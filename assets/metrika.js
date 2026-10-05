/* Yandex Metrica — visitor statistics (counter 113420424). */
const YM_ID=113420424;
(function(){
  if(!YM_ID)return;
  window.dataLayer=window.dataLayer||[];
  (function(m,e,t,r,i,k,a){
    m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();
    for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r)return}
    k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
  })(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id='+YM_ID,'ym');
  ym(YM_ID,'init',{ssr:true,webvisor:true,clickmap:true,ecommerce:'dataLayer',referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});
  // goals: what visitors actually do on the page (add them in Metrica as "JavaScript event" goals)
  const goal=n=>ym(YM_ID,'reachGoal',n);
  document.addEventListener('click',e=>{
    const a=e.target.closest('a,button');if(!a)return;
    const href=a.getAttribute('href')||'';
    if(a.matches('[data-reg]'))goal('register_click');
    else if(a.matches('[data-wa]'))goal('whatsapp_click');
    else if(a.matches('[data-pay]'))goal('kaspi_click');
    else if(a.matches('[data-soc]'))goal(a.dataset.soc+'_click');
    else if(a.matches('[data-dl]'))goal('regulations_pdf_'+a.dataset.dl);
    else if(href==='/oferta')goal('offer_open');
    else if(href==='/polozhenie')goal('regulations_open');
    else if(href.startsWith('mailto:'))goal('email_click');
    else if(a.matches('.lang button'))goal('lang_'+a.dataset.lang);
  });
})();
