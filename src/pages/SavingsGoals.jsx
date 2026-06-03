import React, { useState, useEffect } from 'react';
const C = { teal:'#0d9488', muted:'#f0fdf4', border:'#d1fae5', text:'#134e4a', sub:'#6b7280' };
const card = { background:'#fff', borderRadius:16, padding:'20px 24px', boxShadow:'0 1px 8px rgba(13,148,136,0.08)', marginBottom:16 };
const inp = { width:'100%', padding:'9px 12px', borderRadius:8, border:`1.5px solid #d1fae5`, fontSize:13, outline:'none', background:'#fff', boxSizing:'border-box', fontFamily:'inherit', color:'#134e4a' };
const lbl = { fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:5 };

export default function SavingsGoals() {
  const [goals,setGoals]=useState([]);
  const [newGoal,setNewGoal]=useState({name:'',target:'',deadline:'',saved:'',category:'',note:''});
  const [editingId,setEditingId]=useState(null); const [editData,setEditData]=useState({});

  useEffect(()=>{ setGoals(JSON.parse(localStorage.getItem('goals')||'[]')); },[]);
  const save=(u)=>{ setGoals(u); localStorage.setItem('goals',JSON.stringify(u)); };
  const handleAdd=()=>{ if(!newGoal.name||!newGoal.target) return; save([...goals,{...newGoal,id:Date.now()}]); setNewGoal({name:'',target:'',deadline:'',saved:'',category:'',note:''}); };

  const totTarget=goals.reduce((s,g)=>s+(Number(g.target)||0),0);
  const totSaved=goals.reduce((s,g)=>s+(Number(g.saved)||0),0);
  const totPct=totTarget>0?(totSaved/totTarget)*100:0;

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text}}>Savings Goals</h1>
        <p style={{margin:'2px 0 0',fontSize:13,color:C.sub}}>Track your savings targets and progress</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:24}}>
        {[['Goals',goals.length,C.teal],['Saved',`฿${totSaved.toLocaleString()}`,'#16a34a'],['Target',`฿${totTarget.toLocaleString()}`,'#ef4444'],['Progress',`${totPct.toFixed(0)}%`,C.teal]].map(([l,v,c])=>(
          <div key={l} style={{background:'#fff',borderRadius:14,padding:'16px 18px',boxShadow:'0 1px 8px rgba(13,148,136,0.07)',borderTop:`3px solid ${c}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.sub,textTransform:'uppercase',letterSpacing:.5,marginBottom:4}}>{l}</div>
            <div style={{fontSize:22,fontWeight:800,color:c}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,alignItems:'start'}}>
        <div style={card}>
          <h3 style={{fontSize:15,margin:'0 0 16px',color:C.text,fontWeight:700}}>➕ Add New Goal</h3>
          {[['name','Goal Name','text','e.g. New Laptop, Japan Trip'],['note','Note','text','Why this goal matters...']].map(([f,l,t,ph])=>(
            <div key={f} style={{marginBottom:14}}><label style={lbl}>{l}</label><input type={t} placeholder={ph} value={newGoal[f]} onChange={e=>setNewGoal({...newGoal,[f]:e.target.value})} style={inp}/></div>
          ))}
          <div style={{marginBottom:14}}><label style={lbl}>Category</label>
            <select value={newGoal.category} onChange={e=>setNewGoal({...newGoal,category:e.target.value})} style={inp}>
              <option value="">— Select —</option>
              {['Travel ✈️','Electronics 💻','Education 📚','Emergency Fund 🚨','Investment 📈','Health 🏥','Shopping 🛍️','Other 📦'].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
            {[['target','Target (฿)','10000'],['saved','Already Saved (฿)','0']].map(([f,l,ph])=>(
              <div key={f}><label style={lbl}>{l}</label><input type="number" placeholder={ph} value={newGoal[f]} onChange={e=>setNewGoal({...newGoal,[f]:e.target.value})} style={inp}/></div>
            ))}
          </div>
          <div style={{marginBottom:20}}><label style={lbl}>Deadline</label><input type="date" value={newGoal.deadline} onChange={e=>setNewGoal({...newGoal,deadline:e.target.value})} style={inp}/></div>
          <button onClick={handleAdd} style={{width:'100%',padding:12,borderRadius:10,border:'none',background:C.teal,color:'#fff',fontWeight:700,fontSize:14,cursor:'pointer'}}>➕ Add Goal</button>
        </div>
        <div>
          {goals.length===0?(
            <div style={{...card,textAlign:'center',padding:48,color:C.sub}}><div style={{fontSize:48}}>🎯</div><p style={{marginTop:12}}>No goals yet.<br/>Add your first savings goal!</p></div>
          ):goals.map(goal=>{
            const target=Number(goal.target)||0; const savedAmt=Number(goal.saved)||0;
            const pct=target>0?Math.min((savedAmt/target)*100,100):0; const remaining=target-savedAmt;
            let daysLeft=null; let dailyNeeded=null;
            if(goal.deadline){ daysLeft=Math.ceil((new Date(goal.deadline)-new Date())/(1000*60*60*24)); dailyNeeded=daysLeft>0&&remaining>0?(remaining/daysLeft).toFixed(0):0; }
            const barColor=pct>=100?'#16a34a':pct>=75?C.teal:'#f59e0b';
            if(editingId===goal.id) return (
              <div key={goal.id} style={card}>
                <h4 style={{fontSize:14,color:C.teal,marginBottom:12}}>✏️ Edit Goal</h4>
                {[['Goal Name','name','text'],['Target (฿)','target','number'],['Saved (฿)','saved','number'],['Note','note','text']].map(([l,f,t])=>(
                  <div key={f} style={{marginBottom:12}}><label style={lbl}>{l}</label><input type={t} value={editData[f]||''} onChange={e=>setEditData({...editData,[f]:e.target.value})} style={inp}/></div>
                ))}
                <div style={{marginBottom:12}}><label style={lbl}>Deadline</label><input type="date" value={editData.deadline||''} onChange={e=>setEditData({...editData,deadline:e.target.value})} style={inp}/></div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>{save(goals.map(g=>g.id===editingId?editData:g));setEditingId(null);}} style={{padding:'9px 18px',borderRadius:9,border:'none',background:C.teal,color:'#fff',fontWeight:700,cursor:'pointer',fontSize:13}}>💾 Save</button>
                  <button onClick={()=>setEditingId(null)} style={{padding:'9px 18px',borderRadius:9,border:`1px solid ${C.border}`,background:C.muted,color:C.sub,cursor:'pointer',fontSize:13}}>✕</button>
                </div>
              </div>
            );
            return (
              <div key={goal.id} style={card}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:12}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:16,color:C.text}}>{goal.name}</div>
                    {goal.category&&<span style={{fontSize:12,background:C.muted,color:C.teal,padding:'2px 8px',borderRadius:20,marginTop:4,display:'inline-block',border:`1px solid ${C.border}`}}>{goal.category}</span>}
                    {goal.deadline&&<div style={{fontSize:12,color:C.sub,marginTop:4}}>📅 {goal.deadline}{daysLeft!==null&&<span style={{marginLeft:6,color:daysLeft<30?'#ef4444':C.sub}}>{daysLeft<0?'⚠️ Overdue!':`(${daysLeft} days left)`}</span>}</div>}
                    {goal.note&&<div style={{fontSize:12,color:C.sub,marginTop:2}}>📝 {goal.note}</div>}
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={()=>{setEditingId(goal.id);setEditData({...goal});}} style={{padding:'5px 10px',borderRadius:7,border:`1px solid ${C.border}`,background:C.muted,color:C.teal,fontSize:12,cursor:'pointer',fontWeight:600}}>✏️</button>
                    <button onClick={()=>{if(!window.confirm('Delete?')) return;save(goals.filter(g=>g.id!==goal.id));}} style={{padding:'5px 10px',borderRadius:7,border:'none',background:'#fef2f2',color:'#ef4444',fontSize:12,cursor:'pointer',fontWeight:600}}>🗑️</button>
                  </div>
                </div>
                <div style={{height:8,borderRadius:4,background:C.border,overflow:'hidden',marginBottom:8}}>
                  <div style={{height:'100%',borderRadius:4,width:`${pct}%`,background:barColor,transition:'width .4s'}}/>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:12}}>
                  <span style={{color:C.sub}}>฿{savedAmt.toLocaleString()} / ฿{target.toLocaleString()}</span>
                  <span style={{fontWeight:700,color:pct>=100?'#16a34a':C.teal}}>{pct>=100?'🎉 Completed!':`${pct.toFixed(0)}%`}</span>
                </div>
                {dailyNeeded&&remaining>0&&<div style={{background:C.muted,borderRadius:8,padding:'8px 12px',fontSize:13,color:C.teal,marginBottom:12,border:`1px solid ${C.border}`}}>💡 Save <strong>฿{dailyNeeded}/day</strong> to reach goal by deadline</div>}
                {pct<100&&(
                  <div style={{display:'flex',gap:8}}>
                    <input type="number" placeholder="Update saved amount" defaultValue={savedAmt} key={savedAmt} onBlur={e=>save(goals.map(g=>g.id===goal.id?{...g,saved:e.target.value}:g))} style={{...inp,flex:1}}/>
                    <button onClick={e=>save(goals.map(g=>g.id===goal.id?{...g,saved:e.target.previousSibling?.value||savedAmt}:g))} style={{padding:'9px 18px',borderRadius:9,border:'none',background:C.teal,color:'#fff',fontWeight:700,cursor:'pointer',fontSize:13}}>Update</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}