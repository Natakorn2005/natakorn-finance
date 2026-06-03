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
  TrendingUp, BookMarked, Printer,
} from 'lucide-react';
import { bootstrapSync } from './services/transactionService'; // NEW
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // existing — session restore
  useEffect(() => {
    const session = localStorage.getItem('auth_session');
    if (session === 'true') setIsLoggedIn(true);
  }, []);

  // NEW — auto-pull from Sheet + drain offline queue on login
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
      <div className="app">

        {/* ── Desktop Sidebar ── */}
        <nav className="sidebar">

          {/* Logo */}
          <div className="logo">
            <div className="logo-icon">FT</div>
            <div className="logo-text">
              <span>FinanceTrack</span>
              <span>Personal Finance</span>
            </div>
          </div>

          {/* Overview */}
          <div className="sidebar-section">Overview</div>
          <NavLink to="/" end><LayoutDashboard size={17}/> Dashboard</NavLink>
          <NavLink to="/accounts"><Wallet size={17}/> Accounts</NavLink>

          {/* Record */}
          <div className="sidebar-section">Record</div>
          <NavLink to="/upload"><UploadIcon size={17}/> Upload Slip</NavLink>
          <NavLink to="/manual"><PenLine size={17}/> Manual Entry</NavLink>
          <NavLink to="/transactions"><List size={17}/> Transactions</NavLink>

          {/* Planning */}
          <div className="sidebar-section">Planning</div>
          <NavLink to="/planning"><Target size={17}/> Planning</NavLink>
          <NavLink to="/budget"><BookOpen size={17}/> Budget Tracker</NavLink>
          <NavLink to="/goals"><PiggyBank size={17}/> Savings Goals</NavLink>

          {/* Finance */}
          <div className="sidebar-section">Finance</div>
          <NavLink to="/debt"><CreditCard size={17}/> Debt</NavLink>
          <NavLink to="/repay"><ReceiptText size={17}/> Repay</NavLink>
          <NavLink to="/investment"><TrendingUp size={17}/> Investment</NavLink>

          {/* System */}
          <div className="sidebar-section">System</div>
          <NavLink to="/importexport"><FileUp size={17}/> Import / Export</NavLink>
          <NavLink to="/print"><Printer size={17}/> Print Report</NavLink>
          <NavLink to="/readme"><BookMarked size={17}/> README</NavLink>
          <NavLink to="/settings"><SettingsIcon size={17}/> Settings</NavLink>

          {/* Spacer + Logout */}
          <div style={{ flex: 1 }} />
          {/* User Profile */}
          <div className="sidebar-profile">
            <div className="sidebar-profile-avatar">NW</div>
            <div className="sidebar-profile-info">
              <span>Natakorn</span>
              <span>Personal Finance</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              color: 'rgba(255,255,255,0.6)', background: 'none',
              border: 'none', cursor: 'pointer',
              padding: '11px 20px', margin: '4px 10px 16px',
              borderRadius: 10, fontSize: 13.5, width: 'calc(100% - 20px)',
              transition: 'all 0.18s', fontFamily: 'inherit', fontWeight: 500,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
            }}
          >
            <LogOut size={17}/> Logout
          </button>
        </nav>

        {/* ── Mobile Header ── */}
        <div className="mobile-header">
          <div className="mobile-header-logo">
            <div className="mobile-header-logo-icon">FT</div>
            FinanceTrack
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none', color: '#fff',
              borderRadius: 8, padding: '6px 12px',
              cursor: 'pointer', fontSize: 12,
              display: 'flex', alignItems: 'center',
              gap: 4, fontFamily: 'inherit', fontWeight: 600,
            }}
          >
            <LogOut size={14}/> Logout
          </button>
        </div>

        {/* ── Main Content ── */}
        <main className="content">
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

        {/* ── Mobile Bottom Navigation ── */}
        <nav className="mobile-nav">
          <NavLink to="/" end>
            <LayoutDashboard size={20}/>
            <span className="mobile-nav-label">Home</span>
          </NavLink>
          <NavLink to="/accounts">
            <Wallet size={20}/>
            <span className="mobile-nav-label">Accounts</span>
          </NavLink>
          <NavLink to="/upload">
            <UploadIcon size={20}/>
            <span className="mobile-nav-label">Upload</span>
          </NavLink>
          <NavLink to="/manual">
            <PenLine size={20}/>
            <span className="mobile-nav-label">Manual</span>
          </NavLink>
          <NavLink to="/transactions">
            <List size={20}/>
            <span className="mobile-nav-label">History</span>
          </NavLink>
          <NavLink to="/budget">
            <BookOpen size={20}/>
            <span className="mobile-nav-label">Budget</span>
          </NavLink>
          <NavLink to="/settings">
            <SettingsIcon size={20}/>
            <span className="mobile-nav-label">Settings</span>
          </NavLink>
        </nav>

      </div>
    </Router>
  );
}

export default App;