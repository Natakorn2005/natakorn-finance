import React, { useState, useEffect } from 'react';
import { getAll } from '../services/transactionService';

const C = { teal:'#0d9488', tealLight:'#2dd4bf', muted:'#f0fdf4', border:'#d1fae5', text:'#134e4a', sub:'#6b7280' };
const card = { background:'#fff', borderRadius:16, padding:'20px 24px', boxShadow:'0 1px 8px rgba(13,148,136,0.08)', marginBottom:24 };

const FIXED_EXPENSES = [
  { cat:'รายจ่ายประจำเดือน : ค่าหอพัก', label:'ค่าหอพัก' },
  { cat:'รายจ่ายประจำเดือน : ค่าน้ำ / ค่าไฟฟ้า', label:'ค่าน้ำ / ค่าไฟฟ้า' },
  { cat:'รายจ่ายประจำเดือน : ค่าเน็ตมือถือ', label:'ค่าเน็ตมือถือ' },
  { cat:'รายจ่ายประจำเดือน : ค่าบริการรายเดือน', label:'ค่าบริการรายเดือน' },
];
const BUDGET_GROUPS = [
  { group:'อาหารและเครื่องดื่ม', categories:['อาหารและเครื่องดื่ม : อาหารและเครื่องดื่ม','อาหารและเครื่องดื่ม : เครื่องดื่ม','อาหารและเครื่องดื่ม : ขนมและของกินเล่น'] },
  { group:'การเดินทาง', categories:['การเดินทาง : ขนส่งสาธารณะ','การเดินทาง : แท็กซี่ / วินมอเตอร์ไซค์'] },
  { group:'รายจ่ายประจำเดือน', categories:['รายจ่ายประจำเดือน : ค่าหอพัก','รายจ่ายประจำเดือน : ค่าน้ำ / ค่าไฟฟ้า','รายจ่ายประจำเดือน : ค่าซักผ้า / อบผ้า','รายจ่ายประจำเดือน : ค่าเน็ตมือถือ','รายจ่ายประจำเดือน : ค่าบริการรายเดือน'] },
  { group:'การศึกษา', categories:['การศึกษา : ค่าการศึกษา','การศึกษา : สื่อการเรียน / เครื่องเขียน','การศึกษา : อุปกรณ์ทำโปรเจกต์'] },
  { group:'ความบันเทิง', categories:['ความบันเทิง : ค่าเข้าร่วมกิจกรรม','ความบันเทิง : ของใช้ส่วนตัว','ความบันเทิง : เสื้อผ้า / เครื่องแต่งกาย','ความบันเทิง : ของขวัญ / สังสรรค์','ความบันเทิง : ท่องเที่ยว'] },
  { group:'สุขภาพ', categories:['สุขภาพ / ค่ารักษาพยาบาล'] },
  { group:'เงินออมและการลงทุน', categories:['เงินออมและการลงทุน : เงินออม','เงินออมและการลงทุน : เงินฉุกเฉิน','เงินออมและการลงทุน : การลงทุน'] },
  { group:'ค่าใช้จ่ายอื่น ๆ', categories:['ค่าใช้จ่ายอื่น ๆ'] },
];
const DEFAULT_PLANS = {
  1:{ name:'แผนที่ 1', income:7000, budgets:{'อาหารและเครื่องดื่ม':4500,'การเดินทาง':440,'รายจ่ายประจำเดือน':430,'เงินออมและการลงทุน':630} },
  2:{ name:'แผนที่ 2', income:10750, budgets:{'อาหารและเครื่องดื่ม':4500,'รายจ่ายประจำเดือน':4620,'การเดินทาง':440,'เงินออมและการลงทุน':630} },
  3:{ name:'แผนที่ 3', income:13600, budgets:{'อาหารและเครื่องดื่ม':6300,'รายจ่ายประจำเดือน':5240,'การเดินทาง':440,'เงินออมและการลงทุน':620} },
};

