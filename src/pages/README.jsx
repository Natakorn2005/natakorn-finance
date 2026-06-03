import React from 'react';
const C = { teal:'#0d9488', muted:'#f0fdf4', border:'#d1fae5', text:'#134e4a', sub:'#6b7280' };
const card = { background:'#fff', borderRadius:16, padding:'20px 24px', boxShadow:'0 1px 8px rgba(13,148,136,0.08)', marginBottom:24 };

export default function README() {
  const pages=[
    {icon:'📊',name:'Dashboard',path:'/',desc:'Overview of income, expense, net balance, account balances, spending charts, and budget vs actual.',tips:['Select month to filter','Click account cards → Accounts page','Budget vs Actual appears when budgets set']},
    {icon:'🏦',name:'Accounts',path:'/accounts',desc:'Current balance per account. Click any card to see full transaction history with running balance.',tips:['Set initial balances for accurate calculations','Running balance updates automatically']},
    {icon:'📤',name:'Upload Slip',path:'/upload',desc:'Upload e-slip images and let AI extract transaction details automatically. Supports PromptPay, KBank, SCB, TrueMoney, and more.',tips:['Requires API key in Settings','Multi-item receipts split automatically','Review before saving']},
    {icon:'✍️',name:'Manual Entry',path:'/manual',desc:'Record transactions manually without a slip. Supports Expense, Transfer, and Income modes.',tips:['Use for cash transactions','Date/time auto-fills to now','Mark Reimbursable or Repayable if needed']},
    {icon:'📋',name:'Transactions',path:'/transactions',desc:'Full list of all transactions. Filter by month, account, or category. Click row to expand details.',tips:['✏️ Edit opens full edit form','Click row to see Note, Receipt, flags']},
    {icon:'📋',name:'Planning',path:'/planning',desc:'Create and manage budget plans. Each plan has income + per-group budgets. Set one as active.',tips:['Add unlimited plans','Active plan used by Budget Tracker']},
    {icon:'📊',name:'Budget Tracker',path:'/budget',desc:'Track spending against active plan. Fixed expense checker, savings checker, monthly/weekly trackers.',tips:['Fixed expenses auto-detect from transactions','Manual override available']},
    {icon:'🎯',name:'Savings Goals',path:'/goals',desc:'Set savings targets with deadlines. Track progress and get daily savings recommendations.',tips:['Update saved amount regularly']},
    {icon:'💳',name:'Debt',path:'/debt',desc:'Track all debts including credit cards, loans, money owed to friends.',tips:['Quick payment button to log repayments']},
    {icon:'📋',name:'Repay',path:'/repay',desc:'Shows all transactions marked as Repayable. Track which have been reimbursed.',tips:['REPAY=true transactions appear here automatically']},
    {icon:'📈',name:'Investment',path:'/investment',desc:'Track investment portfolio. Records invested amount, current value, and P&L.',tips:['Update current value regularly']},
    {icon:'📂',name:'Import / Export',path:'/importexport',desc:'Import from Excel or export all data. Download import template to get started.',tips:['DATE must be DD/MM/YYYY text','ACCOUNT must use () format','Dedup by DATE+TIME+amount — safe to import multiple times']},
    {icon:'⚙️',name:'Settings',path:'/settings',desc:'Configure API keys, Google Sheets sync, change password.',tips:['Default password: financetrack2026 — change it!','Test Connection before enabling sync']},
  ];

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text}}>README</h1>
        <p style={{margin:'2px 0 0',fontSize:13,color:C.sub}}>How to use FinanceTrack</p>
      </div>

      {/* App overview */}
      <div style={card}>
        <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20}}>
          <img src="/favicon.svg" alt="FinanceTrack" style={{width:64,height:64,borderRadius:16,flexShrink:0,boxShadow:'0 4px 12px rgba(13,148,136,0.2)'}}/>
          <div>
            <h2 style={{fontSize:22,fontWeight:800,margin:0,color:C.text}}>FinanceTrack</h2>
            <p style={{color:C.sub,margin:'4px 0 0',fontSize:14}}>Personal Finance Manager — v2.0.0</p>
            <p style={{color:C.teal,margin:'2px 0 0',fontSize:13}}>By NATAKORN WISETWONGSAHAKIT</p>
          </div>
        </div>
        <p style={{fontSize:14,color:C.sub,lineHeight:1.8,margin:0}}>
          FinanceTrack is a personal finance web app that records, analyzes, and plans your finances. It uses AI (Claude by Anthropic) to automatically read e-slips and extract transaction data. All data is stored locally and synced with Google Sheets.
        </p>
      </div>

      {/* Pages guide */}
      <div style={card}>
        <h3 style={{fontSize:16,marginBottom:20,color:C.text,fontWeight:700}}>🗺️ Pages Guide</h3>
        {pages.map(page=>(
          <div key={page.name} style={{marginBottom:20,paddingBottom:20,borderBottom:`1px solid ${C.muted}`}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <span style={{fontSize:20}}>{page.icon}</span>
              <div>
                <span style={{fontWeight:700,fontSize:15,color:C.text}}>{page.name}</span>
                <span style={{fontSize:12,color:C.sub,marginLeft:8}}>{page.path}</span>
              </div>
            </div>
            <p style={{fontSize:13,color:C.sub,lineHeight:1.7,marginBottom:8,margin:'0 0 8px'}}>{page.desc}</p>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              {page.tips.map((tip,i)=>(
                <div key={i} style={{fontSize:12,color:C.teal,display:'flex',gap:6}}>
                  <span>💡</span><span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Daily workflow */}
      <div style={card}>
        <h3 style={{fontSize:16,marginBottom:16,color:C.text,fontWeight:700}}>📅 Daily Workflow</h3>
        {[['1','📸','Take a screenshot of your e-slip after payment'],['2','📤','Open Upload Slip → drag & drop the image'],['3','🤖','Claude reads the slip automatically'],['4','✅','Review extracted data → edit if needed → Save'],['5','☁️','Image uploads to Google Drive automatically'],['6','📊','Check Dashboard to see updated spending']].map(([step,icon,text])=>(
          <div key={step} style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
            <div style={{width:28,height:28,background:`linear-gradient(135deg,${C.teal},#4ade80)`,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:12,flexShrink:0}}>{step}</div>
            <span style={{fontSize:20}}>{icon}</span>
            <span style={{fontSize:14,color:C.sub}}>{text}</span>
          </div>
        ))}
      </div>

      {/* Account reference */}
      <div style={card}>
        <h3 style={{fontSize:16,marginBottom:16,color:C.text,fontWeight:700}}>🏦 Account Reference</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:10}}>
          {[['KMA (บัญชีเล็ก)','Krungsri ends 4884','🏦'],['Krungsri Boarding Card','Krungsri ends 1183','✈️'],['Kept (บัญชีเงินลงทุน)','Kept investment account','📈'],['Make (บัญชีรายวัน)','Make ends 5754','💳'],['Truemoney Wallet','TrueMoney digital','📱'],['UOB (บัตรเครดิต)','UOB credit card','💳'],['SCB (บัญชีใหญ่)','SCB ends 2455','🏛️'],['SCB (บัญชีกลาง)','SCB ends 6158','🏛️'],['SCB (บัญชีมหาวิทยาลัย)','SCB ends 4772','🎓'],['Anywheel Wallet','Bicycle rental','🚲'],['PaoTang Wallet (เป๋าตัง)','เป๋าตัง wallet','📲'],['เงินสด','Cash','💵']].map(([name,detail,icon])=>(
            <div key={name} style={{background:C.muted,borderRadius:10,padding:'10px 14px',border:`1px solid ${C.border}`}}>
              <div style={{fontSize:16}}>{icon}</div>
              <div style={{fontWeight:600,fontSize:13,marginTop:4,color:C.text}}>{name}</div>
              <div style={{fontSize:12,color:C.sub,marginTop:2}}>{detail}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tech stack */}
      <div style={card}>
        <h3 style={{fontSize:16,marginBottom:16,color:C.text,fontWeight:700}}>⚙️ Tech Stack</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10}}>
          {[['React','Frontend framework','⚛️'],['Claude AI','Slip analysis','🤖'],['Gemini AI','Alternative AI','✨'],['localStorage','Primary store','💾'],['Google Sheets','Cloud sync','📊'],['Google Drive','Receipt storage','☁️'],['Apps Script','Backend API','⚙️'],['Recharts','Charts','📈']].map(([name,desc,icon])=>(
            <div key={name} style={{background:C.muted,borderRadius:10,padding:'10px 14px',textAlign:'center',border:`1px solid ${C.border}`}}>
              <div style={{fontSize:24}}>{icon}</div>
              <div style={{fontWeight:700,fontSize:13,marginTop:4,color:C.text}}>{name}</div>
              <div style={{fontSize:11,color:C.sub,marginTop:2}}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}