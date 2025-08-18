const burger=document.getElementById('burger');
const menu=document.getElementById('menu');
burger?.addEventListener('click',()=>{const open=menu.style.display==='flex';menu.style.display=open?'none':'flex';menu.style.flexDirection='column';menu.style.gap='14px';burger.setAttribute('aria-expanded',String(!open))});
document.querySelectorAll('a[href^="#"]').forEach(a=>{a.addEventListener('click',e=>{const id=a.getAttribute('href');if(!id||id==='#')return;const el=document.querySelector(id);if(el){e.preventDefault();el.scrollIntoView({behavior:'smooth'})}})});
const form=document.getElementById('form');
const status=document.getElementById('form-status');
form?.addEventListener('submit',e=>{e.preventDefault();status.textContent='Grazie! Ti risponderemo al più presto.';form.reset()});
document.getElementById('year').textContent=new Date().getFullYear();
document.querySelectorAll('[data-sku] .btn').forEach(btn=>{btn.addEventListener('click',e=>{const card=e.currentTarget.closest('[data-sku]');const sku=card?.getAttribute('data-sku');if(sku){console.log('SKU selezionato:',sku)}})});
