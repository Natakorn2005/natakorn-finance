import React, { useState, useEffect } from 'react';

const C = { teal:'#0d9488', tealLight:'#2dd4bf', green:'#4ade80', muted:'#f0fdf4', border:'#d1fae5', text:'#134e4a', sub:'#6b7280' };
const card = { background:'#fff', borderRadius:16, padding:'20px 24px', boxShadow:'0 1px 8px rgba(13,148,136,0.08)', marginBottom:16 };
const inp = { width:'100%', padding:'9px 12px', borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:13, outline:'none', background:'#fff', boxSizing:'border-box', fontFamily:'inherit', color:C.text };
const lbl = { fontSize:11, fontWeight:700, color:C.sub, textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:5 };

const BUDGET_GROUPS = [
  { group:'อาหารและเครื่องดื่ม' },{ group:'การเดินทาง' },{ group:'รายจ่ายประจำเดือน' },
  { group:'การศึกษา' },{ group:'ความบันเทิง' },{ group:'สุขภาพ' },{ group:'เงินออมและการลงทุน' },
];

const DEFAULT_PLANS = {
  1:{ name:'แผนที่ 1', description:'กรกฎาคม 2567 - มกราคม 2569', income:7000, budgets:{'อาหารและเครื่องดื่ม':4500,'การเดินทาง':440,'รายจ่ายประจำเดือน':430,'เงินออมและการลงทุน':630} },
  2:{ name:'แผนที่ 2', description:'มกราคม 2569 - ปัจจุบัน', income:10750, budgets:{'อาหารและเครื่องดื่ม':4500,'รายจ่ายประจำเดือน':4620,'การเดินทาง':440,'เงินออมและการลงทุน':630} },
  3:{ name:'แผนที่ 3', description:'รอดำเนินการ', income:13600, budgets:{'อาหารและเครื่องดื่ม':6300,'รายจ่ายประจำเดือน':5240,'การเดินทาง':440,'เงินออมและการลงทุน':620} },
};

function PlanEditor({ plan, onSave, onCancel, isNew }) {
  const [data, setData] = useState({ ...plan, budgets:{ ...(plan.budgets||{}) } });
  const total = Object.values(data.budgets||{}).reduce((s,v)=>s+(Number(v)||0),0);
  const savings = (Number(data.income)||0) - total;

  return (
    <div style={{background:C.muted,borderRadius:12,padding:20,marginTop:16,border:`1px solid ${C.border}`}}>
      <h4 style={{fontSize:15,marginBottom:16,color:C.teal,margin:'0 0 16px'}}>{isNew?'➕ สร้างแผนใหม่':`✏️ แก้ไข ${plan.name}`}</h4>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
        <div><label style={lbl}>ชื่อแผน</label><input type="text" placeholder="แผนที่ 4" value={data.name||''} onChange={e=>setData(p=>({...p,name:e.target.value}))} style={inp}/></div>
        <div><label style={lbl}>รายได้ต่อเดือน (฿)</label><input type="number" placeholder="10000" value={data.income||''} onChange={e=>setData(p=>({...p,income:Number(e.target.value)}))} style={inp}/></div>
      </div>
      <div style={{marginBottom:12}}><label style={lbl}>คำอธิบาย</label><input type="text" placeholder="ช่วงเวลา..." value={data.description||''} onChange={e=>setData(p=>({...p,description:e.target.value}))} style={inp}/></div>
      <div style={{fontSize:13,fontWeight:700,color:C.sub,marginBottom:10,textTransform:'uppercase',letterSpacing:.5}}>งบประมาณรายหมวด</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:10,marginBottom:16}}>
        {BUDGET_GROUPS.map(({group})=>(
          <div key={group}><label style={{...lbl,fontSize:10}}>{group}</label>
            <input type="number" placeholder="0" value={data.budgets?.[group]||''} onChange={e=>setData(p=>({...p,budgets:{...p.budgets,[group]:Number(e.target.value)}}))} style={{...inp,padding:'7px 10px',fontSize:12}}/>
          </div>
        ))}
      </div>
      <div style={{background:'#fff',borderRadius:10,padding:14,marginBottom:16,display:'flex',gap:24,flexWrap:'wrap',border:`1px solid ${C.border}`}}>
        {[['รายได้',`฿${(Number(data.income)||0).toLocaleString()}`,'#16a34a'],['งบรวม',`฿${total.toLocaleString()}`,'#ef4444'],['เหลือออม',`฿${savings.toLocaleString()}`,savings>=0?'#16a34a':'#ef4444']].map(([l,v,c])=>(
          <div key={l}><div style={{fontSize:11,color:C.sub}}>{l}</div><div style={{fontWeight:700,color:c,fontSize:14}}>{v}</div></div>
        ))}
      </div>
      <div style={{display:'flex',gap:8}}>
        <button onClick={()=>onSave(data)} style={{padding:'9px 18px',borderRadius:9,border:'none',background:C.teal,color:'#fff',fontWeight:700,cursor:'pointer',fontSize:13}}>💾 บันทึก</button>
        <button onClick={onCancel} style={{padding:'9px 18px',borderRadius:9,border:`1px solid ${C.border}`,background:C.muted,color:C.sub,fontWeight:700,cursor:'pointer',fontSize:13}}>✕ ยกเลิก</button>
      </div>
    </div>
  );
}

