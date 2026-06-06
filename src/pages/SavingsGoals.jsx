import React, { useState, useEffect } from 'react';
import { getAll, saveSavingsGoalsToSheet } from '../services/transactionService';

const C = { teal:'#0d9488', muted:'#f0fdf4', border:'#d1fae5', text:'#134e4a', sub:'#6b7280' };
const card = { background:'#fff', borderRadius:16, padding:'20px 24px', boxShadow:'0 1px 8px rgba(13,148,136,0.08)', marginBottom:16 };
const inp = { width:'100%', padding:'9px 12px', borderRadius:8, border:`1.5px solid #d1fae5`, fontSize:13, outline:'none', background:'#fff', boxSizing:'border-box', fontFamily:'inherit', color:'#134e4a' };
const lbl = { fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:5 };

export default function SavingsGoals() {
  const [goals, setGoals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({ name:'', target:'', monthly:'', deadline:'' });
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    setTransactions(getAll());
    const saved = JSON.parse(localStorage.getItem('savingsGoals') || '[]');
    setGoals(Array.isArray(saved) ? saved : []);
  }, []);

  const saveGoals = (updated) => {
    setGoals(updated);
    localStorage.setItem('savingsGoals', JSON.stringify(updated));
    saveSavingsGoalsToSheet(updated);
  };

  // Auto-sum savings from transactions TYPE = เงินออมและการลงทุน : เงินออม
  const totalSaved = transactions
    .filter(tx => tx.TYPE === 'เงินออมและการลงทุน : เงินออม')
    .reduce((s, tx) => s + (Number(tx.EXPENSE) || Number(tx.TRANSFER) || 0), 0);

  // Monthly savings this month
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const savedThisMonth = transactions
    .filter(tx => {
      if (tx.TYPE !== 'เงินออมและการลงทุน : เงินออม') return false;
      const p = (tx.DATE||'').split('/');
      return p.length === 3 && `${p[2]}-${p[1]}` === monthKey;
    })
    .reduce((s, tx) => s + (Number(tx.EXPENSE) || Number(tx.TRANSFER) || 0), 0);

  const handleAdd = () => {
    if (!form.name || !form.target) return;
    const goal = { id: Date.now(), name: form.name, target: Number(form.target), monthly: Number(form.monthly)||0, deadline: form.deadline, createdAt: new Date().toISOString() };
    saveGoals([...goals, goal]);
    setForm({ name:'', target:'', monthly:'', deadline:'' });
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this goal?')) return;
    saveGoals(goals.filter(g => g.id !== id));
  };

  const handleEdit = (goal) => {
    setEditId(goal.id);
    setForm({ name: goal.name, target: goal.target, monthly: goal.monthly||'', deadline: goal.deadline||'' });
  };

  const handleSaveEdit = () => {
    saveGoals(goals.map(g => g.id === editId ? { ...g, name: form.name, target: Number(form.target), monthly: Number(form.monthly)||0, deadline: form.deadline } : g));
    setEditId(null);
    setForm({ name:'', target:'', monthly:'', deadline:'' });
  };

  const daysLeft = (deadline) => {
    if (!deadline) return null;
    const diff = Math.ceil((new Date(deadline) - new Date()) / (1000*60*60*24));
    return diff;
  };

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0, fontSize:24, fontWeight:800, color:C.text }}>Savings Goals</h1>
        <p style={{ margin:'2px 0 0', fontSize:13, color:C.sub }}>Track your savings targets and progress</p>
      </div>

      {/* Auto-detected savings summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:14, marginBottom:24 }}>
        {[
          ['Total Saved', `฿${totalSaved.toLocaleString()}`, C.teal],
          ['This Month', `฿${savedThisMonth.toLocaleString()}`, '#16a34a'],
          ['Goals', goals.length, '#8b5cf6'],
        ].map(([l,v,c]) => (
          <div key={l} style={{ background:'#fff', borderRadius:14, padding:'14px 18px', boxShadow:'0 1px 8px rgba(13,148,136,0.08)', borderTop:`3px solid ${c}` }}>
            <div style={{ fontSize:11, color:C.sub, fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>{l}</div>
            <div style={{ fontSize:22, fontWeight:800, color:c, marginTop:4 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ ...card, background:C.muted, border:`1px solid ${C.border}` }}>
        <div style={{ fontSize:13, color:C.sub }}>
          💡 Savings are auto-detected from transactions with TYPE <strong style={{color:C.teal}}>เงินออมและการลงทุน : เงินออม</strong>. Total saved above reflects all such transactions.
        </div>
      </div>

      {/* Add/Edit goal */}
      <div style={card}>
        <h3 style={{ margin:'0 0 16px', fontSize:15, color:C.text, fontWeight:700 }}>{editId ? '✏️ Edit Goal' : '➕ Add Savings Goal'}</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div style={{ gridColumn:'1/-1' }}><label style={lbl}>Goal Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. ออมเพื่อลงทุนปีหน้า" style={inp}/></div>
          <div><label style={lbl}>Target Amount (฿)</label><input type="number" value={form.target} onChange={e=>setForm({...form,target:e.target.value})} placeholder="12000" style={inp}/></div>
          <div><label style={lbl}>Monthly Target (฿)</label><input type="number" value={form.monthly} onChange={e=>setForm({...form,monthly:e.target.value})} placeholder="1000" style={inp}/></div>
          <div style={{ gridColumn:'1/-1' }}><label style={lbl}>Deadline</label><input type="date" value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})} style={inp}/></div>
        </div>
        <div style={{ display:'flex', gap:8, marginTop:14 }}>
          <button onClick={editId ? handleSaveEdit : handleAdd}
            style={{ flex:1, padding:'10px 0', borderRadius:9, border:'none', background:C.teal, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
            {editId ? '💾 Save Changes' : '➕ Add Goal'}
          </button>
          {editId && <button onClick={()=>{ setEditId(null); setForm({name:'',target:'',monthly:'',deadline:''}); }}
            style={{ padding:'10px 20px', borderRadius:9, border:`1px solid ${C.border}`, background:C.muted, color:C.sub, fontWeight:700, fontSize:13, cursor:'pointer' }}>
            Cancel
          </button>}
        </div>
      </div>

      {/* Goals list */}
      {goals.length === 0 ? (
        <div style={{ ...card, textAlign:'center', padding:48, color:C.sub }}>
          <div style={{ fontSize:48 }}>🎯</div>
          <p style={{ marginTop:12 }}>No savings goals yet. Add one above!</p>
        </div>
      ) : goals.map(goal => {
        const pct = goal.target > 0 ? Math.min((totalSaved / goal.target) * 100, 100) : 0;
        const days = daysLeft(goal.deadline);
        const monthsLeft = days ? Math.ceil(days/30) : null;
        const needed = goal.target - totalSaved;
        const monthlyNeeded = monthsLeft > 0 ? Math.ceil(needed / monthsLeft) : 0;
        const color = pct >= 100 ? '#16a34a' : pct >= 75 ? C.teal : pct >= 50 ? '#f59e0b' : '#ef4444';

        return (
          <div key={goal.id} style={{ ...card, borderLeft:`3px solid ${color}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10, marginBottom:16 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:16, color:C.text }}>{goal.name}</div>
                <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>
                  Target: ฿{goal.target.toLocaleString()}
                  {goal.monthly > 0 && ` · ฿${goal.monthly.toLocaleString()}/month`}
                  {goal.deadline && ` · Due: ${goal.deadline}`}
                </div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => handleEdit(goal)} style={{ padding:'5px 10px', borderRadius:7, border:`1px solid ${C.border}`, background:C.muted, color:C.teal, fontSize:12, cursor:'pointer', fontWeight:600 }}>✏️</button>
                <button onClick={() => handleDelete(goal.id)} style={{ padding:'5px 10px', borderRadius:7, border:'none', background:'#fef2f2', color:'#ef4444', fontSize:12, cursor:'pointer', fontWeight:600 }}>🗑️</button>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6 }}>
                <span style={{ color:C.sub }}>฿{totalSaved.toLocaleString()} saved</span>
                <span style={{ fontWeight:700, color }}>{pct.toFixed(0)}%</span>
              </div>
              <div style={{ height:10, borderRadius:5, background:C.border, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:5, width:`${pct}%`, background:color, transition:'width .4s' }}/>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:C.sub, marginTop:4 }}>
                <span>฿{Math.max(needed,0).toLocaleString()} remaining</span>
                {pct >= 100 && <span style={{ color:'#16a34a', fontWeight:700 }}>🎉 Goal reached!</span>}
              </div>
            </div>

            {/* Stats */}
            {days !== null && needed > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:8 }}>
                {[
                  ['📅 Days Left', days > 0 ? `${days} days` : 'Overdue!', days > 0 ? C.teal : '#ef4444'],
                  ['📆 Months Left', monthsLeft > 0 ? `${monthsLeft} months` : '-', C.teal],
                  ['💰 Need/Month', monthlyNeeded > 0 ? `฿${monthlyNeeded.toLocaleString()}` : '-', '#8b5cf6'],
                  ['✅ Saved/Month', `฿${savedThisMonth.toLocaleString()}`, '#16a34a'],
                ].map(([l,v,c]) => (
                  <div key={l} style={{ background:C.muted, borderRadius:8, padding:'8px 12px', border:`1px solid ${C.border}` }}>
                    <div style={{ fontSize:10, color:C.sub, fontWeight:600 }}>{l}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:c, marginTop:2 }}>{v}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}