import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, Area,
} from 'recharts';
import { ACCOUNT_LIST } from '../constants';
import { getAll } from '../services/transactionService';

// ── Brand palette ──────────────────────────────────────────────
const C = {
  teal:      '#0d9488',
  tealLight: '#2dd4bf',
  green:     '#4ade80',
  greenDark: '#16a34a',
  muted:     '#f0fdf4',
  border:    '#d1fae5',
  text:      '#134e4a',
  sub:       '#6b7280',
};

const CHART_COLORS = [
  '#0d9488','#4ade80','#06b6d4','#f59e0b',
  '#ec4899','#8b5cf6','#f97316','#84cc16',
];

const ACCOUNT_COLORS = ACCOUNT_LIST.reduce((m, a) => { m[a.key] = a.color; return m; }, {});

const BUDGET_GROUPS = [
  { group: 'อาหารและเครื่องดื่ม', color: '#f97316', categories: [
    'อาหารและเครื่องดื่ม : อาหารและเครื่องดื่ม',
    'อาหารและเครื่องดื่ม : เครื่องดื่ม',
    'อาหารและเครื่องดื่ม : ขนมและของกินเล่น',
  ]},
  { group: 'การเดินทาง', color: '#06b6d4', categories: [
    'การเดินทาง : ขนส่งสาธารณะ',
    'การเดินทาง : แท็กซี่ / วินมอเตอร์ไซค์',
  ]},
  { group: 'รายจ่ายประจำเดือน', color: '#0d9488', categories: [
    'รายจ่ายประจำเดือน : ค่าหอพัก',
    'รายจ่ายประจำเดือน : ค่าน้ำ / ค่าไฟฟ้า',
    'รายจ่ายประจำเดือน : ค่าซักผ้า / อบผ้า',
    'รายจ่ายประจำเดือน : ค่าเน็ตมือถือ',
    'รายจ่ายประจำเดือน : ค่าบริการรายเดือน',
  ]},
  { group: 'การศึกษา', color: '#8b5cf6', categories: [
    'การศึกษา : ค่าการศึกษา',
    'การศึกษา : สื่อการเรียน / เครื่องเขียน',
    'การศึกษา : อุปกรณ์ทำโปรเจกต์',
  ]},
  { group: 'ความบันเทิง', color: '#ec4899', categories: [
    'ความบันเทิง : ค่าเข้าร่วมกิจกรรม',
    'ความบันเทิง : ของใช้ส่วนตัว',
    'ความบันเทิง : เสื้อผ้า / เครื่องแต่งกาย',
    'ความบันเทิง : ของขวัญ / สังสรรค์',
    'ความบันเทิง : ท่องเที่ยว',
  ]},
  { group: 'สุขภาพ', color: '#22c55e', categories: ['สุขภาพ / ค่ารักษาพยาบาล'] },
  { group: 'เงินออมและการลงทุน', color: '#84cc16', categories: [
    'เงินออมและการลงทุน : เงินออม',
    'เงินออมและการลงทุน : เงินฉุกเฉิน',
    'เงินออมและการลงทุน : การลงทุน',
  ]},
  { group: 'ค่าใช้จ่ายอื่น ๆ', color: '#94a3b8', categories: ['ค่าใช้จ่ายอื่น ๆ'] },
];

// ── Donut center label ─────────────────────────────────────────
function DonutCenter({ cx, cy, total }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-0.6em" fontSize="11" fill={C.sub}>Total</tspan>
      <tspan x={cx} dy="1.4em" fontSize="15" fontWeight="800" fill={C.text}>
        ฿{total.toLocaleString()}
      </tspan>
    </text>
  );
}

