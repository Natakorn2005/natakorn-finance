import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import * as tx from '../services/transactionService';
import * as gs from '../services/googleService';

const C = { teal:'#0d9488', muted:'#f0fdf4', border:'#d1fae5', text:'#134e4a', sub:'#6b7280' };
const card = { background:'#fff', borderRadius:16, padding:'20px 24px', boxShadow:'0 1px 8px rgba(13,148,136,0.08)', marginBottom:16 };

const HEADER_ALIASES = { 'ID':'ID','UID':'UID','UPDATED_AT':'UPDATED_AT','ACCOUNT':'ACCOUNT','DATE':'DATE','TIME':'TIME','DESCRIPTION':'DESCRIPTION','TYPE':'TYPE','REIMBURSE':'REIMBURSE','REPAY':'REPAY','PAY BACK':'PAY_BACK','PAY_BACK':'PAY_BACK','PAYEE / PAYER':'PAYEE_PAYER','PAYEE_PAYER':'PAYEE_PAYER','INCOME':'INCOME','EXPENSE':'EXPENSE','TRANSFER':'TRANSFER','DESTINATION ACCOUNT':'DESTINATION_ACCOUNT','DESTINATION_ACCOUNT':'DESTINATION_ACCOUNT','NOTE':'NOTE','RECEIPT':'RECEIPT' };
function pad(n){return String(n).padStart(2,'0');}
function toDateText(v){if(v instanceof Date) return `${pad(v.getDate())}/${pad(v.getMonth()+1)}/${v.getFullYear()}`; const s=String(v||'').trim(); if(s.includes('-')&&s.length===10){const p=s.split('-');return `${p[2]}/${p[1]}/${p[0]}`;} if(s.includes('/')){const p=s.split('/'); if(p.length===3){let[d,m,y]=p; if(y.length===4&&d.length===4){[d,y]=[y,d];} if(p[0].length===4) return `${pad(p[2])}/${pad(p[1])}/${p[0]}`; return `${pad(d)}/${pad(m)}/${y}`;}} return s;}
function toTimeText(v){if(v instanceof Date) return `${pad(v.getHours())}:${pad(v.getMinutes())}:${pad(v.getSeconds())}`; let s=String(v||'').trim(); if(!s) return '00:00:00'; if(s.length===5) s+=':00'; return s;}
function toBool(v){return v===true||String(v).toUpperCase()==='TRUE'||v===1||v==='1';}
function rowToRecord(raw){const r={}; for(const k of Object.keys(raw)){const ak=HEADER_ALIASES[k.trim()]; if(ak) r[ak]=raw[k];} return {UID:String(r.UID||'').trim()||tx.newUID(),UPDATED_AT:Number(r.UPDATED_AT)||Date.now(),ACCOUNT:(r.ACCOUNT||'').trim()||'เงินสด',DATE:toDateText(r.DATE),TIME:toTimeText(r.TIME),DESCRIPTION:r.DESCRIPTION||'',TYPE:r.TYPE||'',REIMBURSE:toBool(r.REIMBURSE),REPAY:toBool(r.REPAY),PAY_BACK:toBool(r.PAY_BACK),PAYEE_PAYER:r.PAYEE_PAYER||'',INCOME:Number(r.INCOME)||0,EXPENSE:Number(r.EXPENSE)||0,TRANSFER:Number(r.TRANSFER)||0,DESTINATION_ACCOUNT:r.DESTINATION_ACCOUNT||'',NOTE:r.NOTE||'',RECEIPT:r.RECEIPT||'',syncStatus:'pending'};}
function localKey(r){return [r.DATE,r.TIME,Number(r.INCOME)||0,Number(r.EXPENSE)||0,Number(r.TRANSFER)||0,r.ACCOUNT,r.DESCRIPTION].join('|');}

