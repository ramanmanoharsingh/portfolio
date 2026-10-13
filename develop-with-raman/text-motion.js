/* Shared text reveal for every site page: headings, eyebrows and FAQ rows split into
   masked words that rise into place the first time they enter the viewport.
   Motion mirrors the homepage .wd word-wipe (same easing, stagger and travel) so the
   whole site keeps one aesthetic. Never changes an element's accessible name. */
(()=>{
const SEL='h1,h2,h3,.eb,summary';
const EASE='cubic-bezier(.22,.61,.36,1)';
const style=document.createElement('style');
style.textContent='.tm-w{display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.1em;margin-bottom:-.1em}.tm-w>i{display:inline-block;font-style:normal;transform:translateY(108%);transition:transform .95s '+EASE+';transition-delay:calc(var(--i,0)*55ms)}.tm-in .tm-w>i{transform:none}@media (prefers-reduced-motion:reduce){.tm-w>i{transform:none!important;transition:none!important}}';
document.head.appendChild(style);
const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
if(reduce)return;
const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const io=('IntersectionObserver'in window)?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('tm-in');io.unobserve(e.target)}}),{threshold:.2,rootMargin:'0px 0px -6% 0px'}):null;
const split=el=>{
 if(!el||!el.dataset||el.dataset.tm)return;
 el.dataset.tm='1';
 try{
  if(el.classList.contains('sr')||el.isContentEditable)return;
  if(el.querySelector('.wd'))return; // homepage headings already use the .wd wipe
  const name=(el.getAttribute('aria-label')||el.textContent||'').replace(/\s+/g,' ').trim();
  if(!name)return;
  let i=0,out='';
  for(const n of el.childNodes){
   if(n.nodeType===3){const words=n.textContent.split(/\s+/).filter(Boolean);if(words.length)out+=words.map(w=>`<span class="tm-w"><i style="--i:${i++}">${esc(w)}</i></span>`).join(' ')+' '}
   else if(n.nodeName==='BR'){out+='<br>'}
   else return; // unexpected markup: leave the element untouched
  }
  if(!i)return;
  el.setAttribute('aria-label',name);
  el.innerHTML='<span aria-hidden="true">'+out.trim()+'</span>';
  if(!io){el.classList.add('tm-in');return}
  io.observe(el);
 }catch(_){el.classList.add('tm-in')}
};
const scan=root=>{if(!root||root.nodeType!==1)return;if(root.matches&&root.matches(SEL))split(root);if(root.querySelectorAll)root.querySelectorAll(SEL).forEach(split)};
const start=()=>{
 scan(document.body);
 let t;const mo=new MutationObserver(ms=>{clearTimeout(t);t=setTimeout(()=>ms.forEach(m=>m.addedNodes.forEach(n=>scan(n))),80)});
 mo.observe(document.body,{childList:true,subtree:true});
 // Failsafe: nothing may stay hidden if the observer never fires for an on-screen element.
 addEventListener('load',()=>setTimeout(()=>document.querySelectorAll('[data-tm]:not(.tm-in)').forEach(el=>{const r=el.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight)el.classList.add('tm-in')}),2500));
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.TextMotion={scan};
})();
