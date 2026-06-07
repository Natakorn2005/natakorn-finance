import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { ACCOUNTS, TYPES } from '../constants';
import { saveTransaction } from '../services/transactionService';

// Check for duplicate transactions in localStorage
function checkDuplicate(tx) {
  try {
    const all = JSON.parse(localStorage.getItem('ft_transactions') || '[]');
    return all.find(t =>
      t.DATE === tx.DATE &&
      t.TIME === tx.TIME &&
      t.ACCOUNT === tx.ACCOUNT &&
      t.UID !== tx.UID &&  // ignore self
      t._fromCurrentSession !== true &&  // ignore same session saves
      (
        (Number(t.INCOME) === Number(tx.INCOME) && Number(tx.INCOME) > 0) ||
        (Number(t.EXPENSE) === Number(tx.EXPENSE) && Number(tx.EXPENSE) > 0) ||
        (Number(t.TRANSFER) === Number(tx.TRANSFER) && Number(tx.TRANSFER) > 0)
      )
    ) || null;
  } catch { return null; }
}

const C = { teal:'#0d9488', tealLight:'#2dd4bf', green:'#4ade80', muted:'#f0fdf4', border:'#d1fae5', text:'#134e4a', sub:'#6b7280' };

const SYSTEM_PROMPT = `You are an expert accounting assistant for "NATAKORN WISETWONGSAHAKIT" (Thai name: นฐกร วิเศษวงศ์สหกิจ).
Your job: analyze the provided e-slip / receipt image and extract the data into a STRICT JSON ARRAY. Respond ONLY with a valid JSON array — no explanation, no markdown, no commentary.
Each object MUST contain exactly these keys: DATE, TIME, ACCOUNT, DESCRIPTION, TYPE, REIMBURSE, REPAY, PAYEE_PAYER, INCOME, EXPENSE, TRANSFER, DESTINATION_ACCOUNT, CLAIMED_FROM
================================================================
1. DATE (format: DD/MM/YYYY — always text)
- Thai Buddhist year → Gregorian: BE 68=2025, BE 69=2026. 2-digit "69"→2026.
- If MM/DD/YYYY, reorder to DD/MM/YYYY. NEVER shift midnight timestamp.
2. TIME (format: HH:MM:SS) — append ":00" if seconds missing.
3. ACCOUNT — SOURCE account. Must be EXACTLY one of:
  KMA (บัญชีเล็ก) | ends 4884
  Krungsri Boarding Card | ends 1183
  SCB (บัญชีใหญ่) | ends 2455
  SCB (บัญชีกลาง) | ends 6158
  SCB (บัญชีมหาวิทยาลัย) | ends 4772
  Kept (บัญชีเงินลงทุน) | ends 1999
  Make (บัญชีรายวัน) | ends 5754
  Truemoney Wallet | name only
  UOB (บัตรเครดิต) | name only
  Anywheel Wallet | name only
  PaoTang Wallet (เป๋าตัง) | name only
  เงินสด | default
RULES: Strip dashes/spaces from account number, check ENDS WITH digits. DIGIT MATCH > logo. Krungsri logo + 4884 = KMA (บัญชีเล็ก). Krungsri Boarding Card = credit card ends 1183 only.
4. NAME RECOGNITION: นฐกร วิเศษวงศ์สหกิจ / NATAKORN WISETWONGSAHAKIT. Partial match ok.
5. DIRECTION: RECIPIENT is yours→TRANSFER. Sender≠you, recipient=you→INCOME. Recipient≠you→EXPENSE. Unclear→EXPENSE.
6. TRANSFER: one row only, TYPE="การโอนย้ายเงิน : ถอนเงิน / โอนเงิน", DESTINATION_ACCOUNT=matched name. Wallet top-ups=TRANSFER. ATM withdrawal DESTINATION="เงินสด".
7. DESCRIPTION: memo/note base. Strip "คืนเงิน" (REIMBURSE) and "(เบิก)" (REPAY). Keep station codes: S8-S12, BWA-SLY etc.
8. คืนเงิน[ชื่อ]ค่า[X] pattern: EXPENSE+REIMBURSE=true, TYPE based on [X].
9. TYPE must be EXACTLY one of:
INCOME: รายรับ : เงินประจำเดือน | รายรับ : รายได้เสริม | รายรับ : เงินคืน | รายรับ : รายรับอื่น ๆ
EXPENSE: อาหารและเครื่องดื่ม : อาหารและเครื่องดื่ม | อาหารและเครื่องดื่ม : เครื่องดื่ม | อาหารและเครื่องดื่ม : ขนมและของกินเล่น | การเดินทาง : ขนส่งสาธารณะ | การเดินทาง : แท็กซี่ / วินมอเตอร์ไซค์ | รายจ่ายประจำเดือน : ค่าหอพัก | รายจ่ายประจำเดือน : ค่าน้ำ / ค่าไฟฟ้า | รายจ่ายประจำเดือน : ค่าซักผ้า / อบผ้า | รายจ่ายประจำเดือน : ค่าเน็ตมือถือ | รายจ่ายประจำเดือน : ค่าบริการรายเดือน | การศึกษา : ค่าการศึกษา | การศึกษา : สื่อการเรียน / เครื่องเขียน | การศึกษา : อุปกรณ์ทำโปรเจกต์ | ความบันเทิง : ค่าเข้าร่วมกิจกรรม | ความบันเทิง : ของใช้ส่วนตัว | ความบันเทิง : เสื้อผ้า / เครื่องแต่งกาย | ความบันเทิง : ของขวัญ / สังสรรค์ | ความบันเทิง : ท่องเที่ยว | สุขภาพ / ค่ารักษาพยาบาล | เงินออมและการลงทุน : เงินออม | เงินออมและการลงทุน : เงินฉุกเฉิน | เงินออมและการลงทุน : การลงทุน | ค่าใช้จ่ายอื่น ๆ
TRANSFER: การโอนย้ายเงิน : ถอนเงิน / โอนเงิน
CONFIDENCE: append "?" ONLY to TYPE field if <80% confident. NEVER append "?" to ACCOUNT, DATE, TIME, or any other field.
MERCHANTS: 7-Eleven/Lotus's→SPLIT per item. Cafe Amazon/Starbucks→เครื่องดื่ม. BTS/MRT/SRT/BRT/Salaya Link→ขนส่งสาธารณะ(keep code). Anywheel ride→ขนส่งสาธารณะ+Anywheel Wallet. City Bike/City Bike Rental/Device ID→Anywheel Wallet+ขนส่งสาธารณะ. Grab+person→แท็กซี่. Grab+shop→อาหาร.
10. FLAG RULES:
    REIMBURSE=true (👥 เพื่อนค้างจ่าย):
      - EXPENSE = you paid FOR a friend and expect friend to pay you back
      - INCOME = friend is paying you back
    REPAY=true (🏢 เบิกได้):
      - EXPENSE = you paid something you will claim back from org/parents
      - INCOME = org/parents is reimbursing you
      - Also true if "(เบิก)" in memo OR TYPE is: การศึกษา:อุปกรณ์ทำโปรเจกต์, การศึกษา:ค่าการศึกษา, ความบันเทิง:ค่าเข้าร่วมกิจกรรม, สุขภาพ/ค่ารักษาพยาบาล
      - Strip "(เบิก)" from DESCRIPTION if present
    PAY_BACK=true (💸 คืนหนี้):
      - INCOME = someone lent you money (you owe them)
      - EXPENSE = you are paying back money you borrowed
    NOTE: Multiple flags CAN be true if multiple situations apply (e.g. paying back friend AND will claim from parents = PAY_BACK=true + REPAY=true)
    If unclear, all false.
11. MULTI-ITEM: one object PER ITEM. Share DATE/TIME/ACCOUNT/PAYEE_PAYER. Pro-rata discount.
12. PAYEE_PAYER: full name as printed. Drop bank prefix, keep title.
13. AMOUNTS: exactly one non-zero. DESTINATION_ACCOUNT only when TRANSFER>0.
14. CLAIMED_FROM: organization/company that will reimburse you. Fill ONLY when REPAY=true and slip shows org name (university, company, etc.). Otherwise empty string.`;

