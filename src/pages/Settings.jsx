import React, { useState, useEffect } from 'react';
import { LS_SYNC_ON, LS_TX, ACCOUNTS } from '../constants';
import { ping } from '../services/googleService';
import { pullFromSheet } from '../services/transactionService';

const C = { teal:'#0d9488', tealLight:'#2dd4bf', green:'#4ade80', muted:'#f0fdf4', border:'#d1fae5', text:'#134e4a', sub:'#6b7280' };
const card = { background:'#fff', borderRadius:16, padding:'20px 24px', boxShadow:'0 1px 8px rgba(13,148,136,0.08)', marginBottom:24, maxWidth:560 };
const inp = { width:'100%', padding:'9px 12px', borderRadius:8, border:`1.5px solid #d1fae5`, fontSize:13, outline:'none', background:'#fff', boxSizing:'border-box', fontFamily:'inherit', color:'#134e4a' };
const lbl = { fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:5 };

function PasswordChanger() {
  const [current,setCurrent]=useState(''); const [newPass,setNewPass]=useState(''); const [confirm,setConfirm]=useState(''); const [msg,setMsg]=useState(''); const [error,setError]=useState('');
  const handle=()=>{
    const sp=localStorage.getItem('app_password')||'financetrack2026';
    if(current!==sp){setError('Current password is incorrect.');return;} if(newPass.length<6){setError('At least 6 characters.');return;} if(newPass!==confirm){setError('Passwords do not match.');return;}
    localStorage.setItem('app_password',newPass); setMsg('✅ Password changed!'); setError(''); setCurrent('');setNewPass('');setConfirm(''); setTimeout(()=>setMsg(''),3000);
  };
  return (
    <div>
      {[['Current Password',current,setCurrent],['New Password',newPass,setNewPass],['Confirm',confirm,setConfirm]].map(([l,v,sv])=>(
        <div key={l} style={{marginBottom:14}}><label style={lbl}>{l}</label><input type="password" placeholder={l} value={v} onChange={e=>sv(e.target.value)} style={inp}/></div>
      ))}
      {error&&<div style={{color:'#ef4444',fontSize:13,marginBottom:12}}>❌ {error}</div>}
      {msg&&<div style={{color:'#16a34a',fontSize:13,marginBottom:12}}>{msg}</div>}
      <button onClick={handle} style={{padding:'9px 18px',borderRadius:9,border:'none',background:C.teal,color:'#fff',fontWeight:700,cursor:'pointer',fontSize:13}}>🔑 Change Password</button>
    </div>
  );
}

function GoogleSyncSettings() {
  const [enabled,setEnabled]=useState(localStorage.getItem(LS_SYNC_ON)==='1');
  const [testing,setTesting]=useState(false); const [testResult,setTestResult]=useState(null);
  const [syncing,setSyncing]=useState(false); const [syncMsg,setSyncMsg]=useState('');
  const toggle=()=>{const n=!enabled;setEnabled(n);localStorage.setItem(LS_SYNC_ON,n?'1':'0');setTestResult(null);};
  const handleTest=async()=>{setTesting(true);setTestResult(null);try{const r=await ping();setTestResult(r&&r.status==='ok'?'success':'error');}catch{setTestResult('error');}finally{setTesting(false);};};
  const handlePull=async()=>{setSyncing(true);setSyncMsg('');try{const r=await pullFromSheet();setSyncMsg(`✅ Synced ${r.merged} transactions!`);}catch(err){setSyncMsg('❌ '+err.message);}finally{setSyncing(false);setTimeout(()=>setSyncMsg(''),4000);};};
  return (
    <div>
      <div style={{background:C.muted,borderRadius:10,padding:14,marginBottom:16,fontSize:13,color:C.sub,border:`1px solid ${C.border}`}}>When enabled, transactions sync to Google Sheet automatically.</div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:C.muted,borderRadius:10,marginBottom:12,border:`1px solid ${C.border}`}}>
        <div>
          <div style={{fontWeight:600,fontSize:14,color:C.text}}>Google Sheets Sync</div>
          <div style={{fontSize:12,color:C.sub,marginTop:2}}>{enabled?'✅ Enabled':'❌ Disabled — local only'}</div>
        </div>
        <button onClick={toggle} style={{width:52,height:28,borderRadius:99,border:'none',background:enabled?'#16a34a':'#ddd',cursor:'pointer',position:'relative',transition:'background .2s'}}>
          <div style={{width:22,height:22,borderRadius:'50%',background:'#fff',position:'absolute',top:3,left:enabled?27:3,transition:'left .2s',boxShadow:'0 1px 4px rgba(0,0,0,.2)'}}/>
        </button>
      </div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <button onClick={handleTest} disabled={testing} style={{padding:'8px 16px',borderRadius:9,border:`1px solid ${C.border}`,background:C.muted,color:C.teal,fontWeight:700,cursor:'pointer',fontSize:13}}>{testing?'⏳ Testing...':'🔌 Test Connection'}</button>
        <button onClick={handlePull} disabled={syncing} style={{padding:'8px 16px',borderRadius:9,border:`1px solid ${C.border}`,background:C.muted,color:C.teal,fontWeight:700,cursor:'pointer',fontSize:13}}>{syncing?'⏳ Syncing...':'🔄 Pull from Sheet'}</button>
      </div>
      {testResult==='success'&&<div style={{color:'#16a34a',fontSize:13,fontWeight:600,marginTop:10}}>✅ Connected!</div>}
      {testResult==='error'&&<div style={{color:'#ef4444',fontSize:13,fontWeight:600,marginTop:10}}>❌ Connection failed.</div>}
      {syncMsg&&<div style={{fontSize:13,marginTop:10,color:syncMsg.includes('✅')?'#16a34a':'#f59e0b'}}>{syncMsg}</div>}
    </div>
  );
}

