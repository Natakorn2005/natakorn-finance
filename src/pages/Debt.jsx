import React, { useState, useEffect } from 'react';
import { ACCOUNTS } from '../constants';

const C = { teal:'#0d9488', muted:'#f0fdf4', border:'#d1fae5', text:'#134e4a', sub:'#6b7280' };
const card = { background:'#fff', borderRadius:16, padding:'20px 24px', boxShadow:'0 1px 8px rgba(13,148,136,0.08)', marginBottom:16 };
const inp = { width:'100%', padding:'9px 12px', borderRadius:8, border:`1.5px solid #d1fae5`, fontSize:13, outline:'none', background:'#fff', boxSizing:'border-box', fontFamily:'inherit', color:'#134e4a' };
const lbl = { fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:5 };
const DEBT_TYPES = ['Credit Card','Personal Loan','Student Loan','Car Loan','Mortgage','Friend / Family','Other'];

function DebtCard({ debt, onEdit, onDelete, onPayment }) {
  const [payAmt, setPayAmt] = useState('');
  const total=Number(debt.total)||0; const paid=Number(debt.paid)||0; const remaining=total-paid;
  const pct=total>0?Math.min((paid/total)*100,100):0;
  let daysLeft=null; if(debt.dueDate) daysLeft=Math.ceil((new Date(debt.dueDate)-new Date())/(1000*60*60*24));

  return (
    <div style={card}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:12}}>
        <div>
          <div style={{fontWeight:700,fontSize:16,color:C.text}}>{debt.name}</div>
          <div style={{display:'flex',gap:6,marginTop:4,flexWrap:'wrap'}}>
            <span style={{fontSize:12,background:'#fef2f2',color:'#ef4444',padding:'2px 8px',borderRadius:20}}>{debt.type}</span>
            {debt.account&&<span style={{fontSize:12,background:C.muted,color:C.teal,padding:'2px 8px',borderRadius:20,border:`1px solid ${C.border}`}}>{debt.account}</span>}
          </div>
          {debt.creditor&&<div style={{fontSize:12,color:C.sub,marginTop:4}}>👤 {debt.creditor}</div>}
          {debt.dueDate&&<div style={{fontSize:12,marginTop:4,color:daysLeft!==null&&daysLeft<30?'#ef4444':C.sub}}>📅 {debt.dueDate}{daysLeft!==null&&<span style={{marginLeft:6}}>{daysLeft<0?'⚠️ Overdue!':`(${daysLeft} days left)`}</span>}</div>}
          {debt.interestRate&&Number(debt.interestRate)>0&&<div style={{fontSize:12,color:'#f59e0b',marginTop:2}}>📈 {debt.interestRate}% interest</div>}
          {debt.note&&<div style={{fontSize:12,color:C.sub,marginTop:2}}>📝 {debt.note}</div>}
        </div>
        <div style={{display:'flex',gap:6}}>
          <button onClick={()=>onEdit(debt)} style={{padding:'5px 10px',borderRadius:7,border:`1px solid ${C.border}`,background:C.muted,color:C.teal,fontSize:12,cursor:'pointer',fontWeight:600}}>✏️</button>
          <button onClick={()=>onDelete(debt.id)} style={{padding:'5px 10px',borderRadius:7,border:'none',background:'#fef2f2',color:'#ef4444',fontSize:12,cursor:'pointer',fontWeight:600}}>🗑️</button>
        </div>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
        {[['Total',`฿${total.toLocaleString()}`,'#ef4444'],['Paid',`฿${paid.toLocaleString()}`,'#16a34a'],['Remaining',`฿${remaining.toLocaleString()}`,remaining>0?'#ef4444':'#16a34a']].map(([l,v,c])=>(
          <div key={l} style={{textAlign:'center'}}>
            <div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div>
            <div style={{fontSize:11,color:C.sub}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{height:8,borderRadius:4,background:C.border,overflow:'hidden',marginBottom:6}}>
        <div style={{height:'100%',borderRadius:4,width:`${pct}%`,background:pct>=100?'#16a34a':pct>=50?C.teal:'#ef4444',transition:'width .4s'}}/>
      </div>
      <div style={{fontSize:12,color:C.sub,marginBottom:12}}>{pct>=100?'🎉 Fully Paid!':`${pct.toFixed(0)}% paid`}</div>
      {remaining>0&&(
        <div style={{display:'flex',gap:8}}>
          <input type="number" placeholder="Payment amount" value={payAmt} onChange={e=>setPayAmt(e.target.value)} style={{...inp,flex:1}}/>
          <button onClick={()=>{onPayment(debt.id,payAmt);setPayAmt('');}} style={{padding:'8px 16px',borderRadius:8,border:'none',background:'#16a34a',color:'#fff',fontWeight:700,cursor:'pointer',fontSize:13}}>💳 Pay</button>
        </div>
      )}
    </div>
  );
}

export default function Debt() {
  const [debts,setDebts]=useState([]);
  const [newDebt,setNewDebt]=useState({name:'',creditor:'',total:'',paid:'',dueDate:'',interestRate:'',account:'UOB (บัตรเครดิต)',note:'',type:'Credit Card'});
  const [editingId,setEditingId]=useState(null); const [editData,setEditData]=useState({});

  useEffect(()=>{ setDebts(JSON.parse(localStorage.getItem('debts')||'[]')); },[]);
  const save=(u)=>{ setDebts(u); localStorage.setItem('debts',JSON.stringify(u)); };
  const handleAdd=()=>{ if(!newDebt.name||!newDebt.total) return; save([...debts,{...newDebt,id:Date.now()}]); setNewDebt({name:'',creditor:'',total:'',paid:'',dueDate:'',interestRate:'',account:'UOB (บัตรเครดิต)',note:'',type:'Credit Card'}); };
  const totalDebt=debts.reduce((s,d)=>s+(Number(d.total)||0),0);
  const totalPaid=debts.reduce((s,d)=>s+(Number(d.paid)||0),0);

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text}}>Debt Tracker</h1>
        <p style={{margin:'2px 0 0',fontSize:13,color:C.sub}}>Track all your debts and repayment progress</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:24}}>
        {[['Debts',debts.length,C.teal],['Total Owed',`฿${totalDebt.toLocaleString()}`,'#ef4444'],['Total Paid',`฿${totalPaid.toLocaleString()}`,'#16a34a'],['Remaining',`฿${(totalDebt-totalPaid).toLocaleString()}`,(totalDebt-totalPaid)>0?'#ef4444':'#16a34a']].map(([l,v,c])=>(
          <div key={l} style={{background:'#fff',borderRadius:14,padding:'16px 18px',boxShadow:'0 1px 8px rgba(13,148,136,0.07)',borderTop:`3px solid ${c}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.sub,textTransform:'uppercase',letterSpacing:.5,marginBottom:4}}>{l}</div>
            <div style={{fontSize:22,fontWeight:800,color:c}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,alignItems:'start'}}>
        <div style={card}>
          <h3 style={{fontSize:15,margin:'0 0 16px',color:C.text,fontWeight:700}}>➕ Add New Debt</h3>
          {[['name','Debt Name','text','e.g. UOB Credit Card'],['creditor','Creditor','text','e.g. UOB Bank'],['total','Total Amount (฿)','number','50000'],['paid','Already Paid (฿)','number','0'],['interestRate','Interest Rate (%)','number','0'],['note','Note','text','']].map(([f,l,t,ph])=>(
            <div key={f} style={{marginBottom:14}}><label style={lbl}>{l}</label>
              <input type={t} placeholder={ph} value={newDebt[f]} onChange={e=>setNewDebt({...newDebt,[f]:e.target.value})} style={inp}/>
            </div>
          ))}
          <div style={{marginBottom:14}}><label style={lbl}>Type</label>
            <select value={newDebt.type} onChange={e=>setNewDebt({...newDebt,type:e.target.value})} style={inp}>{DEBT_TYPES.map(t=><option key={t}>{t}</option>)}</select>
          </div>
          <div style={{marginBottom:14}}><label style={lbl}>Account</label>
            <select value={newDebt.account} onChange={e=>setNewDebt({...newDebt,account:e.target.value})} style={inp}>{ACCOUNTS.map(a=><option key={a}>{a}</option>)}</select>
          </div>
          <div style={{marginBottom:20}}><label style={lbl}>Due Date</label><input type="date" value={newDebt.dueDate} onChange={e=>setNewDebt({...newDebt,dueDate:e.target.value})} style={inp}/></div>
          <button onClick={handleAdd} style={{width:'100%',padding:12,borderRadius:10,border:'none',background:C.teal,color:'#fff',fontWeight:700,fontSize:14,cursor:'pointer'}}>➕ Add Debt</button>
        </div>
        <div>
          {debts.length===0?(
            <div style={{...card,textAlign:'center',padding:48,color:C.sub}}>
              <div style={{fontSize:48}}>💳</div><p style={{marginTop:12}}>No debts recorded.<br/>Great job staying debt-free! 🎉</p>
            </div>
          ):debts.map(debt=>editingId===debt.id?(
            <div key={debt.id} style={card}>
              <h4 style={{fontSize:14,color:C.teal,marginBottom:12}}>✏️ Edit Debt</h4>
              {[['Debt Name','name','text'],['Creditor','creditor','text'],['Total (฿)','total','number'],['Paid (฿)','paid','number'],['Interest (%)','interestRate','number'],['Note','note','text']].map(([l,f,t])=>(
                <div key={f} style={{marginBottom:12}}><label style={lbl}>{l}</label><input type={t} value={editData[f]||''} onChange={e=>setEditData({...editData,[f]:e.target.value})} style={inp}/></div>
              ))}
              <div style={{marginBottom:12}}><label style={lbl}>Due Date</label><input type="date" value={editData.dueDate||''} onChange={e=>setEditData({...editData,dueDate:e.target.value})} style={inp}/></div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{save(debts.map(d=>d.id===editingId?editData:d));setEditingId(null);}} style={{padding:'9px 18px',borderRadius:9,border:'none',background:C.teal,color:'#fff',fontWeight:700,cursor:'pointer',fontSize:13}}>💾 Save</button>
                <button onClick={()=>setEditingId(null)} style={{padding:'9px 18px',borderRadius:9,border:`1px solid ${C.border}`,background:C.muted,color:C.sub,fontWeight:700,cursor:'pointer',fontSize:13}}>✕</button>
              </div>
            </div>
          ):(
            <DebtCard key={debt.id} debt={debt}
              onEdit={d=>{setEditingId(d.id);setEditData({...d});}}
              onDelete={id=>{if(!window.confirm('Delete?')) return;save(debts.filter(d=>d.id!==id));}}
              onPayment={(id,amt)=>save(debts.map(d=>d.id===id?{...d,paid:String((Number(d.paid)||0)+Number(amt))}:d))}/>
          ))}
        </div>
      </div>
    </div>
  );
}