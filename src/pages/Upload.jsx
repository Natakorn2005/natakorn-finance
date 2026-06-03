import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { ACCOUNTS, TYPES } from '../constants';
import { saveTransaction } from '../services/transactionService';

// ================================================================
// System Prompt
// ================================================================
const SYSTEM_PROMPT = `You are an expert accounting assistant for "NATAKORN WISETWONGSAHAKIT" (Thai name: นฐกร วิเศษวงศ์สหกิจ).

Your job: analyze the provided e-slip / receipt image and extract the data into a STRICT JSON ARRAY. Respond ONLY with a valid JSON array — no explanation, no markdown, no commentary.

Each object MUST contain exactly these keys:
DATE, TIME, ACCOUNT, DESCRIPTION, TYPE, REIMBURSE, REPAY, PAYEE_PAYER, INCOME, EXPENSE, TRANSFER, DESTINATION_ACCOUNT

================================================================
1. DATE  (format: DD/MM/YYYY — always text)
================================================================
- Read the date printed on the slip.
- Thai Buddhist year → Gregorian: AD = BE - 543.
  - BE 68 = 2025, BE 69 = 2026. A 2-digit year "69" → 2026.
- If the format looks like MM/DD/YYYY, reorder it to DD/MM/YYYY.
- Trust the date exactly as printed. NEVER shift a midnight (00:xx) timestamp to the previous day.

================================================================
2. TIME  (format: HH:MM:SS — always text)
================================================================
- Read the time printed on the slip.
- If seconds are missing, append ":00".
- A 00:xx:xx time belongs to the date stated on the slip — do not adjust.

================================================================
3. ACCOUNT  — the SOURCE account that paid / sent the money
================================================================
Must be EXACTLY one of these names:

  Account name              | How to match it
  --------------------------|----------------------------------------
  KMA (บัญชีเล็ก)            | account tail digits end with 4884
  Krungsri Boarding Card    | account tail digits end with 1183
  SCB (บัญชีใหญ่)            | account tail digits end with 2455
  SCB (บัญชีกลาง)            | account tail digits end with 6158
  SCB (บัญชีมหาวิทยาลัย)     | account tail digits end with 4772
  Kept (บัญชีเงินลงทุน)      | account tail digits end with 1999
  Make (บัญชีรายวัน)         | account tail digits end with 5754
  Truemoney Wallet          | by issuer/name only
  UOB (บัตรเครดิต)           | by issuer/name only (UOB card)
  Anywheel Wallet           | by issuer/name only
  PaoTang Wallet (เป๋าตัง)   | by issuer/name only
  เงินสด                     | no slip / cannot determine

ACCOUNT MATCHING RULES:
- Account numbers on slips are often masked (e.g. XXX-X-X4884-X or 199-9).
- Strip ALL dashes, spaces, and dots from the account number, then check whether
  the resulting digit string ENDS WITH one of the tail digits above.
  Example: "199-9" → "1999" → matches Kept (บัญชีเงินลงทุน).
- DIGIT MATCH TAKES PRIORITY over bank logo or issuer name. Even if the slip
  shows the Krungsri logo, if the account number ends with 4884 it is
  KMA (บัญชีเล็ก) — NOT Krungsri Boarding Card.
- Krungsri Boarding Card is a CREDIT CARD (ends with 1183). A Krungsri slip
  showing a savings account number (e.g. XXX-4-74884-X) is KMA (บัญชีเล็ก).
- If the slip shows a holder name instead of a number, match the bank/issuer.
- If nothing matches, default to "เงินสด".

================================================================
4. NAME RECOGNITION (used to decide transaction direction)
================================================================
These identify the OWNER (you):
  - Thai:    นฐกร วิเศษวงศ์สหกิจ
  - English: NATAKORN WISETWONGSAHAKIT
  - Partial match is acceptable: first name alone ("นฐกร" or "NATAKORN") counts.
  - Names may be partially masked on slips — match the visible portion.

================================================================
5. TRANSACTION DIRECTION — choose INCOME, EXPENSE, or TRANSFER
================================================================
Exactly ONE of INCOME / EXPENSE / TRANSFER holds the amount. The other two = 0.

Decision logic:
  - RECIPIENT is one of YOUR OWN accounts/wallets (name or tail digits match the
    table above, or the holder name matches YOU) → TRANSFER.
  - SENDER is someone else AND RECIPIENT is YOU → INCOME.
  - RECIPIENT is someone else (a person or merchant who is not you) → EXPENSE.
  - Any "โอนเงิน" / "PromptPay" to a named payee who is NOT you → EXPENSE or TRANSFER,
    NEVER INCOME, regardless of the note.
  - If direction is genuinely unclear with only one amount shown → default EXPENSE.

Make a best guess when uncertain; the user reviews before saving.

================================================================
6. TRANSFER rules (money moving between YOUR OWN accounts)
================================================================
- Record ONE row only, from the SOURCE account. NEVER create a second row for the
  receiving account.
- TYPE = "การโอนย้ายเงิน : ถอนเงิน / โอนเงิน"
- DESTINATION_ACCOUNT = the matched destination account name (same name format).
- Wallet top-ups are TRANSFERS:
    - Top-up to Truemoney Wallet / Anywheel Wallet / PaoTang Wallet from a bank
      = TRANSFER, DESTINATION_ACCOUNT = that wallet.
- ATM withdrawal: TYPE = "การโอนย้ายเงิน : ถอนเงิน / โอนเงิน",
    ACCOUNT = source bank, DESTINATION_ACCOUNT = "เงินสด".
- Cash deposit (CDM / ATM deposit): ACCOUNT = "เงินสด",
    DESTINATION_ACCOUNT = the receiving bank account.

================================================================
7. DESCRIPTION
================================================================
- Use the memo/note on the slip as the base.
- Strip the keyword "คืนเงิน" (see REIMBURSE) and "(เบิก)" (see REPAY) from the text.
- Keep transit station codes verbatim, e.g. "S8-S12", "N3-CEN", "SLY-BWA", "BWA-SLY".
- For a shared/split bill (memo contains "หารกัน" or "ส่วนของ"): record only YOUR
  share (the amount actually shown as paid) and note the split in DESCRIPTION.

================================================================
8. คืนเงิน DIRECTION RULE
================================================================
- Pattern: an OUTGOING transfer whose memo is "คืนเงิน[ชื่อ]ค่า[X]"
- Therefore: EXPENSE = amount, REIMBURSE = true, strip "คืนเงิน[ชื่อ]" from DESCRIPTION,
  and set TYPE based on [X].

================================================================
9. TYPE — must be EXACTLY one of the following
================================================================
INCOME types:
  - รายรับ : เงินประจำเดือน
  - รายรับ : รายได้เสริม
  - รายรับ : เงินคืน
  - รายรับ : รายรับอื่น ๆ

EXPENSE types:
  - อาหารและเครื่องดื่ม : อาหารและเครื่องดื่ม
  - อาหารและเครื่องดื่ม : เครื่องดื่ม
  - อาหารและเครื่องดื่ม : ขนมและของกินเล่น
  - การเดินทาง : ขนส่งสาธารณะ
  - การเดินทาง : แท็กซี่ / วินมอเตอร์ไซค์
  - รายจ่ายประจำเดือน : ค่าหอพัก
  - รายจ่ายประจำเดือน : ค่าน้ำ / ค่าไฟฟ้า
  - รายจ่ายประจำเดือน : ค่าซักผ้า / อบผ้า
  - รายจ่ายประจำเดือน : ค่าเน็ตมือถือ
  - รายจ่ายประจำเดือน : ค่าบริการรายเดือน
  - การศึกษา : ค่าการศึกษา
  - การศึกษา : สื่อการเรียน / เครื่องเขียน
  - การศึกษา : อุปกรณ์ทำโปรเจกต์
  - ความบันเทิง : ค่าเข้าร่วมกิจกรรม
  - ความบันเทิง : ของใช้ส่วนตัว
  - ความบันเทิง : เสื้อผ้า / เครื่องแต่งกาย
  - ความบันเทิง : ของขวัญ / สังสรรค์
  - ความบันเทิง : ท่องเที่ยว
  - สุขภาพ / ค่ารักษาพยาบาล
  - เงินออมและการลงทุน : เงินออม
  - เงินออมและการลงทุน : เงินฉุกเฉิน
  - เงินออมและการลงทุน : การลงทุน

TRANSFER type:
  - การโอนย้ายเงิน : ถอนเงิน / โอนเงิน

CONFIDENCE FLAG:
- If less than ~80% confident of TYPE, append "?" (e.g. "ความบันเทิง : ของใช้ส่วนตัว?")

MERCHANT MAPPING:
  - 7-Eleven, Lotus's, BigC mini → SPLIT per item
  - Cafe Amazon, Starbucks → อาหารและเครื่องดื่ม : เครื่องดื่ม
  - BTS, MRT, SRT, BRT, Salaya Link → การเดินทาง : ขนส่งสาธารณะ (keep station code)
  - Anywheel RIDE → การเดินทาง : ขนส่งสาธารณะ, ACCOUNT = Anywheel Wallet
  - City Bike / City Bike Rental / Device ID slip → Anywheel Wallet + ขนส่งสาธารณะ
  - Grab + person PAYEE → แท็กซี่ / วินมอเตอร์ไซค์
  - Grab + shop PAYEE → อาหารและเครื่องดื่ม : อาหารและเครื่องดื่ม

================================================================
10. REIMBURSE and REPAY
================================================================
REIMBURSE:
  - true ONLY if memo EXPLICITLY contains "คืนเงิน". Strip it from DESCRIPTION.
  - NEVER infer from context alone.

REPAY:
  - true if memo contains "(เบิก)". Strip it from DESCRIPTION.
  - Auto-set true for: การศึกษา : อุปกรณ์ทำโปรเจกต์, การศึกษา : ค่าการศึกษา,
    ความบันเทิง : ค่าเข้าร่วมกิจกรรม, สุขภาพ / ค่ารักษาพยาบาล

================================================================
11. MULTI-ITEM RECEIPTS
================================================================
- One JSON object PER ITEM. Never collapse to single row.
- Shared DATE, TIME, ACCOUNT, PAYEE_PAYER across all rows.
- Distribute discount pro-rata by item price.

================================================================
12. PAYEE_PAYER
================================================================
- Full name exactly as printed. Drop bank prefix, keep title (นาย/นาง/น.ส.).
- EXPENSE → PAYEE. INCOME → PAYER. TRANSFER → recipient side.

================================================================
13. AMOUNTS
================================================================
- Exactly one of INCOME/EXPENSE/TRANSFER is non-zero; others = 0.
- DESTINATION_ACCOUNT filled only when TRANSFER > 0; otherwise "".`;

