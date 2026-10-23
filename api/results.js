/* Olympiad results lookup (/results page).
   1) action "send":   participant enters ФИО, ИИН, phone, email → the row is found in the results
                       table, a 6-digit code is emailed, and the page gets a signed token (the code is not in it).
   2) action "verify": token + code → the participant's results.
   No database: the token is HMAC-signed, so the server only needs the secret.
   Env vars (Vercel):
     RESULTS_SECRET               long random string for signing tokens                       (required)
     RESEND_API_KEY               https://resend.com API key, domain verified there            (required)
     RESULTS_MAIL_FROM            e.g. "Fibonacci Olympiad <results@fibonacci-olympiads.kz>"   (required)
     Results table — one of:
     GOOGLE_SERVICE_ACCOUNT_JSON  service account key (JSON); share the sheet with its email   (recommended, sheet stays private)
     RESULTS_SHEET_ID             spreadsheet id from …/spreadsheets/d/<id>/edit
     RESULTS_SHEET_RANGE          sheet name or range, default: the first sheet                (optional)
     RESULTS_CSV_URL              or a "Publish to web → CSV" link (anyone with the link sees the whole table)
     Rate limits (optional, recommended): Upstash Redis / Vercel KV
     KV_REST_API_URL + KV_REST_API_TOKEN  (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
   Table: first row is headers. Required columns ИИН and ФИО (or Фамилия + Имя); Email if present must
   match what the participant enters. Every other column is shown to the participant as is, except
   Телефон and columns whose header starts with "_" (internal notes). */
const crypto=require('crypto');

const ALLOWED_ORIGIN=/^https:\/\/((www\.)?fibonacci-olympiads\.kz|[a-z0-9-]+\.vercel\.app)$|^http:\/\/localhost(:\d+)?$/;
const CODE_TTL=10*60;        // seconds the emailed code is valid
const MAX_TRIES=5;           // wrong codes per token (needs KV)
const SENDS_PER_IIN=5;       // codes per ИИН per hour (needs KV)
const SENDS_PER_IP=30;       // codes per IP per hour (needs KV)
const TABLE_TTL=60*1000;     // how long a warm function keeps the table

const clean=(v,max)=>String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
const b64u=b=>Buffer.from(b).toString('base64url');

/* ---------- validation ---------- */
// Kazakhstan ИИН: 12 digits, the last one is a check digit
function iinValid(s){
  if(!/^\d{12}$/.test(s))return false;
  const d=[...s].map(Number);
  let c=d.slice(0,11).reduce((a,x,i)=>a+x*(i+1),0)%11;
  if(c===10){c=d.slice(0,11).reduce((a,x,i)=>a+x*((i+2)%11+1),0)%11;if(c===10)return false}
  return c===d[11];
}
const normName=s=>String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^\p{L}\s-]/gu,' ').split(/[\s-]+/).filter(Boolean);
// every word typed must be in the registered name (order free, patronymic optional), at least surname + name
function nameMatches(typed,registered){
  const t=normName(typed),r=new Set(normName(registered));
  return t.length>=2&&t.every(w=>r.has(w));
}
const normEmail=s=>String(s||'').trim().toLowerCase();
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ---------- results table ---------- */
function parseCsv(text){
  const rows=[];let row=[],f='',q=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(q){if(ch==='"'){if(text[i+1]==='"'){f+='"';i++}else q=false}else f+=ch;continue}
    if(ch==='"')q=true;
    else if(ch===',')row.push(f),f='';
    else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(f);rows.push(row);row=[];f=''}
    else f+=ch;
  }
  if(f||row.length){row.push(f);rows.push(row)}
  return rows;
}

async function googleToken(sa){
  const now=Math.floor(Date.now()/1000);
  const head=b64u(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const claim=b64u(JSON.stringify({iss:sa.client_email,scope:'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600}));
  const sig=crypto.sign('RSA-SHA256',Buffer.from(head+'.'+claim),sa.private_key).toString('base64url');
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:head+'.'+claim+'.'+sig}),
    signal:AbortSignal.timeout(10000)});
  const data=await r.json().catch(()=>({}));
  if(!r.ok||!data.access_token)throw new Error('google token: '+r.status+' '+(data.error||''));
  return data.access_token;
}

async function fetchRows(){
  const env=process.env;
  if(env.GOOGLE_SERVICE_ACCOUNT_JSON&&env.RESULTS_SHEET_ID){
    const sa=JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const token=await googleToken(sa);
    const base='https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(env.RESULTS_SHEET_ID.trim());
    let range=(env.RESULTS_SHEET_RANGE||'').trim();
    if(!range){
      const m=await fetch(base+'?fields=sheets.properties.title',{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(10000)});
      const meta=await m.json().catch(()=>({}));
      if(!m.ok)throw new Error('sheets meta: '+m.status+' '+(meta.error?.message||''));
      range=meta.sheets[0].properties.title;
    }
    const r=await fetch(base+'/values/'+encodeURIComponent(range)+'?valueRenderOption=FORMATTED_VALUE',
      {headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(10000)});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error('sheets values: '+r.status+' '+(data.error?.message||''));
    return (data.values||[]).map(row=>row.map(String));
  }
  if(/^https:\/\//.test(env.RESULTS_CSV_URL||'')){
    const r=await fetch(env.RESULTS_CSV_URL.trim(),{redirect:'follow',signal:AbortSignal.timeout(10000)});
    if(!r.ok)throw new Error('csv: '+r.status);
    return parseCsv((await r.text()).replace(/^﻿/,''));
  }
  throw new Error('no results source configured');
}

