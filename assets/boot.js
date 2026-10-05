// lock scroll during the intro; unlocked by the intro timeline (or the safety net below)
document.documentElement.classList.add('lock');
setTimeout(function(){document.documentElement.classList.remove('intro','lock')},10000);
// always start at the top so the intro is actually seen after a reload
if('scrollRestoration' in history)history.scrollRestoration='manual';
window.scrollTo(0,0);
