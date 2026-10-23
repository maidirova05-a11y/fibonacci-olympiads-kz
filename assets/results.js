// Results page: participant data → code by email (/api/results "send") → results ("verify")
(function(){
  const UI={
    ru:{back:"На главную",title:"Результаты олимпиады",sub:"Введите данные участника, указанные при регистрации. На почту придёт код подтверждения — после него откроются результаты.",
      fio:"ФИО участника",fio_h:"Как при регистрации, например: Иванов Иван Иванович",iin:"ИИН участника",phone:"Телефон",email:"Электронная почта",email_h:"Та же почта, что при регистрации — на неё придёт код",
      send:"Получить код",agree:"Нажимая кнопку, вы соглашаетесь на обработку персональных данных.",sent:"Мы отправили 6-значный код на",code:"Код из письма",show:"Показать результаты",
      edit:"Изменить данные",spam:"Письмо не пришло? Проверьте папку «Спам». Код действует 10 минут.",resend:"Отправить код ещё раз",wait:"Повторно — через {s} с",
      q:"Есть вопросы по результатам? Напишите нам в WhatsApp.",again:"Проверить другого участника",open:"Открыть ↗",busy:"Подождите…",
      e_fio:"Укажите фамилию и имя участника.",e_iin:"Проверьте ИИН: 12 цифр без ошибок.",e_phone:"Укажите номер телефона.",e_email:"Укажите корректную почту.",
      e_not_found:"Участник с такими данными не найден. Проверьте ФИО, ИИН и почту — они должны совпадать с регистрацией. Если результаты ещё не опубликованы, зайдите позже.",
      e_code:"Неверный или устаревший код. Проверьте письмо или запросите код ещё раз.",e_too_many:"Слишком много попыток. Попробуйте через час.",e_net:"Не удалось связаться с сервером. Проверьте интернет и попробуйте ещё раз.",e_server:"Сервис временно недоступен. Попробуйте позже или напишите нам в WhatsApp."},
    kk:{back:"Басты бетке",title:"Олимпиада нәтижелері",sub:"Қатысушының тіркелу кезінде көрсетілген деректерін енгізіңіз. Поштаға растау коды келеді — содан кейін нәтижелер ашылады.",
      fio:"Қатысушының аты-жөні",fio_h:"Тіркелудегідей, мысалы: Иванов Иван Иванович",iin:"Қатысушының ЖСН",phone:"Телефон",email:"Электрондық пошта",email_h:"Тіркелу кезіндегі пошта — код соған келеді",
      send:"Код алу",agree:"Батырманы басу арқылы сіз дербес деректерді өңдеуге келісесіз.",sent:"6 таңбалы кодты мына поштаға жібердік:",code:"Хаттағы код",show:"Нәтижелерді көрсету",
      edit:"Деректерді өзгерту",spam:"Хат келмеді ме? «Спам» қалтасын тексеріңіз. Код 10 минут жарамды.",resend:"Кодты қайта жіберу",wait:"Қайта жіберу — {s} с кейін",
      q:"Нәтижелер бойынша сұрақтар бар ма? WhatsApp-қа жазыңыз.",again:"Басқа қатысушыны тексеру",open:"Ашу ↗",busy:"Күте тұрыңыз…",
      e_fio:"Қатысушының тегі мен атын көрсетіңіз.",e_iin:"ЖСН-ді тексеріңіз: қатесіз 12 сан.",e_phone:"Телефон нөмірін көрсетіңіз.",e_email:"Дұрыс поштаны көрсетіңіз.",
      e_not_found:"Мұндай деректері бар қатысушы табылмады. Аты-жөнін, ЖСН мен поштаны тексеріңіз — олар тіркелумен сәйкес болуы керек. Нәтижелер әлі жарияланбаса, кейінірек кіріңіз.",
      e_code:"Код қате немесе мерзімі өткен. Хатты тексеріңіз немесе кодты қайта сұраңыз.",e_too_many:"Әрекет тым көп. Бір сағаттан кейін қайталаңыз.",e_net:"Серверге қосылу мүмкін болмады. Интернетті тексеріп, қайталаңыз.",e_server:"Қызмет уақытша қолжетімсіз. Кейінірек қайталаңыз немесе WhatsApp-қа жазыңыз."},
    en:{back:"Back to home",title:"Olympiad results",sub:"Enter the participant's details as given at registration. We will email you a confirmation code, then the results will open.",
      fio:"Participant's full name",fio_h:"As at registration, e.g. Ivanov Ivan Ivanovich",iin:"Participant's IIN",phone:"Phone",email:"Email",email_h:"The email used at registration — the code is sent there",
      send:"Get the code",agree:"By pressing the button you agree to the processing of your personal data.",sent:"We sent a 6-digit code to",code:"Code from the email",show:"Show results",
      edit:"Change details",spam:"No email? Check your spam folder. The code is valid for 10 minutes.",resend:"Send the code again",wait:"Resend in {s} s",
      q:"Questions about the results? Message us on WhatsApp.",again:"Check another participant",open:"Open ↗",busy:"Please wait…",
      e_fio:"Enter the participant's surname and name.",e_iin:"Check the IIN: 12 digits, no typos.",e_phone:"Enter a phone number.",e_email:"Enter a valid email.",
      e_not_found:"No participant found with these details. Check the name, IIN and email — they must match the registration. If results are not published yet, come back later.",
      e_code:"Wrong or expired code. Check the email or request a new code.",e_too_many:"Too many attempts. Try again in an hour.",e_net:"Could not reach the server. Check your connection and try again.",e_server:"The service is temporarily unavailable. Try later or message us on WhatsApp."}
  };
  const NAV={ru:{n_about:"Об олимпиаде",n_doc:"Положение",n_stages:"Этапы",n_format:"Формат",n_prizes:"Призы",n_res:"Результаты",n_faq:"Вопросы"},
    kk:{n_about:"Олимпиада туралы",n_doc:"Ереже",n_stages:"Кезеңдер",n_format:"Формат",n_prizes:"Жүлделер",n_res:"Нәтижелер",n_faq:"Сұрақтар"},
    en:{n_about:"About",n_doc:"Regulations",n_stages:"Stages",n_format:"Format",n_prizes:"Prizes",n_res:"Results",n_faq:"FAQ"}};
  for(const k in NAV)Object.assign(UI[k],NAV[k]);
  const root=document.documentElement,key=root.dataset.store;
  let lang='ru';
  const t=k=>UI[lang][k]||UI.ru[k]||'';

  const s1=document.getElementById('step1'),s2=document.getElementById('step2'),s3=document.getElementById('step3');
  const resendBtn=s2.querySelector('[data-resend]');
  let token='',sentData=null,cooldown=0,timer=null;

  function set(l){
    if(!UI[l])l='ru';lang=l;
    document.querySelectorAll('[data-ui]').forEach(e=>{e.textContent=t(e.dataset.ui)});
    document.querySelectorAll('.lang button').forEach(b=>b.classList.toggle('on',b.dataset.lang===l));
    root.lang=l;document.title=t('title')+' — '+document.title.split(' — ').slice(1).join(' — ');
    drawResend();
    try{localStorage.setItem(key,l)}catch(e){}
  }

  // same check digit rule as the server (api/results.js)
  function iinValid(s){
    if(!/^\d{12}$/.test(s))return false;
    const d=[...s].map(Number);
    let c=d.slice(0,11).reduce((a,x,i)=>a+x*(i+1),0)%11;
    if(c===10){c=d.slice(0,11).reduce((a,x,i)=>a+x*((i+2)%11+1),0)%11;if(c===10)return false}
    return c===d[11];
  }

  function showErr(form,code,field){
    const p=form.querySelector('.err');
    p.textContent=code?t('e_'+code)||t('e_server'):'';p.hidden=!code;
    form.querySelectorAll('input').forEach(i=>i.removeAttribute('aria-invalid'));
    if(field&&form.elements[field]){form.elements[field].setAttribute('aria-invalid','true');form.elements[field].focus()}
  }
  async function api(body){
    try{
      const r=await fetch('/api/results',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,lang})});
      return await r.json().catch(()=>({ok:false,error:'server'}));
    }catch(e){return {ok:false,error:'net'}}
  }
  async function busy(btn,fn){
    const label=btn.textContent;btn.disabled=true;btn.textContent=t('busy');
    try{return await fn()}finally{btn.disabled=false;btn.textContent=label}
  }

  function drawResend(){
    resendBtn.disabled=cooldown>0;
    resendBtn.textContent=cooldown>0?t('wait').replace('{s}',cooldown):t('resend');
  }
  function startCooldown(){
    cooldown=60;drawResend();clearInterval(timer);
    timer=setInterval(()=>{cooldown--;drawResend();if(cooldown<=0)clearInterval(timer)},1000);
  }

  async function send(btn,form){
    const r=await busy(btn,()=>api({action:'send',...sentData}));
    if(!r.ok){showErr(form,r.error,{fio:'fio',iin:'iin',phone:'phone',email:'email'}[r.error]);return false}
    token=r.token;startCooldown();return true;
  }

  s1.elements.iin.addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,12)});
  s2.elements.code.addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,6)});

  s1.addEventListener('submit',async e=>{
    e.preventDefault();
    const f=s1.elements,d={fio:f.fio.value.trim(),iin:f.iin.value.trim(),phone:f.phone.value.trim(),email:f.email.value.trim(),website:f.website.value};
    if(d.fio.split(/\s+/).filter(Boolean).length<2)return showErr(s1,'fio','fio');
    if(!iinValid(d.iin))return showErr(s1,'iin','iin');
    const ph=d.phone.replace(/\D/g,'');if(ph.length<10||ph.length>15)return showErr(s1,'phone','phone');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email))return showErr(s1,'email','email');
    showErr(s1,'');sentData=d;
    if(!await send(s1.querySelector('.go'),s1))return;
    s2.querySelector('[data-email]').textContent=d.email;
    s2.elements.code.value='';showErr(s2,'');
    s1.hidden=true;s2.hidden=false;s2.elements.code.focus();
    if(window.gtag)gtag('event','results_code_sent');
  });

  resendBtn.addEventListener('click',async()=>{
    showErr(s2,'');
    if(await send(resendBtn,s2))s2.elements.code.focus();
    drawResend();
  });
  s2.querySelector('[data-back]').addEventListener('click',()=>{s2.hidden=true;s1.hidden=false;s1.elements.fio.focus()});

  s2.addEventListener('submit',async e=>{
    e.preventDefault();
    const code=s2.elements.code.value.trim();
    if(!/^\d{6}$/.test(code))return showErr(s2,'code','code');
    const r=await busy(s2.querySelector('.go'),()=>api({action:'verify',token,code}));
    if(!r.ok)return showErr(s2,r.error,r.error==='code'?'code':null);
    render(r.results);
    s2.hidden=true;s3.hidden=false;window.scrollTo(0,0);
    if(window.gtag)gtag('event','results_viewed');
  });

  function render(list){
    const box=s3.querySelector('[data-res]');box.textContent='';
    for(const item of list){
      const art=document.createElement('article'),h=document.createElement('h2'),dl=document.createElement('dl');
      h.textContent=item.fio;art.append(h,dl);
      for(const [k,v] of item.fields){
        const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;
        if(/^https:\/\/\S+$/.test(v)){const a=document.createElement('a');a.href=v;a.target='_blank';a.rel='noopener noreferrer';a.textContent=t('open');dd.append(a)}
        else dd.textContent=v;
        dl.append(dt,dd);
      }
      box.append(art);
    }
  }
  s3.querySelector('[data-again]').addEventListener('click',()=>{
    s1.reset();token='';sentData=null;s3.hidden=true;s1.hidden=false;s1.elements.fio.focus();
  });

  document.querySelectorAll('.lang button').forEach(b=>b.addEventListener('click',()=>set(b.dataset.lang)));
  let l=new URLSearchParams(location.search).get('lang');
  if(!l){try{l=localStorage.getItem(key)}catch(e){}}
  set(l||'ru');
})();