function ApiKeyInput({ label, storageKey, placeholder, helpUrl }) {
  const [value,setValue]=useState(''); const [show,setShow]=useState(false); const [saved,setSaved]=useState(false);
  useEffect(()=>{setValue(localStorage.getItem(storageKey)||'');},[storageKey]);
  const handleSave=()=>{localStorage.setItem(storageKey,value);setSaved(true);setTimeout(()=>setSaved(false),2000);};
  const handleClear=()=>{localStorage.removeItem(storageKey);setValue('');};
  return (
    <div>
      <label style={lbl}>{label}</label>
      <div style={{position:'relative',marginBottom:6}}>
        <input type={show?'text':'password'} placeholder={placeholder} value={value} onChange={e=>setValue(e.target.value)} style={{...inp,paddingRight:44}}/>
        <button onClick={()=>setShow(!show)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:16,color:C.sub}}>{show?'🙈':'👁️'}</button>
      </div>
      <span style={{fontSize:12,color:C.sub}}>Get key from <a href={helpUrl} target="_blank" rel="noreferrer" style={{color:C.teal}}>{helpUrl.replace('https://','')}</a></span>
      <div style={{display:'flex',gap:10,marginTop:10}}>
        <button onClick={handleSave} style={{padding:'8px 16px',borderRadius:9,border:'none',background:C.teal,color:'#fff',fontWeight:700,cursor:'pointer',fontSize:13}}>{saved?'✅ Saved!':'💾 Save Key'}</button>
        {value&&<button onClick={handleClear} style={{padding:'8px 16px',borderRadius:9,border:'none',background:'#fef2f2',color:'#ef4444',fontWeight:700,cursor:'pointer',fontSize:13}}>🗑️ Clear</button>}
      </div>
    </div>
  );
}