const PROVIDERS = {
  'claude-sonnet': { label: 'Claude Sonnet 4.6', type: 'anthropic', model: 'claude-sonnet-4-6' },
  'claude-haiku':  { label: 'Claude Haiku 4.5',  type: 'anthropic', model: 'claude-haiku-4-5-20251001' },
  'gemini-flash':  { label: 'Gemini 2.5 Flash',  type: 'gemini',    model: 'gemini-2.5-flash' },
};

async function callAnthropic(apiKey, b64, mime, model) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true' },
    body: JSON.stringify({ model, max_tokens:8000, system:SYSTEM_PROMPT,
      messages:[{role:'user',content:[{type:'image',source:{type:'base64',media_type:mime,data:b64}},{type:'text',text:'Analyze this e-slip.'}]}] }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  const t = d.content?.[0]?.text; if (!t) throw new Error('Empty response');
  let cleaned = t.replace(/```json|```/g,'').trim();
  // Fix truncated JSON by finding the last complete object
  try {
    const p = JSON.parse(cleaned);
    return Array.isArray(p) ? p : [p];
  } catch(e) {
    // Try to recover truncated JSON array
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace > 0) {
      cleaned = cleaned.substring(0, lastBrace+1);
      if (!cleaned.startsWith('[')) cleaned = '[' + cleaned;
      if (!cleaned.endsWith(']')) cleaned = cleaned + ']';
      try {
        const p = JSON.parse(cleaned);
        return Array.isArray(p) ? p : [p];
      } catch(e2) { throw new Error('AI returned invalid JSON: ' + e.message); }
    }
    throw new Error('AI returned invalid JSON: ' + e.message);
  }
}
async function callGemini(apiKey, b64, mime, model) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ system_instruction:{parts:[{text:SYSTEM_PROMPT}]},
      contents:[{parts:[{inline_data:{mime_type:mime,data:b64}},{text:'Analyze this e-slip.'}]}],
      generationConfig:{temperature:0,maxOutputTokens:8000,responseMimeType:'application/json'} }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  const t = d.candidates?.[0]?.content?.parts?.[0]?.text; if (!t) throw new Error('Empty response');
  let cleaned = t.replace(/```json|```/g,'').trim();
  try {
    const p = JSON.parse(cleaned);
    return Array.isArray(p) ? p : [p];
  } catch(e) {
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace > 0) {
      cleaned = cleaned.substring(0, lastBrace+1);
      if (!cleaned.startsWith('[')) cleaned = '[' + cleaned;
      if (!cleaned.endsWith(']')) cleaned = cleaned + ']';
      try {
        const p = JSON.parse(cleaned);
        return Array.isArray(p) ? p : [p];
      } catch(e2) { throw new Error('AI returned invalid JSON: ' + e.message); }
    }
    throw new Error('AI returned invalid JSON: ' + e.message);
  }
}
async function analyzeImage(provKey, file) {
  const cfg = PROVIDERS[provKey];
  const b64 = await new Promise((res,rej)=>{ const rd=new FileReader(); rd.onload=()=>res(rd.result.split(',')[1]); rd.onerror=(e)=>rej(new Error('File read failed')); rd.readAsDataURL(file); });
  const raw = await file.arrayBuffer(); const by = new Uint8Array(raw);
  let mime = file.type||'image/jpeg';
  if(by[0]===0xFF&&by[1]===0xD8) mime='image/jpeg';
  else if(by[0]===0x89&&by[1]===0x50) mime='image/png';
  else if(by[0]===0x52&&by[1]===0x49) mime='image/webp';
  if(cfg.type==='anthropic'){ const k=localStorage.getItem('anthropic_api_key'); if(!k) throw new Error('Anthropic API key not set in Settings'); return callAnthropic(k,b64,mime,cfg.model); }
  else { const k=localStorage.getItem('gemini_api_key'); if(!k) throw new Error('Gemini API key not set in Settings'); return callGemini(k,b64,mime,cfg.model); }
}

