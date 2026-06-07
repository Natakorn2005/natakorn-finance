import React, { useState, useEffect } from 'react';
import { getAll, updateTransaction } from '../services/transactionService';

const C = { teal:'#0d9488', muted:'#f0fdf4', border:'#d1fae5', text:'#134e4a', sub:'#6b7280' };
const card = { background:'#fff', borderRadius:16, padding:'20px 24px', boxShadow:'0 1px 8px rgba(13,148,136,0.08)', marginBottom:16 };

function GroupCard({ g, flag, color, onSettle }) {
  const [expanded, setExpanded] = useState(false);
  const expenseTxs = g.transactions.filter(tx => Number(tx.EXPENSE) > 0);
  const incomeTxs  = g.transactions.filter(tx => Number(tx.INCOME)  > 0);
  const pendingTxs = expenseTxs.filter(tx => !tx.SETTLED);
  const totalPending = pendingTxs.reduce((s,tx)=>s+(Number(tx.EXPENSE)||0),0);
  const allSettled = expenseTxs.length > 0 && pendingTxs.length === 0;

  return (
    <div style={{ ...card, borderLeft:`3px solid ${allSettled?'#16a34a':color}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}
        onClick={()=>setExpanded(p=>!p)}>
        <div>
          <div style={{ fontWeight:700, fontSize:15, color:C.text }}>{g.key}</div>
          <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>
            {pendingTxs.length} pending · {expenseTxs.length-pendingTxs.length} settled
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:18, fontWeight:800, color:allSettled?'#16a34a':color }}>
            {allSettled ? '✅ All Settled' : `฿${totalPending.toLocaleString()} pending`}
          </div>
          <div style={{ fontSize:11, color:C.sub }}>{expanded?'▲ Hide':'▼ Show'} {g.transactions.length} records</div>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop:12, borderTop:`1px solid ${C.muted}`, paddingTop:8 }}>
          {/* Expense rows with checkbox */}
          {expenseTxs.map(tx => (
            <div key={tx.UID} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:`1px solid ${C.muted}`, opacity:tx.SETTLED?0.5:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <input type="checkbox" checked={tx.SETTLED===true||tx.SETTLED==='true'}
                  onChange={()=>onSettle(tx)}
                  style={{ width:17, height:17, cursor:'pointer', accentColor:C.teal }}/>
                <div>
                  <div style={{ fontSize:13, color:C.text, fontWeight:600, textDecoration:tx.SETTLED?'line-through':'none' }}>{tx.DESCRIPTION||'-'}</div>
                  <div style={{ fontSize:11, color:C.sub }}>
                    {tx.DATE} · {tx.PAYEE_PAYER||'-'}{tx.CLAIMED_FROM?` → ${tx.CLAIMED_FROM}`:''}
                  </div>
                </div>
              </div>
              <div style={{ fontWeight:700, fontSize:13, color:'#ef4444' }}>-฿{Number(tx.EXPENSE).toLocaleString()}</div>
            </div>
          ))}
          {/* Income rows — reference only */}
          {incomeTxs.length > 0 && (
            <>
              <div style={{ fontSize:11, color:C.sub, fontWeight:600, padding:'8px 0 4px', marginTop:4 }}>— Received —</div>
              {incomeTxs.map(tx => (
                <div key={tx.UID} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${C.muted}` }}>
                  <div>
                    <div style={{ fontSize:13, color:C.text, fontWeight:600 }}>{tx.DESCRIPTION||'-'}</div>
                    <div style={{ fontSize:11, color:C.sub }}>
                      {tx.DATE} · {tx.PAYEE_PAYER||'-'}{tx.CLAIMED_FROM?` → ${tx.CLAIMED_FROM}`:''}
                    </div>
                  </div>
                  <div style={{ fontWeight:700, fontSize:13, color:'#16a34a' }}>+฿{Number(tx.INCOME).toLocaleString()}</div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Repay() {
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab]       = useState('repay');
  const [filter, setFilter]             = useState('pending');

  useEffect(()=>{ setTransactions(getAll()); },[]);

  const handleSettle = async (tx) => {
    console.log('SETTLE:', tx.UID, 'current:', tx.SETTLED, 'type:', typeof tx.SETTLED);
    const newSettled = !(tx.SETTLED===true||tx.SETTLED==='true');
    console.log('new SETTLED:', newSettled);
    const updated = { ...tx, SETTLED: newSettled };
    // Update local state immediately for responsive UI
    setTransactions(prev => prev.map(t => t.UID===tx.UID ? {...t, SETTLED: newSettled} : t));
    // Sync to sheet
    await updateTransaction(updated);
  };

  const repayTxs     = transactions.filter(tx=>tx.REPAY===true||tx.REPAY==='true');
  const reimburseTxs = transactions.filter(tx=>tx.REIMBURSE===true||tx.REIMBURSE==='true');

  const buildGroups = (txs, keyFn) => {
    const map = {};
    txs.forEach(tx => {
      const key = keyFn(tx)||'Other';
      if (!map[key]) map[key]={ key, transactions:[] };
      map[key].transactions.push(tx);
    });
    return Object.values(map);
  };

  const applyFilter = (groups) => groups.filter(g => {
    const exp = g.transactions.filter(tx=>Number(tx.EXPENSE)>0);
    const pending = exp.filter(tx=>!tx.SETTLED).length;
    if (filter==='pending') return pending > 0;
    if (filter==='settled') return exp.length > 0 && pending === 0;
    return true;
  });

  const repayGroups     = applyFilter(buildGroups(repayTxs,     tx=>tx.CLAIMED_FROM||'ไม่ระบุองค์กร'));
  const reimburseGroups = applyFilter(buildGroups(reimburseTxs, tx=>tx.PAYEE_PAYER));

  const calcPending = (groups) => groups.reduce((s,g)=>
    s + g.transactions.filter(tx=>Number(tx.EXPENSE)>0&&!tx.SETTLED).reduce((a,tx)=>a+(Number(tx.EXPENSE)||0),0), 0);

  const totalRepayPending     = calcPending(buildGroups(repayTxs,     tx=>tx.CLAIMED_FROM||'ไม่ระบุองค์กร'));
  const totalReimbursePending = calcPending(buildGroups(reimburseTxs, tx=>tx.PAYEE_PAYER));

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0,fontSize:24,fontWeight:800,color:C.text }}>Repay & Reimburse</h1>
        <p style={{ margin:'2px 0 0',fontSize:13,color:C.sub }}>🏢 เบิกได้ = claim from org/parents · 👥 เพื่อนค้างจ่าย = friend owes me</p>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:14,marginBottom:24 }}>
        <div style={{ background:'#fff',borderRadius:14,padding:'14px 18px',boxShadow:'0 1px 8px rgba(13,148,136,0.08)',borderTop:'3px solid #8b5cf6' }}>
          <div style={{ fontSize:11,color:C.sub,fontWeight:600,textTransform:'uppercase',letterSpacing:.5 }}>เบิกได้ Pending</div>
          <div style={{ fontSize:22,fontWeight:800,color:'#8b5cf6',marginTop:4 }}>฿{totalRepayPending.toLocaleString()}</div>
        </div>
        <div style={{ background:'#fff',borderRadius:14,padding:'14px 18px',boxShadow:'0 1px 8px rgba(13,148,136,0.08)',borderTop:'3px solid #f59e0b' }}>
          <div style={{ fontSize:11,color:C.sub,fontWeight:600,textTransform:'uppercase',letterSpacing:.5 }}>เพื่อนค้างจ่าย Pending</div>
          <div style={{ fontSize:22,fontWeight:800,color:'#f59e0b',marginTop:4 }}>฿{totalReimbursePending.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ display:'flex',gap:8,marginBottom:12 }}>
        {[['repay','🏢 เบิกได้',totalRepayPending],['reimburse','👥 เพื่อนค้างจ่าย',totalReimbursePending]].map(([id,label,pending])=>(
          <button key={id} onClick={()=>setActiveTab(id)}
            style={{ flex:1,padding:'10px 0',borderRadius:10,border:`2px solid ${activeTab===id?C.teal:C.border}`,background:activeTab===id?C.teal:C.muted,color:activeTab===id?'#fff':C.sub,fontWeight:700,fontSize:13,cursor:'pointer' }}>
            {label}
            {pending>0&&<span style={{ marginLeft:6,background:'#ef4444',color:'#fff',borderRadius:20,fontSize:11,padding:'2px 7px' }}>฿{pending.toLocaleString()}</span>}
          </button>
        ))}
      </div>

      <div style={{ display:'flex',gap:8,marginBottom:16 }}>
        {[['all','All'],['pending','⏳ Pending'],['settled','✅ Settled']].map(([v,l])=>(
          <button key={v} onClick={()=>setFilter(v)}
            style={{ padding:'6px 14px',borderRadius:20,border:`1px solid ${filter===v?C.teal:C.border}`,background:filter===v?C.teal:C.muted,color:filter===v?'#fff':C.sub,fontWeight:600,fontSize:12,cursor:'pointer' }}>
            {l}
          </button>
        ))}
      </div>

      {activeTab==='repay' && (
        repayGroups.length===0
          ? <div style={{...card,textAlign:'center',padding:32,color:C.sub}}><p>No {filter!=='all'?filter:''} claimable transactions.</p></div>
          : repayGroups.map(g=><GroupCard key={g.key} g={g} flag="REPAY" color="#8b5cf6" onSettle={handleSettle}/>)
      )}
      {activeTab==='reimburse' && (
        reimburseGroups.length===0
          ? <div style={{...card,textAlign:'center',padding:32,color:C.sub}}><p>No {filter!=='all'?filter:''} friend reimbursements.</p></div>
          : reimburseGroups.map(g=><GroupCard key={g.key} g={g} flag="REIMBURSE" color="#f59e0b" onSettle={handleSettle}/>)
      )}
    </div>
  );
}