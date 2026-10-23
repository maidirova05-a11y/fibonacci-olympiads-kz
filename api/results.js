/* Olympiad results lookup (/results page).
   1) action "send":   participant enters ФИО, ИИН, phone, email → they are checked against the
                       registration form answers (Google Form → Sheet), the ИИН is looked up in the
                       results sheet, a 6-digit code is emailed and the page gets a signed token
                       (the code is not in it).
   2) action "verify": token + code → the participant's results.
   No database: the token is HMAC-signed, so the server only needs the secret.
   Env vars (Vercel):
     RESULTS_SECRET               long random string for signing tokens                       (required)
     RESEND_API_KEY               https://resend.com API key, domain verified there            (required)
     RESULTS_MAIL_FROM            e.g. "Fibonacci Olympiad <results@fibonacci-olympiads.kz>"   (required)
     Sheets, read with a Google service account (share the spreadsheet with its email, Viewer):
     GOOGLE_SERVICE_ACCOUNT_JSON  service account key (JSON)
     REG_SHEET_ID                 spreadsheet with the registration form answers (…/spreadsheets/d/<id>/edit)
     REG_SHEET_RANGE              its tab, default: the first tab (where the form writes)       (optional)
     RESULTS_SHEET_ID             spreadsheet with results, default: REG_SHEET_ID               (optional)
     RESULTS_SHEET_RANGE          its tab, default: "Результаты"                               (optional)
     or instead of a service account, "Publish to web → CSV" links (anyone with a link sees that tab):
     REG_CSV_URL, RESULTS_CSV_URL
     Rate limits (optional, recommended): Upstash Redis / Vercel KV
     KV_REST_API_URL + KV_REST_API_TOKEN  (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
   Registration tab: columns are found by their question text (ИИН/ЖСН, ФИО/Аты-жөні, почта, телефон);
   the participant's ФИО and ИИН are preferred over a parent's or teacher's. Every email and phone
   column of the row counts. A filled email and phone must match what the participant types.
   Results tab: first row is headers, needs an ИИН column. Every other column is shown as is, except
   ФИО, email, phone, timestamp and columns whose header starts with "_" (internal notes). */
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

