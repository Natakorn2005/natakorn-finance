"""
FinanceTrack — Slip Analysis Test Harness
==========================================
Tests Claude and/or Gemini models against your real e-slip images,
then scores per-field accuracy against a ground truth answer key.

SETUP
-----
1. pip install anthropic google-genai pillow requests
2. Set your API keys as environment variables:
     set ANTHROPIC_API_KEY=sk-ant-...
     set GEMINI_API_KEY=AIza...
3. Drop your slip images into the ./slips/ folder
   (supports .jpg .jpeg .png .webp)
4. (Optional) Fill in ground_truth.json with correct answers
   to get accuracy scores. If skipped, raw outputs are still saved.
5. Run:
     python run_test.py                    # test all enabled models
     python run_test.py --model gemini-flash
     python run_test.py --model claude-haiku
     python run_test.py --model all

OUTPUT
------
- results/<model>/<slip_filename>.json    raw JSON from model
- results/summary.json                    accuracy scores per field per model
- results/mismatches.json                 every field that differed, for review
"""

import os
import sys
import json
import base64
import argparse
import pathlib
import time
import mimetypes
from datetime import datetime

# ================================================================
# MODEL REGISTRY
# Update the model string if Google/Anthropic releases a newer one.
# ================================================================
MODELS = {
    "gemini-flash-lite": {
        "provider": "gemini",
        "model_id": "gemini-2.5-flash-lite",   # cheapest, ~6 THB/month at your volume
        "label": "Gemini 2.5 Flash-Lite",
    },
    "gemini-flash": {
        "provider": "gemini",
        "model_id": "gemini-2.5-flash",          # recommended starting point
        "label": "Gemini 2.5 Flash",
    },
    "claude-haiku": {
        "provider": "anthropic",
        "model_id": "claude-haiku-4-5-20251001",
        "label": "Claude Haiku 4.5",
    },
    "claude-sonnet": {
        "provider": "anthropic",
        "model_id": "claude-sonnet-4-6",
        "label": "Claude Sonnet 4.6",
    },
}

# Fields to score in accuracy report
SCORED_FIELDS = [
    "DATE", "TIME", "ACCOUNT", "DESCRIPTION",
    "TYPE", "REIMBURSE", "REPAY",
    "PAYEE_PAYER", "INCOME", "EXPENSE", "TRANSFER",
    "DESTINATION_ACCOUNT",
]

# Fields where we strip trailing "?" before comparing
# (model signals low confidence but answer may still be correct)
STRIP_CONFIDENCE_FLAG = {"TYPE"}

BASE_DIR   = pathlib.Path(__file__).parent
SLIPS_DIR  = BASE_DIR / "slips"
RESULTS_DIR = BASE_DIR / "results"
PROMPT_FILE = BASE_DIR / "system_prompt.txt"
GT_FILE     = BASE_DIR / "ground_truth.json"


# ================================================================
# HELPERS
# ================================================================

def load_system_prompt() -> str:
    if not PROMPT_FILE.exists():
        raise FileNotFoundError(f"System prompt not found at {PROMPT_FILE}")
    return PROMPT_FILE.read_text(encoding="utf-8")


def list_slips() -> list[pathlib.Path]:
    exts = {".jpg", ".jpeg", ".png", ".webp"}
    slips = sorted([f for f in SLIPS_DIR.iterdir() if f.suffix.lower() in exts])
    if not slips:
        print(f"[!] No images found in {SLIPS_DIR}")
        print("    Drop your slip images there (.jpg .jpeg .png .webp) and re-run.")
    return slips