// ================================================================
// Provider config
// ================================================================
const PROVIDERS = {
  'claude-sonnet': { label: 'Claude Sonnet 4.6', type: 'anthropic', model: 'claude-sonnet-4-6' },
  'claude-haiku':  { label: 'Claude Haiku 4.5',  type: 'anthropic', model: 'claude-haiku-4-5-20251001' },
  'gemini-flash':  { label: 'Gemini 2.5 Flash',  type: 'gemini',    model: 'gemini-2.5-flash' },
};

// ================================================================
// API callers
// ================================================================
async function callAnthropic(apiKey, imageBase64, imageMimeType, model) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: imageMimeType, data: imageBase64 },
          },
          { type: 'text', text: 'Analyze this e-slip and return the JSON array.' },
        ],
      }],
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  const text = data.content?.[0]?.text;
  if (!text) throw new Error('Empty response from Claude');
  const clean = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function callGemini(apiKey, imageBase64, imageMimeType, model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{
        parts: [
          { inline_data: { mime_type: imageMimeType, data: imageBase64 } },
          { text: 'Analyze this e-slip and return the JSON array.' },
        ],
      }],
      generationConfig: {
        temperature: 0.0,
        maxOutputTokens: 4000,
        responseMimeType: 'application/json',
      },
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  const clean = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function analyzeImage(providerKey, imageFile) {
  const cfg = PROVIDERS[providerKey];
  const base64 = await new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result.split(',')[1]);
    reader.onerror = rej;
    reader.readAsDataURL(imageFile);
  });

  // Detect real mime type from magic bytes
  const raw = await imageFile.arrayBuffer();
  const bytes = new Uint8Array(raw);
  let mime = imageFile.type || 'image/jpeg';
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) mime = 'image/jpeg';
  else if (bytes[0] === 0x89 && bytes[1] === 0x50) mime = 'image/png';
  else if (bytes[0] === 0x52 && bytes[1] === 0x49) mime = 'image/webp';

  if (cfg.type === 'anthropic') {
    const apiKey = localStorage.getItem('anthropic_api_key');
    if (!apiKey) throw new Error('Anthropic API key not set in Settings');
    return callAnthropic(apiKey, base64, mime, cfg.model);
  } else {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) throw new Error('Gemini API key not set in Settings');
    return callGemini(apiKey, base64, mime, cfg.model);
  }
}

