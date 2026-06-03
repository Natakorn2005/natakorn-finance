# FinanceTrack — Slip Analysis Test Harness

Test Claude and Gemini models against your real e-slip images,
then compare per-field accuracy side-by-side.

---

## Setup

### 1. Install dependencies
```
pip install anthropic google-genai pillow
```

### 2. Set API keys (Windows)
```
set ANTHROPIC_API_KEY=sk-ant-...
set GEMINI_API_KEY=AIza...
```
Mac/Linux:
```
export ANTHROPIC_API_KEY=sk-ant-...
export GEMINI_API_KEY=AIza...
```

### 3. Add your slips
Drop slip images into the `slips/` folder.
Supported: `.jpg` `.jpeg` `.png` `.webp`

Name them anything — the filename is used as the key in ground_truth.json.

### 4. (Optional) Fill in ground truth
Copy `ground_truth_template.json` → `ground_truth.json` and fill in
the correct answers for each slip. Delete the `_instructions` block.

If you skip this step, raw outputs are still saved — you just won't get
accuracy scores.

---

## Running

```bash
# Test all 4 models
python run_test.py

# Test only Gemini Flash (recommended starting point)
python run_test.py --model gemini-flash

# Test only Gemini Flash-Lite (cheapest)
python run_test.py --model gemini-flash-lite

# Test only Claude Haiku
python run_test.py --model claude-haiku

# Test only Claude Sonnet
python run_test.py --model claude-sonnet
```

---

## Output

```
results/
  gemini-flash/
    slip_001.json       ← raw JSON from model for each slip
    slip_002.json
  claude-haiku/
    slip_001.json
    ...
  summary.json          ← per-field accuracy per model
  mismatches.json       ← every field that differed from ground truth
  errors.json           ← API errors or JSON parse failures (if any)
```

### Reading the accuracy table
The script prints a table like this at the end:

```
Field                         Gemini 2.5 Flash    Claude Haiku 4.5
---------------------------------------------------------------------
DATE                          20/20 (100.0%)      20/20 (100.0%)
TIME                          20/20 (100.0%)      20/20 (100.0%)
ACCOUNT                       17/20 (85.0%)       18/20 (90.0%)
TYPE                          16/20 (80.0%)       15/20 (75.0%)
...
Row count match               19/20               20/20
```

Focus on these fields when deciding which model to use:
- **ACCOUNT** — masked account number matching (the hard one)
- **TYPE** — category classification
- **INCOME/EXPENSE/TRANSFER** — direction detection
- **Row count match** — did the model split multi-item receipts correctly?

---

## Recommended test set

For a meaningful result, include at least:
- 5 simple single-transfer slips
- 5 merchant payment slips (different shops)
- 3 slips with masked/partial account numbers
- 2 slips with คืนเงิน in the memo
- 2 slips involving BTS/MRT/transit
- 1 Grab slip (person as payee)
- 1 multi-item receipt (7-Eleven)

~20 slips total is enough to see meaningful differences between models.

---

## Updating the model strings

If Google or Anthropic releases a new model, update the `MODELS` dict
at the top of `run_test.py`:

```python
"gemini-flash": {
    "provider": "gemini",
    "model_id": "gemini-2.5-flash",   # ← change this
    ...
},
```

---

## Cost per test run (~20 slips, gemini-flash)

Each slip = ~7,500 input tokens + ~200 output tokens.
20 slips × Gemini 2.5 Flash ($0.30/$2.50 per 1M) ≈ $0.05 total (~1.8 THB).
Very cheap — run as many times as you need.
