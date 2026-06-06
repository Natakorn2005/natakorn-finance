import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAll, saveTransaction } from '../services/transactionService';

const C = { teal:'#0d9488', muted:'#f0fdf4', border:'#d1fae5', text:'#134e4a', sub:'#6b7280' };
const card = { background:'#fff', borderRadius:16, padding:'20px 24px', boxShadow:'0 1px 8px rgba(13,148,136,0.08)', marginBottom:16 };

function DebtCard({ g, onRecord }) {
  const [expanded, setExpanded] = useState(false);
  const net = g.totalBorrowed - g.totalPaid;
  const settled = net <= 0;

  return (
    <div style={{ ...card, borderLeft:`3px solid ${settled?'#16a34a':'#ef4444'}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}
        onClick={() => setExpanded(p => !p)}>
        <div>
          <div style={{ fontWeight:700, fontSize:15, color:C.text }}>{g.person}</div>
          <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>
            Borrowed ฿{g.totalBorrowed.toLocaleString()} · Paid back ฿{g.totalPaid.toLocaleString()}
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:18, fontWeight:800, color:settled?'#16a34a':'#ef4444' }}>
            {settled ? '✅ Settled' : `฿${net.toLocaleString()} owed`}
          </div>
          <div style={{ fontSize:11, color:C.sub, marginTop:2 }}>
            {expanded?'▲ Hide':'▼ Show'} {g.transactions.length} transactions
          </div>
        </div>
      </div>

      {!settled && (
        <button onClick={() => onRecord(g)} style={{ marginTop:12, width:'100%', padding:'9px 0', borderRadius:9, border:'none', background:'#fef2f2', color:'#ef4444', fontWeight:700, fontSize:13, cursor:'pointer' }}>
          💸 Record Pay Back ฿{net.toLocaleString()}
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
                  <div style={{ fontSize:11, color:C.sub }}>{tx.DATE} · {tx.ACCOUNT}</div>
                </div>
                <div style={{ fontWeight:700, fontSize:13, color:isIncome?'#ef4444':'#16a34a' }}>
                  {isIncome ? `+฿${amt.toLocaleString()} (borrowed)` : `-฿${amt.toLocaleString()} (paid back)`}
                </div>
              </div>
            );
          })}
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8, fontSize:13, fontWeight:700, color:settled?'#16a34a':'#ef4444' }}>
            Net: {net>0?`฿${net.toLocaleString()} still owed`:net<0?`฿${Math.abs(net).toLocaleString()} overpaid`:'Settled ✅'}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Debt() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('all'); // all | pending | settled
  const [recording, setRecording] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setTransactions(getAll()); }, []);

  const debtTxs = transactions.filter(tx => tx.PAY_BACK === true || tx.PAY_BACK === 'true');
  const groupedMap = {};
  debtTxs.forEach(tx => {
    const person = tx.PAYEE_PAYER || 'Unknown';
    if (!groupedMap[person]) groupedMap[person] = { person, transactions:[], totalBorrowed:0, totalPaid:0, account: tx.ACCOUNT };
    groupedMap[person].transactions.push(tx);
    groupedMap[person].totalBorrowed += Number(tx.INCOME)  || 0;
    groupedMap[person].totalPaid     += Number(tx.EXPENSE) || 0;
  });

  const allGroups = Object.values(groupedMap).sort((a,b) => (b.totalBorrowed-b.totalPaid) - (a.totalBorrowed-a.totalPaid));
  const groups = allGroups.filter(g => {
    const net = g.totalBorrowed - g.totalPaid;
    if (filter === 'pending') return net > 0;
    if (filter === 'settled') return net <= 0;
    return true;
  });

  const totalOwed    = allGroups.reduce((s,g) => s + Math.max(g.totalBorrowed-g.totalPaid,0), 0);
  const pendingCount = allGroups.filter(g => g.totalBorrowed-g.totalPaid > 0).length;
  const settledCount = allGroups.filter(g => g.totalBorrowed-g.totalPaid <= 0).length;

  const handleRecord = (g) => {
    const net = g.totalBorrowed - g.totalPaid;
    setRecording({ person: g.person, amount: net, account: g.account });
  };

  const handleSaveRecord = async () => {
    if (!recording) return;
    setSaving(true);
    const now = new Date();
    await saveTransaction({
      ACCOUNT: recording.account || 'เงินสด',
      DATE: `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`,
      TIME: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:00`,
      DESCRIPTION: `จ่ายคืน ${recording.person}`,
      TYPE: 'การโอนย้ายเงิน : ถอนเงิน / โอนเงิน',
      PAYEE_PAYER: recording.person,
      INCOME: 0, EXPENSE: recording.amount, TRANSFER: 0,
      PAY_BACK: true, REIMBURSE: false, REPAY: false,
      NOTE: 'Auto-recorded from Debt page',
    });
    setTransactions(getAll());
    setRecording(null);
    setSaving(false);
  };

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0, fontSize:24, fontWeight:800, color:C.text }}>Debt</h1>
        <p style={{ margin:'2px 0 0', fontSize:13, color:C.sub }}>PAY_BACK transactions — borrowed money tracking</p>
      </div>

      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:14, marginBottom:24 }}>
        {[
          ['Total Owed',  `฿${totalOwed.toLocaleString()}`, '#ef4444'],
          ['Pending',     pendingCount,                     '#f59e0b'],
          ['Settled',     settledCount,                     '#16a34a'],
        ].map(([l,v,c]) => (
          <div key={l} style={{ background:'#fff', borderRadius:14, padding:'14px 18px', boxShadow:'0 1px 8px rgba(13,148,136,0.08)', borderTop:`3px solid ${c}` }}>
            <div style={{ fontSize:11, color:C.sub, fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>{l}</div>
            <div style={{ fontSize:22, fontWeight:800, color:c, marginTop:4 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {[['all','All'],['pending','⏳ Pending'],['settled','✅ Settled']].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{ padding:'7px 16px', borderRadius:20, border:`1px solid ${filter===v?C.teal:C.border}`, background:filter===v?C.teal:C.muted, color:filter===v?'#fff':C.sub, fontWeight:600, fontSize:12, cursor:'pointer' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Quick Record Modal */}
      {recording && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:28, width:'100%', maxWidth:400, boxShadow:'0 8px 32px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin:'0 0 16px', color:C.text }}>💸 Record Pay Back</h3>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.sub, display:'block', marginBottom:4 }}>PERSON</label>
              <input value={recording.person} onChange={e=>setRecording({...recording,person:e.target.value})}
                style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:13, outline:'none', boxSizing:'border-box' }}/>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.sub, display:'block', marginBottom:4 }}>AMOUNT (฿)</label>
              <input type="number" value={recording.amount} onChange={e=>setRecording({...recording,amount:Number(e.target.value)})}
                style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:13, outline:'none', boxSizing:'border-box', color:'#ef4444', fontWeight:700 }}/>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.sub, display:'block', marginBottom:4 }}>ACCOUNT</label>
              <input value={recording.account} onChange={e=>setRecording({...recording,account:e.target.value})}
                style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:13, outline:'none', boxSizing:'border-box' }}/>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setRecording(null)} style={{ flex:1, padding:12, borderRadius:9, border:`1px solid ${C.border}`, background:C.muted, color:C.sub, fontWeight:700, cursor:'pointer' }}>Cancel</button>
              <button onClick={handleSaveRecord} disabled={saving}
                style={{ flex:2, padding:12, borderRadius:9, border:'none', background:'#ef4444', color:'#fff', fontWeight:700, cursor:'pointer', fontSize:14 }}>
                {saving ? '⏳ Saving...' : '💸 Record Pay Back'}
              </button>
            </div>
          </div>
        </div>
      )}

      {groups.length === 0 ? (
        <div style={{ ...card, textAlign:'center', padding:48, color:C.sub }}>
          <div style={{ fontSize:48 }}>💸</div>
          <p style={{ marginTop:12 }}>No {filter !== 'all' ? filter : ''} debt transactions.</p>
        </div>
      ) : groups.map(g => <DebtCard key={g.person} g={g} onRecord={handleRecord}/>)}
    </div>
  );
}