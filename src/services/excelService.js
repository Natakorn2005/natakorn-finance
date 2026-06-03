import * as XLSX from 'xlsx';
import { ACCOUNT_MAP, ACCOUNT_COL_MAP } from '../constants';

// Convert Excel serial date to DD/MM/YYYY
function excelDateToString(serial) {
  if (!serial) return '';
  if (typeof serial === 'string' && serial.includes('/')) return serial;
  if (typeof serial === 'string' && serial.includes('-')) {
    const p = serial.split('-');
    return `${p[2]}/${p[1]}/${p[0]}`;
  }
  if (typeof serial === 'number') {
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = date.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  return String(serial);
}

// Convert Excel serial time to HH:MM:SS
function excelTimeToString(serial) {
  if (!serial) return '00:00:00';
  if (typeof serial === 'string' && serial.includes(':')) {
    return serial.length === 5 ? serial + ':00' : serial;
  }
  if (typeof serial === 'number') {
    const totalSeconds = Math.round(serial * 86400);
    const hh = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const ss = String(totalSeconds % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return '00:00:00';
}

// IMPORT: Read Excel file and return transactions array
export function importFromExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });

        // Find the transaction sheet
        const sheetName = wb.SheetNames.find(n =>
          n.includes('บัญชีรายรับ') || n.includes('Sheet1') || n.includes('transaction')
        ) || wb.SheetNames[0];

        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        // Find header row
        let headerRow = 0;
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          if (rows[i].some(c =>
            String(c).toUpperCase().includes('DATE') ||
            String(c).includes('วันที่')
          )) {
            headerRow = i;
            break;
          }
        }

        const headers = rows[headerRow].map(h =>
          String(h).trim().toUpperCase()
            .replace('PAYEE / PAYER', 'PAYEE_PAYER')
            .replace('DESTINATION ACCOUNT', 'DESTINATION_ACCOUNT')
            .replace('PAY BACK', 'PAY_BACK')
        );

        const transactions = [];
        const dateCounters = {};

        for (let i = headerRow + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.every(c => c === '' || c === null)) continue;

          const tx = {};
          headers.forEach((h, idx) => { tx[h] = row[idx]; });

          if (!tx.DATE && !tx.ACCOUNT) continue;

          const dateStr = excelDateToString(tx.DATE);
          const timeStr = excelTimeToString(tx.TIME);
          if (!dateStr || dateStr === '') continue;

          // Generate ID
          const dp = dateStr.split('/');
          const dateKey = dp.length === 3 ? `${dp[2]}${dp[1]}${dp[0]}` : '00000000';
          dateCounters[dateKey] = (dateCounters[dateKey] || 0) + 1;
          const id = tx.ID || `${dateKey}_${String(dateCounters[dateKey]).padStart(3, '0')}`;

          // Normalize account name using shared ACCOUNT_MAP
          const rawAccount = String(tx.ACCOUNT || '').trim();
          const account = ACCOUNT_MAP[rawAccount] || rawAccount || 'เงินสด';

          // Normalize destination account
          const rawDest = String(tx.DESTINATION_ACCOUNT || tx['DESTINATION ACCOUNT'] || '').trim();
          const destAccount = ACCOUNT_MAP[rawDest] || rawDest || '';

          transactions.push({
            ID: id,
            ACCOUNT: account,
            DATE: dateStr,
            TIME: timeStr,
            DESCRIPTION: String(tx.DESCRIPTION || '').trim(),
            TYPE: String(tx.TYPE || '').trim(),
            REIMBURSE: String(tx.REIMBURSE || '').toLowerCase() === 'true',
            REPAY: String(tx.REPAY || '').toLowerCase() === 'true',
            PAY_BACK: String(tx.PAY_BACK || tx['PAY BACK'] || '').toLowerCase() === 'true',
            PAYEE_PAYER: String(tx.PAYEE_PAYER || tx['PAYEE / PAYER'] || '').trim(),
            INCOME: parseFloat(tx.INCOME || 0) || 0,
            EXPENSE: parseFloat(tx.EXPENSE || 0) || 0,
            TRANSFER: parseFloat(tx.TRANSFER || 0) || 0,
            DESTINATION_ACCOUNT: destAccount,
            NOTE: String(tx.NOTE || '').trim(),
            RECEIPT: String(tx.RECEIPT || '').trim(),
          });
        }

        // Sort by date/time and regenerate IDs
        const sorted = transactions.sort((a, b) => {
          const getKey = (tx) => {
            const dp = (tx.DATE || '').split('/');
            const tp = (tx.TIME || '').split(':');
            return dp.length === 3
              ? `${dp[2]}${dp[1]}${dp[0]}_${(tp[0]||'00')}${(tp[1]||'00')}`
              : '99999999_9999';
          };
          return getKey(a) > getKey(b) ? 1 : -1;
        });

        const counters = {};
        const final = sorted.map(tx => {
          const dp = (tx.DATE || '').split('/');
          const dateKey = dp.length === 3 ? `${dp[2]}${dp[1]}${dp[0]}` : '00000000';
          counters[dateKey] = (counters[dateKey] || 0) + 1;
          return { ...tx, ID: `${dateKey}_${String(counters[dateKey]).padStart(3, '0')}` };
        });

        resolve({ transactions: final, sheetName });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

