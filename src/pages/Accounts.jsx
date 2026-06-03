import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ACCOUNT_LIST } from '../constants';
import { getAll, reindexLocal } from '../services/transactionService';

const C = {
  teal:      '#0d9488',
  tealLight: '#2dd4bf',
  green:     '#4ade80',
  muted:     '#f0fdf4',
  border:    '#d1fae5',
  text:      '#134e4a',
  sub:       '#6b7280',
};

function Accounts() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [initialBalances, setInitialBalances] = useState({});
  const [editingInitial, setEditingInitial] = useState(false);
  const [tempInitial, setTempInitial] = useState({});

  useEffect(() => {
    setTransactions(getAll());
    const saved = JSON.parse(localStorage.getItem('initialBalances') || '{}');
    setInitialBalances(saved);
    setTempInitial(saved);
  }, []);

  const calcBalances = () => {
    const b = {};
    ACCOUNT_LIST.forEach(a => { b[a.key] = Number(initialBalances[a.key] || 0); });
    transactions.forEach(tx => {
      const acc  = tx.ACCOUNT;
      const dest = tx.DESTINATION_ACCOUNT;
      const inc = Number(tx.INCOME)   || 0;
      const exp = Number(tx.EXPENSE)  || 0;
      const tra = Number(tx.TRANSFER) || 0;
      if (acc  && b[acc]  !== undefined) b[acc]  += inc - exp - tra;
      if (dest && b[dest] !== undefined) b[dest] += tra;
    });
    return b;
  };

  const balances     = calcBalances();
  const totalBalance = Object.values(balances).reduce((s, v) => s + v, 0);

  const accountTxs = selectedAccount
    ? reindexLocal(transactions).filter(tx =>
        tx.ACCOUNT === selectedAccount || tx.DESTINATION_ACCOUNT === selectedAccount)
    : [];

  const getRunningBalance = () => {
    let running = Number(initialBalances[selectedAccount] || 0);
    return accountTxs.map(tx => {
      const inc = Number(tx.INCOME)   || 0;
      const exp = Number(tx.EXPENSE)  || 0;
      const tra = Number(tx.TRANSFER) || 0;
      if (tx.ACCOUNT === selectedAccount)                  running += inc - exp - tra;
      else if (tx.DESTINATION_ACCOUNT === selectedAccount) running += tra;
      return { ...tx, runningBalance: running };
    });
  };

  const handleSaveInitial = () => {
    const parsed = {};
    Object.keys(tempInitial).forEach(k => { parsed[k] = parseFloat(tempInitial[k]) || 0; });
    setInitialBalances(parsed);
    localStorage.setItem('initialBalances', JSON.stringify(parsed));
    setEditingInitial(false);
  };

  const handleEditTx = (tx) => {
    localStorage.setItem('editTransaction', JSON.stringify(tx));
    navigate('/edit');
  };

  const txWithRunning = selectedAccount ? getRunningBalance() : [];
  const selectedAccObj = ACCOUNT_LIST.find(a => a.key === selectedAccount);

  return (
    <div style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: C.text }}>
          Account Balances
        </h1>
        <p style={{ margin: '2px 0 0', fontSize: 13, color: C.sub }}>
          Current balance and transaction history per account
        </p>
      </div>

      {/* Total Balance banner — brand gradient */}
      <div style={{
        marginBottom: 24, borderRadius: 16, padding: '24px 28px',
        background: `linear-gradient(135deg, ${C.teal} 0%, ${C.tealLight} 50%, ${C.green} 100%)`,
        color: '#fff', boxShadow: '0 4px 20px rgba(13,148,136,0.25)',
      }}>
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6, fontWeight: 600 }}>
          💰 Total Balance (All Accounts)
        </div>
        <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-1px' }}>
          ฿{totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
        <div style={{ fontSize: 13, opacity: 0.75, marginTop: 6 }}>
          Across {ACCOUNT_LIST.length} accounts
        </div>
      </div>

      {/* Account Cards */}
      <div style={{ display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 14, marginBottom: 24 }}>
        {ACCOUNT_LIST.map(acc => {
          const balance = balances[acc.key] || 0;
          const txCount = transactions.filter(tx =>
            tx.ACCOUNT === acc.key || tx.DESTINATION_ACCOUNT === acc.key
          ).length;
          const isSelected = selectedAccount === acc.key;
          return (
            <div key={acc.key}
              onClick={() => setSelectedAccount(isSelected ? null : acc.key)}
              style={{
                background: '#fff', borderRadius: 16, padding: 20,
                boxShadow: isSelected
                  ? `0 0 0 2px ${acc.color}, 0 4px 16px rgba(0,0,0,0.08)`
                  : '0 1px 8px rgba(13,148,136,0.07)',
                cursor: 'pointer', transition: 'all 0.2s',
                borderLeft: `4px solid ${acc.color}`,
                transform: isSelected ? 'translateY(-2px)' : 'none',
              }}>
              <div style={{ display: 'flex',
                justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ fontSize: 22 }}>{acc.icon}</div>
                <span style={{ fontSize: 11, color: C.sub,
                  background: C.muted, padding: '2px 8px',
                  borderRadius: 20, fontWeight: 600 }}>
                  {txCount} txs
                </span>
              </div>
              <div style={{ fontSize: 12, color: C.sub, marginTop: 8,
                fontWeight: 600, lineHeight: 1.3 }}>
                {acc.key}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8,
                color: balance >= 0 ? C.text : '#ef4444' }}>
                ฿{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              {isSelected && (
                <div style={{ fontSize: 11, color: acc.color,
                  marginTop: 6, fontWeight: 700 }}>
                  ▼ Showing transactions
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Initial Balances */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px',
        boxShadow: '0 1px 8px rgba(13,148,136,0.07)', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: editingInitial ? 16 : 0 }}>
          <div>
            <h3 style={{ fontSize: 15, margin: 0, color: C.text, fontWeight: 700 }}>
              ⚙️ Initial Balances
            </h3>
            {!editingInitial && (
              <p style={{ fontSize: 13, color: C.sub, margin: '4px 0 0' }}>
                Set starting balance for each account
              </p>
            )}
          </div>
          <button onClick={() => setEditingInitial(e => !e)}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none',
              background: editingInitial ? C.muted : C.teal,
              color: editingInitial ? C.teal : '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {editingInitial ? '✕ Cancel' : '✏️ Edit'}
          </button>
        </div>
        {editingInitial && (
          <>
            <div style={{ display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12, marginBottom: 16 }}>
              {ACCOUNT_LIST.map(acc => (
                <div key={acc.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.sub }}>
                    {acc.icon} {acc.key}
                  </label>
                  <input type="number" placeholder="0"
                    value={tempInitial[acc.key] || ''}
                    onChange={e => setTempInitial(prev => ({ ...prev, [acc.key]: e.target.value }))}
                    style={{ padding: '8px 12px', borderRadius: 8,
                      border: `1px solid ${C.border}`, fontSize: 13,
                      outline: 'none', background: C.muted }} />
                </div>
              ))}
            </div>
            <button onClick={handleSaveInitial}
              style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none',
                background: C.teal, color: '#fff', fontSize: 14,
                fontWeight: 700, cursor: 'pointer' }}>
              💾 Save Initial Balances
            </button>
          </>
        )}
      </div>

      {/* Transaction History */}
      {selectedAccount && (
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px',
          boxShadow: '0 1px 8px rgba(13,148,136,0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {selectedAccObj && (
                <span style={{ fontSize: 20 }}>{selectedAccObj.icon}</span>
              )}
              <h3 style={{ fontSize: 15, margin: 0, color: C.text, fontWeight: 700 }}>
                {selectedAccount} — Transaction History
              </h3>
            </div>
            <button onClick={() => setSelectedAccount(null)}
              style={{ padding: '6px 14px', borderRadius: 8,
                border: `1px solid ${C.border}`, background: C.muted,
                color: C.sub, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              ✕ Close
            </button>
          </div>

          {txWithRunning.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: C.sub }}>
              No transactions for this account yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Date', 'Description', 'Category', 'In', 'Out', 'Balance', 'Actions'].map(h => (
                      <th key={h} style={{ fontSize: 11, fontWeight: 700,
                        color: C.sub, textTransform: 'uppercase',
                        letterSpacing: 0.5, padding: '8px 8px',
                        borderBottom: `1px solid ${C.border}`,
                        textAlign: ['In','Out','Balance'].includes(h) ? 'right' : 'left' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {txWithRunning.map(tx => {
                    const isSource = tx.ACCOUNT === selectedAccount;
                    const isDest   = tx.DESTINATION_ACCOUNT === selectedAccount;
                    const inc = Number(tx.INCOME)   || 0;
                    const exp = Number(tx.EXPENSE)  || 0;
                    const tra = Number(tx.TRANSFER) || 0;
                    let inAmt = 0, outAmt = 0;
                    if (isSource)    { inAmt = inc; outAmt = exp + tra; }
                    else if (isDest) { inAmt = tra; }
                    return (
                      <tr key={tx.UID || tx.ID}
                        style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '10px 8px' }}>
                          <div style={{ fontSize: 13, color: C.text,
                            fontWeight: 600 }}>{tx.DATE}</div>
                          <div style={{ fontSize: 11, color: C.sub }}>{tx.TIME}</div>
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <div style={{ fontWeight: 600, fontSize: 13,
                            color: C.text }}>{tx.DESCRIPTION}</div>
                          {tx.PAYEE_PAYER && (
                            <div style={{ fontSize: 11, color: C.sub }}>
                              {tx.PAYEE_PAYER}
                            </div>
                          )}
                          {isDest && !isSource && (
                            <div style={{ fontSize: 11, color: C.teal }}>
                              ← from {tx.ACCOUNT}
                            </div>
                          )}
                          {isSource && tra > 0 && (
                            <div style={{ fontSize: 11, color: C.teal }}>
                              → to {tx.DESTINATION_ACCOUNT}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <span style={{ fontSize: 12, color: C.sub }}>{tx.TYPE}</span>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                          {inAmt > 0 && (
                            <span style={{ background: '#f0fdf4', color: C.greenDark || '#16a34a',
                              fontSize: 12, fontWeight: 700, padding: '3px 8px',
                              borderRadius: 20 }}>
                              +฿{inAmt.toLocaleString()}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                          {outAmt > 0 && (
                            <span style={{ background: '#fef2f2', color: '#ef4444',
                              fontSize: 12, fontWeight: 700, padding: '3px 8px',
                              borderRadius: 20 }}>
                              -฿{outAmt.toLocaleString()}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                          <span style={{ fontWeight: 800, fontSize: 14,
                            color: tx.runningBalance >= 0 ? C.teal : '#ef4444' }}>
                            ฿{tx.runningBalance.toLocaleString(undefined,
                              { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <button onClick={() => handleEditTx(tx)}
                            style={{ padding: '5px 12px', borderRadius: 8, border: 'none',
                              background: C.teal, color: '#fff',
                              fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            ✏️ Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Accounts;