async function analyzeImageFromB64(provKey, b64, mime) {
  const cfg = PROVIDERS[provKey];
  if(cfg.type==='anthropic'){ const k=localStorage.getItem('anthropic_api_key'); if(!k) throw new Error('Anthropic API key not set in Settings'); return callAnthropic(k,b64,mime,cfg.model); }
  else { const k=localStorage.getItem('gemini_api_key'); if(!k) throw new Error('Gemini API key not set in Settings'); return callGemini(k,b64,mime,cfg.model); }
}

const ST = {
  pending:  {icon:'⏳',color:C.sub,   label:'Pending'},
  analyzing:{icon:'🤖',color:C.teal,  label:'Analyzing'},
  done:     {icon:'✅',color:'#16a34a',label:'Ready'},
  error:    {icon:'❌',color:'#ef4444',label:'Error'},
  saved:    {icon:'💾',color:C.teal,  label:'Saved'},
};

const lbl = { fontSize:11,fontWeight:700,color:C.sub,textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:4 };
const inp = { width:'100%',padding:'7px 10px',borderRadius:7,border:`1.5px solid ${C.border}`,fontSize:13,background:'#fff',boxSizing:'border-box',outline:'none',fontFamily:'inherit',color:C.text };

function SlipForm({ slip, onChange, onSave, onRetry }) {
  const { transactions:txs, status, error, saving, saved } = slip;
  if (status==='pending') return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',color:C.sub,gap:12}}>
      <div style={{fontSize:48}}>🧾</div><p style={{margin:0}}>Waiting to analyze...</p>
    </div>
  );
  if (status==='analyzing') return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',color:C.teal,gap:12}}>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      <div style={{fontSize:48,animation:'spin 1s linear infinite'}}>🤖</div>
      <p style={{margin:0}}>AI is reading your slip...</p>
      <small style={{color:C.sub}}>This takes a few seconds</small>
    </div>
  );
  if (status==='error') return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:12,padding:24}}>
      <div style={{fontSize:48}}>❌</div>
      <p style={{color:'#ef4444',margin:0,textAlign:'center',fontSize:14}}>{error}</p>
      <button onClick={onRetry} style={{marginTop:8,padding:'10px 24px',borderRadius:10,border:'none',background:'#0d9488',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer'}}>
        🔄 Retry
      </button>
    </div>
  );
  return (
    <div style={{display:'flex',flexDirection:'column',gap:0,height:'100%'}}>
      {saved && <div style={{background:C.muted,color:'#16a34a',padding:'10px 16px',fontSize:13,fontWeight:600,borderRadius:8,marginBottom:12,border:`1px solid ${C.border}`}}>✅ Saved successfully!</div>}
      <div style={{flex:1,overflowY:'auto',paddingRight:4}}>
        {txs.map((tx,i) => (
          <div key={i} style={{marginBottom:16,padding:14,background:C.muted,borderRadius:10,border:`1px solid ${C.border}`}}>
            {txs.length>1 && <div style={{fontSize:12,fontWeight:700,color:C.teal,marginBottom:10}}>Item {i+1} of {txs.length}</div>}
            {(()=>{const dup=checkDuplicate(tx);return dup?<div style={{background:'#fef9c3',border:'1px solid #fcd34d',borderRadius:8,padding:'8px 12px',marginBottom:10,fontSize:12,color:'#92400e'}}>⚠️ Possible duplicate — matches <strong>{dup.ID||dup.DATE}</strong> {dup.DESCRIPTION}. Check before saving.</div>:null;})()}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {[['DATE','Date','text'],['TIME','Time','text']].map(([f,lb,tp])=>(
                <div key={f}><label style={lbl}>{lb}</label><input style={inp} type={tp} value={tx[f]||''} onChange={e=>onChange(i,f,e.target.value)}/></div>
              ))}
              <div><label style={lbl}>Account</label>
                <select style={inp} value={tx.ACCOUNT||''} onChange={e=>onChange(i,'ACCOUNT',e.target.value)}>
                  {ACCOUNTS.map(a=><option key={a}>{a}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Category {tx.TYPE?.endsWith('?')&&<span style={{color:'#f59e0b',marginLeft:4,fontSize:10}}>⚠️ verify</span>}</label>
                <select style={inp} value={(tx.TYPE||'').replace('?','')} onChange={e=>onChange(i,'TYPE',e.target.value)}>
                  {TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              {[['DESCRIPTION','Description','1/-1'],['PAYEE_PAYER','Payee / Payer','1/-1'],
                ['INCOME','Income (฿)',null],['EXPENSE','Expense (฿)',null],['TRANSFER','Transfer (฿)',null]].map(([f,lb,gc])=>(
                <div key={f} style={gc?{gridColumn:gc}:{}}>
                  <label style={lbl}>{lb}</label>
                  <input style={inp} type={f.match(/INCOME|EXPENSE|TRANSFER/)?'number':'text'} value={tx[f]||0} onChange={e=>onChange(i,f,e.target.value)}/>
                </div>
              ))}
              <div><label style={lbl}>Destination</label>
                <select style={inp} value={tx.DESTINATION_ACCOUNT||''} onChange={e=>onChange(i,'DESTINATION_ACCOUNT',e.target.value)}>
                  <option value="">— None —</option>
                  {ACCOUNTS.map(a=><option key={a}>{a}</option>)}
                </select>
              </div>
              <div style={{gridColumn:'1/-1'}}><label style={lbl}>Note</label>
                <input style={inp} placeholder="Additional notes" value={tx.NOTE||''} onChange={e=>onChange(i,'NOTE',e.target.value)}/>
              </div>
              {(tx.REPAY) && <div style={{gridColumn:'1/-1'}}><label style={lbl}>Claimed From (org)</label>
                <input style={inp} placeholder="e.g. Mahidol University" value={tx.CLAIMED_FROM||''} onChange={e=>onChange(i,'CLAIMED_FROM',e.target.value)}/>
              </div>}
            </div>
            <div style={{display:'flex',gap:16,marginTop:10,flexWrap:'wrap'}}>
              {[['REIMBURSE','👥 เพื่อนค้างจ่าย'],['REPAY','🏢 เบิกได้'],['PAY_BACK','💸 คืนหนี้']].map(([f,l])=>(
                <label key={f} style={{fontSize:12,display:'flex',alignItems:'center',gap:5,cursor:'pointer',color:C.sub}}>
                  <input type="checkbox" checked={tx[f]||false} onChange={e=>onChange(i,f,e.target.checked)}/>{l}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!saved && status==='done' && (
        <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:12}}>
          {txs.map((tx,i)=>(
            <button key={i} onClick={()=>onSave(i)} disabled={saving||tx._saved}
              style={{padding:'10px 0',borderRadius:10,border:'none',
                background:tx._saved?'#dcfce7':saving?C.border:C.teal,
                color:tx._saved?'#16a34a':'#fff',fontWeight:700,fontSize:13,
                cursor:(saving||tx._saved)?'default':'pointer',width:'100%',transition:'background 0.2s'}}>
              {tx._saved ? `✅ Item ${i+1} Saved` : saving===i ? '⏳ Saving...' : txs.length>1 ? `💾 Save Item ${i+1}` : '💾 Save This Slip'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Upload() {
  const [slips,setSlips] = useState([]);
  const [current,setCurrent] = useState(0);
  const [provKey,setProvKey] = useState(()=>localStorage.getItem('ai_provider')||'claude-sonnet');
  const [isMobile,setIsMobile] = useState(window.innerWidth<=900);
  useEffect(()=>{ const h=()=>setIsMobile(window.innerWidth<=900); window.addEventListener('resize',h); return ()=>window.removeEventListener('resize',h); },[]);

  useEffect(()=>{ localStorage.setItem('ai_provider',provKey); },[provKey]);

  const doAnalyze = async (id, file, b64, mime) => {
    setSlips(p=>p.map(s=>s.id===id?{...s,status:'analyzing'}:s));
    try {
      // Use pre-read b64 if available (mobile), otherwise read from file
      const txs = b64
        ? await analyzeImageFromB64(provKey, b64, mime||'image/jpeg')
        : await analyzeImage(provKey, file);
      setSlips(p=>p.map(s=>s.id===id?{...s,status:'done',transactions:txs}:s));
    }
    catch(err){ setSlips(p=>p.map(s=>s.id===id?{...s,status:'error',error:err.message}:s)); }
  };

  const onDrop = useCallback(async (files)=>{
    const ns = await Promise.all(files.map(async f => {
      // Read file immediately before any async gap (mobile security requirement)
      const b64 = await new Promise((res,rej)=>{
        const rd=new FileReader();
        rd.onload=()=>res(rd.result.split(',')[1]);
        rd.onerror=(e)=>rej(new Error('File read failed: ' + (e?.target?.error?.message||'unknown')));
        rd.readAsDataURL(f);
      });
      return {
        id: Math.random().toString(36).slice(2),
        file: f,
        b64,           // store base64 immediately
        mime: f.type||'image/jpeg',
        preview: URL.createObjectURL(f),
        status: 'pending',
        transactions: [],
        error: null,
        saving: false,
        saved: false,
      };
    }));
    setSlips(p=>{ setCurrent(p.length); return [...p,...ns]; });
    // Stagger analysis to avoid API rate limits
    // Gemini free = 15 RPM (4000ms gap), Claude Tier1 = 50 RPM (1200ms gap)
    const delay = provKey.startsWith('gemini') ? 6000 : 2500;
    ns.forEach((s, i) => {
      setTimeout(() => doAnalyze(s.id, s.file, s.b64, s.mime), i * delay);
    });
  },[provKey]);

  const {getRootProps,getInputProps,isDragActive}=useDropzone({onDrop,accept:{'image/*':[]},multiple:true});

  const handleChange=(sid,ti,f,v)=>setSlips(p=>p.map(s=>s.id!==sid?s:{...s,transactions:s.transactions.map((tx,i)=>i===ti?{...tx,[f]:v}:tx)}));

  const handleRetry=(sid)=>{
    const slip=slips.find(s=>s.id===sid); if(!slip) return;
    setSlips(p=>p.map(s=>s.id===sid?{...s,status:'pending',error:null}:s));
    setTimeout(()=>doAnalyze(sid, slip.file, slip.b64, slip.mime), 100);
  };

  const handleSave=async(sid, itemIndex)=>{
    const slip=slips.find(s=>s.id===sid); if(!slip) return;
    const isFirst = itemIndex===0 || itemIndex===undefined;
    setSlips(p=>p.map(s=>s.id===sid?{...s,saving:itemIndex}:s));
    try {
      const b64 = slip.b64 || await new Promise((res,rej)=>{const rd=new FileReader();rd.onload=()=>res(rd.result.split(',')[1]);rd.onerror=()=>rej(new Error('File read failed'));rd.readAsDataURL(slip.file);});
      const mime = slip.mime || slip.file?.type || 'image/jpeg';

      if (itemIndex !== undefined) {
        // Save single item
        const tx = {...slip.transactions[itemIndex]};
        if(tx.TYPE?.endsWith('?')) tx.TYPE=tx.TYPE.slice(0,-1).trim();
        // Strip ? from other fields in case AI misbehaves
        if(tx.ACCOUNT?.endsWith('?')) tx.ACCOUNT=tx.ACCOUNT.slice(0,-1).trim();
        if(tx.DATE?.endsWith('?')) tx.DATE=tx.DATE.slice(0,-1).trim();

        // If slip already has a receiptUrl from a previous save, reuse it
        // Otherwise upload image (first save of this slip)
        const alreadySavedOne = slip.transactions.some((t,i) => i!==itemIndex && t._saved);
        let receiptUrl = slip.receiptUrl || null;

        if (!alreadySavedOne && !receiptUrl) {
          // First item saved — upload image, get URL back
          const res = await saveTransaction(tx, b64, mime);
          receiptUrl = res?.RECEIPT || '';
          // Store receiptUrl on slip so next items reuse it
          setSlips(p=>p.map(s=>s.id===sid?{...s,receiptUrl}:s));
        } else {
          // Reuse existing receipt URL for all subsequent items
          tx.RECEIPT = receiptUrl || '';
          await saveTransaction(tx, null, null);
        }

        // Mark this item as saved
        const updatedTxs = slip.transactions.map((t,i) => i===itemIndex ? {...t, _saved:true, _fromCurrentSession:true, RECEIPT: receiptUrl||''} : t);
        const allSaved = updatedTxs.every(t => t._saved);
        setSlips(p=>p.map(s=>s.id===sid?{...s,saving:false,transactions:updatedTxs,saved:allSaved,status:allSaved?'saved':s.status}:s));
      } else {
        // Save all
        for(let i=0;i<slip.transactions.length;i++){
          const tx={...slip.transactions[i]};
          if(tx.TYPE?.endsWith('?')) tx.TYPE=tx.TYPE.slice(0,-1).trim();
          if(tx.ACCOUNT?.endsWith('?')) tx.ACCOUNT=tx.ACCOUNT.slice(0,-1).trim();
          if(tx.DATE?.endsWith('?')) tx.DATE=tx.DATE.slice(0,-1).trim();
          await saveTransaction(tx,i===0?b64:null,i===0?mime:null);
        }
        setSlips(p=>p.map(s=>s.id===sid?{...s,saving:false,saved:true,status:'saved'}:s));
      }
    } catch(err){ setSlips(p=>p.map(s=>s.id===sid?{...s,saving:false,error:err.message,status:'error'}:s)); }
  };

  const cur=slips[current];
  const navBtn={width:32,height:32,borderRadius:8,border:`1px solid ${C.border}`,background:'#fff',cursor:'pointer',fontSize:16,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',color:C.teal,padding:0};

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text}}>Upload Slip</h1>
          <p style={{margin:'2px 0 0',fontSize:13,color:C.sub}}>Upload e-slips and let AI extract transaction details</p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:12,color:C.sub,fontWeight:600}}>AI:</span>
          <select value={provKey} onChange={e=>setProvKey(e.target.value)}
            style={{fontSize:12,padding:'5px 12px',borderRadius:20,border:`1px solid ${C.border}`,background:C.muted,color:C.teal,fontWeight:700,cursor:'pointer',outline:'none'}}>
            {Object.entries(PROVIDERS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Navigator */}
      {slips.length>0 && (
        <div style={{display:'flex',alignItems:'center',gap:8,background:C.muted,borderRadius:12,padding:'10px 16px',border:`1px solid ${C.border}`,flexWrap:'wrap'}}>
          <button onClick={()=>setCurrent(c=>Math.max(0,c-1))} disabled={current===0} style={{...navBtn,opacity:current===0?.3:1}}>←</button>
          <div style={{display:'flex',gap:6,flex:1,flexWrap:'wrap'}}>
            {slips.map((s,i)=>{
              const st=ST[s.status];
              return <button key={s.id} onClick={()=>setCurrent(i)}
                style={{padding:'4px 10px',borderRadius:20,border:'none',background:i===current?st.color:'#e2f8f5',color:i===current?'#fff':C.sub,fontSize:12,fontWeight:600,cursor:'pointer',transition:'all .15s',outline:i===current?`2px solid ${st.color}`:'none',outlineOffset:1}}>
                {st.icon} {i+1}
              </button>;
            })}
          </div>
          <button onClick={()=>setCurrent(c=>Math.min(slips.length-1,c+1))} disabled={current===slips.length-1} style={{...navBtn,opacity:current===slips.length-1?.3:1}}>→</button>
          <span style={{fontSize:12,color:C.sub,marginLeft:4}}>{current+1}/{slips.length}</span>
        </div>
      )}

      {/* Main */}
      {slips.length===0 ? (
        <div {...getRootProps()} style={{border:`2px dashed ${isDragActive?C.teal:C.border}`,borderRadius:16,padding:64,textAlign:'center',cursor:'pointer',background:isDragActive?C.muted:'#fff',transition:'all .2s'}}>
          <input {...getInputProps()}/>
          <div style={{fontSize:56}}>📎</div>
          <p style={{margin:'12px 0 4px',fontWeight:700,color:C.text,fontSize:16}}>{isDragActive?'Drop slips here...':'Drag & drop your e-slips here'}</p>
          <p style={{margin:0,color:C.sub,fontSize:13}}>or <strong style={{color:C.teal}}>click to browse</strong> — supports multiple files</p>
          <p style={{margin:'8px 0 0',fontSize:12,color:'#aaa'}}>JPG · PNG · WEBP</p>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:16,minHeight:isMobile?'auto':600,alignItems:'start'}}>
          {/* Image preview */}
          {cur && (
            <div style={{position:isMobile?'relative':'sticky',top:isMobile?'auto':16}}>
              <div style={{background:'#fff',borderRadius:14,overflow:'hidden',border:`1px solid ${C.border}`,boxShadow:'0 2px 12px rgba(13,148,136,0.08)'}}>
                {cur.b64
                  ? <img src={`data:${cur.mime||'image/jpeg'};base64,${cur.b64}`} alt="slip" style={{width:'100%',display:'block',maxHeight:isMobile?'50vh':'80vh',objectFit:'contain',background:'#f8f8f8'}}/>
                  : cur.preview
                    ? <img src={cur.preview} alt="slip" style={{width:'100%',display:'block',maxHeight:isMobile?'50vh':'80vh',objectFit:'contain',background:'#f8f8f8'}}/>
                    : <div style={{height:200,display:'flex',alignItems:'center',justifyContent:'center',color:C.sub,fontSize:48}}>🧾</div>
                }
              </div>
              <div style={{textAlign:'center',marginTop:10,fontSize:13,color:ST[cur.status].color,fontWeight:600}}>
                {ST[cur.status].icon} {ST[cur.status].label}
                {cur.status==='done'&&cur.transactions.length>1&&` — ${cur.transactions.length} items`}
              </div>
            </div>
          )}
          {/* Form */}
          <div style={{background:'#fff',borderRadius:14,padding:20,border:`1px solid ${C.border}`,boxShadow:'0 2px 12px rgba(13,148,136,0.08)',minHeight:400}}>
            {cur && <SlipForm slip={cur} onChange={(ti,f,v)=>handleChange(cur.id,ti,f,v)} onSave={(i)=>handleSave(cur.id,i)} onRetry={()=>handleRetry(cur.id)}/>}
          </div>
        </div>
      )}

      {slips.length>0 && (
        <div {...getRootProps()} style={{border:`2px dashed ${isDragActive?C.teal:C.border}`,borderRadius:12,padding:'16px 24px',textAlign:'center',cursor:'pointer',background:isDragActive?C.muted:'#fff',fontSize:13,color:C.sub,transition:'all .2s'}}>
          <input {...getInputProps()}/>
          {isDragActive?'📎 Drop to add more slips...':'➕ Drop more slips or click to add'}
        </div>
      )}
    </div>
  );
}