const keyOf=h=>h.toLowerCase().replace(/ё/g,'е').replace(/[^\p{L}\d]/gu,'');
const ALIAS={
  iin:['иин','iin','жсн','иинучастника','жснқатысушы'],
  fio:['фио','фиоучастника','атыжөні','атыжони','толықаты','fullname','name','participant'],
  last:['фамилия','тегі','тег','surname','lastname'],
  first:['имя','аты','firstname'],
  middle:['отчество','әкесініңаты','patronymic','middlename'],
  email:['email','почта','электроннаяпочта','электрондықпошта','емейл','элпочта','mail'],
  phone:['телефон','phone','номертелефона','телефонномері','тел']
};

let cache={at:0,table:null};
async function loadTable(){
  if(cache.table&&Date.now()-cache.at<TABLE_TTL)return cache.table;
  const rows=(await fetchRows()).filter(r=>r.some(c=>String(c).trim()));
  if(!rows.length)throw new Error('results table is empty');
  const headers=rows[0].map(h=>String(h).trim());
  const col={};
  headers.forEach((h,i)=>{const k=keyOf(h);for(const f in ALIAS)if(col[f]===undefined&&ALIAS[f].includes(k))col[f]=i});
  if(col.iin===undefined||(col.fio===undefined&&col.last===undefined))throw new Error('results table needs ИИН and ФИО columns, got: '+headers.join(' | '));
  const hidden=new Set([col.iin,col.email,col.phone].filter(i=>i!==undefined));
  const shown=headers.map((h,i)=>i).filter(i=>headers[i]&&!hidden.has(i)&&!headers[i].startsWith('_'));
  const byIin=new Map();
  for(const r of rows.slice(1)){
    const iin=String(r[col.iin]||'').replace(/\D/g,'');
    if(!iin)continue;
    const fio=col.fio!==undefined?r[col.fio]:[r[col.last],r[col.first],r[col.middle]].filter(Boolean).join(' ');
    const item={fio:String(fio||'').trim(),email:col.email!==undefined?normEmail(r[col.email]):'',
      fields:shown.filter(i=>![col.fio,col.last,col.first,col.middle].includes(i)).map(i=>[headers[i],String(r[i]??'').trim()]).filter(([,v])=>v)};
    if(!byIin.has(iin))byIin.set(iin,[]);
    byIin.get(iin).push(item);
  }
  cache={at:Date.now(),table:byIin};
  return byIin;
}

// rows of this ИИН whose name and (if registered) email match what was typed
async function findResults(iin,fio,email){
  const rows=(await loadTable()).get(iin)||[];
  return rows.filter(r=>nameMatches(fio,r.fio)&&(!r.email||r.email===email));
}

/* ---------- token: payload + HMAC(payload, code) ---------- */
function secret(){
  const s=process.env.RESULTS_SECRET||'';
  if(s.length<24)throw new Error('RESULTS_SECRET is not set (min 24 chars)');
  return s;
}
const sign=(payload,code)=>crypto.createHmac('sha256',secret()).update(payload+'|'+code).digest('base64url');
function makeToken(data,code){
  const payload=b64u(JSON.stringify(data));
  return payload+'.'+sign(payload,code);
}
function readToken(token,code){
  const [payload,sig]=String(token||'').split('.');
  if(!payload||!sig)return null;
  const a=Buffer.from(sign(payload,code)),b=Buffer.from(sig);
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;
  let data;try{data=JSON.parse(Buffer.from(payload,'base64url').toString())}catch(e){return null}
  return data.exp>Date.now()/1000?data:null;
}
const tokenId=token=>crypto.createHash('sha256').update(String(token).split('.')[0]||'').digest('hex').slice(0,32);

/* ---------- optional rate limits (Upstash Redis / Vercel KV REST) ---------- */
async function hit(key,ttl){
  const url=process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL;
  const tok=process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN;
  if(!url||!tok)return 0; // not configured: no limits
  try{
    const r=await fetch(url.replace(/\/$/,'')+'/pipeline',{method:'POST',
      headers:{Authorization:'Bearer '+tok,'Content-Type':'application/json'},
      body:JSON.stringify([['INCR','fimo:'+key],['EXPIRE','fimo:'+key,String(ttl),'NX']]),
      signal:AbortSignal.timeout(5000)});
    const data=await r.json();
    return Number(data[0]?.result)||0;
  }catch(e){console.error('KV error',e.message);return 0}
}

