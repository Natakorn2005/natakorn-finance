import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ACCOUNTS, TYPES } from '../constants';
import { deleteTransaction, pullFromSheet, getAll } from '../services/transactionService';

const C = { teal:'#0d9488', tealLight:'#2dd4bf', muted:'#f0fdf4', border:'#d1fae5', text:'#134e4a', sub:'#6b7280' };
const card = { background:'#fff', borderRadius:16, padding:'20px 24px', boxShadow:'0 1px 8px rgba(13,148,136,0.08)', marginBottom:24 };
const inp = { width:'100%', padding:'9px 12px', borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:13, outline:'none', background:'#fff', boxSizing:'border-box', fontFamily:'inherit', color:C.text };
const lbl = { fontSize:11, fontWeight:700, color:C.sub, textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:5 };

export default function Transactions() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => { setTransactions(getAll()); }, []);

  const months = [...new Set(transactions.map(tx => {
    if (!tx.DATE) return null;
    const p = tx.DATE.split('/');
    return p.length===3 ? `${p[2]}-${p[1]}` : null;
  }).filter(Boolean))].sort().reverse();

  const filtered = [...transactions].reverse().filter(tx => {
    const ms = !search || ['DESCRIPTION','PAYEE_PAYER','NOTE'].some(f=>(tx[f]||'').toLowerCase().includes(search.toLowerCase()));
    const ma = !filterAccount || tx.ACCOUNT===filterAccount;
    const mt = !filterType || tx.TYPE===filterType;
    const mm = !filterMonth || (()=>{ const p=(tx.DATE||'').split('/'); return p.length===3&&`${p[2]}-${p[1]}`===filterMonth; })();
    return ms&&ma&&mt&&mm;
  });

  const totalIncome   = filtered.reduce((s,tx)=>s+(Number(tx.INCOME)||0),0);
  const totalExpense  = filtered.reduce((s,tx)=>s+(Number(tx.EXPENSE)||0),0);
  const totalTransfer = filtered.reduce((s,tx)=>s+(Number(tx.TRANSFER)||0),0);
  const net = totalIncome - totalExpense;

  const handleSync = async () => {
    setSyncing(true); setSyncMsg('');
    try { const r=await pullFromSheet(); setTransactions(getAll()); setSyncMsg(`✅ Synced ${r.merged} transactions`); }
    catch(err) { setSyncMsg('❌ '+err.message); }
    finally { setSyncing(false); setTimeout(()=>setSyncMsg(''),4000); }
  };

  const handleDelete = async (uid) => {
    if (!window.confirm('Delete this transaction?')) return;
    await deleteTransaction(uid); setTransactions(getAll());
  };
  const handleEdit = (tx) => { localStorage.setItem('editTransaction',JSON.stringify(tx)); navigate('/edit'); };

  const badge = (txt, bg, col) => <span style={{fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:20,background:bg,color:col}}>{txt}</span>;

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text}}>Transactions</h1>
          <p style={{margin:'2px 0 0',fontSize:13,color:C.sub}}>View, edit and manage all your recorded transactions</p>
        </div>
        <button onClick={handleSync} disabled={syncing}
          style={{padding:'9px 18px',borderRadius:9,border:`1px solid ${C.border}`,background:C.muted,color:C.teal,fontWeight:700,fontSize:13,cursor:'pointer'}}>
          {syncing?'⏳ Syncing...':'🔄 Sync from Sheet'}
        </button>
      </div>
      {syncMsg && <div style={{marginBottom:16,fontSize:13,color:syncMsg.includes('✅')?'#16a34a':'#f59e0b',fontWeight:600}}>{syncMsg}</div>}

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:24}}>
        {[['Records',filtered.length,C.teal],['Income',`฿${totalIncome.toLocaleString()}`,'#16a34a'],['Expense',`฿${totalExpense.toLocaleString()}`,'#ef4444'],['Net',`฿${net.toLocaleString()}`,net>=0?C.teal:'#ef4444']].map(([l,v,c])=>(
          <div key={l} style={{background:'#fff',borderRadius:14,padding:'16px 18px',boxShadow:'0 1px 8px rgba(13,148,136,0.07)',borderTop:`3px solid ${c}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.sub,textTransform:'uppercase',letterSpacing:.5,marginBottom:4}}>{l}</div>
            <div style={{fontSize:22,fontWeight:800,color:c}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{...card}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}}>
          {[['🔍 Search','text',search,setSearch,null],['📅 Month','select',filterMonth,setFilterMonth,months],
            ['🏦 Account','select',filterAccount,setFilterAccount,ACCOUNTS],['📂 Category','select',filterType,setFilterType,TYPES]].map(([l,t,v,sv,opts])=>(
            <div key={l}><label style={lbl}>{l}</label>
              {t==='text'?<input type="text" placeholder="Description, payee, note..." value={v} onChange={e=>sv(e.target.value)} style={inp}/>:
                <select value={v} onChange={e=>sv(e.target.value)} style={inp}>
                  <option value="">All {l.replace(/[^a-zA-Z ]/g,'').trim()}</option>
                  {opts?.map(o=><option key={o}>{o}</option>)}
                </select>}
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={card}>
        {filtered.length===0 ? (
          <div style={{textAlign:'center',padding:48,color:C.sub}}>
            <div style={{fontSize:48}}>📭</div><p style={{marginTop:12}}>No transactions found.</p>
          </div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  {['ID','Date','Description','Account','Category','In','Out','Flags','Actions'].map(h=>(
                    <th key={h} style={{fontSize:11,fontWeight:700,color:C.sub,textTransform:'uppercase',letterSpacing:.5,padding:'8px 8px',borderBottom:`1px solid ${C.border}`,textAlign:'left',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(tx => (
                  <React.Fragment key={tx.UID||tx.ID}>
                    <tr style={{cursor:'pointer',transition:'background .1s'}}
                      onClick={()=>setExpandedId(expandedId===tx.UID?null:tx.UID)}
                      onMouseEnter={e=>e.currentTarget.style.background=C.muted}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{padding:'10px 8px',fontSize:12,color:C.sub}}>{tx.ID}</td>
                      <td style={{padding:'10px 8px'}}>
                        <div style={{fontSize:13,fontWeight:600,color:C.text}}>{tx.DATE}</div>
                        <div style={{fontSize:11,color:C.sub}}>{tx.TIME}</div>
                      </td>
                      <td style={{padding:'10px 8px',maxWidth:200}}>
                        <div style={{fontWeight:600,fontSize:13,color:C.text}}>{tx.DESCRIPTION}</div>
                        {tx.PAYEE_PAYER&&<div style={{fontSize:11,color:C.sub}}>{tx.PAYEE_PAYER}</div>}
                        {tx.RECEIPT&&<a href={tx.RECEIPT} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:11,color:C.teal}}>🔗 Receipt</a>}
                      </td>
                      <td style={{padding:'10px 8px',fontSize:12,color:C.text}}>{tx.ACCOUNT}</td>
                      <td style={{padding:'10px 8px',fontSize:11,color:C.sub,maxWidth:160}}>{tx.TYPE}</td>
                      <td style={{padding:'10px 8px'}}>
                        {Number(tx.INCOME)>0&&badge(`+฿${Number(tx.INCOME).toLocaleString()}`,C.muted,'#16a34a')}
                        {Number(tx.TRANSFER)>0&&badge(`↔฿${Number(tx.TRANSFER).toLocaleString()}`,`#eff6ff`,'#3b82f6')}
                      </td>
                      <td style={{padding:'10px 8px'}}>
                        {Number(tx.EXPENSE)>0&&badge(`-฿${Number(tx.EXPENSE).toLocaleString()}`,`#fef2f2`,'#ef4444')}
                      </td>
                      <td style={{padding:'10px 8px'}}>
                        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                          {tx.REIMBURSE&&badge('คืนเงิน',C.muted,'#16a34a')}
                          {tx.REPAY&&badge('เบิก','#eff6ff','#3b82f6')}
                          {tx.PAY_BACK&&badge('PayBack','#fef3c7','#d97706')}
                        </div>
                      </td>
                      <td style={{padding:'10px 8px'}}>
                        <div style={{display:'flex',gap:6}}>
                          <button onClick={e=>{e.stopPropagation();handleEdit(tx);}}
                            style={{padding:'5px 10px',borderRadius:7,border:'none',background:C.teal,color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer'}}>✏️</button>
                          <button onClick={e=>{e.stopPropagation();handleDelete(tx.UID);}}
                            style={{padding:'5px 10px',borderRadius:7,border:'none',background:'#fef2f2',color:'#ef4444',fontSize:12,fontWeight:600,cursor:'pointer'}}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                    {expandedId===tx.UID && (
                      <tr style={{background:C.muted}}>
                        <td colSpan={9} style={{padding:'12px 16px'}}>
                          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,fontSize:13}}>
                            {tx.DESTINATION_ACCOUNT&&<div><span style={{color:C.sub}}>Destination: </span>{tx.DESTINATION_ACCOUNT}</div>}
                            {tx.NOTE&&<div><span style={{color:C.sub}}>Note: </span>{tx.NOTE}</div>}
                            {tx.RECEIPT&&<div><span style={{color:C.sub}}>Receipt: </span><a href={tx.RECEIPT} target="_blank" rel="noreferrer" style={{color:C.teal}}>View</a></div>}
                            <div><span style={{color:C.sub}}>Reimburse: </span>{tx.REIMBURSE?'✅':'❌'}</div>
                            <div><span style={{color:C.sub}}>Repay: </span>{tx.REPAY?'✅':'❌'}</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}