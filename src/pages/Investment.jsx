import React, { useState, useEffect } from 'react';
const C = { teal:'#0d9488', muted:'#f0fdf4', border:'#d1fae5', text:'#134e4a', sub:'#6b7280' };
const card = { background:'#fff', borderRadius:16, padding:'20px 24px', boxShadow:'0 1px 8px rgba(13,148,136,0.08)', marginBottom:16 };
const inp = { width:'100%', padding:'9px 12px', borderRadius:8, border:`1.5px solid #d1fae5`, fontSize:13, outline:'none', background:'#fff', boxSizing:'border-box', fontFamily:'inherit', color:'#134e4a' };
const lbl = { fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:5 };
const TYPES = ['Stocks 📈','Crypto 🪙','Mutual Fund 📊','Bond 📄','Real Estate 🏠','Gold 🥇','Fixed Deposit 🏦','Other 📦'];

export default function Investment() {
  const [investments,setInvestments]=useState([]);
  const [newInv,setNewInv]=useState({name:'',type:'Stocks 📈',amount:'',currentValue:'',startDate:'',platform:'',note:''});
  const [editingId,setEditingId]=useState(null); const [editData,setEditData]=useState({});

  useEffect(()=>{ setInvestments(JSON.parse(localStorage.getItem('investments')||'[]')); },[]);
  const save=(u)=>{ setInvestments(u); localStorage.setItem('investments',JSON.stringify(u)); };
  const handleAdd=()=>{ if(!newInv.name||!newInv.amount) return; save([...investments,{...newInv,id:Date.now()}]); setNewInv({name:'',type:'Stocks 📈',amount:'',currentValue:'',startDate:'',platform:'',note:''}); };

  const totInv=investments.reduce((s,i)=>s+(Number(i.amount)||0),0);
  const totCur=investments.reduce((s,i)=>s+(Number(i.currentValue)||Number(i.amount)||0),0);
  const totPnL=totCur-totInv; const totPct=totInv>0?(totPnL/totInv)*100:0;

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text}}>Investments</h1>
        <p style={{margin:'2px 0 0',fontSize:13,color:C.sub}}>Track your investment portfolio and performance</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:24}}>
        {[['Count',investments.length,C.teal],['Invested',`฿${totInv.toLocaleString()}`,'#ef4444'],['Current',`฿${totCur.toLocaleString()}`,'#16a34a'],['P&L',`${totPnL>=0?'+':''}฿${totPnL.toLocaleString()}`,totPnL>=0?'#16a34a':'#ef4444']].map(([l,v,c])=>(
          <div key={l} style={{background:'#fff',borderRadius:14,padding:'16px 18px',boxShadow:'0 1px 8px rgba(13,148,136,0.07)',borderTop:`3px solid ${c}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.sub,textTransform:'uppercase',letterSpacing:.5,marginBottom:4}}>{l}</div>
            <div style={{fontSize:22,fontWeight:800,color:c}}>{v}{l==='P&L'&&<span style={{fontSize:12,marginLeft:4}}>({totPct>=0?'+':''}{totPct.toFixed(1)}%)</span>}</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,alignItems:'start'}}>
        <div style={card}>
          <h3 style={{fontSize:15,margin:'0 0 16px',color:C.text,fontWeight:700}}>➕ Add Investment</h3>
          {[['name','Name','text','e.g. Apple Stock'],['platform','Platform','text','e.g. Bitkub, Settrade']].map(([f,l,t,ph])=>(
            <div key={f} style={{marginBottom:14}}><label style={lbl}>{l}</label><input type={t} placeholder={ph} value={newInv[f]} onChange={e=>setNewInv({...newInv,[f]:e.target.value})} style={inp}/></div>
          ))}
          <div style={{marginBottom:14}}><label style={lbl}>Type</label><select value={newInv.type} onChange={e=>setNewInv({...newInv,type:e.target.value})} style={inp}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
            {[['amount','Invested (฿)','10000'],['currentValue','Current Value (฿)','10000']].map(([f,l,ph])=>(
              <div key={f}><label style={lbl}>{l}</label><input type="number" placeholder={ph} value={newInv[f]} onChange={e=>setNewInv({...newInv,[f]:e.target.value})} style={inp}/></div>
            ))}
          </div>
          <div style={{marginBottom:14}}><label style={lbl}>Start Date</label><input type="date" value={newInv.startDate} onChange={e=>setNewInv({...newInv,startDate:e.target.value})} style={inp}/></div>
          <div style={{marginBottom:20}}><label style={lbl}>Note</label><input type="text" value={newInv.note} onChange={e=>setNewInv({...newInv,note:e.target.value})} style={inp}/></div>
          <button onClick={handleAdd} style={{width:'100%',padding:12,borderRadius:10,border:'none',background:C.teal,color:'#fff',fontWeight:700,fontSize:14,cursor:'pointer'}}>➕ Add Investment</button>
        </div>
        <div>
          {investments.length===0?(
            <div style={{...card,textAlign:'center',padding:48,color:C.sub}}><div style={{fontSize:48}}>📈</div><p style={{marginTop:12}}>No investments yet.<br/>Start tracking your portfolio!</p></div>
          ):investments.map(inv=>{
            const invested=Number(inv.amount)||0; const current=Number(inv.currentValue)||invested;
            const pnl=current-invested; const pct=invested>0?(pnl/invested)*100:0;
            if(editingId===inv.id) return (
              <div key={inv.id} style={card}>
                <h4 style={{fontSize:14,color:C.teal,marginBottom:12}}>✏️ Edit</h4>
                {[['Name','name','text'],['Platform','platform','text'],['Invested (฿)','amount','number'],['Current (฿)','currentValue','number'],['Note','note','text']].map(([l,f,t])=>(
                  <div key={f} style={{marginBottom:12}}><label style={lbl}>{l}</label><input type={t} value={editData[f]||''} onChange={e=>setEditData({...editData,[f]:e.target.value})} style={inp}/></div>
                ))}
                <div style={{marginBottom:12}}><label style={lbl}>Start Date</label><input type="date" value={editData.startDate||''} onChange={e=>setEditData({...editData,startDate:e.target.value})} style={inp}/></div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>{save(investments.map(i=>i.id===editingId?editData:i));setEditingId(null);}} style={{padding:'9px 18px',borderRadius:9,border:'none',background:C.teal,color:'#fff',fontWeight:700,cursor:'pointer',fontSize:13}}>💾</button>
                  <button onClick={()=>setEditingId(null)} style={{padding:'9px 18px',borderRadius:9,border:`1px solid ${C.border}`,background:C.muted,color:C.sub,cursor:'pointer',fontSize:13}}>✕</button>
                </div>
              </div>
            );
            return (
              <div key={inv.id} style={card}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:12}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:16,color:C.text}}>{inv.name}</div>
                    <div style={{display:'flex',gap:6,marginTop:4,flexWrap:'wrap'}}>
                      <span style={{fontSize:12,background:C.muted,color:C.teal,padding:'2px 8px',borderRadius:20,border:`1px solid ${C.border}`}}>{inv.type}</span>
                      {inv.platform&&<span style={{fontSize:12,background:'#f0fdf4',color:'#16a34a',padding:'2px 8px',borderRadius:20}}>{inv.platform}</span>}
                    </div>
                    {inv.startDate&&<div style={{fontSize:12,color:C.sub,marginTop:4}}>📅 Since {inv.startDate}</div>}
                    {inv.note&&<div style={{fontSize:12,color:C.sub,marginTop:2}}>📝 {inv.note}</div>}
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={()=>{setEditingId(inv.id);setEditData({...inv});}} style={{padding:'5px 10px',borderRadius:7,border:`1px solid ${C.border}`,background:C.muted,color:C.teal,fontSize:12,cursor:'pointer',fontWeight:600}}>✏️</button>
                    <button onClick={()=>{if(!window.confirm('Delete?')) return;save(investments.filter(i=>i.id!==inv.id));}} style={{padding:'5px 10px',borderRadius:7,border:'none',background:'#fef2f2',color:'#ef4444',fontSize:12,cursor:'pointer',fontWeight:600}}>🗑️</button>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}}>
                  {[['Invested',`฿${invested.toLocaleString()}`,C.sub],['Current',`฿${current.toLocaleString()}`,C.text],['P&L',`${pnl>=0?'+':''}฿${pnl.toLocaleString()}`,pnl>=0?'#16a34a':'#ef4444']].map(([l,v,c])=>(
                    <div key={l} style={{textAlign:'center',background:C.muted,borderRadius:10,padding:'10px 8px',border:`1px solid ${C.border}`}}>
                      <div style={{fontSize:14,fontWeight:700,color:c}}>{v}</div>
                      <div style={{fontSize:11,color:C.sub}}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8,background:pnl>=0?C.muted:'#fef2f2',borderRadius:8,padding:'8px 12px',border:`1px solid ${pnl>=0?C.border:'#fecaca'}`}}>
                  <span style={{fontSize:20}}>{pnl>=0?'📈':'📉'}</span>
                  <span style={{fontWeight:700,color:pnl>=0?'#16a34a':'#ef4444'}}>{pct>=0?'+':''}{pct.toFixed(2)}% return</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}