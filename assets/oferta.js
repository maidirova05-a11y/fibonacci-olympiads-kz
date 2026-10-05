// Public offer page: language switch shared with the main site (same storage key)
(function(){
  const UI={"kk": {"back": "Басты бетке", "print": "Басып шығару", "title": "Қоғамдық ұсыныс"}, "ru": {"back": "На главную", "print": "Распечатать", "title": "Публичная оферта"}, "en": {"back": "Back to home", "print": "Print", "title": "Public Offer"}};
  const root=document.documentElement,key=root.dataset.store;
  function set(l){
    if(!UI[l])l='ru';
    document.querySelectorAll('[data-doc]').forEach(a=>a.hidden=a.dataset.doc!==l);
    document.querySelectorAll('[data-ui]').forEach(e=>e.textContent=UI[l][e.dataset.ui]);
    document.querySelectorAll('.lang button').forEach(b=>b.classList.toggle('on',b.dataset.lang===l));
    root.lang=l;document.title=UI[l].title+' — '+document.title.split(' — ').slice(1).join(' — ');
    try{localStorage.setItem(key,l)}catch(e){}
  }
  document.querySelectorAll('.lang button').forEach(b=>b.addEventListener('click',()=>set(b.dataset.lang)));
  document.getElementById('printBtn').addEventListener('click',()=>print());
  let l=new URLSearchParams(location.search).get('lang');
  if(!l){try{l=localStorage.getItem(key)}catch(e){}}
  set(l||'ru');
})();
