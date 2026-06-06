import React, { useState, useEffect } from 'react';
import { getAll, saveTransaction } from '../services/transactionService';

const C = { teal:'#0d9488', muted:'#f0fdf4', border:'#d1fae5', text:'#134e4a', sub:'#6b7280' };
const card = { background:'#fff', borderRadius:16, padding:'20px 24px', boxShadow:'0 1px 8px rgba(13,148,136,0.08)', marginBottom:16 };

function GroupCard({ g, color, incomeLabel, expenseLabel, onRecord, recordLabel }) {
  const [expanded, setExpanded] = useState(false);
  const net = g.totalExpense - g.totalIncome;
  const settled = net <= 0;

  return (
    <div style={{ ...card, borderLeft:`3px solid ${settled?'#16a34a':color}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}
        onClick={() => setExpanded(p => !p)}>
        <div>
          <div style={{ fontWeight:700, fontSize:15, color:C.text }}>{g.key}</div>
          <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>
            Paid ฿{g.totalExpense.toLocaleString()} · Received ฿{g.totalIncome.toLocaleString()}
            {g.claimedFrom && <span style={{ marginLeft:6, color:C.teal }}>→ {g.claimedFrom}</span>}
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:18, fontWeight:800, color:settled?'#16a34a':color }}>
            {settled ? '✅ Settled' : `฿${net.toLocaleString()} pending`}
          </div>
          <div style={{ fontSize:11, color:C.sub, marginTop:2 }}>
            {expanded?'▲ Hide':'▼ Show'} {g.transactions.length} transactions
          </div>
        </div>
      </div>

      {!settled && (
        <button onClick={() => onRecord(g)} style={{ marginTop:12, width:'100%', padding:'9px 0', borderRadius:9, border:'none', background:'#f0fdf4', color:C.teal, fontWeight:700, fontSize:13, cursor:'pointer', border:`1px solid ${C.border}` }}>
          💰 Record Payment Received ฿{net.toLocaleString()}
        </button>
      )}

      {expanded && (
        <div style={{ marginTop:12, borderTop:`1px solid ${C.muted}`, paddingTop:12 }}>
          {g.transactions.map((tx, i) => {
            const isIncome = Number(tx.INCOME) > 0;
            const amt = Number(tx.INCOME) || Number(tx.EXPENSE) || 0;
            return (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${C.muted}` }}>
                <div>
                  <div style={{ fontSize:13, color:C.text, fontWeight:600 }}>{tx.DESCRIPTION||'-'}</div>
                  <div style={{ fontSize:11, color:C.sub }}>
                    {tx.DATE} · {tx.ACCOUNT} · {tx.PAYEE_PAYER||'-'}
                    {tx.CLAIMED_FROM ? ` → ${tx.CLAIMED_FROM}` : ''}
                  </div>
                </div>
                <div style={{ fontWeight:700, fontSize:13, color:isIncome?'#16a34a':'#ef4444' }}>
                  {isIncome ? `+฿${amt.toLocaleString()} (${incomeLabel})` : `-฿${amt.toLocaleString()} (${expenseLabel})`}
                </div>
              </div>
            );
          })}
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8, fontSize:13, fontWeight:700, color:settled?'#16a34a':color }}>
            Net: {net>0?`฿${net.toLocaleString()} pending`:net<0?`฿${Math.abs(net).toLocaleString()} over-received`:'Settled ✅'}
          </div>
        </div>
      )}
    </div>
  );
}

