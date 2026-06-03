// ============================================================
// src/services/googleService.js
// ============================================================
import { APPS_SCRIPT_URL, SHEET_TO_APP } from '../constants';

async function call(payload) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  // Read as text first to catch empty/malformed responses
  const text = await res.text();
  console.log('[gs] raw response text (first 200):', text.substring(0, 200));
  if (!text || text.trim() === '') throw new Error('Empty response from Apps Script');
  let data;
  try { data = JSON.parse(text); }
  catch (e) { throw new Error('Bad JSON: ' + text.substring(0, 100)); }
  if (data && data.error) throw new Error(data.error);
  return data;
}

async function callGet(action) {
  const res = await fetch(APPS_SCRIPT_URL + '?action=' + encodeURIComponent(action), {
    method: 'GET',
    redirect: 'follow',
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  if (data && data.error) throw new Error(data.error);
  return data;
}

export function ping()                    { return callGet('ping'); }
export function deleteTransaction(uid)    { return call({ action: 'delete', uid }); }
export function updateTransaction(tx)     { return call({ action: 'update', uid: tx.UID, data: tx }); }
export function importBatch(transactions) { return call({ action: 'importBatch', transactions }); }

export async function upsertTransaction(tx, imageBase64, imageMime) {
  if (imageBase64) {
    console.log('[gs] uploading image, length:', imageBase64.length);
    const uploadRes = await call({
      action: 'uploadImage',
      imageBase64,
      imageMime: imageMime || 'image/jpeg',
      dateStr: tx.DATE || '',
      timeStr: tx.TIME || '',
    });
    console.log('[gs] uploadImage response:', JSON.stringify(uploadRes));
    if (uploadRes.receiptUrl) {
      tx = { ...tx, RECEIPT: uploadRes.receiptUrl };
    }
  }
  const upsertRes = await call({ action: 'upsert', data: tx });
  console.log('[gs] upsert response:', JSON.stringify(upsertRes));
  // Carry receiptUrl forward even if upsert response doesn't echo it
  if (tx.RECEIPT && !upsertRes.receiptUrl) {
    upsertRes.receiptUrl = tx.RECEIPT;
  }
  return upsertRes;
}

export async function fetchAll() {
  const data = await callGet('fetchAll');
  return (data.transactions || []).map(normalizeFromSheet);
}

export function normalizeFromSheet(row) {
  const out = {};
  for (const k of Object.keys(row)) {
    const appKey = SHEET_TO_APP[k] || k;
    out[appKey] = row[k];
  }
  out.INCOME     = Number(out.INCOME)   || 0;
  out.EXPENSE    = Number(out.EXPENSE)  || 0;
  out.TRANSFER   = Number(out.TRANSFER) || 0;
  out.UID        = String(out.UID || '');
  out.UPDATED_AT = Number(out.UPDATED_AT) || 0;
  out.syncStatus = 'synced';
  return out;
}

export const syncFromSheet = fetchAll;