export default function ImportExport() {
  const [status,setStatus]=useState(''); const [statusType,setStatusType]=useState(''); const [busy,setBusy]=useState(false);
  const show=(msg,type='info')=>{setStatus(msg);setStatusType(type);};
  const statusBg=statusType==='ok'?C.muted:statusType==='err'?'#fee2e2':'#eff6ff';
  const statusCol=statusType==='ok'?'#16a34a':statusType==='err'?'#dc2626':'#1d4ed8';

  async function handleFile(e){
    const file=e.target.files?.[0]; if(!file) return; setBusy(true); show('กำลังอ่านไฟล์...','info');
    try{
      const buf=await file.arrayBuffer(); const wb=XLSX.read(buf,{type:'array',cellDates:true}); const ws=wb.Sheets[wb.SheetNames.find(n=>/รายรับ|IMPORT|Sheet/i.test(n))||wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
      const records=rows.map(rowToRecord).filter(r=>r.DATE&&(r.INCOME||r.EXPENSE||r.TRANSFER||r.DESCRIPTION));
      const existing=tx.getAll(); const seen=new Set(existing.map(localKey)); const fresh=[];
      for(const rec of records){const k=localKey(rec); if(seen.has(k)) continue; seen.add(k); fresh.push(rec);}
      const merged=tx.reindexLocal([...existing,...fresh]); localStorage.setItem('ft_transactions',JSON.stringify(merged));
      show(`อ่านได้ ${records.length} แถว — เพิ่มใหม่ ${fresh.length} แถว`,'ok');
      if(tx.isSyncOn()&&navigator.onLine&&fresh.length){show('กำลังส่งขึ้น Google Sheet...','info'); const r=await gs.importBatch(fresh.map(tx.toSheet)); await tx.pullFromSheet(); show(`✅ สำเร็จ: เพิ่ม ${r.added} ข้าม ${r.skipped}`,'ok');}
      else if(fresh.length) show(`✅ เพิ่มในเครื่อง ${fresh.length} แถว`,'ok');
      else show('ℹ️ ไม่มีรายการใหม่','info');
    }catch(err){show('❌ ผิดพลาด: '+err.message,'err');}
    finally{setBusy(false); e.target.value='';}
  }

  function handleExport(){
    const all=tx.reindexLocal(tx.getAll());
    const HEAD=['ID','ACCOUNT','DATE','TIME','DESCRIPTION','TYPE','REIMBURSE','REPAY','PAY BACK','PAYEE / PAYER','INCOME','EXPENSE','TRANSFER','DESTINATION ACCOUNT','TOTAL','RECEIPT','NOTE','UID','UPDATED_AT'];
    const data=all.map(t=>({'ID':t.ID,'ACCOUNT':t.ACCOUNT,'DATE':t.DATE,'TIME':t.TIME,'DESCRIPTION':t.DESCRIPTION,'TYPE':t.TYPE,'REIMBURSE':t.REIMBURSE?'TRUE':'FALSE','REPAY':t.REPAY?'TRUE':'FALSE','PAY BACK':t.PAY_BACK?'TRUE':'FALSE','PAYEE / PAYER':t.PAYEE_PAYER,'INCOME':t.INCOME,'EXPENSE':t.EXPENSE,'TRANSFER':t.TRANSFER,'DESTINATION ACCOUNT':t.DESTINATION_ACCOUNT,'TOTAL':t.TOTAL,'RECEIPT':t.RECEIPT,'NOTE':t.NOTE,'UID':t.UID,'UPDATED_AT':t.UPDATED_AT}));
    const ws=XLSX.utils.json_to_sheet(data,{header:HEAD}); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'บัญชีรายรับ-รายจ่าย'); XLSX.writeFile(wb,`FinanceTrack_Export_${Date.now()}.xlsx`); show('✅ ดาวน์โหลดสำเร็จ','ok');
  }

  function handleDownloadTemplate(){
    const HEAD=['ID','ACCOUNT','DATE','TIME','DESCRIPTION','TYPE','REIMBURSE','REPAY','PAY BACK','PAYEE / PAYER','INCOME','EXPENSE','TRANSFER','DESTINATION ACCOUNT','NOTE','RECEIPT','UID','UPDATED_AT'];
    const example=[{'ID':'','ACCOUNT':'เงินสด','DATE':'01/06/2026','TIME':'10:30:00','DESCRIPTION':'ตัวอย่าง: กาแฟ','TYPE':'อาหารและเครื่องดื่ม : เครื่องดื่ม','REIMBURSE':'FALSE','REPAY':'FALSE','PAY BACK':'FALSE','PAYEE / PAYER':'ร้านกาแฟ','INCOME':0,'EXPENSE':45,'TRANSFER':0,'DESTINATION ACCOUNT':'','NOTE':'','RECEIPT':'','UID':'','UPDATED_AT':''}];
    const ws=XLSX.utils.json_to_sheet(example,{header:HEAD}); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'IMPORT'); XLSX.writeFile(wb,'FinanceTrack_Import_Template.xlsx'); show('✅ ดาวน์โหลด Template สำเร็จ','ok');
  }

  async function handlePull(){setBusy(true);show('กำลังดึงข้อมูล...','info'); try{const r=await tx.pullFromSheet();show(`✅ ดึงสำเร็จ: ${r.merged} รายการ`,'ok');}catch(err){show('❌ '+err.message,'err');}finally{setBusy(false);}}

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text}}>Import / Export</h1>
        <p style={{margin:'2px 0 0',fontSize:13,color:C.sub}}>นำเข้าหรือส่งออกข้อมูลธุรกรรมของคุณ</p>
      </div>
      {status&&<div style={{background:statusBg,color:statusCol,borderRadius:10,padding:'12px 16px',marginBottom:24,fontSize:14,fontWeight:600,border:`1px solid ${statusType==='ok'?C.border:statusType==='err'?'#fecaca':'#bfdbfe'}`}}>{status}</div>}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,alignItems:'start'}}>
        <div style={card}>
          <h3 style={{margin:'0 0 4px',fontSize:15,color:C.text,fontWeight:700}}>📥 นำเข้าข้อมูล (.xlsx)</h3>
          <p style={{fontSize:13,color:C.sub,marginBottom:16}}>DATE = DD/MM/YYYY · TIME = HH:MM:SS · ACCOUNT แบบ ()<br/>ไม่ต้องกรอก ID / UID ระบบสร้างให้อัตโนมัติ</p>
          <label style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:'24px 16px',borderRadius:10,border:`2px dashed ${C.border}`,background:C.muted,cursor:busy?'not-allowed':'pointer',marginBottom:12}}>
            <span style={{fontSize:32}}>📎</span>
            <span style={{fontSize:13,color:C.teal,fontWeight:600}}>{busy?'กำลังประมวลผล...':'คลิกเพื่อเลือกไฟล์'}</span>
            <span style={{fontSize:11,color:C.sub}}>รองรับ .xlsx, .xls, .csv</span>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} disabled={busy} style={{display:'none'}}/>
          </label>
          <button onClick={handleDownloadTemplate} disabled={busy} style={{width:'100%',padding:'10px 0',borderRadius:9,border:`1px solid ${C.border}`,background:C.muted,color:C.teal,fontWeight:700,cursor:'pointer',fontSize:13}}>📋 ดาวน์โหลด Import Template</button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={card}>
            <h3 style={{margin:'0 0 4px',fontSize:15,color:C.text,fontWeight:700}}>📤 ส่งออกข้อมูล (.xlsx)</h3>
            <p style={{fontSize:13,color:C.sub,marginBottom:16}}>ดาวน์โหลดข้อมูลทั้งหมดในรูปแบบ canonical layout</p>
            <button onClick={handleExport} disabled={busy} style={{width:'100%',padding:'12px 0',borderRadius:9,border:'none',background:C.teal,color:'#fff',fontWeight:700,cursor:'pointer',fontSize:13}}>⬇️ ดาวน์โหลด ({tx.getAll().length} รายการ)</button>
          </div>
          <div style={card}>
            <h3 style={{margin:'0 0 4px',fontSize:15,color:C.text,fontWeight:700}}>🔄 ซิงค์กับ Google Sheet</h3>
            <p style={{fontSize:13,color:C.sub,marginBottom:16}}>ดึงข้อมูลจาก Google Sheet และรวมกับข้อมูลในเครื่อง</p>
            <button onClick={handlePull} disabled={busy} style={{width:'100%',padding:'12px 0',borderRadius:9,border:`1px solid ${C.border}`,background:C.muted,color:C.teal,fontWeight:700,cursor:'pointer',fontSize:13}}>
              {busy?'⏳ กำลังดึงข้อมูล...':'☁️ ดึงข้อมูลจาก Google Sheet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}