/* Shared persisted site theme. The public homepage preference is stored in localStorage key "t". */
(()=>{'use strict';
const root=document.documentElement,KEY='t',LEGACY_KEY='playmatchTheme',media=window.matchMedia?window.matchMedia('(prefers-color-scheme: dark)'):null;
const read=()=>{try{let v=localStorage.getItem(KEY);if(v==='light'||v==='dark')return v;v=localStorage.getItem(LEGACY_KEY);if(v==='light'||v==='dark'){localStorage.setItem(KEY,v);return v}return null}catch(_){return null}};
const system=()=>media&&media.matches?'dark':'light';
const icon=t=>t==='dark'?'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"></path></svg>':'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.9 13A8.5 8.5 0 0 1 11 3.1 8.6 8.6 0 1 0 20.9 13Z"></path></svg>';
function paint(t){
 root.dataset.theme=t;root.style.colorScheme=t;
 if(document.body&&document.body.dataset.siteApp==='playmatch')document.body.classList.toggle('light-mode',t==='light');
 let meta=document.querySelector('meta[name="theme-color"]');if(!meta){meta=document.createElement('meta');meta.name='theme-color';document.head.appendChild(meta)}meta.content=t==='dark'?'#000000':'#f7f7f5';
 document.querySelectorAll('[data-theme-toggle]').forEach(b=>{const next=t==='dark'?'light':'dark';b.innerHTML=icon(t);b.setAttribute('aria-label','Switch to '+next+' mode');b.title='Switch to '+next+' mode';b.setAttribute('aria-pressed',String(t==='dark'))});
}
function init(){
 paint(read()||root.dataset.theme||system());
 let b=document.querySelector('[data-theme-toggle]');
 if(!b){b=document.querySelector('.theme-toggle');if(b)b.dataset.themeToggle=''}
 if(!b){
  b=document.createElement('button');b.type='button';b.className='theme-toggle';b.dataset.themeToggle='';b.setAttribute('aria-label','Toggle theme');
  const tr=document.querySelector('.top-right'),pt=document.querySelector('.portal-topbar'),nr=document.querySelector('header.top nav .nr'),qa=document.querySelector('.quick-actions');
  if(tr){const before=tr.querySelector('#top-signout,[data-sign-out],.identity');tr.insertBefore(b,before||null)}
  else if(pt){const before=pt.querySelector(':scope > .button,:scope > .portal-button,:scope > .avatar');pt.insertBefore(b,before||null)}
  else if(nr){const before=nr.querySelector('.top-action,#mb');nr.insertBefore(b,before||null)}
  else if(qa){const before=qa.querySelector('button');qa.insertBefore(b,before||null)}
  else{b.classList.add('theme-toggle-floating');document.body.appendChild(b)}
 }
 if(!b.dataset.bound){b.dataset.bound='1';b.addEventListener('click',()=>{const t=root.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem(KEY,t)}catch(_){}paint(t)})}
 paint(read()||root.dataset.theme||system());
 window.addEventListener('storage',e=>{if(e.key===KEY||e.key===LEGACY_KEY)paint(read()||system())});
 if(media){const change=()=>{if(!read())paint(system())};if(media.addEventListener)media.addEventListener('change',change);else if(media.addListener)media.addListener(change)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();