function mkKey() { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`; }

export default function BudgetPlans() {
  const [transactions,setTransactions]=useState([]);
  const [budgets,setBudgets]=useState({});
  const [activePlan,setActivePlan]=useState(2);
  const [plans,setPlans]=useState(DEFAULT_PLANS);
  const [manualPaid,setManualPaid]=useState({});

  const now=new Date(); const monthKey=mkKey();
  const daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const daysRemaining=daysInMonth-now.getDate()+1;
  const weekNumber=Math.ceil(now.getDate()/7);

  useEffect(()=>{
    setTransactions(getAll());
    const sp=JSON.parse(localStorage.getItem('budgetPlans')||'null'); const p=sp||DEFAULT_PLANS; setPlans(p);
    const ak=parseInt(localStorage.getItem('activePlan')||'2'); setActivePlan(ak);
    const sb=JSON.parse(localStorage.getItem('budgets')||'null'); setBudgets(sb||p[ak]?.budgets||{});
    setManualPaid(JSON.parse(localStorage.getItem('manualPaid')||'{}'));
  },[]);

  const thisMonth=transactions.filter(tx=>{ if(!tx.DATE) return false; const p=tx.DATE.split('/'); return p.length===3&&`${p[2]}-${p[1]}`===monthKey; });
  const spentMap={}; thisMonth.forEach(tx=>{ if(Number(tx.EXPENSE)>0&&tx.TYPE) spentMap[tx.TYPE]=(spentMap[tx.TYPE]||0)+Number(tx.EXPENSE); });
  const groupSpent={}; BUDGET_GROUPS.forEach(({group,categories})=>{ groupSpent[group]=categories.reduce((s,c)=>s+(spentMap[c]||0),0); });

  const varGroups=BUDGET_GROUPS.filter(({group})=>budgets[group]&&group!=='รายจ่ายประจำเดือน');
  const varBudget=varGroups.reduce((s,{group})=>s+(Number(budgets[group])||0),0);
  const varSpent=varGroups.reduce((s,{group})=>s+(groupSpent[group]||0),0);
  const monthlyBudget=Number(budgets['รายจ่ายประจำเดือน'])||0;
  const monthlySpent=groupSpent['รายจ่ายประจำเดือน']||0;
  const totalSpent=varSpent+monthlySpent;
  const totalBudget=varBudget+monthlyBudget;
  const totalRemaining=totalBudget-totalSpent;
  const dailyBudget=daysRemaining>0?(varBudget-varSpent)/daysRemaining:0;
  const currentIncome=plans[activePlan]?.income||0;
  const weeklyBudget=(varBudget+monthlyBudget)/4.33;

  const isPaid=(cat)=>{ const k=`${monthKey}_${cat}`; return manualPaid[k]||(spentMap[cat]||0)>0; };
  const toggleManual=(cat)=>{ const k=`${monthKey}_${cat}`; const u={...manualPaid,[k]:!manualPaid[k]}; setManualPaid(u); localStorage.setItem('manualPaid',JSON.stringify(u)); };

  const allFixedPaid=FIXED_EXPENSES.filter(f=>budgets[f.cat]).every(f=>isPaid(f.cat));
  const fixedPaidCount=FIXED_EXPENSES.filter(f=>budgets[f.cat]&&isPaid(f.cat)).length;
  const fixedTotal2=FIXED_EXPENSES.filter(f=>budgets[f.cat]).length;

  const weekCalc=(week)=>{
    const ws=(week-1)*7+1; const we=Math.min(week*7,daysInMonth);
    const wSpent=thisMonth.reduce((s,tx)=>{ if(!tx.DATE) return s; const day=parseInt(tx.DATE.split('/')[0]); return day>=ws&&day<=we?s+(Number(tx.EXPENSE)||0):s; },0);
    return { wStart:ws,wEnd:we,wSpent,wBudget:weeklyBudget };
  };

  const progressBar=(pct,color)=>(
    <div style={{height:8,borderRadius:4,background:C.border,overflow:'hidden',marginTop:4}}>
      <div style={{height:'100%',borderRadius:4,width:`${Math.min(pct,100)}%`,background:color,transition:'width .4s'}}/>
    </div>
  );

  const statusColor=(pct)=>pct>=100?'#ef4444':pct>=75?'#f59e0b':'#16a34a';

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text}}>Budget Tracker</h1>
          <p style={{margin:'2px 0 0',fontSize:13,color:C.sub}}>{plans[activePlan]?.name} — {monthKey}</p>
        </div>
        <div style={{fontSize:13,background:C.muted,color:'#16a34a',padding:'8px 16px',borderRadius:10,fontWeight:700,border:`1px solid ${C.border}`}}>💚 รายได้ ฿{currentIncome.toLocaleString()}</div>
      </div>

      {/* Fixed expenses */}
      <div style={card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h3 style={{fontSize:15,margin:0,color:C.text,fontWeight:700}}>🔔 รายจ่ายคงที่ประจำเดือน</h3>
          <span style={{fontSize:12,padding:'4px 12px',borderRadius:20,fontWeight:700,background:allFixedPaid?C.muted:'#fef3c7',color:allFixedPaid?'#16a34a':'#d97706',border:`1px solid ${allFixedPaid?C.border:'#fcd34d'}`}}>
            {fixedPaidCount}/{fixedTotal2} จ่ายแล้ว
          </span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>
          {FIXED_EXPENSES.map(({cat,label})=>{
            const paid=isPaid(cat); const actual=spentMap[cat]||0; const auto=(spentMap[cat]||0)>0;
            // Show amount from group budget if individual cat budget not set
            const amount=budgets[cat]||0;
            return (
              <div key={cat} style={{borderRadius:12,padding:16,background:paid?C.muted:'#fff8f0',border:`2px solid ${paid?C.border:'#fcd34d'}`,transition:'all .2s'}}>
                <div style={{fontWeight:700,fontSize:14,color:paid?'#16a34a':'#d97706',marginBottom:4}}>{paid?'✅':'❌'} {label}</div>
                <div style={{fontSize:12,color:C.sub,marginBottom:8}}>฿{amount.toLocaleString()} / เดือน</div>
                {auto?<div style={{fontSize:12,color:'#16a34a',background:C.muted,padding:'4px 8px',borderRadius:6,border:`1px solid ${C.border}`}}>✅ พบรายการ ฿{actual.toLocaleString()}</div>:
                  <button onClick={()=>toggleManual(cat)} style={{width:'100%',padding:'6px 0',borderRadius:8,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',background:paid?C.muted:'#fef3c7',color:paid?'#16a34a':'#d97706'}}>
                    {paid?'↩️ ยกเลิกทำเครื่องหมาย':'✋ ทำเครื่องหมายว่าจ่ายแล้ว'}
                  </button>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Savings checker */}
      {(()=>{
        const items=[{cat:'เงินออมและการลงทุน : เงินออม',label:'เงินออม',icon:'🐷',show:true},{cat:'เงินออมและการลงทุน : เงินฉุกเฉิน',label:'เงินฉุกเฉิน',icon:'🛡️',show:!!budgets['เงินออมและการลงทุน : เงินฉุกเฉิน']}];
        const visible=items.filter(s=>s.show); if(!visible.length) return null;
        const allSaved=visible.every(s=>isPaid(s.cat)); const savedCount=visible.filter(s=>isPaid(s.cat)).length;
        return (
          <div style={card}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <h3 style={{fontSize:15,margin:0,color:C.text,fontWeight:700}}>🐷 ออมเงินประจำเดือน</h3>
              <span style={{fontSize:12,padding:'4px 12px',borderRadius:20,fontWeight:700,background:allSaved?C.muted:'#eff6ff',color:allSaved?'#16a34a':'#2563eb',border:`1px solid ${allSaved?C.border:'#bfdbfe'}`}}>{savedCount}/{visible.length} ออมแล้ว</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>
              {visible.map(({cat,label,icon})=>{
                const sv=isPaid(cat); const amount=budgets[cat]||0; const actual=spentMap[cat]||0; const auto=actual>0;
                return (
                  <div key={cat} style={{borderRadius:12,padding:16,background:sv?C.muted:'#eff6ff',border:`2px solid ${sv?C.border:'#bfdbfe'}`,transition:'all .2s'}}>
                    <div style={{fontWeight:700,fontSize:14,color:sv?'#16a34a':'#2563eb',marginBottom:4}}>{sv?'✅':'⬜'} {icon} {label}</div>
                    <div style={{fontSize:12,color:C.sub,marginBottom:8}}>เป้า ฿{amount.toLocaleString()} / เดือน</div>
                    {auto?<div style={{fontSize:12,color:'#16a34a',background:C.muted,padding:'4px 8px',borderRadius:6,border:`1px solid ${C.border}`}}>✅ พบรายการ ฿{actual.toLocaleString()}</div>:
                      <button onClick={()=>toggleManual(cat)} style={{width:'100%',padding:'6px 0',borderRadius:8,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',background:sv?C.muted:'#dbeafe',color:sv?'#16a34a':'#2563eb'}}>
                        {sv?'↩️ ยกเลิก':'✋ ออมแล้ว'}
                      </button>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Monthly tracker */}
      <div style={card}>
        <h3 style={{margin:'0 0 16px',fontSize:15,color:C.text,fontWeight:700}}>📅 Monthly Tracker — {monthKey}</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:20}}>
          {[['💸 จ่ายไปแล้ว',`฿${totalSpent.toLocaleString()}`,'#ef4444'],['💰 เหลือในงบ',`฿${totalRemaining.toLocaleString()}`,totalRemaining>=0?'#16a34a':'#ef4444'],['📆 งบต่อวัน',`฿${dailyBudget.toLocaleString(undefined,{maximumFractionDigits:0})}`,C.teal],['📆 เหลืออีก',`${daysRemaining} วัน`,C.sub]].map(([l,v,c])=>(
            <div key={l} style={{background:C.muted,borderRadius:12,padding:'14px 16px',border:`1px solid ${C.border}`,borderTop:`3px solid ${c}`}}>
              <div style={{fontSize:11,fontWeight:700,color:C.sub,textTransform:'uppercase',letterSpacing:.5,marginBottom:4}}>{l}</div>
              <div style={{fontSize:20,fontWeight:800,color:c}}>{v}</div>
            </div>
          ))}
        </div>
        {totalBudget>0&&(
          <>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}>
              <span style={{color:C.sub}}>งบรวม ฿{totalBudget.toLocaleString()}</span>
              <span style={{fontWeight:700,color:statusColor((totalSpent/totalBudget)*100)}}>{((totalSpent/totalBudget)*100).toFixed(0)}% ใช้แล้ว</span>
            </div>
            {progressBar((totalSpent/totalBudget)*100,statusColor((totalSpent/totalBudget)*100))}
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:C.sub,marginTop:4}}>
              <span>฿{totalSpent.toLocaleString()} จ่าย</span><span>฿{totalRemaining.toLocaleString()} คงเหลือ</span>
            </div>
          </>
        )}
      </div>

      {/* Weekly tracker */}
      <div style={card}>
        <h3 style={{margin:'0 0 16px',fontSize:15,color:C.text,fontWeight:700}}>📅 Weekly Tracker</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:16}}>
          {[1,2,3,4].map(week=>{
            const {wStart,wEnd,wSpent,wBudget}=weekCalc(week); const pct=wBudget>0?Math.min((wSpent/wBudget)*100,100):0; const isCur=week===weekNumber;
            const wRem=wBudget-wSpent; const wDaysLeft=isCur?Math.max(wEnd-now.getDate()+1,1):wEnd-wStart+1; const wDaily=wRem>0?(wRem/wDaysLeft).toFixed(0):0;
            return (
              <div key={week} style={{background:isCur?C.muted:'#fff',borderRadius:12,padding:14,border:`2px solid ${isCur?C.teal:C.border}`,transition:'all .2s'}}>
                <div style={{fontWeight:700,fontSize:13,color:isCur?C.teal:C.text,marginBottom:2}}>Week {week} {isCur&&'← ตอนนี้'}</div>
                <div style={{fontSize:11,color:C.sub,marginBottom:8}}>วันที่ {wStart}–{wEnd}</div>
                <div style={{fontSize:18,fontWeight:800,color:wSpent>wBudget?'#ef4444':C.text}}>฿{wSpent.toLocaleString()}</div>
                <div style={{fontSize:11,color:C.sub,marginBottom:8}}>จาก ฿{wBudget.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
                {progressBar(pct,statusColor(pct))}
                <div style={{fontSize:11,marginTop:4,color:wRem>=0?'#16a34a':'#ef4444',fontWeight:600}}>
                  {wRem>=0?`฿${wRem.toLocaleString(undefined,{maximumFractionDigits:0})} คงเหลือ`:`เกิน ฿${Math.abs(wRem).toLocaleString(undefined,{maximumFractionDigits:0})}`}
                </div>
                {wRem>0&&<div style={{fontSize:11,marginTop:2,color:C.teal}}>฿{wDaily}/วัน</div>}
              </div>
            );
          })}
        </div>
        {(()=>{
          const {wSpent,wBudget}=weekCalc(weekNumber); const wRem=wBudget-wSpent;
          return (
            <div style={{background:C.muted,borderRadius:10,padding:16,display:'flex',justifyContent:'space-between',alignItems:'center',border:`1px solid ${C.border}`}}>
              <div>
                <div style={{fontWeight:700,fontSize:14,color:C.teal}}>สัปดาห์นี้ (Week {weekNumber})</div>
                <div style={{fontSize:13,color:C.sub,marginTop:2}}>฿{wSpent.toLocaleString()} จ่าย / งบ ฿{wBudget.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:22,fontWeight:800,color:wRem>=0?'#16a34a':'#ef4444'}}>฿{wRem.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
                <div style={{fontSize:12,color:C.sub}}>คงเหลือ</div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Category budgets */}
      <div style={card}>
        <div style={{marginBottom:16}}>
          <h3 style={{fontSize:15,margin:0,color:C.text,fontWeight:700}}>📊 งบประมาณรายหมวดหลัก</h3>
          <p style={{fontSize:12,color:C.sub,margin:'4px 0 0'}}>แก้ไขงบได้ที่หน้า Planning</p>
        </div>
        {BUDGET_GROUPS.map(({group,categories})=>{
          const budget=Number(budgets[group])||0; const spent=groupSpent[group]||0;
          const pct=budget>0?Math.min((spent/budget)*100,100):0; const remaining=budget-spent;
          const daily=daysRemaining>0&&remaining>0?(remaining/daysRemaining).toFixed(0):0;
          const sub=categories.filter(c=>(spentMap[c]||0)>0).map(c=>({name:c.includes(' : ')?c.split(' : ')[1]:c,spent:spentMap[c]||0}));
          if(budget===0&&spent===0) return null;
          return (
            <div key={group} style={{marginBottom:20,paddingBottom:16,borderBottom:`1px solid ${C.muted}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <span style={{fontSize:14,fontWeight:700,color:C.text}}>{group}</span>
                <span style={{fontSize:12,color:C.sub}}>฿{spent.toLocaleString()} / ฿{budget.toLocaleString()}</span>
              </div>
              {budget>0&&(
                <>
                  {progressBar(pct,statusColor(pct))}
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:C.sub,marginTop:3}}>
                    <span style={{color:statusColor(pct)}}>{pct.toFixed(0)}% ใช้แล้ว</span>
                    {remaining>0?<span>฿{daily}/วัน คงเหลือ</span>:<span style={{color:'#ef4444'}}>เกินงบ!</span>}
                  </div>
                </>
              )}
              {sub.length>0&&(
                <div style={{marginTop:8,paddingLeft:12,borderLeft:`2px solid ${C.border}`}}>
                  {sub.map(({name,spent:s})=>(
                    <div key={name} style={{display:'flex',justifyContent:'space-between',fontSize:11,color:C.sub,padding:'2px 0'}}>
                      <span>{name}</span><span>฿{s.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}