// ================================================================
// Status badge
// ================================================================
const STATUS = {
  pending:   { icon: '⏳', color: '#94a3b8', label: 'Pending' },
  analyzing: { icon: '🤖', color: '#667eea', label: 'Analyzing' },
  done:      { icon: '✅', color: '#22c55e', label: 'Ready' },
  error:     { icon: '❌', color: '#ef4444', label: 'Error' },
  saved:     { icon: '💾', color: '#8b5cf6', label: 'Saved' },
};

// ================================================================
// Transaction form for a single slip
// ================================================================
function SlipForm({ slip, onChange, onSave }) {
  const { transactions, status, error, saving, saved } = slip;

  if (status === 'pending') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', color: '#94a3b8', gap: 12 }}>
        <div style={{ fontSize: 48 }}>🧾</div>
        <p style={{ margin: 0 }}>Waiting to analyze...</p>
      </div>
    );
  }

  if (status === 'analyzing') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', color: '#667eea', gap: 12 }}>
        <div style={{ fontSize: 48, animation: 'spin 1s linear infinite' }}>🤖</div>
        <p style={{ margin: 0 }}>AI is reading your slip...</p>
        <small style={{ color: '#aaa' }}>This takes a few seconds</small>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', gap: 12, padding: 24 }}>
        <div style={{ fontSize: 48 }}>❌</div>
        <p style={{ color: '#ef4444', margin: 0, textAlign: 'center', fontSize: 14 }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
      {/* Saved banner */}
      {saved && (
        <div style={{ background: '#dcfce7', color: '#16a34a', padding: '10px 16px',
          fontSize: 13, fontWeight: 600, borderRadius: 8, marginBottom: 12 }}>
          ✅ Saved successfully!
        </div>
      )}

      {/* Transaction rows */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
        {transactions.map((tx, i) => (
          <div key={i} style={{ marginBottom: 16, padding: 14, background: '#f8f9ff',
            borderRadius: 10, border: '1px solid #e8eaff' }}>

            {transactions.length > 1 && (
              <div style={{ fontSize: 12, fontWeight: 700, color: '#667eea',
                marginBottom: 10 }}>Item {i + 1} of {transactions.length}</div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {/* Date */}
              <div>
                <label style={labelStyle}>Date</label>
                <input style={inputStyle} value={tx.DATE || ''}
                  onChange={e => onChange(i, 'DATE', e.target.value)} />
              </div>
              {/* Time */}
              <div>
                <label style={labelStyle}>Time</label>
                <input style={inputStyle} value={tx.TIME || ''}
                  onChange={e => onChange(i, 'TIME', e.target.value)} />
              </div>
              {/* Account */}
              <div>
                <label style={labelStyle}>Account</label>
                <select style={inputStyle} value={tx.ACCOUNT || ''}
                  onChange={e => onChange(i, 'ACCOUNT', e.target.value)}>
                  {ACCOUNTS.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              {/* Type */}
              <div>
                <label style={labelStyle}>
                  Category
                  {tx.TYPE?.endsWith('?') && (
                    <span style={{ color: '#f59e0b', marginLeft: 6, fontSize: 11 }}>⚠️ verify</span>
                  )}
                </label>
                <select style={inputStyle} value={(tx.TYPE || '').replace('?', '')}
                  onChange={e => onChange(i, 'TYPE', e.target.value)}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              {/* Description */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Description</label>
                <input style={inputStyle} value={tx.DESCRIPTION || ''}
                  onChange={e => onChange(i, 'DESCRIPTION', e.target.value)} />
              </div>
              {/* Payee */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Payee / Payer</label>
                <input style={inputStyle} value={tx.PAYEE_PAYER || ''}
                  onChange={e => onChange(i, 'PAYEE_PAYER', e.target.value)} />
              </div>
              {/* Amounts */}
              <div>
                <label style={labelStyle}>Income (฿)</label>
                <input style={inputStyle} type="number" value={tx.INCOME || 0}
                  onChange={e => onChange(i, 'INCOME', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Expense (฿)</label>
                <input style={inputStyle} type="number" value={tx.EXPENSE || 0}
                  onChange={e => onChange(i, 'EXPENSE', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Transfer (฿)</label>
                <input style={inputStyle} type="number" value={tx.TRANSFER || 0}
                  onChange={e => onChange(i, 'TRANSFER', e.target.value)} />
              </div>
              {/* Destination */}
              <div>
                <label style={labelStyle}>Destination</label>
                <select style={inputStyle} value={tx.DESTINATION_ACCOUNT || ''}
                  onChange={e => onChange(i, 'DESTINATION_ACCOUNT', e.target.value)}>
                  <option value="">— None —</option>
                  {ACCOUNTS.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              {/* Note */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Note</label>
                <input style={inputStyle} placeholder="Additional notes"
                  value={tx.NOTE || ''}
                  onChange={e => onChange(i, 'NOTE', e.target.value)} />
              </div>
            </div>

            {/* Flags */}
            <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
              {[['REIMBURSE','คืนเงิน'],['REPAY','เบิกได้'],['PAY_BACK','Pay Back']].map(([f, l]) => (
                <label key={f} style={{ fontSize: 12, display: 'flex',
                  alignItems: 'center', gap: 5, cursor: 'pointer', color: '#555' }}>
                  <input type="checkbox" checked={tx[f] || false}
                    onChange={e => onChange(i, f, e.target.checked)} />
                  {l}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Save button */}
      {!saved && status === 'done' && (
        <button onClick={onSave} disabled={saving}
          style={{ marginTop: 12, padding: '12px 0', borderRadius: 10, border: 'none',
            background: saving ? '#e0e7ff' : '#667eea', color: '#fff',
            fontWeight: 700, fontSize: 14, cursor: saving ? 'default' : 'pointer',
            width: '100%', transition: 'background 0.2s' }}>
          {saving ? '⏳ Saving...' : '💾 Save This Slip'}
        </button>
      )}
    </div>
  );
}

const labelStyle = { fontSize: 11, fontWeight: 600, color: '#888',
  textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 };
const inputStyle = { width: '100%', padding: '7px 10px', borderRadius: 7,
  border: '1px solid #dde', fontSize: 13, background: '#fff',
  boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' };

// ================================================================
// Main Upload component
// ================================================================
function Upload() {
  const [slips, setSlips] = useState([]);
  const [current, setCurrent] = useState(0);
  const [providerKey, setProviderKey] = useState(
    () => localStorage.getItem('ai_provider') || 'claude-sonnet'
  );

  const provider = PROVIDERS[providerKey];

  // Sync provider preference
  useEffect(() => {
    localStorage.setItem('ai_provider', providerKey);
  }, [providerKey]);

  // Add new files
  const onDrop = useCallback((acceptedFiles) => {
    const newSlips = acceptedFiles.map(file => ({
      id: Math.random().toString(36).slice(2),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',   // pending | analyzing | done | error | saved
      transactions: [],
      error: null,
      saving: false,
      saved: false,
    }));
    setSlips(prev => {
      const updated = [...prev, ...newSlips];
      setCurrent(prev.length); // jump to first new slip
      return updated;
    });
    // Auto-analyze all new slips simultaneously
    newSlips.forEach(slip => analyzeSlip(slip.id, slip.file));
  }, [providerKey]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [] }, multiple: true,
  });

  const analyzeSlip = async (id, file) => {
    setSlips(prev => prev.map(s => s.id === id
      ? { ...s, status: 'analyzing' } : s));
    try {
      const txs = await analyzeImage(providerKey, file);
      setSlips(prev => prev.map(s => s.id === id
        ? { ...s, status: 'done', transactions: txs } : s));
    } catch (err) {
      setSlips(prev => prev.map(s => s.id === id
        ? { ...s, status: 'error', error: err.message } : s));
    }
  };

  const handleChange = (slipId, txIndex, field, value) => {
    setSlips(prev => prev.map(s => {
      if (s.id !== slipId) return s;
      const txs = s.transactions.map((tx, i) =>
        i === txIndex ? { ...tx, [field]: value } : tx);
      return { ...s, transactions: txs };
    }));
  };

  const handleSave = async (slipId) => {
    const slip = slips.find(s => s.id === slipId);
    if (!slip) return;

    setSlips(prev => prev.map(s => s.id === slipId ? { ...s, saving: true } : s));

    try {
      const imageBase64 = await new Promise((res) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result.split(',')[1]);
        reader.readAsDataURL(slip.file);
      });
      const imageMime = slip.file.type;

      for (let i = 0; i < slip.transactions.length; i++) {
        const tx = { ...slip.transactions[i] };
        if (tx.TYPE?.endsWith('?')) tx.TYPE = tx.TYPE.slice(0, -1).trim();
        await saveTransaction(tx, i === 0 ? imageBase64 : null, i === 0 ? imageMime : null);
      }

      setSlips(prev => prev.map(s => s.id === slipId
        ? { ...s, saving: false, saved: true, status: 'saved' } : s));
    } catch (err) {
      setSlips(prev => prev.map(s => s.id === slipId
        ? { ...s, saving: false, error: err.message, status: 'error' } : s));
    }
  };

  const currentSlip = slips[current];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e1b4b' }}>
            📤 Upload Slip
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: '#888', marginTop: 2 }}>
            Upload e-slips and let AI extract transaction details
          </p>
        </div>

        {/* AI provider badge + switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: '#888' }}>AI:</span>
          <select value={providerKey}
            onChange={e => setProviderKey(e.target.value)}
            style={{ fontSize: 12, padding: '5px 10px', borderRadius: 20,
              border: '1px solid #dde', background: '#f0f0ff',
              color: '#667eea', fontWeight: 700, cursor: 'pointer', outline: 'none' }}>
            {Object.entries(PROVIDERS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Slip navigator */}
      {slips.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8,
          background: '#f8f9ff', borderRadius: 12, padding: '10px 16px',
          border: '1px solid #e8eaff', flexWrap: 'wrap' }}>

          <button onClick={() => setCurrent(c => Math.max(0, c - 1))}
            disabled={current === 0}
            style={{ ...navBtn, opacity: current === 0 ? 0.3 : 1 }}>←</button>

          {/* Status dots */}
          <div style={{ display: 'flex', gap: 6, flex: 1, flexWrap: 'wrap' }}>
            {slips.map((s, i) => {
              const st = STATUS[s.status];
              return (
                <button key={s.id} onClick={() => setCurrent(i)}
                  style={{
                    padding: '4px 10px', borderRadius: 20, border: 'none',
                    background: i === current ? st.color : '#e8eaff',
                    color: i === current ? '#fff' : '#888',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.15s',
                    outline: i === current ? `2px solid ${st.color}` : 'none',
                    outlineOffset: 1,
                  }}>
                  {st.icon} {i + 1}
                </button>
              );
            })}
          </div>

          <button onClick={() => setCurrent(c => Math.min(slips.length - 1, c + 1))}
            disabled={current === slips.length - 1}
            style={{ ...navBtn, opacity: current === slips.length - 1 ? 0.3 : 1 }}>→</button>

          <span style={{ fontSize: 12, color: '#888', marginLeft: 4 }}>
            {current + 1} / {slips.length}
          </span>
        </div>
      )}

      {/* Main area */}
      {slips.length === 0 ? (
        /* Empty state — full dropzone */
        <div {...getRootProps()} style={{
          border: '2px dashed #c7d2fe', borderRadius: 16, padding: 64,
          textAlign: 'center', cursor: 'pointer', background: '#f8f9ff',
          transition: 'all 0.2s',
          ...(isDragActive ? { background: '#e0e7ff', borderColor: '#667eea' } : {}),
        }}>
          <input {...getInputProps()} />
          <div style={{ fontSize: 56 }}>📎</div>
          <p style={{ margin: '12px 0 4px', fontWeight: 700, color: '#1e1b4b', fontSize: 16 }}>
            {isDragActive ? 'Drop slips here...' : 'Drag & drop your e-slips here'}
          </p>
          <p style={{ margin: 0, color: '#888', fontSize: 13 }}>
            or <strong style={{ color: '#667eea' }}>click to browse</strong> — supports multiple files
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#aaa' }}>JPG · PNG · WEBP</p>
        </div>
      ) : (
        /* Side-by-side view */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 16, minHeight: 600, alignItems: 'start' }}>

          {/* LEFT — slip image (sticky) */}
          <div style={{ position: 'sticky', top: 16 }}>
            <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden',
              border: '1px solid #e8eaff', boxShadow: '0 2px 12px rgba(102,126,234,0.08)' }}>
              {currentSlip && (
                <img src={currentSlip.preview} alt="slip"
                  style={{ width: '100%', display: 'block',
                    maxHeight: '80vh', objectFit: 'contain',
                    background: '#f8f8f8' }} />
              )}
            </div>

            {/* Status label under image */}
            {currentSlip && (
              <div style={{ textAlign: 'center', marginTop: 10, fontSize: 13,
                color: STATUS[currentSlip.status].color, fontWeight: 600 }}>
                {STATUS[currentSlip.status].icon} {STATUS[currentSlip.status].label}
                {currentSlip.status === 'done' && currentSlip.transactions.length > 1 &&
                  ` — ${currentSlip.transactions.length} items`}
              </div>
            )}
          </div>

          {/* RIGHT — transaction form */}
          <div style={{ background: '#fff', borderRadius: 14, padding: 20,
            border: '1px solid #e8eaff',
            boxShadow: '0 2px 12px rgba(102,126,234,0.08)',
            minHeight: 400 }}>
            {currentSlip && (
              <SlipForm
                slip={currentSlip}
                onChange={(txIndex, field, value) =>
                  handleChange(currentSlip.id, txIndex, field, value)}
                onSave={() => handleSave(currentSlip.id)}
              />
            )}
          </div>
        </div>
      )}

      {/* Bottom dropzone (when slips already loaded) */}
      {slips.length > 0 && (
        <div {...getRootProps()} style={{
          border: '2px dashed #c7d2fe', borderRadius: 12, padding: '16px 24px',
          textAlign: 'center', cursor: 'pointer', background: '#f8f9ff',
          fontSize: 13, color: '#888', transition: 'all 0.2s',
          ...(isDragActive ? { background: '#e0e7ff', borderColor: '#667eea', color: '#667eea' } : {}),
        }}>
          <input {...getInputProps()} />
          {isDragActive ? '📎 Drop to add more slips...'
            : '➕ Drop more slips or click to add'}
        </div>
      )}
    </div>
  );
}

const navBtn = {
  width: 32, height: 32, borderRadius: 8, border: '1px solid #dde',
  background: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#667eea', padding: 0,
};

export default Upload;