import React, { useState, useEffect } from 'react';
import { getAll } from '../services/transactionService';

const C = { teal:'#0d9488', muted:'#f0fdf4', border:'#d1fae5', text:'#134e4a', sub:'#6b7280' };
const card = { background:'#fff', borderRadius:16, padding:'20px 24px', boxShadow:'0 1px 8px rgba(13,148,136,0.08)', marginBottom:16 };
const inp = { width:'100%', padding:'9px 12px', borderRadius:8, border:`1.5px solid #d1fae5`, fontSize:13, outline:'none', background:'#fff', boxSizing:'border-box', fontFamily:'inherit', color:'#134e4a' };
const lbl = { fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:5 };

const TYPES = ['Uncategorized ❓','Stocks 📈','Crypto 🪙','Mutual Fund 📊','Bond 📄','Real Estate 🏠','Gold 🥇','Fixed Deposit 🏦','Other 📦'];

export default function Investment() {
  const [investments, setInvestments] = useState([]);
  const [txTypeOverrides, setTxTypeOverrides] = useState({});
  const [txInvestments, setTxInvestments] = useState([]);
  const [newInv, setNewInv] = useState({ name:'', type:'Stocks 📈', amount:'', currentValue:'', startDate:'', platform:'', note:'' });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [activeGroup, setActiveGroup] = useState('All');

  useEffect(() => {
    setInvestments(JSON.parse(localStorage.getItem('investments') || '[]'));
    setTxTypeOverrides(JSON.parse(localStorage.getItem('investmentTxTypes') || '{}'));
    // Pull investment transactions
    const txs = getAll().filter(tx =>
      tx.TYPE === 'เงินออมและการลงทุน : การลงทุน' && (Number(tx.TRANSFER) > 0 || Number(tx.EXPENSE) > 0)
    );
    setTxInvestments(txs);
  }, []);

  const save = (u) => { setInvestments(u); localStorage.setItem('investments', JSON.stringify(u)); };

  const handleAdd = () => {
    if (!newInv.name || !newInv.amount) return;
    save([...investments, { ...newInv, id: Date.now() }]);
    setNewInv({ name:'', type:'Stocks 📈', amount:'', currentValue:'', startDate:'', platform:'', note:'' });
  };

  // Combine manual + transaction-derived investments
  const invTypeOverrides = JSON.parse(localStorage.getItem('invTypeOverrides') || '{}');
  const txDerived = txInvestments.map(tx => ({
    id: 'tx_' + tx.UID,
    name: tx.DESCRIPTION || tx.DESTINATION_ACCOUNT || 'Investment',
    type: txTypeOverrides['tx_' + tx.UID] || 'Uncategorized ❓',
    amount: Number(tx.TRANSFER) || Number(tx.EXPENSE) || 0,
    currentValue: Number(tx.TRANSFER) || Number(tx.EXPENSE) || 0,
    startDate: tx.DATE || '',
    platform: tx.ACCOUNT || '',
    note: 'Auto from transaction ' + (tx.ID || ''),
    fromTx: true,
  }));

  const allInvestments = [...investments, ...txDerived];

  const totInv = allInvestments.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totCur = allInvestments.reduce((s, i) => s + (Number(i.currentValue) || Number(i.amount) || 0), 0);
  const totPnL = totCur - totInv;
  const totPnLPct = totInv > 0 ? ((totPnL / totInv) * 100).toFixed(1) : 0;

  // Group by type
  const groups = ['All', ...TYPES];
  const grouped = activeGroup === 'All' ? allInvestments : allInvestments.filter(i => i.type === activeGroup);

  // Group summary
  const groupSummary = TYPES.map(type => {
    const items = allInvestments.filter(i => i.type === type);
    if (items.length === 0) return null;
    const invested = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const current = items.reduce((s, i) => s + (Number(i.currentValue) || Number(i.amount) || 0), 0);
    return { type, count: items.length, invested, current, pnl: current - invested };
  }).filter(Boolean);

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0, fontSize:24, fontWeight:800, color:C.text }}>Investment</h1>
        <p style={{ margin:'2px 0 0', fontSize:13, color:C.sub }}>Track your investment portfolio and performance</p>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:14, marginBottom:24 }}>
        {[['Assets', allInvestments.length, C.teal],
          ['Invested', `฿${totInv.toLocaleString()}`, '#ef4444'],
          ['Current', `฿${totCur.toLocaleString()}`, '#16a34a'],
          ['P&L', `${totPnL>=0?'+':''}฿${totPnL.toLocaleString()}`, totPnL>=0?'#16a34a':'#ef4444'],
          ['Return', `${totPnLPct}%`, totPnL>=0?'#16a34a':'#ef4444'],
        ].map(([l,v,c]) => (
          <div key={l} style={{ background:'#fff', borderRadius:14, padding:'14px 18px', boxShadow:'0 1px 8px rgba(13,148,136,0.08)', borderTop:`3px solid ${c}` }}>
            <div style={{ fontSize:11, color:C.sub, fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>{l}</div>
            <div style={{ fontSize:20, fontWeight:800, color:c, marginTop:4 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Group summary */}
      {groupSummary.length > 0 && (
        <div style={card}>
          <h3 style={{ margin:'0 0 16px', fontSize:15, color:C.text, fontWeight:700 }}>📊 By Asset Type</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:10 }}>
            {groupSummary.map(g => (
              <div key={g.type} onClick={() => setActiveGroup(activeGroup===g.type?'All':g.type)}
                style={{ background: activeGroup===g.type ? C.teal : C.muted, borderRadius:10, padding:'12px 14px', border:`1px solid ${C.border}`, cursor:'pointer', transition:'all .2s' }}>
                <div style={{ fontSize:13, fontWeight:700, color: activeGroup===g.type ? '#fff' : C.text, marginBottom:6 }}>{g.type}</div>
                <div style={{ fontSize:11, color: activeGroup===g.type ? 'rgba(255,255,255,0.8)' : C.sub }}>{g.count} assets</div>
                <div style={{ fontSize:13, fontWeight:700, color: activeGroup===g.type ? '#fff' : C.text, marginTop:4 }}>฿{g.current.toLocaleString()}</div>
                <div style={{ fontSize:11, color: g.pnl>=0 ? (activeGroup===g.type?'#a7f3d0':'#16a34a') : '#ef4444' }}>
                  {g.pnl>=0?'+':''}฿{g.pnl.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          {activeGroup !== 'All' && (
            <button onClick={() => setActiveGroup('All')} style={{ marginTop:12, fontSize:12, color:C.teal, background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>
              ✕ Clear filter
            </button>
          )}
        </div>
      )}

      {/* Add new investment */}
      <div style={card}>
        <h3 style={{ margin:'0 0 16px', fontSize:15, color:C.text, fontWeight:700 }}>➕ Add Investment</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div><label style={lbl}>Name</label><input value={newInv.name} onChange={e=>setNewInv({...newInv,name:e.target.value})} placeholder="e.g. PTT Stock" style={inp}/></div>
          <div><label style={lbl}>Type</label><select value={newInv.type} onChange={e=>setNewInv({...newInv,type:e.target.value})} style={inp}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
          <div><label style={lbl}>Invested Amount (฿)</label><input type="number" value={newInv.amount} onChange={e=>setNewInv({...newInv,amount:e.target.value})} placeholder="0" style={inp}/></div>
          <div><label style={lbl}>Current Value (฿)</label><input type="number" value={newInv.currentValue} onChange={e=>setNewInv({...newInv,currentValue:e.target.value})} placeholder="0" style={inp}/></div>
          <div><label style={lbl}>Start Date</label><input type="date" value={newInv.startDate} onChange={e=>setNewInv({...newInv,startDate:e.target.value})} style={inp}/></div>
          <div><label style={lbl}>Platform</label><input value={newInv.platform} onChange={e=>setNewInv({...newInv,platform:e.target.value})} placeholder="e.g. Settrade, Bitkub" style={inp}/></div>
          <div style={{ gridColumn:'1/-1' }}><label style={lbl}>Note</label><input value={newInv.note} onChange={e=>setNewInv({...newInv,note:e.target.value})} placeholder="Optional notes" style={inp}/></div>
        </div>
        <button onClick={handleAdd} style={{ marginTop:14, padding:'10px 24px', borderRadius:10, border:'none', background:C.teal, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
          ➕ Add Investment
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
        {['All', ...TYPES].map(g => (
          <button key={g} onClick={() => setActiveGroup(g)}
            style={{ padding:'6px 14px', borderRadius:20, border:`1px solid ${activeGroup===g?C.teal:C.border}`, background:activeGroup===g?C.teal:C.muted, color:activeGroup===g?'#fff':C.sub, fontSize:12, fontWeight:600, cursor:'pointer' }}>
            {g}
          </button>
        ))}
      </div>

      {/* Investment list */}
      {grouped.length === 0 ? (
        <div style={{ ...card, textAlign:'center', padding:48, color:C.sub }}>
          <div style={{ fontSize:48 }}>📈</div>
          <p style={{ marginTop:12 }}>No investments yet.<br/>Add one above or record investment transactions!</p>
        </div>
      ) : grouped.map(inv => {
        const cur = Number(inv.currentValue) || Number(inv.amount) || 0;
        const pnl = cur - (Number(inv.amount) || 0);
        const pct = Number(inv.amount) > 0 ? ((pnl / Number(inv.amount)) * 100).toFixed(1) : 0;
        const isEditing = editingId === inv.id;
        return (
          <div key={inv.id} style={{ ...card, borderLeft:`3px solid ${pnl>=0?'#16a34a':'#ef4444'}` }}>
            {isEditing ? (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                  <div><label style={lbl}>Name</label><input value={editData.name||''} onChange={e=>setEditData({...editData,name:e.target.value})} style={inp}/></div>
                  <div><label style={lbl}>Type</label><select value={editData.type||''} onChange={e=>setEditData({...editData,type:e.target.value})} style={inp}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                  <div><label style={lbl}>Invested (฿)</label><input type="number" value={editData.amount||''} onChange={e=>setEditData({...editData,amount:e.target.value})} style={inp}/></div>
                  <div><label style={lbl}>Current Value (฿)</label><input type="number" value={editData.currentValue||''} onChange={e=>setEditData({...editData,currentValue:e.target.value})} style={inp}/></div>
                  <div><label style={lbl}>Platform</label><input value={editData.platform||''} onChange={e=>setEditData({...editData,platform:e.target.value})} style={inp}/></div>
                  <div><label style={lbl}>Note</label><input value={editData.note||''} onChange={e=>setEditData({...editData,note:e.target.value})} style={inp}/></div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={()=>{ save(investments.map(i=>i.id===editingId?editData:i)); setEditingId(null); }} style={{ padding:'9px 18px', borderRadius:9, border:'none', background:C.teal, color:'#fff', fontWeight:700, cursor:'pointer', fontSize:13 }}>💾 Save</button>
                  <button onClick={()=>setEditingId(null)} style={{ padding:'9px 18px', borderRadius:9, border:`1px solid ${C.border}`, background:C.muted, color:C.sub, fontWeight:700, cursor:'pointer', fontSize:13 }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontWeight:700, fontSize:15, color:C.text }}>{inv.name}</span>
                    <span style={{ fontSize:11, background:C.muted, color:C.teal, padding:'2px 8px', borderRadius:20, border:`1px solid ${C.border}` }}>{inv.type}</span>
                    {inv.fromTx && <span style={{ fontSize:10, background:'#dbeafe', color:'#3b82f6', padding:'2px 8px', borderRadius:20 }}>Auto</span>}
                    {inv.type==='Uncategorized ❓' && <span style={{ fontSize:10, background:'#fef9c3', color:'#ca8a04', padding:'2px 8px', borderRadius:20 }}>⚠️ Uncategorized</span>}
                  </div>
                  {inv.platform && <div style={{ fontSize:12, color:C.sub, marginBottom:4 }}>📍 {inv.platform}</div>}
                  {inv.startDate && <div style={{ fontSize:12, color:C.sub, marginBottom:4 }}>📅 {inv.startDate}</div>}
                  {inv.note && <div style={{ fontSize:12, color:C.sub }}>{inv.note}</div>}
                </div>
                <div style={{ textAlign:'right', minWidth:140 }}>
                  <div style={{ fontSize:12, color:C.sub }}>Invested: <strong>฿{Number(inv.amount||0).toLocaleString()}</strong></div>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text }}>Current: ฿{cur.toLocaleString()}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:pnl>=0?'#16a34a':'#ef4444' }}>
                    {pnl>=0?'+':''}฿{pnl.toLocaleString()} ({pct}%)
                  </div>
                  <div style={{ display:'flex', gap:6, marginTop:8, justifyContent:'flex-end' }}>
                      <button onClick={()=>{ setEditingId(inv.id); setEditData({...inv}); }} style={{ padding:'5px 10px', borderRadius:7, border:`1px solid ${C.border}`, background:C.muted, color:C.teal, fontSize:12, cursor:'pointer', fontWeight:600 }}>✏️</button>
                      {inv.fromTx && (
                      <select value={inv.type} onChange={e=>{
                        const newOverrides = {...txTypeOverrides, [inv.id]: e.target.value};
                        setTxTypeOverrides(newOverrides);
                        localStorage.setItem('investmentTxTypes', JSON.stringify(newOverrides));
                      }} style={{fontSize:11,padding:'3px 8px',borderRadius:6,border:`1px solid ${C.border}`,background:C.muted,color:C.teal,cursor:'pointer'}}>
                        {TYPES.map(t=><option key={t}>{t}</option>)}
                      </select>
                    )}
                        {!inv.fromTx && <button onClick={()=>{ if(!window.confirm('Delete?')) return; save(investments.filter(i=>i.id!==inv.id)); }} style={{ padding:'5px 10px', borderRadius:7, border:'none', background:'#fef2f2', color:'#ef4444', fontSize:12, cursor:'pointer', fontWeight:600 }}>🗑️</button>}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}