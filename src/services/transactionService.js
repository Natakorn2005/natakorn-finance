// ============================================================
// src/services/transactionService.js
// localStorage = primary store. Google Sheet = mirror.
// ============================================================
import {
  LS_TX, LS_QUEUE, LS_SYNC_ON, LS_LAST_PULL,
} from '../constants';
import * as gs from './googleService';

const LS_DELETED = 'ft_deleted_uids'; // tombstone set

// ---------- low-level localStorage ----------
function readArr(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function writeArr(key, arr) { localStorage.setItem(key, JSON.stringify(arr)); }

export function getAll()      { return readArr(LS_TX); }
function setAll(arr)          { writeArr(LS_TX, arr); }
export function isSyncOn()    { return localStorage.getItem(LS_SYNC_ON) === '1'; }
export function setSyncOn(on) { localStorage.setItem(LS_SYNC_ON, on ? '1' : '0'); }

// ---------- tombstone helpers ----------
function getDeleted()       { try { return new Set(JSON.parse(localStorage.getItem(LS_DELETED) || '[]')); } catch { return new Set(); } }
function addTombstone(uid)  { const s = getDeleted(); s.add(uid); localStorage.setItem(LS_DELETED, JSON.stringify([...s])); }
function clearTombstone(uid){ const s = getDeleted(); s.delete(uid); localStorage.setItem(LS_DELETED, JSON.stringify([...s])); }

// ---------- identity helpers ----------
export function newUID() {
  if (crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  return (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).slice(0, 16);
}

export function makeDisplayId(dateStr, seq) {
  const p = String(dateStr).split('/');
  const ymd = p.length === 3 ? `${p[2]}${pad(p[1])}${pad(p[0])}` : '00000000';
  return `${ymd}_${String(seq).padStart(3, '0')}`;
}
function pad(n) { return String(n).padStart(2, '0'); }

export function reindexLocal(arr) {
  const sorted = [...arr].sort((a, b) => {
    const ka = dateKey(a.DATE) + timeKey(a.TIME);
    const kb = dateKey(b.DATE) + timeKey(b.TIME);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  const counters = {};
  for (const t of sorted) {
    const dk = dateKey(t.DATE);
    counters[dk] = (counters[dk] || 0) + 1;
    t.ID = `${dk}_${String(counters[dk]).padStart(3, '0')}`;
  }
  return sorted;
}
function dateKey(d) { const p = String(d || '').split('/'); return p.length === 3 ? p[2] + pad(p[1]) + pad(p[0]) : '00000000'; }
function timeKey(t) { const p = String(t || '').split(':'); return p.length >= 2 ? pad(p[0]) + pad(p[1]) + pad(p[2] || '00') : '000000'; }

// ---------- sync queue ----------
function enqueue(op) {
  const q = readArr(LS_QUEUE);
  q.push(op);
  writeArr(LS_QUEUE, q);
}

// ---------- save locally ----------
function saveLocal(record) {
  let all = getAll();
  const i = all.findIndex(t => t.UID === record.UID);
  if (i >= 0) all[i] = record; else all.push(record);
  all = reindexLocal(all);
  setAll(all);
  return all.find(t => t.UID === record.UID) || record;
}

// ---------- public CRUD ----------
export async function saveTransaction(tx, imageBase64, imageMime) {
  const now = Date.now();
  const record = {
    ...tx,
    UID: tx.UID || newUID(),
    UPDATED_AT: now,
    syncStatus: 'pending',
  };

  // Remove from tombstone in case this UID was previously deleted
  clearTombstone(record.UID);

  // Save locally first so UI is always responsive
  const saved = saveLocal(record);

  if (isSyncOn() && navigator.onLine) {
    try {
      const res = await gs.upsertTransaction(toSheet(record), imageBase64 || null, imageMime || null);
      if (res.receiptUrl) saved.RECEIPT = res.receiptUrl;
      if (res.id)         saved.ID      = res.id;
      saved.syncStatus = 'synced';
      saveLocal(saved);
    } catch (e) {
      enqueue({ op: 'upsert', uid: record.UID, ts: now, imageBase64, imageMime });
    }
  } else {
    enqueue({ op: 'upsert', uid: record.UID, ts: now, imageBase64, imageMime });
    trySync();
  }

  return getAll().find(t => t.UID === record.UID) || saved;
}

export function updateTransaction(tx, imageBase64, imageMime) {
  return saveTransaction({ ...tx, UID: tx.UID }, imageBase64, imageMime);
}

export function deleteTransaction(uid) {
  // 1. Remove from local store
  let all = getAll().filter(t => t.UID !== uid);
  all = reindexLocal(all);
  setAll(all);

  // 2. Mark as tombstoned so pull never restores it
  addTombstone(uid);

  // 3. Queue delete for sheet sync
  enqueue({ op: 'delete', uid, ts: Date.now() });
  trySync();
}

// ---------- queue drain (app -> sheet) ----------
let draining = false;
export async function trySync() {
  if (!isSyncOn() || !navigator.onLine || draining) return;
  draining = true;
  try {
    const q     = readArr(LS_QUEUE);
    const all   = getAll();
    const byUid = Object.fromEntries(all.map(t => [t.UID, t]));
    const done  = [];

    for (const op of q) {
      try {
        if (op.op === 'delete') {
          await gs.deleteTransaction(op.uid);
          clearTombstone(op.uid); // sheet is clean, tombstone no longer needed
        } else {
          const rec = byUid[op.uid];
          if (!rec) { done.push(op); continue; } // deleted before sync — skip
          const res = await gs.upsertTransaction(toSheet(rec), op.imageBase64 || null, op.imageMime || null);
          if (res.receiptUrl && !rec.RECEIPT) {
            rec.RECEIPT    = res.receiptUrl;
            rec.syncStatus = 'synced';
            saveLocal(rec);
          }
        }
        done.push(op);
      } catch (e) {
        break; // stop on first failure; retry next time
      }
    }

    const remaining = q.filter(op => !done.includes(op));
    writeArr(LS_QUEUE, remaining);
    if (remaining.length === 0) {
      setAll(getAll().map(t => ({ ...t, syncStatus: 'synced' })));
    }
  } finally {
    draining = false;
  }
}

// ---------- pull (sheet -> app), newest UPDATED_AT wins ----------
export async function pullFromSheet() {
  if (!isSyncOn() || !navigator.onLine) return { merged: 0 };
  const remote = await gs.fetchAll();
  const local  = getAll();
  const deleted = getDeleted(); // tombstones — UIDs deleted locally but maybe not yet on sheet

  const localByUid  = Object.fromEntries(local.map(t => [t.UID, t]));
  const remoteByUid = Object.fromEntries(remote.map(t => [t.UID, t]));

  const result = {};

  for (const r of remote) {
    // Skip if locally deleted — tombstone wins, sheet will be cleaned on next sync
    if (deleted.has(r.UID)) continue;

    const l = localByUid[r.UID];
    if (!l || (Number(r.UPDATED_AT) || 0) >= (Number(l.UPDATED_AT) || 0)) {
      result[r.UID] = { ...r, syncStatus: 'synced' };
    } else {
      result[r.UID] = l;
    }
  }

  // Keep local-only records that are still pending (not yet pushed to sheet)
  for (const l of local) {
    if (!remoteByUid[l.UID] && l.syncStatus === 'pending') result[l.UID] = l;
  }

  const merged = reindexLocal(Object.values(result));
  setAll(merged);
  localStorage.setItem(LS_LAST_PULL, String(Date.now()));

  // Pull all special data from sheet
  const specialPulls = [
    { fn: gs.fetchInitialBalances, key: 'initialBalances',  check: d => d && Object.keys(d).length > 0 },
    { fn: gs.fetchQuickTemplates,  key: 'quickTemplates',   check: d => d && d.length > 0 },
    { fn: gs.fetchBudgetPlans,     key: 'budgetPlans',      check: d => d !== null && d !== undefined },
    { fn: gs.fetchSavingsGoals,    key: 'savingsGoals',     check: d => d !== null && d !== undefined },
    { fn: gs.fetchInvestments,     key: 'investments',      check: d => d !== null && d !== undefined },
  ];
  for (const { fn, key, check } of specialPulls) {
    try {
      const data = await fn();
      if (check(data)) localStorage.setItem(key, JSON.stringify(data));
    } catch (e) { /* ignore */ }
  }

  // Drain queue now — this will delete tombstoned records from sheet
  trySync();

  return { merged: merged.length };
}

export async function bootstrapSync() {
  if (!isSyncOn()) return;
  try { await pullFromSheet(); } catch (e) { /* offline */ }
  trySync();
  window.addEventListener('online', trySync);
}

// ---------- initial balances sync ----------
export async function saveQuickTemplatesToSheet(templates) {
  if (!isSyncOn() || !navigator.onLine) return;
  try { await gs.saveQuickTemplates(templates); } catch (e) { /* ignore */ }
}

export async function saveBudgetPlansToSheet(plans) {
  if (!isSyncOn() || !navigator.onLine) return;
  try { await gs.saveBudgetPlans(plans); } catch (e) { /* ignore */ }
}

export async function saveSavingsGoalsToSheet(goals) {
  if (!isSyncOn() || !navigator.onLine) return;
  try { await gs.saveSavingsGoals(goals); } catch (e) { /* ignore */ }
}

export async function saveInvestmentsToSheet(investments) {
  if (!isSyncOn() || !navigator.onLine) return;
  try { await gs.saveInvestments(investments); } catch (e) { /* ignore */ }
}

export async function saveInitialBalancesToSheet(balances) {
  if (!isSyncOn() || !navigator.onLine) return;
  try { await gs.saveInitialBalances(balances); } catch (e) { /* ignore */ }
}

// ---------- mapping: app record -> Apps Script payload ----------
export function toSheet(t) {
  return {
    ID:                  t.ID || '',
    UID:                 t.UID,
    UPDATED_AT:          t.UPDATED_AT,
    ACCOUNT:             t.ACCOUNT || '',
    DATE:                t.DATE || '',
    TIME:                t.TIME || '',
    DESCRIPTION:         t.DESCRIPTION || '',
    TYPE:                t.TYPE || '',
    REIMBURSE:           !!t.REIMBURSE,
    REPAY:               !!t.REPAY,
    PAY_BACK:            !!t.PAY_BACK,
    PAYEE_PAYER:         t.PAYEE_PAYER || '',
    INCOME:              Number(t.INCOME)   || 0,
    EXPENSE:             Number(t.EXPENSE)  || 0,
    TRANSFER:            Number(t.TRANSFER) || 0,
    DESTINATION_ACCOUNT: t.DESTINATION_ACCOUNT || '',
    RECEIPT:             t.RECEIPT || '',
    NOTE:                t.NOTE || '',
    CLAIMED_FROM:        t.CLAIMED_FROM || '',
  };
}