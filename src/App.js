import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Upload from './pages/Upload';
import Transactions from './pages/Transactions';
import Dashboard from './pages/Dashboard';
import Planning from './pages/Planning';
import Settings from './pages/Settings';
import ManualEntry from './pages/ManualEntry';
import ImportExport from './pages/ImportExport';
import Accounts from './pages/Accounts';
import EditTransaction from './pages/EditTransaction';
import Login from './pages/Login';
import BudgetPlans from './pages/BudgetPlans';
import SavingsGoals from './pages/SavingsGoals';
import Debt from './pages/Debt';
import Repay from './pages/Repay';
import Investment from './pages/Investment';
import README from './pages/README';
import PrintReport from './pages/PrintReport';
import {
  LayoutDashboard, Upload as UploadIcon, List, Target,
  Settings as SettingsIcon, PenLine, FileUp, Wallet,
  LogOut, BookOpen, PiggyBank, CreditCard, ReceiptText,
  TrendingUp, BookMarked, Printer, MoreHorizontal,
} from 'lucide-react';
import { bootstrapSync } from './services/transactionService';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    const session = localStorage.getItem('auth_session');
    if (session === 'true') setIsLoggedIn(true);
  }, []);

  useEffect(() => {
    if (isLoggedIn) bootstrapSync();
  }, [isLoggedIn]);

  const handleLogout = () => {
    localStorage.removeItem('auth_session');
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <Router>
      <div style={{ display:'flex', flexDirection: isMobile ? 'column' : 'row', minHeight:'100vh' }}>

        {/* ── Desktop Sidebar ── */}
        {!isMobile && (
          <nav className="sidebar">
            <div className="logo">
              <img src="/favicon-white.svg" alt="FT" style={{width:36,height:36,borderRadius:10,flexShrink:0}} />
              <div className="logo-text">
                <span style={{fontFamily:"'Libre Baskerville', Georgia, serif", letterSpacing:0}}>
                  Finance<em style={{fontStyle:'italic', fontWeight:800, fontFamily:'Inter,sans-serif'}}>Track</em>
                </span>
                <span>Personal Finance</span>
              </div>
            </div>

            <div className="sidebar-section">Overview</div>
            <NavLink to="/" end><LayoutDashboard size={17}/> Dashboard</NavLink>
            <NavLink to="/accounts"><Wallet size={17}/> Accounts</NavLink>

            <div className="sidebar-section">Record</div>
            <NavLink to="/upload"><UploadIcon size={17}/> Upload Slip</NavLink>
            <NavLink to="/manual"><PenLine size={17}/> Manual Entry</NavLink>
            <NavLink to="/transactions"><List size={17}/> Transactions</NavLink>

            <div className="sidebar-section">Planning</div>
            <NavLink to="/planning"><Target size={17}/> Planning</NavLink>
            <NavLink to="/budget"><BookOpen size={17}/> Budget Tracker</NavLink>
            <NavLink to="/goals"><PiggyBank size={17}/> Savings Goals</NavLink>

            <div className="sidebar-section">Finance</div>
            <NavLink to="/debt"><CreditCard size={17}/> Debt</NavLink>
            <NavLink to="/repay"><ReceiptText size={17}/> Repay</NavLink>
            <NavLink to="/investment"><TrendingUp size={17}/> Investment</NavLink>

            <div className="sidebar-section">System</div>
            <NavLink to="/importexport"><FileUp size={17}/> Import / Export</NavLink>
            <NavLink to="/print"><Printer size={17}/> Print Report</NavLink>
            <NavLink to="/readme"><BookMarked size={17}/> README</NavLink>
            <NavLink to="/settings"><SettingsIcon size={17}/> Settings</NavLink>

            <div style={{ flex: 1 }} />
            <div className="sidebar-profile">
              <div className="sidebar-profile-avatar">NW</div>
              <div className="sidebar-profile-info">
                <span>Natakorn</span>
                <span>Personal Finance</span>
              </div>
            </div>
            <button onClick={handleLogout} style={{ display:'flex', alignItems:'center', gap:10, color:'rgba(255,255,255,0.6)', background:'none', border:'none', cursor:'pointer', padding:'11px 20px', margin:'4px 10px 16px', borderRadius:10, fontSize:13.5, width:'calc(100% - 20px)', transition:'all 0.18s', fontFamily:'inherit', fontWeight:500 }}
              onMouseEnter={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.15)'; e.currentTarget.style.color='#fff'; }}
              onMouseLeave={e=>{ e.currentTarget.style.background='none'; e.currentTarget.style.color='rgba(255,255,255,0.6)'; }}>
              <LogOut size={17}/> Logout
            </button>
          </nav>
        )}

        {/* ── Mobile Header ── */}
        {isMobile && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'linear-gradient(90deg,#0d9488,#16a34a)', padding:'12px 16px', position:'sticky', top:0, zIndex:99, color:'#fff' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, fontWeight:800, fontSize:15 }}>
              <img src="/favicon.svg" alt="FT" style={{width:30,height:30,borderRadius:8,flexShrink:0}} />
              <span style={{fontFamily:"'Libre Baskerville',Georgia,serif"}}>Finance<em style={{fontStyle:'italic',fontWeight:800,fontFamily:"Inter,sans-serif"}}>Track</em></span>
            </div>
            <button onClick={handleLogout} style={{ background:'rgba(255,255,255,0.2)', border:'none', color:'#fff', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:4, fontFamily:'inherit', fontWeight:600 }}>
              <LogOut size={14}/> Logout
            </button>
          </div>
        )}

        {/* ── Main Content ── */}
        <main style={{ marginLeft: isMobile ? 0 : 240, flex:1, padding: isMobile ? '16px 12px 80px' : '28px 32px', minHeight:'100vh', background:'#f0fdf4' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/manual" element={<ManualEntry />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/budget" element={<BudgetPlans />} />
            <Route path="/goals" element={<SavingsGoals />} />
            <Route path="/debt" element={<Debt />} />
            <Route path="/repay" element={<Repay />} />
            <Route path="/investment" element={<Investment />} />
            <Route path="/importexport" element={<ImportExport />} />
            <Route path="/print" element={<PrintReport />} />
            <Route path="/readme" element={<README />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/edit" element={<EditTransaction />} />
          </Routes>
        </main>

        {/* ── Mobile Bottom Nav ── */}
        {isMobile && (
          <>
            {/* More drawer */}
            {showMore && (
              <div onClick={()=>setShowMore(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:150 }}>
                <div onClick={e=>e.stopPropagation()} style={{ position:'absolute', bottom:60, left:0, right:0, background:'#fff', borderRadius:'20px 20px 0 0', padding:'20px 16px 16px', boxShadow:'0 -8px 32px rgba(0,0,0,0.15)' }}>
                  <div style={{ textAlign:'center', marginBottom:16, fontSize:13, fontWeight:700, color:'#134e4a' }}>More Pages</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                    {[
                      ['/planning','🎯','Planning'],
                      ['/goals','🐷','Goals'],
                      ['/debt','💳','Debt'],
                      ['/repay','📋','Repay'],
                      ['/investment','📈','Investment'],
                      ['/importexport','📂','Import'],
                      ['/print','🖨️','Print'],
                      ['/readme','📖','README'],
                    ].map(([path,icon,label])=>(
                      <NavLink key={path} to={path} onClick={()=>setShowMore(false)}
                        style={({isActive})=>({ display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'12px 4px', borderRadius:12, textDecoration:'none', background:isActive?'#f0fdf4':'#f9fffe', border:'1px solid #d1fae5', color:isActive?'#0d9488':'#134e4a' })}>
                        <span style={{fontSize:24}}>{icon}</span>
                        <span style={{fontSize:10,fontWeight:600}}>{label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <nav style={{ display:'flex', position:'fixed', bottom:0, left:0, right:0, background:'#fff', borderTop:'1px solid #d1fae5', zIndex:100, padding:'4px 0', boxShadow:'0 -4px 20px rgba(13,148,136,0.08)' }}>
              <NavLink to="/" end style={({isActive})=>({ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'6px 2px', textDecoration:'none', color:isActive?'#0d9488':'#aaa', gap:2 })}>
                <LayoutDashboard size={20}/><span style={{fontSize:9,fontWeight:600}}>Home</span>
              </NavLink>
              <NavLink to="/accounts" style={({isActive})=>({ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'6px 2px', textDecoration:'none', color:isActive?'#0d9488':'#aaa', gap:2 })}>
                <Wallet size={20}/><span style={{fontSize:9,fontWeight:600}}>Accounts</span>
              </NavLink>
              <NavLink to="/upload" style={({isActive})=>({ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'6px 2px', textDecoration:'none', color:isActive?'#0d9488':'#aaa', gap:2 })}>
                <UploadIcon size={20}/><span style={{fontSize:9,fontWeight:600}}>Upload</span>
              </NavLink>
              <NavLink to="/manual" style={({isActive})=>({ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'6px 2px', textDecoration:'none', color:isActive?'#0d9488':'#aaa', gap:2 })}>
                <PenLine size={20}/><span style={{fontSize:9,fontWeight:600}}>Manual</span>
              </NavLink>
              <NavLink to="/transactions" style={({isActive})=>({ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'6px 2px', textDecoration:'none', color:isActive?'#0d9488':'#aaa', gap:2 })}>
                <List size={20}/><span style={{fontSize:9,fontWeight:600}}>History</span>
              </NavLink>
              <NavLink to="/budget" style={({isActive})=>({ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'6px 2px', textDecoration:'none', color:isActive?'#0d9488':'#aaa', gap:2 })}>
                <BookOpen size={20}/><span style={{fontSize:9,fontWeight:600}}>Budget</span>
              </NavLink>
              <NavLink to="/settings" style={({isActive})=>({ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'6px 2px', textDecoration:'none', color:isActive?'#0d9488':'#aaa', gap:2 })}>
                <SettingsIcon size={20}/><span style={{fontSize:9,fontWeight:600}}>Settings</span>
              </NavLink>
              <button onClick={()=>setShowMore(p=>!p)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'6px 2px', background:'none', border:'none', cursor:'pointer', color:showMore?'#0d9488':'#aaa', gap:2 }}>
                <MoreHorizontal size={20}/><span style={{fontSize:9,fontWeight:600}}>More</span>
              </button>
            </nav>
          </>
        )}

      </div>
    </Router>
  );
}

export default App;