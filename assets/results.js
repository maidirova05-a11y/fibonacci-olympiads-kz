// Results page: e-mail → 6-digit password by mail → sign in → scores + certificate (PDF) → change password.
// API: /api/results/* (api/_lib/results.js). The session is an HttpOnly cookie; this script never sees it.
(function(){
  const UI={
    ru:{back:'На главную',title:'Результаты олимпиады',sub:'Введите почту, которую вы указали при регистрации. Мы отправим на неё пароль от личного кабинета с результатами и сертификатом участника.',
      email:'Электронная почта',getpw:'Получить пароль',havepw:'У меня уже есть пароль',
      pw:'Пароль из письма',login:'Войти',sent:'Пароль отправлен на {e}. Проверьте папку «Спам», если письма нет во «Входящих».',
      loginsub:'Логин — ваша почта, пароль — 6 цифр из письма (или ваш собственный, если вы его меняли).',
      resend:'Отправить пароль ещё раз',resendin:'Повторно через {s} с',other:'Другая почта',forgot:'Забыли пароль? Получить новый',
      cab:'Личный кабинет',logout:'Выйти',score:'Результат',pts:['балл','балла','баллов'],grade:'{g} класс',stage:'Дата и место',code:'Код участника',
      cert:'Сертификат участника',certlang:'Язык сертификата',dl:'Скачать PDF',dlpng:'Скачать изображение',making:'Готовим сертификат…',
      chg:'Сменить пароль',cur:'Текущий пароль',np:'Новый пароль',np2:'Повторите новый пароль',save:'Сохранить пароль',saved:'Пароль изменён. Теперь входите с новым паролем.',
      pwhint:'Не короче 6 символов.',mismatch:'Пароли не совпадают.',none:'Для этой почты пока нет результатов.',
      err:{email:'Проверьте адрес почты.',not_found:'Этой почты нет в списке участников. Укажите почту родителя, которую вы оставляли при регистрации, или напишите нам: info@az-group.kz.',
        mail_wait:'Письмо уже отправлено. Повторить можно через {s} с.',mail_daily:'Слишком много писем за сутки. Попробуйте завтра или напишите на info@az-group.kz.',
        credentials:'Неверная почта или пароль.',locked:'Слишком много неверных попыток. Попробуйте через {m} мин или получите новый пароль.',password:'Введите пароль.',
        current:'Текущий пароль указан неверно.',weak:'Новый пароль должен быть не короче 6 символов.',auth:'Сессия истекла, войдите снова.',
        rate_limited:'Слишком много запросов. Подождите немного.',mail:'Не удалось отправить письмо. Попробуйте позже.',net:'Нет соединения. Проверьте интернет и попробуйте снова.',def:'Что-то пошло не так. Попробуйте позже.'}},
    kk:{back:'Басты бетке',title:'Олимпиада нәтижелері',sub:'Тіркелу кезінде көрсеткен поштаңызды енгізіңіз. Біз оған нәтижелер мен қатысушы сертификаты бар жеке кабинеттің құпиясөзін жібереміз.',
      email:'Электрондық пошта',getpw:'Құпиясөз алу',havepw:'Менде құпиясөз бар',
      pw:'Хаттағы құпиясөз',login:'Кіру',sent:'Құпиясөз {e} поштасына жіберілді. Хат «Кіріс» қалтасында болмаса, «Спам» қалтасын тексеріңіз.',
      loginsub:'Логин — поштаңыз, құпиясөз — хаттағы 6 сан (немесе өзгерткен болсаңыз, өз құпиясөзіңіз).',
      resend:'Құпиясөзді қайта жіберу',resendin:'{s} с кейін қайта жіберуге болады',other:'Басқа пошта',forgot:'Құпиясөзді ұмыттыңыз ба? Жаңасын алу',
      cab:'Жеке кабинет',logout:'Шығу',score:'Нәтиже',pts:['ұпай','ұпай','ұпай'],grade:'{g} сынып',stage:'Өткізілген күні мен орны',code:'Қатысушы коды',
      cert:'Қатысушы сертификаты',certlang:'Сертификат тілі',dl:'PDF жүктеу',dlpng:'Суретті жүктеу',making:'Сертификат дайындалуда…',
      chg:'Құпиясөзді өзгерту',cur:'Ағымдағы құпиясөз',np:'Жаңа құпиясөз',np2:'Жаңа құпиясөзді қайталаңыз',save:'Сақтау',saved:'Құпиясөз өзгертілді. Енді жаңа құпиясөзбен кіріңіз.',
      pwhint:'Кемінде 6 таңба.',mismatch:'Құпиясөздер сәйкес емес.',none:'Бұл пошта үшін әзірге нәтиже жоқ.',
      err:{email:'Пошта мекенжайын тексеріңіз.',not_found:'Бұл пошта қатысушылар тізімінде жоқ. Тіркелу кезінде көрсеткен ата-ана поштасын енгізіңіз немесе бізге жазыңыз: info@az-group.kz.',
        mail_wait:'Хат жіберілді. {s} с кейін қайталауға болады.',mail_daily:'Бір тәулікте хат тым көп. Ертең қайталаңыз немесе info@az-group.kz поштасына жазыңыз.',
        credentials:'Пошта немесе құпиясөз қате.',locked:'Қате әрекеттер тым көп. {m} минуттан кейін қайталаңыз немесе жаңа құпиясөз алыңыз.',password:'Құпиясөзді енгізіңіз.',
        current:'Ағымдағы құпиясөз қате.',weak:'Жаңа құпиясөз кемінде 6 таңбадан тұруы керек.',auth:'Сессия аяқталды, қайта кіріңіз.',
        rate_limited:'Сұраулар тым көп. Біраз күтіңіз.',mail:'Хат жіберілмеді. Кейінірек қайталаңыз.',net:'Байланыс жоқ. Интернетті тексеріп, қайталаңыз.',def:'Қате кетті. Кейінірек қайталаңыз.'}},
    en:{back:'Back to home',title:'Olympiad results',sub:'Enter the e-mail you used at registration. We will send it a password for the personal account with the results and the participation certificate.',
      email:'E-mail',getpw:'Get password',havepw:'I already have a password',
      pw:'Password from the e-mail',login:'Sign in',sent:'The password was sent to {e}. Check the Spam folder if it is not in your inbox.',
      loginsub:'Your login is the e-mail; the password is the 6 digits from the letter (or your own one if you changed it).',
      resend:'Send the password again',resendin:'Resend in {s} s',other:'Use another e-mail',forgot:'Forgot the password? Get a new one',
      cab:'Personal account',logout:'Sign out',score:'Score',pts:['point','points','points'],grade:'Grade {g}',stage:'Date and place',code:'Participant code',
      cert:'Participation certificate',certlang:'Certificate language',dl:'Download PDF',dlpng:'Download image',making:'Preparing the certificate…',
      chg:'Change password',cur:'Current password',np:'New password',np2:'Repeat the new password',save:'Save password',saved:'Password changed. Use the new password next time.',
      pwhint:'At least 6 characters.',mismatch:'The passwords do not match.',none:'There are no results for this e-mail yet.',
      err:{email:'Check the e-mail address.',not_found:'This e-mail is not on the participant list. Use the parent e-mail given at registration, or write to info@az-group.kz.',
        mail_wait:'The e-mail has been sent. You can retry in {s} s.',mail_daily:'Too many e-mails today. Try tomorrow or write to info@az-group.kz.',
        credentials:'Wrong e-mail or password.',locked:'Too many wrong attempts. Try again in {m} min or get a new password.',password:'Enter the password.',
        current:'The current password is wrong.',weak:'The new password must be at least 6 characters.',auth:'Session expired, please sign in again.',
        rate_limited:'Too many requests. Please wait a moment.',mail:'Could not send the e-mail. Please try later.',net:'No connection. Check the internet and try again.',def:'Something went wrong. Please try later.'}}
  };
  const NAV={ru:{n_about:'Об олимпиаде',n_doc:'Положение',n_res:'Результаты',n_stages:'Этапы',n_prizes:'Призы',n_faq:'Вопросы'},kk:{n_about:'Олимпиада туралы',n_doc:'Ереже',n_res:'Нәтижелер',n_stages:'Кезеңдер',n_prizes:'Жүлделер',n_faq:'Сұрақтар'},en:{n_about:'About',n_doc:'Regulations',n_res:'Results',n_stages:'Stages',n_prizes:'Prizes',n_faq:'FAQ'}};
  for(const k in NAV)Object.assign(UI[k],NAV[k]);

  // Certificate wording per language (the participant's language of participation is the default).
  const CERT={
    ru:{t1:'СЕРТИФИКАТ',t2:'участника',award:'вручается',grade:g=>g+' класс',
      body:['за участие в республиканском этапе международной','олимпиады по математике Fibonacci International Maths Olympiad'],
      season:'Республиканский этап 2026–2027',score:'Результат',pts:n=>n+' '+plural(n,['балл','балла','баллов']),stage:'Дата и место проведения',code:'Код участника',
      rep:'Официальный представитель в Республике Казахстан — AZ GROUP LLC'},
    kk:{t1:'ҚАТЫСУШЫ',t2:'сертификаты',award:'',grade:g=>g+' сынып',
      body:['Fibonacci International Maths Olympiad математикадан халықаралық','олимпиадасының республикалық кезеңіне қатысқаны үшін беріледі'],
      season:'Республикалық кезең 2026–2027',score:'Нәтиже',pts:n=>n+' ұпай',stage:'Өткізілген күні мен орны',code:'Қатысушы коды',
      rep:'Қазақстан Республикасындағы ресми өкіл — AZ GROUP LLC'},
    en:{t1:'CERTIFICATE',t2:'of participation',award:'is awarded to',grade:g=>'Grade '+g,
      body:['for taking part in the national stage of the international','mathematics olympiad Fibonacci International Maths Olympiad'],
      season:'National stage 2026–2027',score:'Score',pts:n=>n+' '+(n===1?'point':'points'),stage:'Date and place',code:'Participant code',
      rep:'Official representative in the Republic of Kazakhstan — AZ GROUP LLC'}
  };
  function plural(n,f){n=Math.abs(n)%100;const d=n%10;if(n>10&&n<20)return f[2];if(d>1&&d<5)return f[1];if(d===1)return f[0];return f[2]}

  const root=document.documentElement,key=root.dataset.store;
  const $=s=>document.querySelector(s);
  let lang='ru',state={view:'request',email:'',data:null,wait:0};
  const t=(k,v)=>{let s=UI[lang][k]??UI.ru[k];if(v)for(const x in v)s=s.replace('{'+x+'}',v[x]);return s};
  const terr=(code,v)=>{const e=UI[lang].err;let s=e[code]||e.def;if(v)for(const x in v)s=s.replace('{'+x+'}',v[x]);return s};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const gradeNum=g=>String(g||'').replace(/\s*(класс|сынып|grade)\s*/gi,' ').trim();

  async function api(path,body){
    let r;
    try{r=await fetch('/api/results/'+path,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(body||{})})}
    catch(e){return{ok:false,error:'net'}}
    const d=await r.json().catch(()=>({}));
    return r.ok&&d.ok?d:{ok:false,error:d.error||'def',retryAfter:d.retryAfter||Number(r.headers.get('Retry-After'))||0,status:r.status};
  }

  /* ---------- views ---------- */
  function show(view){state.view=view;render()}
  function msg(el,text,kind){el.textContent=text||'';el.className='msg'+(kind?' '+kind:'');el.hidden=!text}
  function busy(btn,on){btn.disabled=on;btn.classList.toggle('busy',on)}

  function render(){
    document.querySelectorAll('[data-ui]').forEach(e=>{const v=t(e.dataset.ui);if(v!=null)e.textContent=v});
    document.querySelectorAll('[data-ph]').forEach(e=>e.placeholder=t(e.dataset.ph));
    document.querySelectorAll('.lang button').forEach(b=>b.classList.toggle('on',b.dataset.lang===lang));
    document.querySelectorAll('[data-view]').forEach(e=>e.hidden=e.dataset.view!==state.view);
    $('.r-head .sub').hidden=state.view==='cab';
    root.lang=lang;document.title=t('title')+' — Fibonacci 2026–2027';
    if(state.view==='login'){$('#lEmail').value=state.email||$('#lEmail').value;tickResend()}
    if(state.view==='cab')renderCab();
  }

  let timer;
  function tickResend(){
    clearInterval(timer);
    const b=$('#resend');
    const upd=()=>{const left=Math.ceil((state.wait-Date.now())/1000);b.disabled=left>0;b.textContent=left>0?t('resendin',{s:left}):t('resend');if(left<=0)clearInterval(timer)};
    upd();timer=setInterval(upd,1000);
  }

  async function requestPw(email,btn,out){
    busy(btn,true);
    const r=await api('request-password',{email,lang});
    busy(btn,false);
    if(!r.ok){
      if(r.error==='mail_wait'){state.email=email;state.wait=Date.now()+r.retryAfter*1000}
      msg(out,terr(r.error,{s:r.retryAfter}),'err');return false;
    }
    state.email=email;state.wait=Date.now()+(r.retryAfter||60)*1000;
    show('login');msg($('#lMsg'),t('sent',{e:email}),'ok');$('#lPw').value='';$('#lPw').focus();
    return true;
  }

  $('#reqForm').addEventListener('submit',e=>{e.preventDefault();const em=$('#rEmail').value.trim();if(!em)return msg($('#rMsg'),terr('email'),'err');requestPw(em,$('#reqBtn'),$('#rMsg'))});
  $('#toLogin').addEventListener('click',()=>{state.email=$('#rEmail').value.trim();show('login');msg($('#lMsg'),'');$('#lPw').focus()});
  $('#other').addEventListener('click',()=>{show('request');msg($('#rMsg'),'');$('#rEmail').focus()});
  $('#resend').addEventListener('click',()=>{const em=$('#lEmail').value.trim();if(!em)return msg($('#lMsg'),terr('email'),'err');requestPw(em,$('#resend'),$('#lMsg'))});
  $('#loginForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const email=$('#lEmail').value.trim(),password=$('#lPw').value.trim(),btn=$('#loginBtn');
    if(!email)return msg($('#lMsg'),terr('email'),'err');
    if(!password)return msg($('#lMsg'),terr('password'),'err');
    busy(btn,true);const r=await api('login',{email,password});busy(btn,false);
    if(!r.ok)return msg($('#lMsg'),terr(r.error,{m:Math.ceil((r.retryAfter||60)/60)}),'err');
    await loadCab();
  });
  $('#logout').addEventListener('click',async()=>{await api('logout');state.data=null;$('#lPw').value='';show('request')});
  $('#pwForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const out=$('#pMsg'),cur=$('#pCur').value.trim(),np=$('#pNew').value,np2=$('#pNew2').value;
    if(np.length<6)return msg(out,terr('weak'),'err');
    if(np!==np2)return msg(out,t('mismatch'),'err');
    const btn=$('#pBtn');busy(btn,true);const r=await api('change-password',{current:cur,password:np});busy(btn,false);
    if(!r.ok){if(r.error==='auth')return expired();return msg(out,terr(r.error),'err')}
    e.target.reset();msg(out,t('saved'),'ok');
  });
  function expired(){state.data=null;show('login');msg($('#lMsg'),terr('auth'),'err')}

  async function loadCab(){
    const r=await api('me');
    if(!r.ok){if(r.error!=='auth'&&r.error!=='net')msg($('#rMsg'),terr(r.error),'err');return false}
    state.data=r;state.email=r.email;show('cab');return true;
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
      const cl=p._cl||p.lang||lang;
      return `<article class="person" data-i="${i}">
        <div class="p-head"><div><h2>${esc(p.name)}</h2>${meta?`<p class="muted">${meta}</p>`:''}</div>
        <div class="score"><span>${esc(t('score'))}</span><b>${esc(p.score)}</b><small>${esc(lang==='ru'?plural(p.score,UI.ru.pts):UI[lang].pts[2])}</small></div></div>
        <dl class="facts">${p.stage?`<div><dt>${esc(t('stage'))}</dt><dd>${esc(p.stage)}</dd></div>`:''}${p.code?`<div><dt>${esc(t('code'))}</dt><dd>${esc(p.code)}</dd></div>`:''}</dl>
        <div class="cert">
          <div class="cert-bar"><h3>${esc(t('cert'))}</h3>
            <div class="seg" role="group" aria-label="${esc(t('certlang'))}">${['kk','ru','en'].map(l=>`<button type="button" data-cl="${l}" class="${l===cl?'on':''}">${l==='kk'?'KZ':l.toUpperCase()}</button>`).join('')}</div></div>
          <div class="cert-img"><img alt="${esc(t('cert'))}: ${esc(p.name)}" hidden><span class="muted">${esc(t('making'))}</span></div>
          <div class="cert-dl"><button type="button" class="b b-red" data-pdf>${dlIcon}${esc(t('dl'))}</button><button type="button" class="b" data-png>${esc(t('dlpng'))}</button></div>
        </div></article>`;
    }).join('');
    box.querySelectorAll('.person').forEach(el=>{
      const p=d.participants[+el.dataset.i];
      const cl=()=>p._cl||p.lang||lang;
      const preview=async()=>{const img=el.querySelector('.cert-img img');const c=await drawCert(p,cl());img.src=c.toDataURL('image/jpeg',.85);img.hidden=false;el.querySelector('.cert-img span').hidden=true};
      el.querySelectorAll('[data-cl]').forEach(b=>b.addEventListener('click',()=>{p._cl=b.dataset.cl;el.querySelectorAll('[data-cl]').forEach(x=>x.classList.toggle('on',x===b));preview()}));
      el.querySelector('[data-pdf]').addEventListener('click',async e=>{const b=e.currentTarget;busy(b,true);try{const c=await drawCert(p,cl());save(await canvasPdf(c),fileName(p,cl(),'pdf'))}finally{busy(b,false)}});
      el.querySelector('[data-png]').addEventListener('click',async e=>{const b=e.currentTarget;busy(b,true);try{const c=await drawCert(p,cl());save(await new Promise(r=>c.toBlob(r,'image/png')),fileName(p,cl(),'png'))}finally{busy(b,false)}});
      preview();
    });
  }
  const dlIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>';
  const fileName=(p,l,ext)=>('Fibonacci-certificate-'+p.name.replace(/[^\p{L}\d]+/gu,'-').replace(/^-|-$/g,'')+'-'+l+'.'+ext);
  function save(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}

  /* ---------- certificate: canvas (A4 landscape) → JPEG → one-page PDF ---------- */
  const W=3508,H=2480; // A4 at 300 dpi
  const imgCache={};
  const loadImg=src=>imgCache[src]||(imgCache[src]=new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src}));
  const HEAD="'Roboto Slab',Georgia,serif",SANS="'Manrope',system-ui,sans-serif";

  async function drawCert(p,l){
    const T=CERT[l]||CERT.ru;
    const g=gradeNum(p.grade);
    const sub=[g&&T.grade(g),p.school,p.city].filter(Boolean).join(' · ');
    const all=[T.t1,T.t2,T.award,p.name,sub,...T.body,T.season,T.score,T.pts(p.score),T.stage,p.stage,T.code,p.code,T.rep].join(' ');
    try{await Promise.all(['900 100px '+HEAD,'700 100px '+HEAD,'800 100px '+SANS,'600 100px '+SANS,'500 100px '+SANS].map(f=>document.fonts.load(f,all)))}catch(e){}
    const [logo,az]=await Promise.all([loadImg('/assets/img/fibonacci-logo.png'),loadImg('/assets/img/azgroup-dark.png')]).catch(()=>[null,null]);

    const c=document.createElement('canvas');c.width=W;c.height=H;
    const x=c.getContext('2d');
    const RED='#E1001B',INK='#0E0E0E',MUTED='#6E6860',LINE='#E6E1DA';
    x.fillStyle='#fff';x.fillRect(0,0,W,H);
    // warm paper band + frame
    x.fillStyle='#F4F2EF';x.fillRect(0,0,W,H);
    x.fillStyle='#fff';roundRect(x,90,90,W-180,H-180,40);x.fill();
    x.strokeStyle=RED;x.lineWidth=10;roundRect(x,90,90,W-180,H-180,40);x.stroke();
    x.strokeStyle=LINE;x.lineWidth=4;roundRect(x,130,130,W-260,H-260,26);x.stroke();
    spiral(x,W-150,H-150,RED); // Fibonacci spiral in the corner
    // logo
    if(logo){const lh=200,lw=logo.width*lh/logo.height;x.drawImage(logo,(W-lw)/2,240,lw,lh)}
    x.textAlign='center';x.textBaseline='alphabetic';
    x.fillStyle=MUTED;x.font='600 50px '+SANS;spaced(x,T.season.toUpperCase(),W/2,560,10);
    x.fillStyle=INK;x.font='900 230px '+HEAD;x.fillText(T.t1,W/2,800);
    x.fillStyle=RED;x.font='700 96px '+HEAD;x.fillText(T.t2,W/2,920);
    let y=1060;
    if(T.award){x.fillStyle=MUTED;x.font='500 56px '+SANS;x.fillText(T.award,W/2,y);y+=40}
    // name, shrunk to fit
    x.fillStyle=INK;let fs=150;x.font='800 '+fs+'px '+HEAD;
    while(x.measureText(p.name).width>W-700&&fs>70){fs-=4;x.font='800 '+fs+'px '+HEAD}
    y+=fs*0.95;x.fillText(p.name,W/2,y);
    x.strokeStyle=RED;x.lineWidth=6;x.beginPath();x.moveTo(W/2-520,y+60);x.lineTo(W/2+520,y+60);x.stroke();
    y+=150;
    if(sub){x.fillStyle=MUTED;let sf=56;x.font='600 '+sf+'px '+SANS;while(x.measureText(sub).width>W-800&&sf>34){sf-=2;x.font='600 '+sf+'px '+SANS}x.fillText(sub,W/2,y);y+=110}
    x.fillStyle=INK;x.font='500 62px '+SANS;
    for(const line of T.body){x.fillText(line,W/2,y);y+=86}
    // score badge
    const by=Math.max(y+30,1800),bw=760,bh=250;
    x.fillStyle='#FCEBEC';roundRect(x,(W-bw)/2,by,bw,bh,36);x.fill();
    x.fillStyle=RED;x.font='700 46px '+SANS;spaced(x,T.score.toUpperCase(),W/2,by+80,8);
    x.font='800 120px '+HEAD;x.fillText(T.pts(p.score),W/2,by+205);
    // bottom row
    const fy=H-300;
    x.textAlign='left';
    if(p.stage){x.fillStyle=MUTED;x.font='600 40px '+SANS;x.fillText(T.stage,300,fy);x.fillStyle=INK;x.font='700 54px '+SANS;x.fillText(p.stage,300,fy+70)}
    x.textAlign='right';
    if(p.code){x.fillStyle=MUTED;x.font='600 40px '+SANS;x.fillText(T.code,W-560,fy);x.fillStyle=INK;x.font='700 54px '+SANS;x.fillText('№ '+p.code,W-560,fy+70)}
    x.textAlign='center';
    if(az){const ah=70,aw=az.width*ah/az.height;x.drawImage(az,(W-aw)/2,fy-40,aw,ah)}
    x.fillStyle=MUTED;x.font='500 38px '+SANS;x.fillText(T.rep,W/2,fy+90);
    return c;
  }
  function roundRect(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath()}
  function spaced(x,s,cx,y,gap){const w=[...s].reduce((n,ch)=>n+x.measureText(ch).width+gap,-gap);let p=cx-w/2;const al=x.textAlign;x.textAlign='left';for(const ch of s){x.fillText(ch,p,y);p+=x.measureText(ch).width+gap}x.textAlign=al}
  function spiral(x,cx,cy,color){
    // golden (Fibonacci) spiral r = a·φ^(2θ/π), faint, unwinding from the bottom-right corner
    x.save();x.globalAlpha=.12;x.strokeStyle=color;x.lineWidth=7;x.beginPath();
    const k=Math.log((1+Math.sqrt(5))/2)/(Math.PI/2);
    for(let i=0,th=0;th<=4.2*Math.PI;th+=0.02,i++){const r=4*Math.exp(k*th),a=Math.PI+th;const px=cx+r*Math.cos(a),py=cy+r*Math.sin(a);i?x.lineTo(px,py):x.moveTo(px,py)}
    x.stroke();x.restore();
  }

  async function canvasPdf(c){
    const jpg=new Uint8Array(await (await new Promise(r=>c.toBlob(r,'image/jpeg',.92))).arrayBuffer());
    const pw=841.89,ph=595.28,enc=new TextEncoder(),parts=[],offs=[];let len=0;
    const push=b=>{const u=typeof b==='string'?enc.encode(b):b;parts.push(u);len+=u.length};
    const obj=(n,body,stream)=>{offs[n]=len;push(n+' 0 obj\n'+body);if(stream){push('\nstream\n');push(stream);push('\nendstream')}push('\nendobj\n')};
    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
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

  /* ---------- language + start ---------- */
  function setLang(l){lang=UI[l]?l:'ru';try{localStorage.setItem(key,lang)}catch(e){}render()}
  document.querySelectorAll('.lang button').forEach(b=>b.addEventListener('click',()=>setLang(b.dataset.lang)));
  let l=new URLSearchParams(location.search).get('lang');
  if(!l){try{l=localStorage.getItem(key)}catch(e){}}
  lang=UI[l]?l:'ru';
  render();
  loadCab();
})();
