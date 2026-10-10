/* Shared site header; page-specific workspace navigation remains separate. */
(() => {
 'use strict';
 const $=(selector,root=document)=>root.querySelector(selector);
 document.addEventListener('DOMContentLoaded',()=>{
  let header=$('header.top');
  const pathname=location.pathname.toLowerCase(),isReset=pathname.endsWith('/reset-password.html'),isProjectIndex=pathname.endsWith('/projects.html');
  if(!header){
   header=document.createElement('header');header.className='site-chrome-header';
   const actionLabel=isReset?'Back to sign in':'Back to website',actionHref=isReset?'/auth.html':'/';
   header.innerHTML='<button class="site-chrome-menu-toggle" type="button" data-site-menu-toggle aria-expanded="false" aria-controls="site-global-menu">Menu</button><a class="site-chrome-brand" href="/" aria-label="Develop with Raman home">Develop with Raman</a><div class="site-chrome-actions"><a class="site-chrome-action" href="'+actionHref+'">'+actionLabel+'</a></div>';
   document.body.insertBefore(header,document.body.firstChild);
  }else{
   header.classList.add('site-chrome-header');
   let brand=$('.brand,.wm,.portal-header-brand',header);
   if(!brand){brand=document.createElement('a');brand.href='/';brand.textContent='Develop with Raman';header.insertBefore(brand,header.firstChild);}
   brand.classList.add('site-chrome-brand');brand.setAttribute('aria-label','Develop with Raman home');
   if(!brand.getAttribute('href')||brand.getAttribute('href')==='index.html')brand.setAttribute('href','/');
   if(isProjectIndex){const portfolio=$('.about-link',header);if(portfolio)portfolio.setAttribute('href','/#work');}
   if(!$('.site-chrome-menu-toggle',header)){
    const button=document.createElement('button');button.className='site-chrome-menu-toggle';button.type='button';button.textContent='Menu';button.setAttribute('data-site-menu-toggle','');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','site-global-menu');header.insertBefore(button,header.firstChild);
   }
  }
  const toggle=$('[data-site-menu-toggle]',header);
  const menu=document.createElement('nav');menu.className='site-chrome-menu-panel';menu.id='site-global-menu';menu.hidden=true;menu.setAttribute('aria-label','Site navigation');menu.setAttribute('role','dialog');menu.setAttribute('aria-modal','true');
  menu.innerHTML='<button class="site-chrome-close" type="button" data-site-menu-close>Close menu</button><a href="/#work">Work</a><a href="/projects.html">Projects</a><a href="/#services">Services</a><a href="/#achievements">Achievements</a><a href="/#about">About</a><a href="/#faq">FAQ</a><a href="/#contact">Contact</a><a class="site-chrome-menu-cta" href="/dashboard.html">Sign in / Dashboard ↗</a>';
  document.body.appendChild(menu);
  const close=()=>{menu.hidden=true;document.body.classList.remove('site-menu-open');toggle.setAttribute('aria-expanded','false');};
  const open=()=>{menu.hidden=false;document.body.classList.add('site-menu-open');toggle.setAttribute('aria-expanded','true');$('[data-site-menu-close]',menu).focus();};
  toggle.addEventListener('click',()=>menu.hidden?open():close());
  $('[data-site-menu-close]',menu).addEventListener('click',close);
  menu.addEventListener('click',event=>{if(event.target===menu)close();});
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden){close();toggle.focus();}});
  document.querySelectorAll('.portal-brand').forEach(brand=>{if(brand.querySelector('span')){[...brand.childNodes].forEach(node=>{if(node.nodeType===Node.TEXT_NODE)node.textContent='';});}});
 });
})();