/* ---------- email ---------- */
async function sendCode(to,code,lang){
  const key=process.env.RESEND_API_KEY,from=process.env.RESULTS_MAIL_FROM;
  if(!key||!from)throw new Error('RESEND_API_KEY / RESULTS_MAIL_FROM are not set');
  const T={
    ru:['Код для просмотра результатов','Ваш код для просмотра результатов олимпиады Fibonacci:','Код действует 10 минут. Если вы не запрашивали результаты, просто проигнорируйте это письмо.'],
    kk:['Нәтижелерді көру коды','Fibonacci олимпиадасының нәтижелерін көруге арналған кодыңыз:','Код 10 минут жарамды. Егер сіз нәтижелерді сұрамаған болсаңыз, бұл хатты елемеңіз.'],
    en:['Your results code','Your code to view the Fibonacci Olympiad results:','The code is valid for 10 minutes. If you did not request it, just ignore this email.']
  }[lang]||[];
  const [subj,lead,note]=T;
  const html=`<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0E0E0E">
<p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#E1001B;font-weight:bold;margin:0 0 16px">Fibonacci International Maths Olympiad</p>
<p style="font-size:16px;margin:0 0 16px">${lead}</p>
<p style="font-size:34px;font-weight:bold;letter-spacing:.3em;margin:0 0 16px">${code}</p>
<p style="font-size:13px;color:#6E6860;margin:0">${note}</p></div>`;
  const r=await fetch('https://api.resend.com/emails',{method:'POST',
    headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
    body:JSON.stringify({from,to:[to],subject:`${subj}: ${code}`,html,text:`${lead} ${code}\n\n${note}`}),
    signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw new Error('resend: '+r.status+' '+(await r.text().catch(()=>'')).slice(0,300));
}

/* ---------- handler ---------- */
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false})}
  const origin=req.headers.origin;
  if(origin&&!ALLOWED_ORIGIN.test(origin))return res.status(403).json({ok:false});

  let b=req.body;
  if(typeof b==='string'){try{b=JSON.parse(b)}catch(e){b=null}}
  if(!b||typeof b!=='object')return res.status(400).json({ok:false,error:'bad_request'});
  const lang=['ru','kk','en'].includes(b.lang)?b.lang:'ru';
  const ip=String(req.headers['x-forwarded-for']||'').split(',')[0].trim()||'?';

  try{
    if(b.action==='send'){
      if(b.website)return res.status(200).json({ok:true,token:''}); // honeypot
      const fio=clean(b.fio,150),iin=clean(b.iin,20).replace(/\D/g,''),email=normEmail(clean(b.email,120));
      const phone=clean(b.phone,32).replace(/\D/g,'');
      if(normName(fio).length<2)return res.status(400).json({ok:false,error:'fio'});
      if(!iinValid(iin))return res.status(400).json({ok:false,error:'iin'});
      if(phone.length<10||phone.length>15)return res.status(400).json({ok:false,error:'phone'});
      if(!EMAIL_RE.test(email))return res.status(400).json({ok:false,error:'email'});
      if(await hit('ip:'+ip,3600)>SENDS_PER_IP||await hit('iin:'+iin,3600)>SENDS_PER_IIN)
        return res.status(429).json({ok:false,error:'too_many'});

      const rows=await findResults(iin,fio,email);
      if(!rows.length)return res.status(404).json({ok:false,error:'not_found'});

      const code=String(crypto.randomInt(0,1e6)).padStart(6,'0');
      const token=makeToken({iin,fio,email,exp:Math.floor(Date.now()/1000)+CODE_TTL,n:crypto.randomBytes(6).toString('base64url')},code);
      await sendCode(email,code,lang);
      console.log('results code sent',{iin:iin.slice(0,6)+'******',phone:phone.slice(-4)});
      return res.status(200).json({ok:true,token});
    }

    if(b.action==='verify'){
      const token=clean(b.token,2000),code=clean(b.code,10).replace(/\D/g,'');
      if(!token||code.length!==6)return res.status(400).json({ok:false,error:'code'});
      if(await hit('try:'+tokenId(token),CODE_TTL)>MAX_TRIES)return res.status(429).json({ok:false,error:'too_many'});
      const data=readToken(token,code);
      if(!data)return res.status(400).json({ok:false,error:'code'});
      const rows=await findResults(data.iin,data.fio,data.email);
      if(!rows.length)return res.status(404).json({ok:false,error:'not_found'});
      return res.status(200).json({ok:true,results:rows.map(r=>({fio:r.fio,fields:r.fields}))});
    }

    return res.status(400).json({ok:false,error:'bad_request'});
  }catch(e){
    console.error('results error',e.message);
    return res.status(500).json({ok:false,error:'server'});
  }
};