def image_to_base64(path: pathlib.Path) -> tuple[str, str]:
    """Returns (base64_data, mime_type) — detects actual format from file bytes."""
    raw = path.read_bytes()
    # Detect real format using magic byte integers (avoids encoding issues)
    # JPEG: FF D8 FF
    if len(raw) >= 3 and raw[0] == 0xFF and raw[1] == 0xD8 and raw[2] == 0xFF:
        mime = "image/jpeg"
    # PNG: 89 50 4E 47
    elif len(raw) >= 4 and raw[0] == 0x89 and raw[1] == 0x50 and raw[2] == 0x4E and raw[3] == 0x47:
        mime = "image/png"
    # WEBP: RIFF....WEBP
    elif len(raw) >= 12 and raw[0:4] == b"RIFF" and raw[8:12] == b"WEBP":
        mime = "image/webp"
    else:
        mime, _ = mimetypes.guess_type(str(path))
        if mime not in ("image/jpeg", "image/png", "image/webp"):
            mime = "image/jpeg"
    data = base64.b64encode(raw).decode("utf-8")
    return data, mime



def parse_json_response(raw: str) -> list[dict]:
    """
    Robustly extract a JSON array from the model response.
    Handles: code fences, leading/trailing whitespace, single-object responses.
    """
    text = raw.strip()
    # Strip markdown code fences
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(
            l for l in lines
            if not l.strip().startswith("```")
        ).strip()
    try:
        parsed = json.loads(text)
        # Model may return a single object instead of an array
        if isinstance(parsed, dict):
            parsed = [parsed]
        return parsed
    except json.JSONDecodeError as e:
        raise ValueError(f"JSON parse failed: {e}\nRaw text:\n{text[:500]}")


def normalize_value(field: str, value) -> str:
    """Normalize a field value for comparison."""
    v = str(value).strip()
    if field in STRIP_CONFIDENCE_FLAG:
        v = v.rstrip("?").strip()
    return v.lower()


def score_rows(predicted: list[dict], expected: list[dict]) -> dict:
    """
    Compare predicted vs expected row arrays.
    Returns per-field match counts and row count match.
    """
    scores = {f: {"match": 0, "total": 0} for f in SCORED_FIELDS}
    row_count_match = len(predicted) == len(expected)

    # Align by index; handle length mismatch by comparing overlapping portion
    for i, exp_row in enumerate(expected):
        if i >= len(predicted):
            # Missing row — count all fields as wrong
            for f in SCORED_FIELDS:
                if f in exp_row:
                    scores[f]["total"] += 1
            continue
        pred_row = predicted[i]
        for f in SCORED_FIELDS:
            if f not in exp_row:
                continue
            scores[f]["total"] += 1
            pred_val = normalize_value(f, pred_row.get(f, ""))
            exp_val  = normalize_value(f, exp_row.get(f, ""))
            if pred_val == exp_val:
                scores[f]["match"] += 1

    return {"field_scores": scores, "row_count_match": row_count_match}


# ================================================================
# GEMINI PROVIDER
# ================================================================

def call_gemini(model_id: str, system_prompt: str, image_b64: str,
                mime_type: str) -> str:
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        raise ImportError(
            "google-genai not installed. Run:\n"
            "  pip install google-genai"
        )

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "GEMINI_API_KEY environment variable not set.\n"
            "  Windows: set GEMINI_API_KEY=AIza...\n"
            "  Mac/Linux: export GEMINI_API_KEY=AIza..."
        )

    client = genai.Client(api_key=api_key)

    image_bytes = base64.b64decode(image_b64)

    response = client.models.generate_content(
        model=model_id,
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            types.Part.from_text(text="Analyze this e-slip and return the JSON array."),
        ],
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            # Force JSON output — Gemini's schema enforcement
            response_mime_type="application/json",
            # Temperature 0 = deterministic extraction (no creativity needed)
            temperature=0.0,
            max_output_tokens=4000,
        ),
    )

    return response.text


# ================================================================
# ANTHROPIC PROVIDER
# ================================================================

def call_anthropic(model_id: str, system_prompt: str, image_b64: str,
                   mime_type: str) -> str:
    try:
        import anthropic
    except ImportError:
        raise ImportError(
            "anthropic not installed. Run:\n"
            "  pip install anthropic"
        )

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "ANTHROPIC_API_KEY environment variable not set.\n"
            "  Windows: set ANTHROPIC_API_KEY=sk-ant-...\n"
            "  Mac/Linux: export ANTHROPIC_API_KEY=sk-ant-..."
        )

    client = anthropic.Anthropic(api_key=api_key)

    message = client.messages.create(
        model=model_id,
        max_tokens=2000,
        system=system_prompt,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": mime_type,
                            "data": image_b64,
                        },
                    },
                    {
                        "type": "text",
                        "text": "Analyze this e-slip and return the JSON array.",
                    },
                ],
            }
        ],
    )

    return message.content[0].text