async function fetchSheet(id,range){
  const sa=JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const token=await googleToken(sa);
  const auth={headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(10000)};
  const base='https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(id);
  if(!range){
    const m=await fetch(base+'?fields=sheets.properties.title',auth);
    const meta=await m.json().catch(()=>({}));
    if(!m.ok)throw new Error('sheets meta: '+m.status+' '+(meta.error?.message||''));
    range=meta.sheets[0].properties.title;
  }
  const r=await fetch(base+'/values/'+encodeURIComponent(range)+'?valueRenderOption=FORMATTED_VALUE',auth);
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error('sheets values "'+range+'": '+r.status+' '+(data.error?.message||''));
  return (data.values||[]).map(row=>row.map(String));
}
async function fetchCsv(url){
  const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw new Error('csv: '+r.status);
  return parseCsv((await r.text()).replace(/^\uFEFF/,''));
}
async function fetchRows(kind){
  const env=process.env,v=k=>(env[k]||'').trim();
  const csv=v(kind+'_CSV_URL');
  if(/^https:\/\//.test(csv))return fetchCsv(csv);
  const id=kind==='REG'?v('REG_SHEET_ID'):v('RESULTS_SHEET_ID')||v('REG_SHEET_ID');
  if(id&&env.GOOGLE_SERVICE_ACCOUNT_JSON)return fetchSheet(id,v(kind+'_SHEET_RANGE')||(kind==='RESULTS'?'Результаты':''));
  throw new Error(kind+' sheet is not configured');
}

/* ---------- columns: found by the question / header text ---------- */
const low=h=>String(h).toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ').trim();
const KIND={
  iin:/(^|[^\p{L}])(иин|жсн|iin)([^\p{L}]|$)/u,
  fio:/фио|аты-жөні|аты жөні|толық аты|full ?name|^name$|фамилия,? (и )?имя|имя,? (и )?фамилия|тегі,? аты/,
  last:/^(фамилия|тегі|surname|last ?name)/,
  first:/^(имя|аты|first ?name)([^\p{L}]|$)/u,
  middle:/^(отчество|әкесінің аты|patronymic|middle ?name)/,
  email:/почт|пошта|e-?mail|емейл|mail/,
  phone:/телефон|phone|whatsapp|ватсап|ұялы|(^|[^\p{L}])тел([^\p{L}]|$)/u
};
const STAMP=/отметка времени|timestamp|уақыт белгісі/;
const OTHER=/родител|ата-ана|ата ана|мама|папа|учител|мұғалім|педагог|наставник|куратор|тренер|жетекші|parent|teacher|mentor|coach/;
const SELF=/участ|ученик|учащ|оқушы|қатысушы|бала|ребен|child|student|participant/;
function columns(headers){
  const h=headers.map(low),col={};
  const taken=new Set();
  for(const k of ['iin','fio','last','first','middle','email','phone']){
    let c=h.map((x,i)=>i).filter(i=>h[i]&&!taken.has(i)&&KIND[k].test(h[i]));
    if(['email','phone'].includes(k)){col[k]=c;c.forEach(i=>taken.add(i));continue}
    // the participant's own name/ИИН, not the parent's or teacher's
    const own=c.filter(i=>!OTHER.test(h[i]));if(own.length)c=own;
    const self=c.filter(i=>SELF.test(h[i]));if(self.length)c=self;
    if(c.length){col[k]=c[0];taken.add(c[0])}
  }
  col.ids=new Set([col.iin,col.fio,col.last,col.first,col.middle,...col.email,...col.phone].filter(i=>i!==undefined));
  h.forEach((x,i)=>{if(STAMP.test(x))col.ids.add(i)});
  return col;
}
const digits=s=>String(s||'').replace(/\D/g,'');
const phone10=s=>digits(s).slice(-10);

async function loadRows(kind){
  const rows=(await fetchRows(kind)).filter(r=>r.some(c=>String(c).trim()));
  if(!rows.length)throw new Error(kind+' sheet is empty');
  const headers=rows[0].map(h=>String(h).trim()),col=columns(headers);
  if(col.iin===undefined)throw new Error(kind+' sheet needs an ИИН column, got: '+headers.join(' | '));
  return {headers,col,rows:rows.slice(1)};
}

const cache={};
async function cached(kind,build){
  const c=cache[kind];
  if(c&&Date.now()-c.at<TABLE_TTL)return c.map;
  const {headers,col,rows}=await loadRows(kind),map=new Map();
  for(const r of rows){
    const iin=digits(r[col.iin]);
    if(!iin)continue;
    if(!map.has(iin))map.set(iin,[]);
    map.get(iin).push(build(r,col,headers));
  }
  cache[kind]={at:Date.now(),map};
  return map;
}
const cell=(r,i)=>i===undefined?'':String(r[i]??'').trim();

// registration answers: who may see results and where the code may go
const loadReg=()=>cached('REG',(r,col)=>({
  fio:cell(r,col.fio)||[cell(r,col.last),cell(r,col.first),cell(r,col.middle)].filter(Boolean).join(' '),
  emails:col.email.map(i=>normEmail(r[i])).filter(Boolean),
  phones:col.phone.map(i=>phone10(r[i])).filter(p=>p.length===10)
}));
// results: every column except identity ones and "_notes"
const loadResults=()=>cached('RESULTS',(r,col,headers)=>
  headers.map((h,i)=>[h,cell(r,i)]).filter(([h,v],i)=>h&&v&&!col.ids.has(i)&&!h.startsWith('_')));

// the registration of this ИИН that matches what was typed; a filled email and phone must match
async function findRegistration(iin,fio,email,phone){
  const rows=(await loadReg()).get(iin)||[];
  return rows.find(r=>nameMatches(fio,r.fio)
    &&(!r.emails.length||r.emails.includes(email))
    &&(!r.phones.length||r.phones.includes(phone10(phone))))||null;
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

      const reg=await findRegistration(iin,fio,email,phone);
      if(!reg)return res.status(404).json({ok:false,error:'not_found'});
      if(!(await loadResults()).get(iin))return res.status(404).json({ok:false,error:'no_results'});

      const code=String(crypto.randomInt(0,1e6)).padStart(6,'0');
      const token=makeToken({iin,fio:reg.fio,exp:Math.floor(Date.now()/1000)+CODE_TTL,n:crypto.randomBytes(6).toString('base64url')},code);
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
      const rows=(await loadResults()).get(data.iin);
      if(!rows)return res.status(404).json({ok:false,error:'no_results'});
      return res.status(200).json({ok:true,results:rows.map(fields=>({fio:data.fio,fields}))});
    }

    return res.status(400).json({ok:false,error:'bad_request'});
  }catch(e){
    console.error('results error',e.message);
    return res.status(500).json({ok:false,error:'server'});
  }
};

