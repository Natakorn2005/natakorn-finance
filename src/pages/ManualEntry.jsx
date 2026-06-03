import React, { useState, useEffect } from 'react';
import { ACCOUNTS, EXPENSE_TYPES, INCOME_TYPES, LS_SYNC_ON } from '../constants';
import { saveTransaction } from '../services/transactionService';

const C = { teal:'#0d9488', tealLight:'#2dd4bf', green:'#4ade80', muted:'#f0fdf4', border:'#d1fae5', text:'#134e4a', sub:'#6b7280' };
const card = { background:'#fff', borderRadius:16, padding:'20px 24px', boxShadow:'0 1px 8px rgba(13,148,136,0.08)', marginBottom:24 };
const inp = { width:'100%', padding:'9px 12px', borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:13, outline:'none', background:'#fff', boxSizing:'border-box', fontFamily:'inherit', color:C.text };
const lbl = { fontSize:11, fontWeight:700, color:C.sub, textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:5 };

const CATEGORIES = { EXPENSE: EXPENSE_TYPES, INCOME: INCOME_TYPES };

export default function ManualEntry() {
  const [mode, setMode] = useState('EXPENSE');
  const [form, setForm] = useState({ date:'', time:'', amount:'', account:'เงินสด', destAccount:'KMA (บัญชีเล็ก)', category:'', description:'', payee:'', reimburse:false, repay:false, payBack:false, note:'', receipt:'' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    const now = new Date();
    setForm(p => ({ ...p,
      date: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`,
      time: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
      category: EXPENSE_TYPES[0],
    }));
  }, []);

  useEffect(() => {
    if (mode !== 'TRANSFER') setForm(p => ({ ...p, category: (CATEGORIES[mode]||EXPENSE_TYPES)[0] }));
  }, [mode]);

  const hc = (f,v) => setForm(p => ({ ...p, [f]: v }));

  const handleSubmit = async () => {
    if (!form.amount || !form.date || !form.time) { alert('Please fill in date, time and amount.'); return; }
    setSaving(true);
    const amt = parseFloat(form.amount);
    const [y,m,d] = form.date.split('-');
    const tx = {
      ACCOUNT: form.account, DATE: `${d}/${m}/${y}`,
      TIME: form.time.length===5 ? form.time+':00' : form.time,
      DESCRIPTION: form.description || '-',
      TYPE: mode==='TRANSFER' ? 'การโอนย้ายเงิน : ถอนเงิน / โอนเงิน' : form.category,
      REIMBURSE: form.reimburse, REPAY: form.repay, PAY_BACK: form.payBack,
      PAYEE_PAYER: form.payee||'', INCOME: mode==='INCOME'?amt:0,
      EXPENSE: mode==='EXPENSE'?amt:0, TRANSFER: mode==='TRANSFER'?amt:0,
      DESTINATION_ACCOUNT: mode==='TRANSFER'?form.destAccount:'',
      NOTE: form.note||'', RECEIPT: form.receipt||'',
    };
    try {
      let b64=null, mime=null;
      if (imageFile) {
        b64 = await new Promise(res=>{const rd=new FileReader();rd.onload=()=>res(rd.result.split(',')[1]);rd.readAsDataURL(imageFile);});
        mime = imageFile.type;
      }
      const sv = await saveTransaction(tx, b64, mime);
      setReceipt(sv); setSaved(true);
    } catch(err) { alert('Error: '+err.message); }
    finally { setSaving(false); }
  };

  const handleReset = () => {
    setSaved(false); setReceipt(null); setImageFile(null); setImagePreview(null);
    const now = new Date();
    setForm({ date:`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`,
      time:`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
      amount:'', account:'เงินสด', destAccount:'KMA (บัญชีเล็ก)', category:EXPENSE_TYPES[0],
      description:'', payee:'', reimburse:false, repay:false, payBack:false, note:'', receipt:'' });
    setMode('EXPENSE');
  };

  const modeColor = mode==='INCOME'?'#16a34a':mode==='TRANSFER'?'#3b82f6':'#ef4444';
  const syncOn = localStorage.getItem(LS_SYNC_ON)==='1';

  if (saved && receipt) return (
    <div>
      <div style={{marginBottom:24}}><h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text}}>Manual Entry</h1></div>
      <div style={{maxWidth:480,margin:'0 auto'}}>
        <div style={{...card,textAlign:'center'}}>
          <div style={{fontSize:56,marginBottom:8}}>✅</div>
          <div style={{fontSize:20,fontWeight:700,color:'#16a34a',marginBottom:4}}>RECORDED SUCCESS</div>
          <div style={{fontSize:13,color:C.sub,marginBottom:4}}>Transaction saved successfully</div>
          {syncOn && <div style={{fontSize:12,color:C.teal,marginBottom:20}}>📊 Syncing to Google Sheets</div>}
          <div style={{borderTop:`2px dashed ${C.border}`,borderBottom:`2px dashed ${C.border}`,padding:'20px 0',margin:'0 0 20px',textAlign:'left'}}>
            {[['ID',receipt.ID],['Date & Time',`${receipt.DATE} @ ${receipt.TIME}`],['Account',receipt.ACCOUNT],
              receipt.DESTINATION_ACCOUNT?['Destination',receipt.DESTINATION_ACCOUNT]:null,
              ['Category',receipt.TYPE],['Description',receipt.DESCRIPTION],
              receipt.PAYEE_PAYER?['Payee',receipt.PAYEE_PAYER]:null].filter(Boolean).map(([l,v])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',marginBottom:10,fontSize:14}}>
                <span style={{color:C.sub}}>{l}</span><strong style={{color:C.text,maxWidth:'60%',textAlign:'right'}}>{v}</strong>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',marginTop:12,fontSize:18,fontWeight:700}}>
              <span>Amount</span><span style={{color:modeColor}}>฿{parseFloat(form.amount).toLocaleString(undefined,{minimumFractionDigits:2})}</span>
            </div>
          </div>
          <div style={{display:'flex',gap:12}}>
            <button onClick={handleReset} style={{flex:1,padding:14,borderRadius:10,border:`1px solid ${C.border}`,background:C.muted,color:C.teal,fontWeight:700,cursor:'pointer',fontSize:14}}>➕ New Entry</button>
            <button onClick={()=>window.location.href='/transactions'} style={{flex:1,padding:14,borderRadius:10,border:'none',background:C.teal,color:'#fff',fontWeight:700,cursor:'pointer',fontSize:14}}>📋 Transactions</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text}}>Manual Entry</h1>
        <p style={{margin:'2px 0 0',fontSize:13,color:C.sub}}>Record a transaction manually without a slip</p>
      </div>
      <div style={{maxWidth:560,margin:'0 auto'}}>
        {/* Mode switcher */}
        <div style={{display:'flex',gap:10,marginBottom:24}}>
          {['EXPENSE','TRANSFER','INCOME'].map(m=>{
            const mc=m==='INCOME'?'#16a34a':m==='TRANSFER'?'#3b82f6':'#ef4444';
            return <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:'12px 0',borderRadius:10,border:`2px solid ${mode===m?mc:C.border}`,background:mode===m?mc:C.muted,color:mode===m?'#fff':C.sub,fontWeight:700,fontSize:13,cursor:'pointer',transition:'all .2s'}}>
              {m==='EXPENSE'?'💸 Expense':m==='TRANSFER'?'🔄 Transfer':'💚 Income'}
            </button>;
          })}
        </div>
        <div style={card}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
            {[['date','Date','date'],['time','Time','time']].map(([f,l,t])=>(
              <div key={f}><label style={lbl}>{l}</label><input type={t} value={form[f]} onChange={e=>hc(f,e.target.value)} style={inp}/></div>
            ))}
          </div>
          <div style={{marginBottom:16}}><label style={lbl}>Amount (฿)</label>
            <input type="number" placeholder="0" value={form.amount} onChange={e=>hc('amount',e.target.value)} style={{...inp,color:modeColor,fontSize:16,fontWeight:700}}/>
          </div>
          <div style={{marginBottom:16}}><label style={lbl}>{mode==='TRANSFER'?'Source Account':mode==='INCOME'?'Receiving Account':'Account'}</label>
            <select value={form.account} onChange={e=>hc('account',e.target.value)} style={inp}>
              {ACCOUNTS.map(a=><option key={a}>{a}</option>)}
            </select>
          </div>
          {mode==='TRANSFER' && <div style={{marginBottom:16}}><label style={lbl}>Destination Account</label>
            <select value={form.destAccount} onChange={e=>hc('destAccount',e.target.value)} style={inp}>
              {ACCOUNTS.map(a=><option key={a}>{a}</option>)}
            </select>
          </div>}
          {mode!=='TRANSFER' && <div style={{marginBottom:16}}><label style={lbl}>Category</label>
            <select value={form.category} onChange={e=>hc('category',e.target.value)} style={inp}>
              {(CATEGORIES[mode]||[]).map(c=><option key={c}>{c}</option>)}
            </select>
          </div>}
          {[['description','Description','text'],['payee','Payee / Payer','text'],['note','Note','text']].map(([f,l,t])=>(
            <div key={f} style={{marginBottom:16}}><label style={lbl}>{l}</label>
              <input type={t} value={form[f]} onChange={e=>hc(f,e.target.value)} style={inp}/>
            </div>
          ))}
          {/* Image */}
          <div style={{marginBottom:16}}><label style={lbl}>Attach Image (optional)</label>
            <label style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:10,border:`2px dashed ${C.border}`,background:C.muted,cursor:'pointer',fontSize:13}}>
              <span style={{fontSize:20}}>📎</span>
              <span style={{color:C.teal,fontWeight:600}}>{imageFile?imageFile.name:'คลิกเพื่อเลือกรูปสลิป'}</span>
              <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(!f)return;setImageFile(f);setImagePreview(URL.createObjectURL(f));hc('receipt','');}}/>
            </label>
            {imagePreview && <div style={{marginTop:8}}>
              <img src={imagePreview} alt="preview" style={{maxWidth:'100%',maxHeight:160,borderRadius:8,border:`1px solid ${C.border}`}}/>
              <button onClick={()=>{setImageFile(null);setImagePreview(null);}} style={{display:'block',marginTop:4,fontSize:11,color:'#ef4444',background:'none',border:'none',cursor:'pointer',padding:0}}>✕ ลบรูป</button>
            </div>}
          </div>
          {mode==='EXPENSE' && (
            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:20}}>
              {[['reimburse','💰 Reimbursable (คืนเงิน)'],['repay','📋 Repayable (เบิกได้)'],['payBack','↩️ Pay Back']].map(([f,l])=>(
                <label key={f} style={{display:'flex',alignItems:'center',gap:10,fontSize:14,cursor:'pointer',color:C.sub}}>
                  <input type="checkbox" checked={form[f]} onChange={e=>hc(f,e.target.checked)} style={{width:16,height:16}}/>{l}
                </label>
              ))}
            </div>
          )}
          <button onClick={handleSubmit} disabled={saving}
            style={{width:'100%',padding:14,fontSize:15,fontWeight:700,border:'none',borderRadius:10,background:saving?C.border:`linear-gradient(135deg,${modeColor},${modeColor}cc)`,color:'#fff',cursor:saving?'default':'pointer',opacity:saving?.7:1}}>
            {saving?'⏳ Saving...':'💾 Save Transaction'}
          </button>
        </div>
      </div>
    </div>
  );
}