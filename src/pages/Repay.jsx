import React, { useState, useEffect } from 'react';
import { getAll } from '../services/transactionService';

const C = { teal:'#0d9488', muted:'#f0fdf4', border:'#d1fae5', text:'#134e4a', sub:'#6b7280' };
const card = { background:'#fff', borderRadius:16, padding:'20px 24px', boxShadow:'0 1px 8px rgba(13,148,136,0.08)', marginBottom:16 };
const inp = { width:'100%', padding:'9px 12px', borderRadius:8, border:`1.5px solid #d1fae5`, fontSize:13, outline:'none', background:'#fff', boxSizing:'border-box', fontFamily:'inherit', color:'#134e4a' };
const SC = { pending:'#f59e0b', partial:'#3b82f6', repaid:'#16a34a' };
const SL = { pending:'⏳ Pending', partial:'🔄 Partial', repaid:'✅ Repaid' };

function RepayCard({ tx, status, repaidAmt, onMarkRepaid }) {
  const [inputAmt, setInputAmt] = useState(String(Number(tx.EXPENSE)||0));
  const expense = Number(tx.EXPENSE)||0;
  return (
    <div style={card}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:12}}>
        <div>
          <div style={{fontWeight:700,fontSize:15,color:C.text}}>{tx.DESCRIPTION}</div>
          <div style={{fontSize:12,color:C.sub,marginTop:2}}>📅 {tx.DATE} · 🏦 {tx.ACCOUNT}</div>
          {tx.PAYEE_PAYER&&<div style={{fontSize:12,color:C.sub}}>👤 {tx.PAYEE_PAYER}</div>}
          {tx.TYPE&&<div style={{fontSize:12,color:C.teal,marginTop:2}}>📂 {tx.TYPE}</div>}
          {tx.NOTE&&<div style={{fontSize:12,color:C.sub}}>📝 {tx.NOTE}</div>}
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:20,fontWeight:800,color:'#ef4444'}}>฿{expense.toLocaleString()}</div>
          <span style={{fontSize:12,padding:'3px 10px',borderRadius:20,background:`${SC[status]}22`,color:SC[status],fontWeight:600}}>{SL[status]}</span>
        </div>
      </div>
      {repaidAmt>0&&<div style={{background:C.muted,borderRadius:8,padding:'8px 12px',fontSize:13,color:'#16a34a',marginBottom:12,border:`1px solid ${C.border}`}}>✅ Repaid: ฿{repaidAmt.toLocaleString()}{repaidAmt<expense&&` (฿${(expense-repaidAmt).toLocaleString()} remaining)`}</div>}
      {status!=='repaid'&&(
        <div style={{display:'flex',gap:8}}>
          <input type="number" value={inputAmt} onChange={e=>setInputAmt(e.target.value)} style={{...inp,flex:1}} placeholder="Amount repaid"/>
          <button onClick={()=>onMarkRepaid(tx,inputAmt)} style={{padding:'8px 16px',borderRadius:8,border:'none',background:'#16a34a',color:'#fff',fontWeight:700,cursor:'pointer',fontSize:13}}>✅ Mark Repaid</button>
        </div>
      )}
    </div>
  );
}

export default function Repay() {
  const [transactions,setTransactions]=useState([]);
  const [repayItems,setRepayItems]=useState([]);
  const [filterStatus,setFilterStatus]=useState('pending');

  useEffect(()=>{
    setTransactions(getAll());
    setRepayItems(JSON.parse(localStorage.getItem('repayItems')||'[]'));
  },[]);

  const repayable=transactions.filter(tx=>tx.REPAY===true||tx.REPAY==='true');
  const getStatus=(id)=>repayItems.find(r=>r.txId===id)?.status||'pending';
  const getRepaid=(id)=>Number(repayItems.find(r=>r.txId===id)?.repaidAmount||0);

  const handleMarkRepaid=(tx,amount)=>{
    const ex=repayItems.find(r=>r.txId===tx.ID);
    const u=ex?repayItems.map(r=>r.txId===tx.ID?{...r,repaidAmount:amount,status:Number(amount)>=Number(tx.EXPENSE)?'repaid':'partial'}:r)
      :[...repayItems,{txId:tx.ID,repaidAmount:amount,status:Number(amount)>=Number(tx.EXPENSE)?'repaid':'partial',repaidDate:new Date().toLocaleDateString('th-TH')}];
    setRepayItems(u); localStorage.setItem('repayItems',JSON.stringify(u));
  };

  const filtered=filterStatus==='all'?repayable:repayable.filter(tx=>getStatus(tx.ID)===filterStatus);
  const totalRepayable=repayable.reduce((s,tx)=>s+(Number(tx.EXPENSE)||0),0);
  const totalRepaid=repayable.reduce((s,tx)=>s+getRepaid(tx.ID),0);

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text}}>Repay Tracker</h1>
        <p style={{margin:'2px 0 0',fontSize:13,color:C.sub}}>Track expenses that can be reimbursed or claimed back</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:24}}>
        {[['Items',repayable.length,C.teal],['Repayable',`฿${totalRepayable.toLocaleString()}`,'#f59e0b'],['Repaid',`฿${totalRepaid.toLocaleString()}`,'#16a34a'],['Pending',`฿${(totalRepayable-totalRepaid).toLocaleString()}`,totalRepayable-totalRepaid>0?'#f59e0b':'#16a34a']].map(([l,v,c])=>(
          <div key={l} style={{background:'#fff',borderRadius:14,padding:'16px 18px',boxShadow:'0 1px 8px rgba(13,148,136,0.07)',borderTop:`3px solid ${c}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.sub,textTransform:'uppercase',letterSpacing:.5,marginBottom:4}}>{l}</div>
            <div style={{fontSize:22,fontWeight:800,color:c}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:10,marginBottom:24,flexWrap:'wrap'}}>
        {['all','pending','partial','repaid'].map(s=>(
          <button key={s} onClick={()=>setFilterStatus(s)}
            style={{padding:'8px 16px',borderRadius:10,border:`1.5px solid ${filterStatus===s?C.teal:C.border}`,background:filterStatus===s?C.teal:C.muted,color:filterStatus===s?'#fff':C.sub,fontWeight:600,fontSize:13,cursor:'pointer',transition:'all .2s'}}>
            {s==='all'?'📋 All':SL[s]}
          </button>
        ))}
      </div>
      {repayable.length===0?(
        <div style={{...card,textAlign:'center',padding:48,color:C.sub}}>
          <div style={{fontSize:48}}>📋</div><p style={{marginTop:12}}>No repayable transactions found.<br/>Mark transactions as "Repayable" when recording.</p>
        </div>
      ):filtered.length===0?(
        <div style={{...card,textAlign:'center',padding:48,color:C.sub}}>
          <div style={{fontSize:48}}>✅</div><p style={{marginTop:12}}>No {filterStatus} items!</p>
        </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {filtered.map(tx=><RepayCard key={tx.ID} tx={tx} status={getStatus(tx.ID)} repaidAmt={getRepaid(tx.ID)} onMarkRepaid={handleMarkRepaid}/>)}
        </div>
      )}
    </div>
  );
}