// ── Stat card ──────────────────────────────────────────────────
function StatCard({ label, value, color, icon, sub }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: '18px 20px',
      boxShadow: '0 1px 8px rgba(13,148,136,0.08)',
      borderTop: `3px solid ${color}`,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ fontSize: 12, color: C.sub, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1.2 }}>
        ฿{typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 0 }) : value}
      </div>
      {sub && <div style={{ fontSize: 12, color: C.sub }}>{sub}</div>}
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [initialBalances, setInitialBalances] = useState({});

  useEffect(() => {
    const txs = getAll();
    setTransactions(txs);
    setInitialBalances(JSON.parse(localStorage.getItem('initialBalances') || '{}'));
    // Default to All Time (empty string)
  }, []);

  const months = [...new Set(transactions.map(tx => {
    if (!tx.DATE) return null;
    const p = tx.DATE.split('/');
    return p.length === 3 ? `${p[2]}-${p[1]}` : null;
  }).filter(Boolean))].sort().reverse();

  // Exclude REIMBURSE and REPAY from expense calculations (will be paid back)
  const filtered = (selectedMonth
    ? transactions.filter(tx => {
        if (!tx.DATE) return false;
        const p = tx.DATE.split('/');
        return p.length === 3 && `${p[2]}-${p[1]}` === selectedMonth;
      })
    : transactions
  ).map(tx => {
    // Zero out expense for reimbursable/repayable transactions
    if ((tx.REIMBURSE===true||tx.REIMBURSE==='true') ||
        (tx.REPAY===true||tx.REPAY==='true')) {
      return { ...tx, EXPENSE: 0 };
    }
    return tx;
  });

  const totalIncome   = filtered.reduce((s, tx) => s + (Number(tx.INCOME)   || 0), 0);
  const totalExpense  = filtered.reduce((s, tx) => s + (Number(tx.EXPENSE)  || 0), 0);
  const totalTransfer = filtered.reduce((s, tx) => s + (Number(tx.TRANSFER) || 0), 0);
  const netBalance    = totalIncome - totalExpense;

  const calcAccountBalances = () => {
    const b = {};
    ACCOUNT_LIST.forEach(a => { b[a.key] = Number(initialBalances[a.key] || 0); });
    transactions.forEach(tx => {
      const { ACCOUNT: acc, DESTINATION_ACCOUNT: dest } = tx;
      const inc = Number(tx.INCOME) || 0;
      const exp = Number(tx.EXPENSE) || 0;
      const tra = Number(tx.TRANSFER) || 0;
      if (acc  && b[acc]  !== undefined) b[acc]  += inc - exp - tra;
      if (dest && b[dest] !== undefined) b[dest] += tra;
    });
    return b;
  };
  const accountBalances  = calcAccountBalances();
  const totalAllAccounts = Object.values(accountBalances).reduce((s, v) => s + v, 0);

  // Group expense data
  const groupSpentMap = {};
  BUDGET_GROUPS.forEach(({ group, categories }) => {
    const total = filtered
      .filter(tx => Number(tx.EXPENSE) > 0 && categories.includes(tx.TYPE))
      .reduce((s, tx) => s + Number(tx.EXPENSE), 0);
    if (total > 0) groupSpentMap[group] = total;
  });
  const groupData = Object.entries(groupSpentMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Account expense data
  const accountMap = {};
  filtered.forEach(tx => {
    if (Number(tx.EXPENSE) > 0) {
      const acc = tx.ACCOUNT || 'Unknown';
      accountMap[acc] = (accountMap[acc] || 0) + Number(tx.EXPENSE);
    }
  });
  const accountData = Object.entries(accountMap)
    .map(([name, value]) => ({
      name, value,
      color: ACCOUNT_COLORS[name] || C.teal,
    }))
    .sort((a, b) => b.value - a.value);

  // Budget vs actual
  const budgets = JSON.parse(localStorage.getItem('budgets') || '{}');
  const budgetVsActual = BUDGET_GROUPS
    .filter(({ group }) => Number(budgets[group]) > 0)
    .map(({ group, color }) => ({
      name: group,
      budget: Number(budgets[group]) || 0,
      actual: groupSpentMap[group] || 0,
      color,
    }))
    .sort((a, b) => b.budget - a.budget);

  // Monthly data
  const monthlyMap = {};
  transactions.forEach(tx => {
    if (!tx.DATE || !Number(tx.EXPENSE)) return;
    const p = tx.DATE.split('/');
    if (p.length !== 3) return;
    const key = `${p[2]}-${p[1]}`;
    monthlyMap[key] = (monthlyMap[key] || 0) + Number(tx.EXPENSE);
  });
  const monthlyData = Object.entries(monthlyMap)
    .map(([month, expense]) => ({ month, expense }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Daily data
  const dailyMap = {};
  filtered.forEach(tx => {
    if (!tx.DATE || !Number(tx.EXPENSE)) return;
    const day = tx.DATE.split('/')[0];
    dailyMap[day] = (dailyMap[day] || 0) + Number(tx.EXPENSE);
  });
  const dailyData = Object.entries(dailyMap)
    .map(([day, expense]) => ({ day, expense }))
    .sort((a, b) => parseInt(a.day) - parseInt(b.day));

  const topCategories = [...groupData].slice(0, 5);

  // Donut chart — find cx/cy via customized label
  const [donutCenter, setDonutCenter] = useState({ cx: 0, cy: 0 });

  return (
    <div style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex',
        justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: C.text }}>
            Dashboard
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: C.sub }}>
            Overview of your financial activity
          </p>
        </div>

        {/* Month selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>📅</span>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 10,
              border: `1.5px solid ${C.border}`, fontSize: 13,
              background: C.muted, color: C.text, fontWeight: 600, outline: 'none' }}>
            <option value="">All Time</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Income"   value={totalIncome}   color={C.greenDark} icon="↑" />
        <StatCard label="Total Expense"  value={totalExpense}  color="#ef4444"     icon="↓" />
        <StatCard label="Net Balance"    value={netBalance}    color={netBalance >= 0 ? C.teal : '#ef4444'} icon="=" />
        <StatCard label="Transfers"      value={totalTransfer} color={C.sub}       icon="⇄" />
      </div>

      {/* Account Balances */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px',
        boxShadow: '0 1px 8px rgba(13,148,136,0.08)', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, color: C.text, fontWeight: 700 }}>
              🏦 Account Balances
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: C.teal }}>
              Total: ฿{totalAllAccounts.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <button onClick={() => navigate('/accounts')}
              style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.border}`,
                background: C.muted, color: C.teal, fontSize: 12,
                fontWeight: 700, cursor: 'pointer' }}>
              View All →
            </button>
          </div>
        </div>

        <div style={{ display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {ACCOUNT_LIST.map(acc => {
            const balance = accountBalances[acc.key] || 0;
            return (
              <div key={acc.key} onClick={() => navigate('/accounts')}
                style={{ background: C.muted, borderRadius: 12, padding: '12px 14px',
                  borderLeft: `3px solid ${acc.color}`, cursor: 'pointer',
                  transition: 'transform 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                <div style={{ fontSize: 16 }}>{acc.icon}</div>
                <div style={{ fontSize: 11, color: C.sub, marginTop: 4,
                  fontWeight: 600, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {acc.key}
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, marginTop: 6,
                  color: balance >= 0 ? C.text : '#ef4444' }}>
                  ฿{balance.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {transactions.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, padding: 64,
          textAlign: 'center', color: C.sub,
          boxShadow: '0 1px 8px rgba(13,148,136,0.08)' }}>
          <div style={{ fontSize: 56 }}>📊</div>
          <p style={{ marginTop: 16, fontSize: 15 }}>
            No data yet.<br />Upload some slips to see your dashboard!
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, padding: 64,
          textAlign: 'center', color: C.sub,
          boxShadow: '0 1px 8px rgba(13,148,136,0.08)' }}>
          <div style={{ fontSize: 56 }}>📅</div>
          <p style={{ marginTop: 16, fontSize: 15 }}>
            No data for this period.<br />Try selecting a different month.
          </p>
        </div>
      ) : (
        <>
          {/* Donut + Account bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 16, marginBottom: 24 }}>

            {/* Donut */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px',
              boxShadow: '0 1px 8px rgba(13,148,136,0.08)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, color: C.text, fontWeight: 700 }}>
                🍩 Expense by Category
              </h3>
              {groupData.length === 0 ? (
                <p style={{ color: C.sub, textAlign: 'center', padding: 32 }}>No expense data</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={groupData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%" cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        onMouseEnter={(_, index, e) => {
                          // capture center coords once
                        }}
                        label={false}
                      >
                        {groupData.map((entry) => {
                          const grp = BUDGET_GROUPS.find(g => g.group === entry.name);
                          return <Cell key={entry.name} fill={grp ? grp.color : C.teal} />;
                        })}
                      </Pie>
                      {/* Center total via custom label on first slice */}
                      <Pie
                        data={[{ value: 1 }]}
                        dataKey="value"
                        cx="50%" cy="50%"
                        innerRadius={0}
                        outerRadius={0}
                        label={({ cx, cy }) => (
                          <DonutCenter cx={cx} cy={cy} total={totalExpense} />
                        )}
                        labelLine={false}
                      >
                        <Cell fill="transparent" stroke="none" />
                      </Pie>
                      <Tooltip formatter={v => `฿${Number(v).toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Legend */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {groupData.map(item => {
                      const grp = BUDGET_GROUPS.find(g => g.group === item.name);
                      const color = grp ? grp.color : C.teal;
                      const pct = totalExpense > 0
                        ? (item.value / totalExpense * 100).toFixed(0) : 0;
                      return (
                        <div key={item.name}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%',
                            background: color, flexShrink: 0 }} />
                          <span style={{ flex: 1, color: C.sub, overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.name}
                          </span>
                          <span style={{ fontWeight: 700, color: C.text }}>
                            ฿{item.value.toLocaleString()}
                          </span>
                          <span style={{ color: C.sub, minWidth: 32, textAlign: 'right' }}>
                            {pct}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Expense by Account */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px',
              boxShadow: '0 1px 8px rgba(13,148,136,0.08)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, color: C.text, fontWeight: 700 }}>
                🏦 Expense by Account
              </h3>
              {accountData.length === 0 ? (
                <p style={{ color: C.sub, textAlign: 'center', padding: 32 }}>No expense data</p>
              ) : (
                <ResponsiveContainer width="100%" height={accountData.length * 52 + 40}>
                  <BarChart data={accountData} layout="vertical"
                    margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false}
                      stroke={C.border} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: C.sub }}
                      tickFormatter={v => `฿${v.toLocaleString()}`}
                      axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name"
                      tick={{ fontSize: 11, fill: C.sub }} width={120}
                      axisLine={false} tickLine={false} />
                    <Tooltip formatter={v => `฿${Number(v).toLocaleString()}`}
                      contentStyle={{ borderRadius: 10, border: `1px solid ${C.border}` }} />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                      {accountData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Budget vs Actual */}
          {budgetVsActual.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px',
              boxShadow: '0 1px 8px rgba(13,148,136,0.08)', marginBottom: 24 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, color: C.text, fontWeight: 700 }}>
                🎯 Budget vs Actual
              </h3>
              <ResponsiveContainer width="100%" height={budgetVsActual.length * 56 + 40}>
                <BarChart data={budgetVsActual} layout="vertical"
                  margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={C.border} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: C.sub }}
                    tickFormatter={v => `฿${v.toLocaleString()}`}
                    axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name"
                    tick={{ fontSize: 11, fill: C.sub }} width={140}
                    axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v, name) => [`฿${Number(v).toLocaleString()}`,
                      name === 'budget' ? 'งบที่ตั้ง' : 'ใช้จริง']}
                    contentStyle={{ borderRadius: 10, border: `1px solid ${C.border}` }} />
                  <Bar dataKey="budget" name="budget" radius={[0, 4, 4, 0]}>
                    {budgetVsActual.map((entry, i) => (
                      <Cell key={i} fill={entry.color + '40'} stroke={entry.color} strokeWidth={1} />
                    ))}
                  </Bar>
                  <Bar dataKey="actual" name="actual" radius={[0, 4, 4, 0]}>
                    {budgetVsActual.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Monthly Spending */}
          {monthlyData.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px',
              boxShadow: '0 1px 8px rgba(13,148,136,0.08)', marginBottom: 24 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, color: C.text, fontWeight: 700 }}>
                📅 Monthly Spending
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData}
                  margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.border} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.sub }}
                    axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: C.sub }}
                    tickFormatter={v => `฿${v.toLocaleString()}`}
                    axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={v => `฿${Number(v).toLocaleString()}`}
                    labelFormatter={l => `เดือน ${l}`}
                    contentStyle={{ borderRadius: 10, border: `1px solid ${C.border}` }} />
                  <Bar dataKey="expense" radius={[6, 6, 0, 0]}>
                    {monthlyData.map((entry, i) => (
                      <Cell key={i}
                        fill={entry.month === selectedMonth ? C.teal : C.tealLight + '80'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ fontSize: 12, color: C.sub, textAlign: 'center', marginTop: 4 }}>
                เดือนที่เลือกแสดงสีเข้ม
              </div>
            </div>
          )}

          {/* Daily Spending */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px',
            boxShadow: '0 1px 8px rgba(13,148,136,0.08)', marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 15, color: C.text, fontWeight: 700 }}>
              📈 Daily Spending
              {selectedMonth && (
                <span style={{ fontSize: 12, color: C.sub,
                  marginLeft: 8, fontWeight: 400 }}>— {selectedMonth}</span>
              )}
            </h3>
            {dailyData.length === 0 ? (
              <p style={{ color: C.sub, textAlign: 'center', padding: 32 }}>No expense data</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={dailyData}>
                  <defs>
                    <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.teal} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={C.teal} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.border} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: C.sub }}
                    axisLine={false} tickLine={false}
                    label={{ value: 'วันที่', position: 'insideBottomRight',
                      offset: -4, fontSize: 11, fill: C.sub }} />
                  <YAxis tick={{ fontSize: 11, fill: C.sub }}
                    tickFormatter={v => `฿${v.toLocaleString()}`}
                    axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={v => `฿${Number(v).toLocaleString()}`}
                    labelFormatter={l => `วันที่ ${l}`}
                    contentStyle={{ borderRadius: 10, border: `1px solid ${C.border}` }} />
                  <Area type="monotone" dataKey="expense"
                    fill="url(#tealGrad)" stroke={C.teal}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: C.teal, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: C.teal }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top Categories table */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px',
            boxShadow: '0 1px 8px rgba(13,148,136,0.08)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, color: C.text, fontWeight: 700 }}>
              🏆 Top Spending Categories
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['#', 'Category', 'Amount', '% of Total'].map(h => (
                    <th key={h} style={{ fontSize: 11, fontWeight: 700,
                      color: C.sub, textTransform: 'uppercase',
                      letterSpacing: 0.5, padding: '8px 0',
                      borderBottom: `1px solid ${C.border}`,
                      textAlign: h === 'Amount' || h === '% of Total' ? 'right' : 'left' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topCategories.map((cat, i) => {
                  const grp = BUDGET_GROUPS.find(g => g.group === cat.name);
                  const color = grp ? grp.color : CHART_COLORS[i % CHART_COLORS.length];
                  const pct = totalExpense > 0
                    ? (cat.value / totalExpense * 100).toFixed(0) : 0;
                  return (
                    <tr key={i}>
                      <td style={{ padding: '10px 0', fontSize: 13 }}>
                        <span style={{ fontWeight: 800, color }}>{i + 1}</span>
                      </td>
                      <td style={{ padding: '10px 8px', fontSize: 13, color: C.text }}>
                        {cat.name}
                      </td>
                      <td style={{ padding: '10px 0', textAlign: 'right' }}>
                        <span style={{ background: '#fef2f2', color: '#ef4444',
                          fontSize: 12, fontWeight: 700, padding: '3px 8px',
                          borderRadius: 20 }}>
                          ฿{cat.value.toLocaleString()}
                        </span>
                      </td>
                      <td style={{ padding: '10px 0', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center',
                          gap: 8, justifyContent: 'flex-end' }}>
                          <div style={{ width: 80, height: 6, borderRadius: 3,
                            background: C.border, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%',
                              background: color, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700,
                            color: C.text, minWidth: 32 }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;