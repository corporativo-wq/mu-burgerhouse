(function(){
var d=document;
var chips=d.querySelectorAll('#chips a'), secs=d.querySelectorAll('[data-sec]');
var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ var id=e.target.id; chips.forEach(function(a){ var on=a.getAttribute('href')==='#'+id; a.classList.toggle('active',on); if(on) a.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'}); }); } }); },{rootMargin:'-40% 0px -55% 0px',threshold:0});
secs.forEach(function(s){ io.observe(s); });
chips.forEach(function(a){ a.addEventListener('click',function(){ if(window.dataLayer) dataLayer.push({event:'menu_section',section:a.getAttribute('href').slice(1)}); }); });
var intro=d.getElementById('intro');
if(intro){
var key='mu-intro', today=new Date(new Date().toLocaleString('en-US',{timeZone:'America/Cancun'})), iso=today.toISOString().slice(0,10);
var vig=(!intro.getAttribute('data-desde')||iso>=intro.getAttribute('data-desde'))&&(!intro.getAttribute('data-hasta')||iso<=intro.getAttribute('data-hasta'));
var seen=false; try{ seen=sessionStorage.getItem(key)==='1'; }catch(e){}
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(vig&&!seen&&!reduce&&!location.hash){
var ones=intro.querySelectorAll('.one'), n=0; try{ n=parseInt(localStorage.getItem('mu-intro-n')||'0',10)||0; localStorage.setItem('mu-intro-n',String(n+1)); }catch(e){}
var one=ones[n%ones.length], v=one.querySelector('video'), bar=one.querySelector('.bar i'), done=false;
one.hidden=false; v.preload='auto';
if(innerWidth>=900){ var mp=v.querySelector('source[type="video/mp4"]'); if(mp&&/diablo\.mp4$/.test(mp.src)){ v.querySelectorAll('source').forEach(function(s){ if(s!==mp) s.remove(); }); mp.src=mp.src.replace(/\.mp4$/,'-hd.mp4'); } } /* pantallas grandes: 1080p cuando existe */
v.load();
intro.hidden=false; d.body.classList.add('locked');
function close(){ if(done) return; done=true; try{ sessionStorage.setItem(key,'1'); }catch(e){} intro.classList.add('out'); d.body.classList.remove('locked'); setTimeout(function(){ intro.remove(); },700); if(window.dataLayer) dataLayer.push({event:'intro_close',id:one.getAttribute('data-id')}); }
intro.querySelectorAll('[data-intro-close]').forEach(function(b){ b.addEventListener('click',function(e){ if(b.tagName==='A'){ e.preventDefault(); close(); var t=d.querySelector(b.getAttribute('href')); if(t) setTimeout(function(){ t.scrollIntoView({behavior:'smooth',block:'center'}); },350); } else close(); }); });
v.addEventListener('timeupdate',function(){ if(v.duration&&bar) bar.style.width=(v.currentTime/v.duration*100)+'%'; });
v.addEventListener('ended',function(){ setTimeout(close,400); });
var p=v.play(); if(p&&p.catch) p.catch(function(){ /* sin autoplay: se queda el póster hasta que toquen Ver el menú */ });
var started=false; v.addEventListener('playing',function(){ started=true; });
setTimeout(function(){ if(!done&&!started&&!d.hidden) close(); },14000); /* red lenta: no bloquear el menú (si la pestaña está oculta, se espera) */
if(window.dataLayer) dataLayer.push({event:'intro_view',id:one.getAttribute('data-id')});
} else { intro.remove(); }
}
})();