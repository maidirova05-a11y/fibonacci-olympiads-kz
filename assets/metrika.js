/* Yandex Metrica — visitor statistics.
   Put the counter number from metrika.yandex.ru here (e.g. 98765432). While it is 0, nothing is loaded. */
const YM_ID=0;
(function(){
  if(!YM_ID)return;
  window.ym=window.ym||function(){(window.ym.a=window.ym.a||[]).push(arguments)};window.ym.l=+new Date;
  const s=document.createElement('script');s.async=true;s.src='https://mc.yandex.ru/metrika/tag.js';document.head.appendChild(s);
  ym(YM_ID,'init',{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});
  // goals: what visitors actually do on the page
  const goal=n=>ym(YM_ID,'reachGoal',n);
  document.addEventListener('click',e=>{
    const a=e.target.closest('a,button');if(!a)return;
    if(a.matches('[data-reg]'))goal('register_click');
    else if(a.matches('[data-wa]'))goal('whatsapp_click');
    else if(a.matches('[data-pay]'))goal('kaspi_click');
    else if(a.matches('[data-soc]'))goal(a.dataset.soc+'_click');
    else if(a.getAttribute('href')==='/oferta')goal('offer_open');
    else if(a.getAttribute('href')==='/polozhenie')goal('regulations_open');
    else if((a.getAttribute('href')||'').startsWith('mailto:'))goal('email_click');
    else if(a.matches('.lang button'))goal('lang_'+a.dataset.lang);
  });
})();