export default function Settings() {
  const [provider,setProvider]=useState(localStorage.getItem('ai_provider')||'claude-sonnet');
  const choose=(p)=>{setProvider(p);localStorage.setItem('ai_provider',p);};
  const provLabels={'claude-sonnet':'Claude Sonnet 4.6','claude-haiku':'Claude Haiku 4.5','gemini-flash':'Gemini 2.5 Flash'};

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text}}>Settings</h1>
        <p style={{margin:'2px 0 0',fontSize:13,color:C.sub}}>Configure your API keys and preferences</p>
      </div>

      {/* AI Provider */}
      <div style={card}>
        <h3 style={{margin:'0 0 4px',fontSize:16,color:C.text,fontWeight:700}}>🤖 AI Provider</h3>
        <p style={{fontSize:13,color:C.sub,marginBottom:16}}>Choose which AI reads your slips. Keys stored locally in your browser.</p>
        <div style={{display:'flex',gap:10,marginBottom:16}}>
          {[['claude-sonnet','Claude Sonnet','Best accuracy'],['claude-haiku','Claude Haiku','Cheapest'],['gemini-flash','Gemini Flash','Google']].map(([id,l,sub])=>(
            <button key={id} onClick={()=>choose(id)} style={{flex:1,padding:'12px 10px',borderRadius:10,border:`2px solid ${provider===id?C.teal:C.border}`,background:provider===id?C.muted:'#fff',cursor:'pointer',textAlign:'left',transition:'all .2s'}}>
              <div style={{fontWeight:700,fontSize:13,color:provider===id?C.teal:C.text,display:'flex',alignItems:'center',gap:6}}>
                {l}{provider===id&&<span style={{fontSize:10,background:C.teal,color:'#fff',borderRadius:99,padding:'2px 8px'}}>ACTIVE</span>}
              </div>
              <div style={{fontSize:11,color:C.sub,marginTop:2}}>{sub}</div>
            </button>
          ))}
        </div>
        <div style={{background:C.muted,borderRadius:10,padding:16,marginBottom:16,border:`1px solid ${C.border}`}}>
          <div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:12}}>🟣 Claude (Anthropic)</div>
          <ApiKeyInput label="Anthropic API Key" storageKey="anthropic_api_key" placeholder="sk-ant-..." helpUrl="https://console.anthropic.com"/>
        </div>
        <div style={{background:C.muted,borderRadius:10,padding:16,border:`1px solid ${C.border}`}}>
          <div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:12}}>✨ Gemini (Google)</div>
          <ApiKeyInput label="Gemini API Key" storageKey="gemini_api_key" placeholder="AIza..." helpUrl="https://aistudio.google.com"/>
        </div>
      </div>

      {/* Google Sync */}
      <div style={card}>
        <h3 style={{margin:'0 0 16px',fontSize:16,color:C.text,fontWeight:700}}>🔗 Google Sheets Sync</h3>
        <GoogleSyncSettings/>
      </div>

      {/* Profile */}
      <div style={card}>
        <h3 style={{margin:'0 0 20px',fontSize:16,color:C.text,fontWeight:700}}>👤 Profile</h3>
        <div style={{marginBottom:14}}><label style={lbl}>Name</label><input type="text" value="NATAKORN WISETWONGSAHAKIT" readOnly style={{...inp,background:C.muted,color:C.sub}}/></div>
        <div><label style={lbl}>Default Account</label><select defaultValue="เงินสด" style={inp}>{ACCOUNTS.map(a=><option key={a}>{a}</option>)}</select></div>
      </div>

      {/* Password */}
      <div style={card}>
        <h3 style={{margin:'0 0 16px',fontSize:16,color:C.text,fontWeight:700}}>🔒 Change Password</h3>
        <div style={{background:C.muted,borderRadius:10,padding:14,marginBottom:16,fontSize:13,color:C.sub,border:`1px solid ${C.border}`}}>💡 Default: <strong>financetrack2026</strong> — change after first login!</div>
        <PasswordChanger/>
      </div>

      {/* App Info */}
      <div style={card}>
        <h3 style={{margin:'0 0 16px',fontSize:16,color:C.text,fontWeight:700}}>ℹ️ App Info</h3>
        {[['App','FinanceTrack'],['Version','2.1.0'],['Owner','NATAKORN WISETWONGSAHAKIT'],['Storage','Local + Google Sheets'],['AI Model',provLabels[provider]||'Claude Sonnet 4.6'],['Backend','Google Apps Script v3']].map(([l,v])=>(
          <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:14,padding:'8px 0',borderBottom:`1px solid ${C.muted}`}}>
            <span style={{color:C.sub}}>{l}</span><strong style={{color:C.text}}>{v}</strong>
          </div>
        ))}
        <div style={{marginTop:20}}>
          <div style={{fontSize:13,fontWeight:700,color:'#ef4444',marginBottom:12}}>⚠️ Danger Zone</div>
          <button onClick={()=>{if(window.confirm('Delete ALL local transactions?')){localStorage.removeItem(LS_TX);alert('✅ Cleared.');}}} style={{padding:'9px 18px',borderRadius:9,border:'none',background:'#fef2f2',color:'#ef4444',fontWeight:700,cursor:'pointer',fontSize:13}}>🗑️ Clear Local Transactions</button>
        </div>
      </div>
    </div>
  );
}