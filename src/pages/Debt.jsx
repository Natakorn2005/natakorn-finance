import React, { useState, useEffect } from 'react';
import { getAll, updateTransaction } from '../services/transactionService';

const C = { teal:'#0d9488', muted:'#f0fdf4', border:'#d1fae5', text:'#134e4a', sub:'#6b7280' };
const card = { background:'#fff', borderRadius:16, padding:'20px 24px', boxShadow:'0 1px 8px rgba(13,148,136,0.08)', marginBottom:16 };

function PersonGroup({ g, onSettle }) {
  const [expanded, setExpanded] = useState(false);
  const pendingTxs  = g.transactions.filter(tx => Number(tx.EXPENSE) > 0 && !tx.SETTLED);
  const settledTxs  = g.transactions.filter(tx => Number(tx.EXPENSE) > 0 && tx.SETTLED);
  const incomeTxs   = g.transactions.filter(tx => Number(tx.INCOME) > 0);
  const totalOwed   = pendingTxs.reduce((s,tx) => s+(Number(tx.EXPENSE)||0), 0);
  const allSettled  = pendingTxs.length === 0 && g.transactions.filter(tx=>Number(tx.EXPENSE)>0).length > 0;

  return (
    <div style={{ ...card, borderLeft:`3px solid ${allSettled?'#16a34a':'#ef4444'}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}
        onClick={()=>setExpanded(p=>!p)}>
        <div>
          <div style={{ fontWeight:700, fontSize:15, color:C.text }}>{g.person}</div>
          <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>
            {pendingTxs.length} pending · {settledTxs.length} settled
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:18, fontWeight:800, color:allSettled?'#16a34a':'#ef4444' }}>
            {allSettled ? '✅ All Settled' : `฿${totalOwed.toLocaleString()} pending`}
          </div>
          <div style={{ fontSize:11, color:C.sub }}>{expanded?'▲ Hide':'▼ Show'} {g.transactions.length} records</div>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop:12, borderTop:`1px solid ${C.muted}`, paddingTop:8 }}>
          {/* Expense rows with checkbox */}
          {g.transactions.filter(tx=>Number(tx.EXPENSE)>0).map(tx => (
            <div key={tx.UID} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:`1px solid ${C.muted}`, opacity:tx.SETTLED?0.5:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <input type="checkbox" checked={tx.SETTLED===true||tx.SETTLED==='true'}
                  onChange={()=>onSettle(tx)}
                  style={{ width:17, height:17, cursor:'pointer', accentColor:C.teal }}/>
                <div>
                  <div style={{ fontSize:13, color:C.text, fontWeight:600, textDecoration:tx.SETTLED?'line-through':'none' }}>{tx.DESCRIPTION||'-'}</div>
                  <div style={{ fontSize:11, color:C.sub }}>{tx.DATE} · {tx.ACCOUNT}{tx.CLAIMED_FROM?` → ${tx.CLAIMED_FROM}`:''}</div>
                </div>
              </div>
              <div style={{ fontWeight:700, fontSize:13, color:'#ef4444' }}>-฿{Number(tx.EXPENSE).toLocaleString()}</div>
            </div>
          ))}
          {/* Income rows — reference only */}
          {incomeTxs.length > 0 && (
            <>
              <div style={{ fontSize:11, color:C.sub, fontWeight:600, padding:'8px 0 4px', marginTop:4 }}>— Borrowed —</div>
              {incomeTxs.map(tx => (
                <div key={tx.UID} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${C.muted}` }}>
                  <div>
                    <div style={{ fontSize:13, color:C.text, fontWeight:600 }}>{tx.DESCRIPTION||'-'}</div>
                    <div style={{ fontSize:11, color:C.sub }}>{tx.DATE} · {tx.ACCOUNT}</div>
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

export default function Debt() {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('pending');

  useEffect(() => { setTransactions(getAll()); }, []);

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

  const debtTxs = transactions.filter(tx => tx.PAY_BACK===true||tx.PAY_BACK==='true');
  const groupedMap = {};
  debtTxs.forEach(tx => {
    const person = tx.PAYEE_PAYER||'Unknown';
    if (!groupedMap[person]) groupedMap[person] = { person, transactions:[] };
    groupedMap[person].transactions.push(tx);
  });

  const allGroups = Object.values(groupedMap);
  const groups = allGroups.filter(g => {
    const pending = g.transactions.filter(tx=>Number(tx.EXPENSE)>0&&!tx.SETTLED).length;
    const hasExpense = g.transactions.filter(tx=>Number(tx.EXPENSE)>0).length > 0;
    if (filter==='pending') return pending > 0;
    if (filter==='settled') return hasExpense && pending === 0;
    return true;
  });

  const totalPending  = allGroups.reduce((s,g)=>s+g.transactions.filter(tx=>Number(tx.EXPENSE)>0&&!tx.SETTLED).reduce((a,tx)=>a+(Number(tx.EXPENSE)||0),0),0);
  const pendingCount  = allGroups.filter(g=>g.transactions.filter(tx=>Number(tx.EXPENSE)>0&&!tx.SETTLED).length>0).length;
  const settledCount  = allGroups.filter(g=>g.transactions.filter(tx=>Number(tx.EXPENSE)>0).length>0&&g.transactions.filter(tx=>Number(tx.EXPENSE)>0&&!tx.SETTLED).length===0).length;

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0,fontSize:24,fontWeight:800,color:C.text }}>Debt</h1>
        <p style={{ margin:'2px 0 0',fontSize:13,color:C.sub }}>💸 คืนหนี้ — PAY_BACK transactions</p>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:14,marginBottom:24 }}>
        {[['Total Pending',`฿${totalPending.toLocaleString()}`,'#ef4444'],['Pending',pendingCount,'#f59e0b'],['Settled',settledCount,'#16a34a']].map(([l,v,c])=>(
          <div key={l} style={{ background:'#fff',borderRadius:14,padding:'14px 18px',boxShadow:'0 1px 8px rgba(13,148,136,0.08)',borderTop:`3px solid ${c}` }}>
            <div style={{ fontSize:11,color:C.sub,fontWeight:600,textTransform:'uppercase',letterSpacing:.5 }}>{l}</div>
            <div style={{ fontSize:22,fontWeight:800,color:c,marginTop:4 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex',gap:8,marginBottom:16 }}>
        {[['all','All'],['pending','⏳ Pending'],['settled','✅ Settled']].map(([v,l])=>(
          <button key={v} onClick={()=>setFilter(v)}
            style={{ padding:'7px 16px',borderRadius:20,border:`1px solid ${filter===v?C.teal:C.border}`,background:filter===v?C.teal:C.muted,color:filter===v?'#fff':C.sub,fontWeight:600,fontSize:12,cursor:'pointer' }}>
            {l}
          </button>
        ))}
      </div>
      {groups.length===0
        ? <div style={{...card,textAlign:'center',padding:48,color:C.sub}}><div style={{fontSize:48}}>💸</div><p style={{marginTop:12}}>No {filter!=='all'?filter:''} debt transactions.</p></div>
        : groups.map(g=><PersonGroup key={g.person} g={g} onSettle={handleSettle}/>)
      }
    </div>
  );
}