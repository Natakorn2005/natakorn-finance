// ============================================================
// src/constants.js — single source of truth for the React app
// ============================================================

// --- Backend ---
export const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxCLqBJwMpATy8vFgbRbdP-y85beQhxBNVJ264QBjEC11yWP54yzVEXhoJPA-YWlw-gnw/exec';
export const SHEET_ID      = '1lvyd4dwVvBRcenyIVKYfJDm9EuDW-ECTnQ05y7c2oi0';
export const DRIVE_FOLDER  = '16XN1vtKn70OXna0uYG7KrhJWvoqYrEXW';

// --- localStorage keys ---
export const LS_TX        = 'ft_transactions';
export const LS_QUEUE     = 'ft_sync_queue';
export const LS_SYNC_ON   = 'ft_sync_enabled';
export const LS_LAST_PULL = 'ft_last_pull';

// --- Accounts ---
export const ACCOUNTS = [
  'KMA (บัญชีเล็ก)',
  'Krungsri Boarding Card',
  'Truemoney Wallet',
  'เงินสด',
  'UOB (บัตรเครดิต)',
  'SCB (บัญชีใหญ่)',
  'SCB (บัญชีกลาง)',
  'SCB (บัญชีมหาวิทยาลัย)',
  'Anywheel Wallet',
  'Kept (บัญชีเงินลงทุน)',
  'Make (บัญชีรายวัน)',
  'PaoTang Wallet (เป๋าตัง)',
];

// --- Transaction types ---
export const EXPENSE_TYPES = [
  'อาหารและเครื่องดื่ม : อาหารและเครื่องดื่ม',
  'อาหารและเครื่องดื่ม : เครื่องดื่ม',
  'อาหารและเครื่องดื่ม : ขนมและของกินเล่น',
  'การเดินทาง : ขนส่งสาธารณะ',
  'การเดินทาง : แท็กซี่ / วินมอเตอร์ไซค์',
  'รายจ่ายประจำเดือน : ค่าหอพัก',
  'รายจ่ายประจำเดือน : ค่าน้ำ / ค่าไฟฟ้า',
  'รายจ่ายประจำเดือน : ค่าซักผ้า / อบผ้า',
  'รายจ่ายประจำเดือน : ค่าเน็ตมือถือ',
  'รายจ่ายประจำเดือน : ค่าบริการรายเดือน',
  'การศึกษา : ค่าการศึกษา',
  'การศึกษา : สื่อการเรียน / เครื่องเขียน',
  'การศึกษา : อุปกรณ์ทำโปรเจกต์',
  'ความบันเทิง : ค่าเข้าร่วมกิจกรรม',
  'ความบันเทิง : ของใช้ส่วนตัว',
  'ความบันเทิง : เสื้อผ้า / เครื่องแต่งกาย',
  'ความบันเทิง : ของขวัญ / สังสรรค์',
  'ความบันเทิง : ท่องเที่ยว',
  'สุขภาพ / ค่ารักษาพยาบาล',
  'เงินออมและการลงทุน : เงินออม',
  'เงินออมและการลงทุน : เงินฉุกเฉิน',
  'เงินออมและการลงทุน : การลงทุน',
  'การโอนย้ายเงิน : ถอนเงิน / โอนเงิน',
  'ค่าใช้จ่ายอื่น ๆ',
];

export const INCOME_TYPES = [
  'รายรับ : เงินประจำเดือน',
  'รายรับ : รายได้เสริม',
  'รายรับ : เงินคืน',
  'รายรับ : รายรับอื่น ๆ',
];
export const ALL_TYPES = [...INCOME_TYPES, ...EXPENSE_TYPES];

// --- Canonical field list ---
export const FIELDS = [
  'ID', 'UID', 'UPDATED_AT', 'ACCOUNT', 'DATE', 'TIME', 'DESCRIPTION', 'TYPE',
  'REIMBURSE', 'REPAY', 'PAY_BACK', 'PAYEE_PAYER', 'INCOME', 'EXPENSE',
  'TRANSFER', 'DESTINATION_ACCOUNT', 'TOTAL', 'RECEIPT', 'NOTE', 'CLAIMED_FROM', 'SETTLED',
];

export const SHEET_TO_APP = {
  'PAYEE / PAYER': 'PAYEE_PAYER',
  'PAYEE_PAYER': 'PAYEE_PAYER',
  'DESTINATION ACCOUNT': 'DESTINATION_ACCOUNT',
  'DESTINATION_ACCOUNT': 'DESTINATION_ACCOUNT',
  'PAY BACK': 'PAY_BACK',
  'PAY_BACK': 'PAY_BACK',
  'CLAIMED_FROM': 'CLAIMED_FROM',
};

export const ACCOUNT_LIST = [
  { key: 'KMA (บัญชีเล็ก)',              icon: '🏦', color: '#667eea' },
  { key: 'Krungsri Boarding Card',        icon: '💳', color: '#764ba2' },
  { key: 'Truemoney Wallet',              icon: '📱', color: '#f59e0b' },
  { key: 'เงินสด',                        icon: '💵', color: '#22c55e' },
  { key: 'UOB (บัตรเครดิต)',              icon: '💳', color: '#ef4444' },
  { key: 'SCB (บัญชีใหญ่)',               icon: '🏛️', color: '#06b6d4' },
  { key: 'SCB (บัญชีกลาง)',               icon: '🏛️', color: '#ec4899' },
  { key: 'SCB (บัญชีมหาวิทยาลัย)',        icon: '🎓', color: '#84cc16' },
  { key: 'Anywheel Wallet',               icon: '🚲', color: '#f97316' },
  { key: 'Kept (บัญชีเงินลงทุน)',         icon: '📈', color: '#8b5cf6' },
  { key: 'Make (บัญชีรายวัน)',            icon: '🏦', color: '#14b8a6' },
  { key: 'PaoTang Wallet (เป๋าตัง)',      icon: '📱', color: '#f43f5e' },
];

export const TYPES = ALL_TYPES;
export const CATEGORIES = ALL_TYPES;