import React, { useState, useEffect, useRef } from 'react';
import { getAll } from '../services/transactionService';

const C = { teal:'#0d9488', muted:'#f0fdf4', border:'#d1fae5', text:'#134e4a', sub:'#6b7280' };
const card = { background:'#fff', borderRadius:16, padding:'20px 24px', boxShadow:'0 1px 8px rgba(13,148,136,0.08)', marginBottom:16 };
const inp = { width:'100%', padding:'9px 12px', borderRadius:8, border:`1.5px solid #d1fae5`, fontSize:13, outline:'none', background:'#fff', boxSizing:'border-box', fontFamily:'inherit', color:'#134e4a' };
const lbl = { fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:5 };
const thS = { padding:'8px 10px', background:C.muted, borderBottom:`2px solid ${C.border}`, fontWeight:700, color:C.sub, fontSize:12 };
const tdS = { padding:'7px 10px', borderBottom:`1px solid ${C.muted}`, fontSize:12 };
const pageBreak = { pageBreakBefore:'always', paddingTop:16 };

export default function PrintReport() {
  const [transactions,setTransactions]=useState([]);
  const [selectedMonth,setSelectedMonth]=useState('');  // default All Time
  const [reportType,setReportType]=useState('monthly');
  const [debts,setDebts]=useState([]);
  const [repayItems,setRepayItems]=useState([]);
  const [investments,setInvestments]=useState([]);

  useEffect(()=>{
    setTransactions(getAll());
    setDebts(JSON.parse(localStorage.getItem('debts')||'[]'));
    setRepayItems(JSON.parse(localStorage.getItem('repayItems')||'[]'));
    setInvestments(JSON.parse(localStorage.getItem('investments')||'[]'));
    // Default to All Time — no setSelectedMonth here
  },[]);

  const months=[...new Set(transactions.map(tx=>{if(!tx.DATE) return null; const p=tx.DATE.split('/'); return p.length===3?`${p[2]}-${p[1]}`:null;}).filter(Boolean))].sort().reverse();
  const filtered=selectedMonth?transactions.filter(tx=>{if(!tx.DATE) return false; const p=tx.DATE.split('/'); return p.length===3&&`${p[2]}-${p[1]}`===selectedMonth;}):transactions;
  const totalIncome=filtered.reduce((s,tx)=>s+(Number(tx.INCOME)||0),0);
  const totalExpense=filtered.reduce((s,tx)=>s+(Number(tx.EXPENSE)||0),0);
  const totalTransfer=filtered.reduce((s,tx)=>s+(Number(tx.TRANSFER)||0),0);
  const netBalance=totalIncome-totalExpense;
  const catMap={}; filtered.forEach(tx=>{ if(Number(tx.EXPENSE)>0&&tx.TYPE) catMap[tx.TYPE]=(catMap[tx.TYPE]||0)+Number(tx.EXPENSE); });
  const catData=Object.entries(catMap).map(([n,v])=>({n,v})).sort((a,b)=>b.v-a.v);
  const accMap={}; filtered.forEach(tx=>{ if(Number(tx.EXPENSE)>0) accMap[tx.ACCOUNT]=(accMap[tx.ACCOUNT]||0)+Number(tx.EXPENSE); });
  const totalDebt=debts.reduce((s,d)=>s+(Number(d.total)||0),0);
  const totalDebtPaid=debts.reduce((s,d)=>s+(Number(d.paid)||0),0);
  const repayableTxs=transactions.filter(tx=>tx.REPAY===true||tx.REPAY==='true');
  const getRepaid=(id)=>Number(repayItems.find(r=>r.txId===id)?.repaidAmount||0);
  const totInv=investments.reduce((s,i)=>s+(Number(i.amount)||0),0);
  const totCur=investments.reduce((s,i)=>s+(Number(i.currentValue)||Number(i.amount)||0),0);
  const totPnL=totCur-totInv;
  const monthLabel=selectedMonth?(()=>{const [y,m]=selectedMonth.split('-');const mn=['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return `${mn[parseInt(m)]} ${y}`;})():'All Time';
  const REPORT_TYPES=[{v:'monthly',l:'📊 Monthly Summary'},{v:'detailed',l:'📋 Detailed Transactions'},{v:'category',l:'📂 Category Breakdown'},{v:'debt',l:'💳 Debt Report'},{v:'repay',l:'📋 Repay Report'},{v:'investment',l:'📈 Investment Report'},{v:'full',l:'📑 Full Report'}];
  const show=(s)=>reportType===s||reportType==='full'||(reportType==='monthly'&&['summary','category','account'].includes(s));

  return (
    <div>
      <div className="no-print">
        <div style={{marginBottom:24}}>
          <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text}}>Print Report</h1>
          <p style={{margin:'2px 0 0',fontSize:13,color:C.sub}}>Generate and print your financial report</p>
        </div>
        <div style={card}>
          <h3 style={{margin:'0 0 16px',fontSize:15,color:C.text,fontWeight:700}}>⚙️ Report Settings</h3>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
            <div><label style={lbl}>Month</label><select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} style={inp}><option value="">All Time</option>{months.map(m=><option key={m}>{m}</option>)}</select></div>
            <div><label style={lbl}>Report Type</label><select value={reportType} onChange={e=>setReportType(e.target.value)} style={inp}>{REPORT_TYPES.map(r=><option key={r.v} value={r.v}>{r.l}</option>)}</select></div>
          </div>
          <button onClick={()=>window.print()} style={{padding:'12px 32px',borderRadius:10,border:'none',background:C.teal,color:'#fff',fontWeight:700,fontSize:14,cursor:'pointer'}}>🖨️ Print / Save as PDF</button>
        </div>
        <div style={{fontSize:13,color:C.sub,background:C.muted,padding:12,borderRadius:10,border:`1px solid ${C.border}`}}>💡 Select <strong>Save as PDF</strong> in print dialog. Use <strong>landscape</strong> for detailed reports.</div>
      </div>

      <div className="print-report">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',borderBottom:`2px solid ${C.teal}`,paddingBottom:16,marginBottom:24}}>
          <div>
            <h1 style={{fontSize:22,fontWeight:800,color:C.text,margin:0}}>📊 FinanceTrack</h1>
            <p style={{color:C.sub,margin:'4px 0 0',fontSize:13}}>{REPORT_TYPES.find(r=>r.v===reportType)?.l} — {monthLabel}</p>
          </div>
          <div style={{textAlign:'right',fontSize:12,color:C.sub}}>
            <div style={{fontWeight:600}}>NATAKORN WISETWONGSAHAKIT</div>
            <div>Generated: {new Date().toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric'})}</div>
          </div>
        </div>

        {show('summary')&&(
          <div style={{marginBottom:28}}>
            <h3 style={{fontSize:15,fontWeight:700,marginBottom:12,borderBottom:`1px solid ${C.border}`,paddingBottom:8,color:C.text}}>💰 Financial Summary — {monthLabel}</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:12}}>
              {[['💚 Income',`฿${totalIncome.toLocaleString()}`,'#16a34a'],['❤️ Expense',`฿${totalExpense.toLocaleString()}`,'#ef4444'],['💙 Net',`฿${netBalance.toLocaleString()}`,netBalance>=0?'#16a34a':'#ef4444'],['🔄 Transfers',`฿${totalTransfer.toLocaleString()}`,C.teal]].map(([l,v,c])=>(
                <div key={l} style={{background:C.muted,borderRadius:8,padding:'10px 14px',border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:11,color:C.sub,marginBottom:4}}>{l}</div>
                  <div style={{fontSize:16,fontWeight:800,color:c}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(show('category')||reportType==='category')&&(
          <div style={{marginBottom:28}}>
            <h3 style={{fontSize:15,fontWeight:700,marginBottom:12,borderBottom:`1px solid ${C.border}`,paddingBottom:8,color:C.text}}>📂 Expense by Category</h3>
            {catData.length===0 ? <p style={{color:C.sub,padding:'12px 0'}}>No expense data for this period.</p> :
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr>{['#','Category','Amount','% of Total'].map((h,i)=><th key={h} style={{...thS,textAlign:i>=2?'right':'left'}}>{h}</th>)}</tr></thead>
              <tbody>
                {catData.map((cat,i)=>(
                  <tr key={i}><td style={tdS}>{i+1}</td><td style={tdS}>{cat.n}</td>
                    <td style={{...tdS,textAlign:'right',fontWeight:600}}>฿{cat.v.toLocaleString()}</td>
                    <td style={{...tdS,textAlign:'right',color:C.sub}}>{totalExpense>0?((cat.v/totalExpense)*100).toFixed(1):0}%</td>
                  </tr>
                ))}
                <tr style={{background:C.muted,fontWeight:700,borderTop:`2px solid ${C.border}`}}><td colSpan={2} style={tdS}>Total</td><td style={{...tdS,textAlign:'right'}}>฿{totalExpense.toLocaleString()}</td><td style={{...tdS,textAlign:'right'}}>100%</td></tr>
              </tbody>
            </table>}
          </div>
        )}

        {(reportType==='detailed'||reportType==='full')&&(
          <div className='page-break' style={{marginBottom:28}}>
            <h3 style={{fontSize:15,fontWeight:700,marginBottom:12,borderBottom:`1px solid ${C.border}`,paddingBottom:8,color:C.text}}>📋 Transactions ({filtered.length})</h3>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr>{['Date','Description','Account','Category','Income','Expense','Transfer'].map((h,i)=><th key={h} style={{...thS,textAlign:i>=4?'right':'left'}}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map((tx,i)=>(
                  <tr key={i}>
                    <td style={{...tdS,whiteSpace:'nowrap'}}>{tx.DATE}</td>
                    <td style={tdS}><div>{tx.DESCRIPTION}</div>{tx.PAYEE_PAYER&&<div style={{fontSize:11,color:C.sub}}>{tx.PAYEE_PAYER}</div>}</td>
                    <td style={{...tdS,whiteSpace:'nowrap'}}>{tx.ACCOUNT}</td><td style={tdS}>{tx.TYPE}</td>
                    <td style={{...tdS,textAlign:'right',color:'#16a34a',fontWeight:600}}>{Number(tx.INCOME)>0?`฿${Number(tx.INCOME).toLocaleString()}`:''}</td>
                    <td style={{...tdS,textAlign:'right',color:'#ef4444',fontWeight:600}}>{Number(tx.EXPENSE)>0?`฿${Number(tx.EXPENSE).toLocaleString()}`:''}</td>
                    <td style={{...tdS,textAlign:'right',color:'#3b82f6',fontWeight:600}}>{Number(tx.TRANSFER)>0?`฿${Number(tx.TRANSFER).toLocaleString()}`:''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Debt Report */}
        {(reportType==='debt'||reportType==='full')&&(
          <div className='page-break' style={{marginBottom:28}}>
            <h3 style={{fontSize:15,fontWeight:700,marginBottom:12,borderBottom:`1px solid ${C.border}`,paddingBottom:8,color:C.text}}>💳 Debt Report</h3>
            {debts.length===0 ? <p style={{color:C.sub,padding:'12px 0'}}>No debt records.</p> :
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr>{['Creditor','Total','Paid','Remaining','Status'].map((h,i)=><th key={h} style={{...thS,textAlign:i>=1?'right':'left'}}>{h}</th>)}</tr></thead>
              <tbody>
                {debts.map((d,i)=>{
                  const remaining=Number(d.total||0)-Number(d.paid||0);
                  return <tr key={i}>
                    <td style={tdS}>{d.creditor||d.name||'-'}</td>
                    <td style={{...tdS,textAlign:'right'}}>฿{Number(d.total||0).toLocaleString()}</td>
                    <td style={{...tdS,textAlign:'right',color:'#16a34a'}}>฿{Number(d.paid||0).toLocaleString()}</td>
                    <td style={{...tdS,textAlign:'right',color:'#ef4444'}}>฿{remaining.toLocaleString()}</td>
                    <td style={{...tdS,textAlign:'right'}}><span style={{background:remaining<=0?'#dcfce7':'#fee2e2',color:remaining<=0?'#16a34a':'#ef4444',padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:700}}>{remaining<=0?'Paid':'Pending'}</span></td>
                  </tr>;
                })}
                <tr style={{background:C.muted,fontWeight:700}}><td style={tdS}>Total</td>
                  <td style={{...tdS,textAlign:'right'}}>฿{debts.reduce((s,d)=>s+Number(d.total||0),0).toLocaleString()}</td>
                  <td style={{...tdS,textAlign:'right',color:'#16a34a'}}>฿{debts.reduce((s,d)=>s+Number(d.paid||0),0).toLocaleString()}</td>
                  <td style={{...tdS,textAlign:'right',color:'#ef4444'}}>฿{debts.reduce((s,d)=>s+Number(d.total||0)-Number(d.paid||0),0).toLocaleString()}</td>
                  <td style={tdS}></td>
                </tr>
              </tbody>
            </table>}
          </div>
        )}

        {/* Repay Report */}
        {(reportType==='repay'||reportType==='full')&&(
          <div className='page-break' style={{marginBottom:28}}>
            <h3 style={{fontSize:15,fontWeight:700,marginBottom:12,borderBottom:`1px solid ${C.border}`,paddingBottom:8,color:C.text}}>📋 Repay Report</h3>
            {transactions.filter(tx=>tx.REPAY===true||tx.REPAY==='true').length===0
              ? <p style={{color:C.sub}}>No repayable transactions.</p>
              : <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                  <thead><tr>{['Date','Description','Account','Amount','Repaid','Remaining'].map((h,i)=><th key={h} style={{...thS,textAlign:i>=3?'right':'left'}}>{h}</th>)}</tr></thead>
                  <tbody>
                    {transactions.filter(tx=>tx.REPAY===true||tx.REPAY==='true').map((tx,i)=>{
                      const amt=Number(tx.EXPENSE)||Number(tx.INCOME)||0;
                      const repaid=Number(repayItems.find(r=>r.txId===tx.UID)?.repaidAmount||0);
                      return <tr key={i}>
                        <td style={{...tdS,whiteSpace:'nowrap'}}>{tx.DATE}</td>
                        <td style={tdS}>{tx.DESCRIPTION}</td>
                        <td style={tdS}>{tx.ACCOUNT}</td>
                        <td style={{...tdS,textAlign:'right'}}>฿{amt.toLocaleString()}</td>
                        <td style={{...tdS,textAlign:'right',color:'#16a34a'}}>฿{repaid.toLocaleString()}</td>
                        <td style={{...tdS,textAlign:'right',color:'#ef4444'}}>฿{(amt-repaid).toLocaleString()}</td>
                      </tr>;
                    })}
                  </tbody>
                </table>
            }
          </div>
        )}

        {/* Investment Report */}
        {(reportType==='investment'||reportType==='full')&&(
          <div className='page-break' style={{marginBottom:28}}>
            <h3 style={{fontSize:15,fontWeight:700,marginBottom:12,borderBottom:`1px solid ${C.border}`,paddingBottom:8,color:C.text}}>📈 Investment Report</h3>
            {investments.length===0 ? <p style={{color:C.sub,padding:'12px 0'}}>No investment records.</p> :
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr>{['Asset','Invested','Current Value','P&L','Return'].map((h,i)=><th key={h} style={{...thS,textAlign:i>=1?'right':'left'}}>{h}</th>)}</tr></thead>
              <tbody>
                {investments.map((inv,i)=>{
                  const pnl=(Number(inv.currentValue)||Number(inv.amount)||0)-Number(inv.amount||0);
                  const pct=Number(inv.amount)>0?(pnl/Number(inv.amount)*100).toFixed(1):0;
                  return <tr key={i}>
                    <td style={tdS}>{inv.name||inv.asset||'-'}</td>
                    <td style={{...tdS,textAlign:'right'}}>฿{Number(inv.amount||0).toLocaleString()}</td>
                    <td style={{...tdS,textAlign:'right'}}>฿{Number(inv.currentValue||inv.amount||0).toLocaleString()}</td>
                    <td style={{...tdS,textAlign:'right',color:pnl>=0?'#16a34a':'#ef4444',fontWeight:600}}>฿{pnl.toLocaleString()}</td>
                    <td style={{...tdS,textAlign:'right',color:pnl>=0?'#16a34a':'#ef4444'}}>{pct}%</td>
                  </tr>;
                })}
                <tr style={{background:C.muted,fontWeight:700}}>
                  <td style={tdS}>Total</td>
                  <td style={{...tdS,textAlign:'right'}}>฿{investments.reduce((s,i)=>s+Number(i.amount||0),0).toLocaleString()}</td>
                  <td style={{...tdS,textAlign:'right'}}>฿{investments.reduce((s,i)=>s+Number(i.currentValue||i.amount||0),0).toLocaleString()}</td>
                  <td style={{...tdS,textAlign:'right',color:totPnL>=0?'#16a34a':'#ef4444',fontWeight:700}}>฿{totPnL.toLocaleString()}</td>
                  <td style={tdS}></td>
                </tr>
              </tbody>
            </table>}
          </div>
        )}

        <div style={{marginTop:32,paddingTop:16,borderTop:`1px solid ${C.border}`,fontSize:11,color:C.sub,display:'flex',justifyContent:'space-between'}}>
          <span>FinanceTrack — Personal Finance Manager</span>
          <span>Generated: {new Date().toLocaleString('th-TH')}</span>
        </div>
      </div>
    </div>
  );
}