export default function Planning() {
  const [plans,setPlans] = useState(DEFAULT_PLANS);
  const [activePlan,setActivePlan] = useState(2);
  const [editingKey,setEditingKey] = useState(null);
  const [confirmDelete,setConfirmDelete] = useState(null);

  useEffect(()=>{
    const s=JSON.parse(localStorage.getItem('budgetPlans')||'null');
    if(s) setPlans(s);
    setActivePlan(parseInt(localStorage.getItem('activePlan')||'2'));
  },[]);

  const savePlans=(p)=>{ setPlans(p); localStorage.setItem('budgetPlans',JSON.stringify(p)); };

  const handleSetActive=(key)=>{
    setActivePlan(key); localStorage.setItem('activePlan',String(key));
    localStorage.setItem('budgets',JSON.stringify(plans[key]?.budgets||{}));
  };

  const handleSavePlan=(data)=>{
    if(editingKey==='new'){ const keys=Object.keys(plans).map(Number); const nk=Math.max(...keys)+1; savePlans({...plans,[nk]:data}); }
    else { savePlans({...plans,[editingKey]:data}); if(editingKey===activePlan) localStorage.setItem('budgets',JSON.stringify(data.budgets||{})); }
    setEditingKey(null);
  };

  const handleDelete=(key)=>{ const u={...plans}; delete u[key]; savePlans(u); if(activePlan===key){ const r=Object.keys(u)[0]; if(r) handleSetActive(Number(r)); } setConfirmDelete(null); };

  const planKeys=Object.keys(plans).map(Number).sort();

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text}}>จัดการแผนงบประมาณ</h1>
          <p style={{margin:'2px 0 0',fontSize:13,color:C.sub}}>สร้าง แก้ไข และเลือกแผนที่ใช้งานอยู่</p>
        </div>
        <button onClick={()=>setEditingKey('new')} style={{padding:'9px 18px',borderRadius:9,border:'none',background:C.teal,color:'#fff',fontWeight:700,cursor:'pointer',fontSize:13}}>➕ แผนใหม่</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16,marginBottom:24}}>
        {planKeys.map(key=>{
          const plan=plans[key]; const isActive=activePlan===key;
          const total=Object.values(plan.budgets||{}).reduce((s,v)=>s+(Number(v)||0),0);
          const savings=(plan.income||0)-total;
          return (
            <div key={key} style={{...card,marginBottom:0,border:`2px solid ${isActive?C.teal:C.border}`,boxShadow:isActive?`0 4px 20px rgba(13,148,136,0.15)`:'0 1px 8px rgba(13,148,136,0.07)',transition:'all .2s'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:12}}>
                <div>
                  <div style={{fontWeight:700,fontSize:16,color:isActive?C.teal:C.text}}>{isActive&&'✅ '}{plan.name}</div>
                  <div style={{fontSize:12,color:C.sub,marginTop:3}}>{plan.description}</div>
                </div>
                {isActive&&<span style={{fontSize:11,background:C.muted,color:C.teal,padding:'3px 8px',borderRadius:20,fontWeight:700,border:`1px solid ${C.border}`}}>ACTIVE</span>}
              </div>
              <div style={{marginBottom:12}}>
                {Object.entries(plan.budgets||{}).filter(([,v])=>Number(v)>0).map(([g,a])=>(
                  <div key={g} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'3px 0',borderBottom:`1px solid ${C.muted}`}}>
                    <span style={{color:C.sub}}>{g}</span><span style={{fontWeight:600,color:C.text}}>฿{Number(a).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:14}}>
                {[['💚 รายได้',`฿${(plan.income||0).toLocaleString()}`,'#16a34a'],['💸 งบรวม',`฿${total.toLocaleString()}`,'#ef4444'],['🐷 เหลือออม',`฿${savings.toLocaleString()}`,savings>=0?'#16a34a':'#ef4444']].map(([l,v,c])=>(
                  <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                    <span style={{color:C.sub}}>{l}</span><strong style={{color:c}}>{v}</strong>
                  </div>
                ))}
              </div>
              {plan.income>0&&(
                <div style={{marginBottom:14}}>
                  <div style={{height:6,borderRadius:3,background:C.border,overflow:'hidden'}}>
                    <div style={{height:'100%',borderRadius:3,width:`${Math.min((total/(plan.income||1))*100,100)}%`,background:total>plan.income?'#ef4444':C.teal,transition:'width .4s'}}/>
                  </div>
                  <div style={{fontSize:11,color:C.sub,marginTop:3}}>{((total/(plan.income||1))*100).toFixed(0)}% ของรายได้ถูกจัดสรร</div>
                </div>
              )}
              <div style={{display:'flex',gap:8}}>
                {!isActive&&<button onClick={()=>handleSetActive(key)} style={{flex:1,fontSize:12,padding:'8px 0',borderRadius:8,border:'none',background:C.teal,color:'#fff',fontWeight:700,cursor:'pointer'}}>✅ ใช้แผนนี้</button>}
                <button onClick={()=>setEditingKey(key)} style={{flex:1,fontSize:12,padding:'8px 0',borderRadius:8,border:`1px solid ${C.border}`,background:C.muted,color:C.teal,fontWeight:700,cursor:'pointer'}}>✏️ แก้ไข</button>
                {!isActive&&<button onClick={()=>setConfirmDelete(key)} style={{fontSize:12,padding:'8px 12px',borderRadius:8,border:'none',background:'#fef2f2',color:'#ef4444',cursor:'pointer'}}>🗑️</button>}
              </div>
              {confirmDelete===key&&(
                <div style={{marginTop:12,background:'#fee2e2',borderRadius:8,padding:12,fontSize:13}}>
                  <div style={{marginBottom:8,color:'#dc2626',fontWeight:600}}>ลบแผนนี้?</div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>handleDelete(key)} style={{padding:'6px 12px',borderRadius:7,border:'none',background:'#ef4444',color:'#fff',fontWeight:700,cursor:'pointer',fontSize:12}}>ลบ</button>
                    <button onClick={()=>setConfirmDelete(null)} style={{padding:'6px 12px',borderRadius:7,border:`1px solid ${C.border}`,background:C.muted,color:C.sub,cursor:'pointer',fontSize:12}}>ยกเลิก</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editingKey!==null&&(
        <div style={card}>
          <PlanEditor plan={editingKey==='new'?{name:'',description:'',income:'',budgets:{}}:plans[editingKey]} onSave={handleSavePlan} onCancel={()=>setEditingKey(null)} isNew={editingKey==='new'}/>
        </div>
      )}
    </div>
  );
}