# ================================================================
# MAIN RUNNER
# ================================================================

def run_model(model_key: str, slips: list[pathlib.Path],
              system_prompt: str, ground_truth: dict) -> dict:
    cfg = MODELS[model_key]
    provider = cfg["provider"]
    model_id = cfg["model_id"]
    label    = cfg["label"]

    out_dir = RESULTS_DIR / model_key
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"  Model: {label}")
    print(f"  Slips: {len(slips)}")
    print(f"{'='*60}")

    all_scores  = {f: {"match": 0, "total": 0} for f in SCORED_FIELDS}
    row_matches = 0
    mismatches  = []
    errors      = []
    total_slips = 0

    for slip_path in slips:
        slip_name = slip_path.name
        print(f"\n  [{slip_name}]", end=" ", flush=True)

        # Load image
        try:
            image_b64, mime_type = image_to_base64(slip_path)
        except Exception as e:
            print(f"ERROR loading image: {e}")
            errors.append({"slip": slip_name, "error": str(e)})
            continue

        # Call model
        try:
            if provider == "gemini":
                raw = call_gemini(model_id, system_prompt, image_b64, mime_type)
            else:
                raw = call_anthropic(model_id, system_prompt, image_b64, mime_type)
            print("✓ response received", end=" ", flush=True)
        except Exception as e:
            print(f"ERROR calling API: {e}")
            errors.append({"slip": slip_name, "error": str(e)})
            continue

        # Parse JSON
        try:
            predicted = parse_json_response(raw)
            print(f"({len(predicted)} row{'s' if len(predicted) != 1 else ''})", end=" ")
        except ValueError as e:
            print(f"ERROR parsing JSON: {e}")
            errors.append({"slip": slip_name, "error": str(e), "raw": raw[:300]})
            # Still save the raw output for inspection
            (out_dir / f"{slip_path.stem}_RAW_ERROR.txt").write_text(raw, encoding="utf-8")
            continue

        # Save raw output
        out_file = out_dir / f"{slip_path.stem}.json"
        out_file.write_text(
            json.dumps(predicted, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )

        total_slips += 1

        # Score against ground truth if available
        if slip_name in ground_truth:
            expected = ground_truth[slip_name]
            if isinstance(expected, dict):
                expected = [expected]

            result = score_rows(predicted, expected)
            if result["row_count_match"]:
                row_matches += 1
            else:
                print(f"[ROW COUNT MISMATCH: predicted {len(predicted)}, expected {len(expected)}]", end=" ")

            for f in SCORED_FIELDS:
                fs = result["field_scores"][f]
                all_scores[f]["match"] += fs["match"]
                all_scores[f]["total"] += fs["total"]

            # Collect mismatches for review
            for i, exp_row in enumerate(expected):
                pred_row = predicted[i] if i < len(predicted) else {}
                for f in SCORED_FIELDS:
                    if f not in exp_row:
                        continue
                    pred_val = normalize_value(f, pred_row.get(f, "MISSING"))
                    exp_val  = normalize_value(f, exp_row.get(f, ""))
                    if pred_val != exp_val:
                        mismatches.append({
                            "slip": slip_name,
                            "row": i,
                            "field": f,
                            "expected": exp_row.get(f),
                            "predicted": pred_row.get(f, "MISSING"),
                        })
            print("scored ✓")
        else:
            print("(no ground truth — output saved)")

        # Free tier = 5 req/min — wait 13s between calls to stay safe
        time.sleep(13)

    # Build summary
    summary = {
        "model": label,
        "model_id": model_id,
        "run_at": datetime.now().isoformat(),
        "total_slips": total_slips,
        "errors": len(errors),
        "ground_truth_available": sum(
            1 for s in slips if s.name in ground_truth
        ),
    }

    if summary["ground_truth_available"] > 0:
        summary["row_count_accuracy"] = (
            f"{row_matches}/{summary['ground_truth_available']}"
        )
        summary["field_accuracy"] = {}
        for f in SCORED_FIELDS:
            total = all_scores[f]["total"]
            match = all_scores[f]["match"]
            if total > 0:
                pct = round(match / total * 100, 1)
                summary["field_accuracy"][f] = f"{match}/{total} ({pct}%)"
            else:
                summary["field_accuracy"][f] = "n/a"

    return {
        "summary": summary,
        "mismatches": mismatches,
        "errors": errors,
    }


def print_summary_table(results: dict[str, dict]):
    """Print a readable accuracy table across all models."""
    models_with_scores = {
        k: v for k, v in results.items()
        if v["summary"].get("ground_truth_available", 0) > 0
    }
    if not models_with_scores:
        print("\n[No ground truth found — raw outputs saved to results/ folder]")
        print("Fill in ground_truth.json to get accuracy scores.")
        return

    print("\n" + "="*70)
    print("  ACCURACY SUMMARY")
    print("="*70)

    col_w = 20
    header = f"{'Field':<30}" + "".join(
        f"{MODELS[k]['label'][:col_w]:<{col_w}}"
        for k in models_with_scores
    )
    print(header)
    print("-" * len(header))

    for f in SCORED_FIELDS:
        row = f"{f:<30}"
        for k, v in models_with_scores.items():
            acc = v["summary"]["field_accuracy"].get(f, "n/a")
            row += f"{acc:<{col_w}}"
        print(row)

    print("-" * len(header))
    row = f"{'Row count match':<30}"
    for k, v in models_with_scores.items():
        row += f"{v['summary'].get('row_count_accuracy','n/a'):<{col_w}}"
    print(row)
    print("="*70)


# ================================================================
# ENTRY POINT
# ================================================================

def main():
    parser = argparse.ArgumentParser(
        description="FinanceTrack slip analysis test harness"
    )
    parser.add_argument(
        "--model",
        choices=list(MODELS.keys()) + ["all"],
        default="all",
        help="Which model(s) to test (default: all)",
    )
    args = parser.parse_args()

    # Decide which models to run
    if args.model == "all":
        models_to_run = list(MODELS.keys())
    else:
        models_to_run = [args.model]

    # Load prompt
    try:
        system_prompt = load_system_prompt()
    except FileNotFoundError as e:
        print(f"[ERROR] {e}")
        sys.exit(1)

    # Load slips
    slips = list_slips()
    if not slips:
        sys.exit(1)

    # Load ground truth (optional)
    ground_truth = {}
    if GT_FILE.exists():
        with open(GT_FILE, encoding="utf-8") as f:
            ground_truth = json.load(f)
        print(f"[i] Ground truth loaded: {len(ground_truth)} entries")
    else:
        print(f"[i] No ground_truth.json found — outputs will be saved but not scored")
        print(f"    Template: ground_truth_template.json")

    print(f"[i] Slips found: {len(slips)}")
    print(f"[i] Models to test: {', '.join(models_to_run)}")

    # Run each model
    RESULTS_DIR.mkdir(exist_ok=True)
    all_results = {}
    for model_key in models_to_run:
        result = run_model(model_key, slips, system_prompt, ground_truth)
        all_results[model_key] = result

    # Print summary table
    print_summary_table(all_results)

    # Save combined results
    combined_summary = {k: v["summary"] for k, v in all_results.items()}
    all_mismatches   = {k: v["mismatches"] for k, v in all_results.items()}
    all_errors       = {k: v["errors"] for k, v in all_results.items()}

    (RESULTS_DIR / "summary.json").write_text(
        json.dumps(combined_summary, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    (RESULTS_DIR / "mismatches.json").write_text(
        json.dumps(all_mismatches, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    if any(v["errors"] for v in all_results.values()):
        (RESULTS_DIR / "errors.json").write_text(
            json.dumps(all_errors, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )

    print(f"\n[i] Full outputs saved to: {RESULTS_DIR}")
    print("[i] Done.")


if __name__ == "__main__":
    main()
