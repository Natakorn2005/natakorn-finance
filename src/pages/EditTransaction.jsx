import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ACCOUNTS, TYPES } from '../constants';
import { updateTransaction, deleteTransaction } from '../services/transactionService';

const C = { teal:'#0d9488', muted:'#f0fdf4', border:'#d1fae5', text:'#134e4a', sub:'#6b7280' };
const card = { background:'#fff', borderRadius:16, padding:'20px 24px', boxShadow:'0 1px 8px rgba(13,148,136,0.08)' };
const inp = { width:'100%', padding:'9px 12px', borderRadius:8, border:`1.5px solid #d1fae5`, fontSize:13, outline:'none', background:'#fff', boxSizing:'border-box', fontFamily:'inherit', color:'#134e4a' };
const lbl = { fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:5 };

export default function EditTransaction() {
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [mode, setMode] = useState('EXPENSE');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [originalUID, setOriginalUID] = useState(null);
  const [originalID, setOriginalID] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('editTransaction');
    if (!stored) { navigate('/transactions'); return; }
    const tx = JSON.parse(stored);
    setOriginalUID(tx.UID); setOriginalID(tx.ID);
    let dm = 'EXPENSE';
    if (Number(tx.INCOME)>0) dm='INCOME';
    else if (Number(tx.TRANSFER)>0) dm='TRANSFER';
    setMode(dm);
    let d=tx.DATE||''; if(d.includes('/')){const p=d.split('/');d=`${p[2]}-${p[1]}-${p[0]}`;}
    let t=tx.TIME||''; if(t.length>5) t=t.substring(0,5);
    setForm({ date:d, time:t, amount:Number(tx.INCOME)||Number(tx.EXPENSE)||Number(tx.TRANSFER)||0,
      account:tx.ACCOUNT||'เงินสด', destAccount:tx.DESTINATION_ACCOUNT||'KMA (บัญชีเล็ก)',
      category:tx.TYPE||TYPES[0], description:tx.DESCRIPTION||'', payee:tx.PAYEE_PAYER||'',
      reimburse:tx.REIMBURSE||false, repay:tx.REPAY||false, payBack:tx.PAY_BACK||false,
      note:tx.NOTE||'', receipt:tx.RECEIPT||'', claimedFrom:tx.CLAIMED_FROM||'' });
  }, [navigate]);

  const hc = (f,v) => setForm(p=>({...p,[f]:v}));

  const handleSave = async () => {
    if (!form.amount||!form.date||!form.time) { alert('Fill in date, time and amount.'); return; }
    setSaving(true);
    const [y,m,d]=form.date.split('-');
    const amt=parseFloat(form.amount);
    const tx={ UID:originalUID, ACCOUNT:form.account,
      DATE:`${d}/${m}/${y}`, TIME:form.time.length===5?form.time+':00':form.time,
      DESCRIPTION:form.description||'-',
      TYPE:mode==='TRANSFER'?'การโอนย้ายเงิน : ถอนเงิน / โอนเงิน':form.category,
      REIMBURSE:form.reimburse, REPAY:form.repay, PAY_BACK:form.payBack,
      PAYEE_PAYER:form.payee||'', INCOME:mode==='INCOME'?amt:0,
      EXPENSE:mode==='EXPENSE'?amt:0, TRANSFER:mode==='TRANSFER'?amt:0,
      DESTINATION_ACCOUNT:mode==='TRANSFER'?form.destAccount:'',
      NOTE:form.note||'', RECEIPT:form.receipt||'', CLAIMED_FROM:form.claimedFrom||'' };
    try {
      let b64=null,mime=null;
      if(imageFile){ b64=await new Promise(res=>{const rd=new FileReader();rd.onload=()=>res(rd.result.split(',')[1]);rd.readAsDataURL(imageFile);}); mime=imageFile.type; }
      await updateTransaction(tx,b64,mime);
      localStorage.removeItem('editTransaction'); setSaved(true);
    } catch(err){ alert('Error: '+err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this transaction?')) return;
    setSaving(true);
    try { await deleteTransaction(originalUID); localStorage.removeItem('editTransaction'); navigate('/transactions'); }
    catch(err){ alert('Error: '+err.message); }
    finally { setSaving(false); }
  };

  const mc = mode==='INCOME'?'#16a34a':mode==='TRANSFER'?'#3b82f6':'#ef4444';

  if (saved) return (
    <div>
      <div style={{marginBottom:24}}><h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text}}>Edit Transaction</h1></div>
      <div style={{maxWidth:480,margin:'0 auto'}}>
        <div style={{...card,textAlign:'center',padding:48}}>
          <div style={{fontSize:56,marginBottom:8}}>✅</div>
          <div style={{fontSize:20,fontWeight:700,color:'#16a34a',marginBottom:4}}>Updated Successfully</div>
          <div style={{fontSize:13,color:C.sub,marginBottom:24}}>Transaction has been saved</div>
          <div style={{display:'flex',gap:12}}>
            <button onClick={()=>navigate('/transactions')} style={{flex:1,padding:14,borderRadius:10,border:`1px solid ${C.border}`,background:C.muted,color:C.teal,fontWeight:700,cursor:'pointer',fontSize:13}}>← Transactions</button>
            <button onClick={()=>navigate('/')} style={{flex:1,padding:14,borderRadius:10,border:'none',background:C.teal,color:'#fff',fontWeight:700,cursor:'pointer',fontSize:13}}>📊 Dashboard</button>
          </div>
        </div>
      </div>
    </div>
  );

  if (!form) return <div style={{textAlign:'center',padding:48,color:C.sub}}>Loading...</div>;

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text}}>Edit Transaction</h1>
        <p style={{margin:'2px 0 0',fontSize:13,color:C.sub}}>Editing <strong style={{color:C.teal}}>{originalID}</strong></p>
      </div>
      <div style={{maxWidth:560,margin:'0 auto'}}>
        <button onClick={()=>{localStorage.removeItem('editTransaction');navigate('/transactions');}}
          style={{marginBottom:20,padding:'8px 16px',borderRadius:9,border:`1px solid ${C.border}`,background:C.muted,color:C.teal,fontWeight:700,fontSize:13,cursor:'pointer'}}>← Back</button>
        {/* Mode switcher */}
        <div style={{display:'flex',gap:10,marginBottom:24}}>
          {['EXPENSE','TRANSFER','INCOME'].map(m=>{
            const mc2=m==='INCOME'?'#16a34a':m==='TRANSFER'?'#3b82f6':'#ef4444';
            return <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:'12px 0',borderRadius:10,border:`2px solid ${mode===m?mc2:C.border}`,background:mode===m?mc2:C.muted,color:mode===m?'#fff':C.sub,fontWeight:700,fontSize:13,cursor:'pointer',transition:'all .2s'}}>
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
            <input type="number" value={form.amount} onChange={e=>hc('amount',e.target.value)} style={{...inp,color:mc,fontSize:16,fontWeight:700}}/>
          </div>
          <div style={{marginBottom:16}}><label style={lbl}>{mode==='TRANSFER'?'Source Account':mode==='INCOME'?'Receiving Account':'Account'}</label>
            <select value={form.account} onChange={e=>hc('account',e.target.value)} style={inp}>{ACCOUNTS.map(a=><option key={a}>{a}</option>)}</select>
          </div>
          {mode==='TRANSFER'&&<div style={{marginBottom:16}}><label style={lbl}>Destination Account</label>
            <select value={form.destAccount} onChange={e=>hc('destAccount',e.target.value)} style={inp}>{ACCOUNTS.map(a=><option key={a}>{a}</option>)}</select>
          </div>}
          {mode!=='TRANSFER'&&<div style={{marginBottom:16}}><label style={lbl}>Category</label>
            <select value={form.category} onChange={e=>hc('category',e.target.value)} style={inp}>{TYPES.map(t=><option key={t}>{t}</option>)}</select>
          </div>}
          {(form.repay === true || form.repay === 'true') && (
            <div style={{marginBottom:16}}>
              <label style={lbl}>Claimed From (org/company)</label>
              <input type="text" value={form.claimedFrom||''} onChange={e=>hc('claimedFrom',e.target.value)}
                placeholder="e.g. Mahidol University" style={inp}/>
            </div>
          )}
          {[['description','Description'],['payee','Payee / Payer'],['note','Note'],['receipt','Receipt URL']].map(([f,l])=>(
            <div key={f} style={{marginBottom:16}}><label style={lbl}>{l}</label>
              <input type="text" value={form[f]} onChange={e=>hc(f,e.target.value)} style={{...inp,color:f==='receipt'&&form.receipt?'#16a34a':undefined}}/>
              {f==='receipt'&&form.receipt&&<a href={form.receipt} target="_blank" rel="noreferrer" style={{fontSize:12,color:C.teal,marginTop:4,display:'inline-block'}}>🔗 View receipt</a>}
            </div>
          ))}
          {/* Image */}
          <div style={{marginBottom:16}}><label style={lbl}>Replace Image (optional)</label>
            <label style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:10,border:`2px dashed ${C.border}`,background:C.muted,cursor:'pointer',fontSize:13}}>
              <span style={{fontSize:20}}>📎</span><span style={{color:C.teal,fontWeight:600}}>{imageFile?imageFile.name:'คลิกเพื่อเลือกรูปใหม่'}</span>
              <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(!f)return;setImageFile(f);setImagePreview(URL.createObjectURL(f));hc('receipt','');}}/>
            </label>
            {imagePreview&&<div style={{marginTop:8}}><img src={imagePreview} alt="preview" style={{maxWidth:'100%',maxHeight:160,borderRadius:8,border:`1px solid ${C.border}`}}/><button onClick={()=>{setImageFile(null);setImagePreview(null);}} style={{display:'block',marginTop:4,fontSize:11,color:'#ef4444',background:'none',border:'none',cursor:'pointer',padding:0}}>✕ ยกเลิกรูปใหม่</button></div>}
          </div>
          {(mode==='EXPENSE'||mode==='INCOME')&&(
            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:20}}>
              <div style={{fontSize:11,fontWeight:700,color:C.sub,letterSpacing:.5,marginBottom:4}}>FLAGS (เลือกได้มากกว่า 1)</div>
              {(mode==='INCOME' ? [
                  ['reimburse','👥 เพื่อนคืนเงิน — เพื่อนจ่ายคืนที่ค้างอยู่'],
                  ['repay','🏢 ได้รับเงินคืน — org/พ่อแม่โอนคืนให้'],
                  ['payBack','💸 ยืมเงิน — เงินที่ยืมมา จะต้องคืน'],
                ] : [
                  ['reimburse','👥 ฉันจ่ายแทนเพื่อน — เพื่อนจะคืนให้ฉัน'],
                  ['repay','🏢 เบิกได้ — จะได้รับคืนจาก org/พ่อแม่'],
                  ['payBack','💸 กำลังคืนหนี้ — จ่ายคืนเงินที่ยืมมา'],
                ]).map(([f,l]) => (
                  <label key={f} style={{display:'flex',alignItems:'center',gap:10,fontSize:14,cursor:'pointer',color:(form[f]||false)?C.teal:C.sub,fontWeight:(form[f]||false)?700:400}}>
                    <input type="checkbox" checked={form[f]||false}
                      onChange={e=>setForm(p=>({...p,[f]:e.target.checked}))}
                      style={{width:16,height:16}}/>{l}
                  </label>
                ))}
            </div>
          )}
          <div style={{display:'flex',gap:12,marginTop:8}}>
            <button onClick={handleDelete} disabled={saving}
              style={{padding:'12px 18px',borderRadius:10,border:'none',background:'#fef2f2',color:'#ef4444',fontWeight:700,fontSize:14,cursor:'pointer'}}>🗑️ Delete</button>
            <button onClick={handleSave} disabled={saving}
              style={{flex:1,padding:14,fontSize:15,fontWeight:700,border:'none',borderRadius:10,background:`linear-gradient(135deg,${mc},${mc}cc)`,color:'#fff',cursor:saving?'default':'pointer',opacity:saving?.7:1}}>
              {saving?'⏳ Saving...':'💾 Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}