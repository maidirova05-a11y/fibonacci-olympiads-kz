// Results page: e-mail → 6-digit password by mail → sign in → scores + certificate (PDF) → change password.
// API: /api/results/* (api/_lib/results.js). The session is an HttpOnly cookie; this script never sees it.
(function(){
  const UI={
    ru:{back:'На главную',title:'Результаты олимпиады',sub:'Введите почту, которую вы указали при регистрации. Мы отправим на неё пароль от личного кабинета с результатами.',
      email:'Электронная почта',ph:'name@mail.ru',getpw:'Получить пароль',havepw:'У меня уже есть пароль',
      pw:'Пароль',login:'Войти',sent:'Если почта {e} есть в списке участников, пароль уже отправлен: письмо приходит в течение пары минут. Проверьте папку «Спам». Не пришло — проверьте адрес или свяжитесь с нами: 8 771 700 1401 (звонок или WhatsApp).',
      loginsub:'Логин — ваша почта. Пароль — 6 цифр из письма (действует 48 часов) или ваш собственный, если вы его задали.',
      resend:'Отправить пароль ещё раз',resendin:'Повторно через {s} с',other:'Другая почта',
      cab:'Личный кабинет',logout:'Выйти',score:'Результат',pts:['балл','балла','баллов'],grade:'{g} класс',stage:'Дата и место',code:'Код участника',
      cert:'Сертификат участника',dl:'Скачать PDF',dlpng:'Скачать изображение',making:'Готовим сертификат…',
      chg:'Сменить пароль',cur:'Текущий пароль',np:'Новый пароль',np2:'Повторите новый пароль',save:'Сохранить пароль',saved:'Пароль изменён. Теперь входите с новым паролем.',
      pwhint:'Не короче 6 символов, без пробелов в начале и в конце.',mismatch:'Пароли не совпадают.',none:'Для этой почты пока нет результатов.',
      err:{email:'Проверьте адрес почты.',
        mail_wait:'Письмо уже отправлено. Повторить можно через {s} с.',mail_daily:'Слишком много писем за сутки. Попробуйте завтра или свяжитесь с нами: 8 771 700 1401 (звонок или WhatsApp).',
        credentials:'Неверная почта или пароль.',locked:'Слишком много неверных попыток. Войдите с новым паролем из письма или попробуйте через {m} мин.',password:'Введите пароль.',
        current:'Текущий пароль указан неверно.',weak:'Новый пароль: не короче 6 символов, без пробелов в начале и в конце.',auth:'Сессия истекла, войдите снова.',
        rate_limited:'Слишком много запросов. Подождите немного.',mail:'Не удалось отправить письмо. Попробуйте позже.',unavailable:'Сервис временно недоступен. Попробуйте через несколько минут.',
        net:'Нет соединения. Проверьте интернет и попробуйте снова.',def:'Что-то пошло не так. Попробуйте позже.'}},
    kk:{back:'Басты бетке',title:'Олимпиада нәтижелері',sub:'Тіркелу кезінде көрсеткен поштаңызды енгізіңіз. Біз оған нәтижелер бар жеке кабинеттің құпиясөзін жібереміз.',
      email:'Электрондық пошта',ph:'name@mail.ru',getpw:'Құпиясөз алу',havepw:'Менде құпиясөз бар',
      pw:'Құпиясөз',login:'Кіру',sent:'Егер {e} поштасы қатысушылар тізімінде болса, құпиясөз жіберілді: хат бірнеше минут ішінде келеді. «Спам» қалтасын тексеріңіз. Хат келмесе, мекенжайды тексеріңіз немесе бізбен хабарласыңыз: 8 771 700 1401 (қоңырау немесе WhatsApp).',
      loginsub:'Логин — поштаңыз. Құпиясөз — хаттағы 6 таңбалы құпиясөз (48 сағат жарамды) немесе өзіңіз қойған құпиясөз.',
      resend:'Құпиясөзді қайта жіберу',resendin:'{s} секундтан кейін қайта жіберуге болады',other:'Басқа пошта',
      cab:'Жеке кабинет',logout:'Шығу',score:'Нәтиже',pts:['ұпай','ұпай','ұпай'],grade:'{g}-сынып',stage:'Өткізілген күні мен орны',code:'Қатысушы коды',
      cert:'Қатысушы сертификаты',dl:'PDF жүктеу',dlpng:'Суретті жүктеу',making:'Сертификат дайындалуда…',
      chg:'Құпиясөзді өзгерту',cur:'Ағымдағы құпиясөз',np:'Жаңа құпиясөз',np2:'Жаңа құпиясөзді қайталаңыз',save:'Сақтау',saved:'Құпиясөз өзгертілді. Енді жаңа құпиясөзбен кіріңіз.',
      pwhint:'Кемінде 6 таңба, басында және соңында бос орынсыз.',mismatch:'Құпиясөздер сәйкес емес.',none:'Бұл пошта үшін әзірге нәтиже жоқ.',
      err:{email:'Пошта мекенжайын тексеріңіз.',
        mail_wait:'Хат әлдеқашан жіберілді. {s} секундтан кейін қайталауға болады.',mail_daily:'Бір тәулікте тым көп хат жіберілді. Ертең қайталаңыз немесе бізбен хабарласыңыз: 8 771 700 1401 (қоңырау немесе WhatsApp).',
        credentials:'Пошта немесе құпиясөз қате.',locked:'Қате әрекеттер тым көп. Хаттағы жаңа құпиясөзбен кіріңіз немесе {m} минуттан кейін қайталаңыз.',password:'Құпиясөзді енгізіңіз.',
        current:'Ағымдағы құпиясөз қате.',weak:'Жаңа құпиясөз: кемінде 6 таңба, басында және соңында бос орынсыз.',auth:'Сессия аяқталды, қайта кіріңіз.',
        rate_limited:'Сұраулар тым көп. Біраз күтіңіз.',mail:'Хат жіберілмеді. Кейінірек қайталаңыз.',unavailable:'Қызмет уақытша қолжетімсіз. Бірнеше минуттан кейін қайталаңыз.',
        net:'Байланыс жоқ. Интернетті тексеріп, қайталаңыз.',def:'Қате орын алды. Кейінірек қайталаңыз.'}},
    en:{back:'Back to home',title:'Olympiad results',sub:'Enter the e-mail you gave at registration. We\'ll e-mail you a password for your results account.',
      email:'E-mail',ph:'name@example.com',getpw:'Get password',havepw:'I already have a password',
      pw:'Password',login:'Sign in',sent:'If {e} is on the participant list, the password is on its way: the e-mail arrives within a couple of minutes. Check your Spam folder. Nothing came? Check the address or contact us: +7 771 700 1401 (call or WhatsApp).',
      loginsub:'Your login is your e-mail. The password is the 6 digits from the e-mail (valid for 48 hours) or your own one, if you set it.',
      resend:'Send the password again',resendin:'Resend in {s} s',other:'Use another e-mail',
      cab:'Your account',logout:'Sign out',score:'Score',pts:['point','points','points'],grade:'Grade {g}',stage:'Date and place',code:'Participant code',
      cert:'Participation certificate',dl:'Download PDF',dlpng:'Download image',making:'Preparing the certificate…',
      chg:'Change password',cur:'Current password',np:'New password',np2:'Confirm new password',save:'Save password',saved:'Password changed. Use the new password next time.',
      pwhint:'At least 6 characters, no spaces at the start or end.',mismatch:'The passwords do not match.',none:'There are no results for this e-mail yet.',
      err:{email:'Check the e-mail address.',
        mail_wait:'The e-mail has already been sent. You can retry in {s} s.',mail_daily:'Too many e-mails today. Try tomorrow or contact us: +7 771 700 1401 (call or WhatsApp).',
        credentials:'Wrong e-mail or password.',locked:'Too many wrong attempts. Sign in with a new password from the e-mail or try again in {m} min.',password:'Enter the password.',
        current:'The current password is wrong.',weak:'New password: at least 6 characters, no spaces at the start or end.',auth:'Session expired, please sign in again.',
        rate_limited:'Too many requests. Please wait a moment.',mail:'Could not send the e-mail. Please try later.',unavailable:'The service is temporarily unavailable. Please try again in a few minutes.',
        net:'No connection. Check your connection and try again.',def:'Something went wrong. Please try later.'}}
  };
  const NAV={ru:{n_about:'Об олимпиаде',n_doc:'Положение',n_res:'Результаты',n_stages:'Этапы',n_format:'Формат',n_prizes:'Призы',n_faq:'Вопросы'},kk:{n_about:'Олимпиада туралы',n_doc:'Ереже',n_res:'Нәтижелер',n_stages:'Кезеңдер',n_format:'Формат',n_prizes:'Жүлделер',n_faq:'Сұрақтар'},en:{n_about:'About',n_doc:'Regulations',n_res:'Results',n_stages:'Stages',n_format:'Format',n_prizes:'Prizes',n_faq:'FAQ'}};
  for(const k in NAV)Object.assign(UI[k],NAV[k]);

  // Scores may be fractional (12,5): comma in ru/kk, «балла» for fractions.
  const num=(n,l)=>Number(n).toLocaleString(l==='en'?'en-US':'ru-RU',{maximumFractionDigits:2});
  function plural(n,f){if(!Number.isInteger(Number(n)))return f[1];n=Math.abs(n)%100;const d=n%10;if(n>10&&n<20)return f[2];if(d>1&&d<5)return f[1];if(d===1)return f[0];return f[2]}
  const ptsWord=(n,l)=>l==='ru'?plural(n,UI.ru.pts):l==='en'?(Number(n)===1?'point':'points'):'ұпай';


  const root=document.documentElement,key=root.dataset.store;
  const $=s=>document.querySelector(s);
  let lang='ru',state={view:'request',email:'',data:null,wait:0};
  const fill=(s,v)=>{if(v)for(const x in v)s=s.split('{'+x+'}').join(v[x]);return s};
  const t=(k,v)=>fill(UI[lang][k]??UI.ru[k],v);
  const terr=(code,v)=>fill(UI[lang].err[code]||UI[lang].err.def,v);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const gradeNum=g=>String(g||'').replace(/\s*(класс|сынып|grade)\s*/gi,' ').replace(/-$/,'').trim();

  async function api(path,body){
    let r;
    try{r=await fetch('/api/results/'+path,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(body||{})})}
    catch(e){return{ok:false,error:'net'}}
    const d=await r.json().catch(()=>({}));
    return r.ok&&d.ok?d:{ok:false,error:d.error||'def',retryAfter:d.retryAfter||Number(r.headers.get('Retry-After'))||0,status:r.status};
  }

  /* ---------- messages: always-present live regions; text is kept as a function so a language switch re-translates it ---------- */
  function msg(el,make,kind,field){
    el._make=make||null;el._kind=kind||'';
    document.querySelectorAll('[aria-invalid]').forEach(i=>{if(i.form===el.closest('form'))i.removeAttribute('aria-invalid')});
    paint(el);
    if(field){field.setAttribute('aria-invalid','true');field.focus()}
  }
  function paint(el){
    const text=el._make?el._make():'';
    el.innerHTML=text?`<p class="msg${el._kind?' '+el._kind:''}" role="${el._kind==='err'?'alert':'status'}">${esc(text)}</p>`:'';
  }
  const err=(el,code,v,field)=>msg(el,()=>terr(code,v),'err',field);
  function busy(btn,on){btn.disabled=on;btn.classList.toggle('busy',on);btn.setAttribute('aria-busy',on?'true':'false')}

  /* ---------- views ---------- */
  function show(view){state.view=view;render()}
  function render(){
    document.querySelectorAll('[data-ui]').forEach(e=>{const v=t(e.dataset.ui);if(v!=null)e.textContent=v});
    document.querySelectorAll('[data-ph]').forEach(e=>e.placeholder=t(e.dataset.ph));
    document.querySelectorAll('.lang button').forEach(b=>{const on=b.dataset.lang===lang;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});
    document.querySelectorAll('[data-view]').forEach(e=>e.hidden=e.dataset.view!==state.view);
    $('.r-head .sub').hidden=state.view!=='request';
    $('main').classList.toggle('v-cab',state.view==='cab');
    root.lang=lang;document.title=t('title')+' — Fibonacci 2026–2027';
    ['#rMsg','#lMsg','#pMsg'].forEach(s=>paint($(s)));
    if(state.view==='login'){if(state.email)$('#lEmail').value=state.email;tickResend()}
    if(state.view==='cab')renderCab();
  }

  let timer;
  function tickResend(){
    clearInterval(timer);
    const b=$('#resend');
    const upd=()=>{const left=Math.ceil((state.wait-Date.now())/1000);b.disabled=left>0;b.textContent=left>0?t('resendin',{s:left}):t('resend');if(left<=0)clearInterval(timer)};
    upd();timer=setInterval(upd,1000);
  }

  async function requestPw(email,btn,out,field){
    busy(btn,true);
    const r=await api('request-password',{email,lang});
    busy(btn,false);
    if(!r.ok&&r.error==='mail_wait'){
      // a letter is already on its way: go to the sign-in form and count down to the next one
      state.email=email;state.wait=Date.now()+(r.retryAfter||60)*1000;
      show('login');err($('#lMsg'),'mail_wait',{s:r.retryAfter||60});$('#lPw').focus();return false;
    }
    if(!r.ok){err(out,r.error,{s:r.retryAfter},r.error==='email'?field:null);return false}
    state.email=email;state.wait=Date.now()+(r.retryAfter||60)*1000;
    show('login');msg($('#lMsg'),()=>t('sent',{e:email}),'ok');$('#lPw').value='';$('#lPw').focus();
    return true;
  }

  $('#reqForm').addEventListener('submit',e=>{e.preventDefault();const f=$('#rEmail'),em=f.value.trim();if(!em)return err($('#rMsg'),'email',null,f);requestPw(em,$('#reqBtn'),$('#rMsg'),f)});
  $('#toLogin').addEventListener('click',()=>{state.email=$('#rEmail').value.trim();show('login');msg($('#lMsg'));(state.email?$('#lPw'):$('#lEmail')).focus()});
  $('#other').addEventListener('click',()=>{show('request');msg($('#rMsg'));$('#rEmail').focus()});
  $('#resend').addEventListener('click',()=>{const f=$('#lEmail'),em=f.value.trim();if(!em)return err($('#lMsg'),'email',null,f);requestPw(em,$('#resend'),$('#lMsg'),f)});
  $('#loginForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const fe=$('#lEmail'),fp=$('#lPw'),email=fe.value.trim(),password=fp.value.trim(),btn=$('#loginBtn');
    if(!email)return err($('#lMsg'),'email',null,fe);
    if(!password)return err($('#lMsg'),'password',null,fp);
    busy(btn,true);
    const r=await api('login',{email,password});
    if(!r.ok){busy(btn,false);return err($('#lMsg'),r.error,{m:Math.ceil((r.retryAfter||60)/60)},r.error==='email'?fe:fp)}
    const ok=await loadCab($('#lMsg'));busy(btn,false);
    if(ok){msg($('#lMsg'));fp.value='';$('#cabH').focus()}
  });
  $('#logout').addEventListener('click',async e=>{
    const b=e.currentTarget;busy(b,true);const r=await api('logout');busy(b,false);
    if(!r.ok){window.alert(terr(r.error));return}
    state.data=null;$('#lPw').value='';msg($('#lMsg'));msg($('#pMsg'));show('request');$('#rEmail').focus();
  });
  $('#pwForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const out=$('#pMsg'),fc=$('#pCur'),fn=$('#pNew'),fn2=$('#pNew2'),cur=fc.value.trim(),np=fn.value,np2=fn2.value;
    if(!cur)return err(out,'password',null,fc);
    if(np.length<6||/^\s|\s$/.test(np))return err(out,'weak',null,fn);
    if(np!==np2)return msg(out,()=>t('mismatch'),'err',fn2);
    const btn=$('#pBtn');busy(btn,true);const r=await api('change-password',{current:cur,password:np});busy(btn,false);
    if(!r.ok){if(r.error==='auth')return expired();return err(out,r.error,{m:Math.ceil((r.retryAfter||60)/60)},r.error==='weak'?fn:r.error==='current'?fc:null)}
    e.target.reset();msg(out,()=>t('saved'),'ok');
  });
  function expired(){state.data=null;show('login');err($('#lMsg'),'auth');($('#lEmail').value?$('#lPw'):$('#lEmail')).focus()}

  // out: where to show a failure (after sign-in); on the first page load a missing session is silent.
  async function loadCab(out){
    const r=await api('me');
    if(!r.ok){if(out)err(out,r.error==='auth'?'auth':r.error);return false}
    state.data=r;state.email=r.email;$('#pUser').value=r.email;show('cab');return true;
  }

  /* ---------- cabinet ---------- */
  function renderCab(){
    const d=state.data;if(!d)return;
    $('#cabEmail').textContent=d.email;
    const box=$('#people');
    if(!d.participants.length){box.innerHTML='<p class="muted">'+esc(t('none'))+'</p>';return}
    box.innerHTML=d.participants.map((p,i)=>{
      const g=gradeNum(p.grade);
      const meta=[g&&t('grade',{g}),p.school,p.city].filter(Boolean).map(esc).join(' · ');
      return `<article class="person" data-i="${i}">
        <div class="p-info"><div class="p-head"><div><h2>${esc(p.name)}</h2>${meta?`<p class="muted">${meta}</p>`:''}</div>
        <div class="score"><span>${esc(t('score'))}</span><b>${esc(num(p.score,lang))}</b><small>${esc(ptsWord(p.score,lang))}</small></div></div>
        <dl class="facts">${p.stage?`<div><dt>${esc(t('stage'))}</dt><dd>${esc(p.stage)}</dd></div>`:''}${p.code?`<div><dt>${esc(t('code'))}</dt><dd>${esc(p.code)}</dd></div>`:''}</dl></div>
        <div class="cert">
          <div class="cert-bar"><h3>${esc(t('cert'))}</h3></div>
          <div class="cert-img"><img alt="${esc(t('cert'))}: ${esc(p.name)}" hidden><span class="muted">${esc(t('making'))}</span></div>
          <div class="cert-dl"><button type="button" class="b b-red" data-pdf>${dlIcon}${esc(t('dl'))}</button><button type="button" class="b" data-png>${esc(t('dlpng'))}</button></div>
        </div></article>`;
    }).join('');
    box.querySelectorAll('.person').forEach(el=>{
      const p=d.participants[+el.dataset.i];
      // The preview is drawn small (1200 px wide) once; the full 300 dpi page is drawn only to download.
      (async()=>{
        const img=el.querySelector('.cert-img img'),wrap=el.querySelector('.cert-img');
        wrap.classList.add('loading');
        try{if(!p._prev){const c=await drawCert(p,PREVIEW);p._prev=c.toDataURL('image/jpeg',.85);free(c)}img.src=p._prev;img.hidden=false;el.querySelector('.cert-img span').hidden=true}
        catch(e){el.querySelector('.cert-img span').textContent=t('err').def}
        finally{wrap.classList.remove('loading')}
      })();
      const dl=async(e,kind)=>{const b=e.currentTarget;busy(b,true);let c;try{c=await drawCert(p,1);save(kind==='pdf'?await canvasPdf(c):await new Promise(r=>c.toBlob(r,'image/png')),fileName(p,kind))}catch(e){alert(t('err').def)}finally{if(c)free(c);busy(b,false)}};
      el.querySelector('[data-pdf]').addEventListener('click',e=>dl(e,'pdf'));
      el.querySelector('[data-png]').addEventListener('click',e=>dl(e,'png'));
    });
  }
  const dlIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>';
  const fileName=(p,ext)=>('Fibonacci-certificate-'+p.name.replace(/[^\p{L}\d]+/gu,'-').replace(/^-|-$/g,'')+'.'+ext);
  // iOS may open the download sheet slowly: keep the object URL alive for a while.
  function save(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},30000)}
  const free=c=>{c.width=c.height=0}; // give the canvas memory back at once (iOS caps the total)

  /* ---------- certificate: the approved design (A4 landscape, 300 dpi) + the participant's name → JPEG → one-page PDF ----------
     The background is the designer's PDF rendered as is (assets/img/certificate-bg*.jpg); only the name is drawn,
     exactly as it stands in the results list, centred above the design's name line. */
  const W=3508,H=2480,PREVIEW=1200/W; // A4 at 300 dpi; previews at 1200 px wide
  const NAME={cx:1725,line:963,max:1900,size:150,min:64,color:'#00603E'}; // line: 822–2627 px at y 963 (from the PDF)
  const imgCache={};
  const loadImg=src=>imgCache[src]||(imgCache[src]=new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>{delete imgCache[src];no(new Error('img'))};i.src=src}));
  const HEAD="'Roboto Slab',Georgia,serif";

  async function drawCert(p,scale){
    const name=String(p.name||'').trim();
    // the exact characters of the name, so the canvas never falls back to a system font (ә, ғ, қ, ң, ө, ұ, ү, һ, і)
    try{await document.fonts.load('700 100px '+HEAD,name)}catch(e){}
    const bg=await loadImg(scale<.5?'/assets/img/certificate-bg-1200.jpg':'/assets/img/certificate-bg.jpg');
    const c=document.createElement('canvas');c.width=Math.round(W*scale);c.height=Math.round(H*scale);
    const x=c.getContext('2d');
    x.drawImage(bg,0,0,c.width,c.height);
    x.scale(scale,scale); // drawn in 300 dpi page units at any size
    let f=NAME.size;x.font='700 '+f+'px '+HEAD;
    while(x.measureText(name).width>NAME.max&&f>NAME.min){f-=2;x.font='700 '+f+'px '+HEAD}
    x.textAlign='center';x.textBaseline='alphabetic';x.fillStyle=NAME.color;
    // a name still too long at the smallest size is squeezed horizontally rather than cut
    const w=x.measureText(name).width;
    if(w>NAME.max){x.save();x.translate(NAME.cx,0);x.scale(NAME.max/w,1);x.fillText(name,0,NAME.line-40);x.restore()}
    else x.fillText(name,NAME.cx,NAME.line-40);
    return c;
  }

  async function canvasPdf(c){
    const jpg=new Uint8Array(await (await new Promise(r=>c.toBlob(r,'image/jpeg',.92))).arrayBuffer());
    const pw=841.89,ph=595.28,enc=new TextEncoder(),parts=[],offs=[];let len=0;
    const push=b=>{const u=typeof b==='string'?enc.encode(b):b;parts.push(u);len+=u.length};
    const obj=(n,body,stream)=>{offs[n]=len;push(n+' 0 obj\n'+body);if(stream){push('\nstream\n');push(stream);push('\nendstream')}push('\nendobj\n')};
    push('%PDF-1.4\n');push(new Uint8Array([0x25,0xE2,0xE3,0xCF,0xD3,0x0A])); // binary marker: four raw high bytes
    const content=`q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`;
    obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
    obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
    obj(4,`<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>`,jpg);
    obj(5,`<< /Length ${content.length} >>`,content);
    const xref=len;
    push('xref\n0 6\n0000000000 65535 f \n'+[1,2,3,4,5].map(n=>String(offs[n]).padStart(10,'0')+' 00000 n \n').join(''));
    push('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
    return new Blob(parts,{type:'application/pdf'});
  }

  /* ---------- nav edge fade: hidden once the menu is scrolled to its end or fits ---------- */
  const nav=$('.snav');
  const navEnd=()=>nav.classList.toggle('end',nav.scrollLeft+nav.clientWidth>=nav.scrollWidth-2);
  nav.addEventListener('scroll',navEnd,{passive:true});addEventListener('resize',navEnd);

  /* ---------- language + start ---------- */
  function setLang(l){lang=UI[l]?l:'ru';try{localStorage.setItem(key,lang)}catch(e){}render();navEnd()}
  document.querySelectorAll('.lang button').forEach(b=>b.addEventListener('click',()=>setLang(b.dataset.lang)));
  let l=new URLSearchParams(location.search).get('lang');
  if(!l){try{l=localStorage.getItem(key)}catch(e){}}
  lang=UI[l]?l:'ru';
  render();navEnd();
  // keep the forms hidden until we know whether a session exists, so a signed-in parent never sees them flash
  loadCab().finally(()=>$('main').classList.remove('pending'));
})();