// EXPORT: Generate Excel file matching your exact format
export function exportToExcel(transactions) {
  const wb = XLSX.utils.book_new();

  const headers = [
    'ID', 'ACCOUNT', 'DATE', 'TIME', 'DESCRIPTION', 'TYPE',
    'REIMBURSE', 'REPAY', 'PAY BACK', 'PAYEE / PAYER',
    'INCOME', 'EXPENSE', 'TRANSFER', 'DESTINATION ACCOUNT',
    'NOTE', 'RECEIPT',
    'KMA_Daily', 'TrueMoney', 'UOB_Credit', 'Cash',
    'SCB_Yearly', 'SCB_Monthly', 'SCB_Uni', 'Anywheel', 'KMA_Board', 'Kept', 'TOTAL'
  ];

  // Calculate running totals
  let runningTotal = 0;
  const rows = transactions.map(tx => {
    const income = Number(tx.INCOME) || 0;
    const expense = Number(tx.EXPENSE) || 0;
    const transfer = Number(tx.TRANSFER) || 0;
    runningTotal = runningTotal + income - expense;

    // Per-account columns using shared ACCOUNT_COL_MAP
    const accountCols = {
      KMA_Daily: 0, TrueMoney: 0, UOB_Credit: 0, Cash: 0,
      SCB_Yearly: 0, SCB_Monthly: 0, SCB_Uni: 0,
      Anywheel: 0, KMA_Board: 0, Kept: 0,
    };
    const colName = ACCOUNT_COL_MAP[tx.ACCOUNT];
    if (colName) {
      accountCols[colName] = income > 0 ? income
        : expense > 0 ? -expense
        : transfer > 0 ? -transfer : 0;
    }

    return [
      tx.ID || '',
      tx.ACCOUNT || '',
      tx.DATE || '',
      tx.TIME || '',
      tx.DESCRIPTION || '',
      tx.TYPE || '',
      tx.REIMBURSE ? 'TRUE' : 'FALSE',
      tx.REPAY ? 'TRUE' : 'FALSE',
      tx.PAY_BACK ? 'TRUE' : 'FALSE',
      tx.PAYEE_PAYER || '',
      income || 0,
      expense || 0,
      transfer || 0,
      tx.DESTINATION_ACCOUNT || '',
      tx.NOTE || '',
      tx.RECEIPT || '',
      accountCols.KMA_Daily,
      accountCols.TrueMoney,
      accountCols.UOB_Credit,
      accountCols.Cash,
      accountCols.SCB_Yearly,
      accountCols.SCB_Monthly,
      accountCols.SCB_Uni,
      accountCols.Anywheel,
      accountCols.KMA_Board,
      accountCols.Kept,
      runningTotal,
    ];
  });

  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws['!cols'] = [
    { wch: 16 }, { wch: 22 }, { wch: 12 }, { wch: 10 },
    { wch: 30 }, { wch: 35 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 25 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 22 }, { wch: 20 }, { wch: 30 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'บัญชีรายรับ-รายจ่าย');

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  XLSX.writeFile(wb, `FinanceTrack_${dateStr}.xlsx`);
}