function RecordModal({ recording, onSave, onClose, saving, flagField }) {
  const [data, setData] = useState(recording);
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:16, padding:28, width:'100%', maxWidth:400, boxShadow:'0 8px 32px rgba(0,0,0,0.15)' }}>
        <h3 style={{ margin:'0 0 16px', color:C.text }}>💰 Record Payment Received</h3>
        {[
          ['From', 'from', 'text'],
          ['Amount (฿)', 'amount', 'number'],
          ['Account', 'account', 'text'],
          ['Description', 'description', 'text'],
        ].map(([l,f,t]) => (
          <div key={f} style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, fontWeight:700, color:C.sub, display:'block', marginBottom:4 }}>{l}</label>
            <input type={t} value={data[f]||''} onChange={e=>setData({...data,[f]:t==='number'?Number(e.target.value):e.target.value})}
              style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:13, outline:'none', boxSizing:'border-box', color:f==='amount'?C.teal:C.text, fontWeight:f==='amount'?700:400 }}/>
          </div>
        ))}
        <div style={{ display:'flex', gap:8, marginTop:8 }}>
          <button onClick={onClose} style={{ flex:1, padding:12, borderRadius:9, border:`1px solid ${C.border}`, background:C.muted, color:C.sub, fontWeight:700, cursor:'pointer' }}>Cancel</button>
          <button onClick={()=>onSave(data)} disabled={saving}
            style={{ flex:2, padding:12, borderRadius:9, border:'none', background:C.teal, color:'#fff', fontWeight:700, cursor:'pointer', fontSize:14 }}>
            {saving ? '⏳ Saving...' : '💰 Record'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Repay() {
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab]       = useState('repay');
  const [filter, setFilter]             = useState('all');
  const [recording, setRecording]       = useState(null);
  const [saving, setSaving]             = useState(false);

  useEffect(() => { setTransactions(getAll()); }, []);

  // REPAY = claimable from org, grouped by TYPE
  const repayTxs = transactions.filter(tx => tx.REPAY===true||tx.REPAY==='true');
  const repayGrouped = {};
  repayTxs.forEach(tx => {
    const key = tx.CLAIMED_FROM || tx.TYPE || 'Other';
    if (!repayGrouped[key]) repayGrouped[key] = { key, transactions:[], totalExpense:0, totalIncome:0, claimedFrom:tx.CLAIMED_FROM||'' };
    repayGrouped[key].transactions.push(tx);
    repayGrouped[key].totalExpense += Number(tx.EXPENSE)||0;
    repayGrouped[key].totalIncome  += Number(tx.INCOME) ||0;
  });

  // REIMBURSE = friend owes me / I owe friend, grouped by PAYEE_PAYER
  const reimburseTxs = transactions.filter(tx => tx.REIMBURSE===true||tx.REIMBURSE==='true');
  const reimburseGrouped = {};
  reimburseTxs.forEach(tx => {
    const key = tx.PAYEE_PAYER || 'Unknown';
    if (!reimburseGrouped[key]) reimburseGrouped[key] = { key, transactions:[], totalExpense:0, totalIncome:0 };
    reimburseGrouped[key].transactions.push(tx);
    reimburseGrouped[key].totalExpense += Number(tx.EXPENSE)||0;
    reimburseGrouped[key].totalIncome  += Number(tx.INCOME) ||0;
  });

  const applyFilter = (groups) => groups.filter(g => {
    const net = g.totalExpense - g.totalIncome;
    if (filter==='pending') return net > 0;
    if (filter==='settled') return net <= 0;
    return true;
  });

  const repayGroups     = applyFilter(Object.values(repayGrouped));
  const reimburseGroups = applyFilter(Object.values(reimburseGrouped));

  const totalRepayPending     = Object.values(repayGrouped).reduce((s,g)=>s+Math.max(g.totalExpense-g.totalIncome,0),0);
  const totalReimbursePending = Object.values(reimburseGrouped).reduce((s,g)=>s+Math.max(g.totalExpense-g.totalIncome,0),0);

  const handleRecord = (g, flagField) => {
    const net = g.totalExpense - g.totalIncome;
    setRecording({ from: g.key, amount: net, account: 'เงินสด', description: `รับคืน ${g.key}`, flagField });
  };

  const handleSaveRecord = async (data) => {
    setSaving(true);
    const now = new Date();
    const tx = {
      ACCOUNT: data.account || 'เงินสด',
      DATE: `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`,
      TIME: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:00`,
      DESCRIPTION: data.description || `รับคืน ${data.from}`,
      TYPE: 'รายรับ : รายรับอื่น ๆ',
      PAYEE_PAYER: data.from,
      INCOME: data.amount, EXPENSE: 0, TRANSFER: 0,
      REPAY: data.flagField === 'REPAY',
      REIMBURSE: data.flagField === 'REIMBURSE',
      PAY_BACK: false,
      NOTE: 'Auto-recorded from Repay page',
    };
    await saveTransaction(tx);
    setTransactions(getAll());
    setRecording(null);
    setSaving(false);
  };

  const tabs = [
    { id:'repay',     label:'🏢 เบิกได้ (Org)',    pending: totalRepayPending },
    { id:'reimburse', label:'🔄 คืนเงิน (Friend)', pending: totalReimbursePending },
  ];

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0, fontSize:24, fontWeight:800, color:C.text }}>Repay & Reimburse</h1>
        <p style={{ margin:'2px 0 0', fontSize:13, color:C.sub }}>Track claimable expenses and friend reimbursements</p>
      </div>

      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:14, marginBottom:24 }}>
        <div style={{ background:'#fff', borderRadius:14, padding:'14px 18px', boxShadow:'0 1px 8px rgba(13,148,136,0.08)', borderTop:'3px solid #8b5cf6' }}>
          <div style={{ fontSize:11, color:C.sub, fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>เบิกได้ Pending</div>
          <div style={{ fontSize:22, fontWeight:800, color:'#8b5cf6', marginTop:4 }}>฿{totalRepayPending.toLocaleString()}</div>
        </div>
        <div style={{ background:'#fff', borderRadius:14, padding:'14px 18px', boxShadow:'0 1px 8px rgba(13,148,136,0.08)', borderTop:'3px solid #f59e0b' }}>
          <div style={{ fontSize:11, color:C.sub, fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>คืนเงิน Pending</div>
          <div style={{ fontSize:22, fontWeight:800, color:'#f59e0b', marginTop:4 }}>฿{totalReimbursePending.toLocaleString()}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ flex:1, padding:'10px 0', borderRadius:10, border:`2px solid ${activeTab===t.id?C.teal:C.border}`, background:activeTab===t.id?C.teal:C.muted, color:activeTab===t.id?'#fff':C.sub, fontWeight:700, fontSize:13, cursor:'pointer' }}>
            {t.label}
            {t.pending > 0 && <span style={{ marginLeft:6, background:'#ef4444', color:'#fff', borderRadius:20, fontSize:11, padding:'2px 7px' }}>฿{t.pending.toLocaleString()}</span>}
          </button>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {[['all','All'],['pending','⏳ Pending'],['settled','✅ Settled']].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{ padding:'6px 14px', borderRadius:20, border:`1px solid ${filter===v?C.teal:C.border}`, background:filter===v?C.teal:C.muted, color:filter===v?'#fff':C.sub, fontWeight:600, fontSize:12, cursor:'pointer' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Record Modal */}
      {recording && (
        <RecordModal recording={recording} onSave={handleSaveRecord} onClose={()=>setRecording(null)} saving={saving}/>
      )}

      {activeTab === 'repay' && (
        repayGroups.length === 0
          ? <div style={{ ...card, textAlign:'center', padding:32, color:C.sub }}><p>No {filter!=='all'?filter:''} claimable transactions.</p></div>
          : repayGroups.map(g => <GroupCard key={g.key} g={g} color="#8b5cf6" incomeLabel="reimbursed" expenseLabel="paid" onRecord={g=>handleRecord(g,'REPAY')} recordLabel="Record Reimbursement"/>)
      )}
      {activeTab === 'reimburse' && (
        reimburseGroups.length === 0
          ? <div style={{ ...card, textAlign:'center', padding:32, color:C.sub }}><p>No {filter!=='all'?filter:''} friend reimbursements.</p></div>
          : reimburseGroups.map(g => <GroupCard key={g.key} g={g} color="#f59e0b" incomeLabel="received back" expenseLabel="paid for friend" onRecord={g=>handleRecord(g,'REIMBURSE')} recordLabel="Record Payment Received"/>)
      )}
    </div>
  );
}