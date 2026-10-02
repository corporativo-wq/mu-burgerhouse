/* Mu. Burgerhouse — JS común (GA4, eventos, barra, retícula, aparición al hacer scroll, horario de hoy). Generado por build.py */
/* ---- GA4 (gtag directo, sin GTM). El ID vive en contenido.json → sitio.ga4_id ---- */
(function(){var id='__GA4_ID__';if(!id||id.indexOf('G-')!==0)return;window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config',id);var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+id;document.head.appendChild(s)})();
(function(){
  var d=document, b=d.body, root=d.documentElement; root.classList.add('js');
  /* ---- medición: cada CTA con data-ev → dataLayer + gtag ---- */
  window.dataLayer=window.dataLayer||[];
  d.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('[data-ev]');if(!a)return;
    var ev=a.getAttribute('data-ev'),br=a.getAttribute('data-branch')||'';
    window.dataLayer.push({event:'cta_click',cta:ev,branch:br,page:location.pathname,href:a.getAttribute('href')||''});
    if(typeof gtag==='function'){gtag('event',ev,{branch:br,page_path:location.pathname});}},{passive:true});
  /* ---- modo noche (se recuerda en este dispositivo) ---- */
  var tn=d.getElementById('tnoche'), noche=false; try{ noche=localStorage.getItem('mu-noche')==='1'; }catch(e){}
  function setNoche(on){ noche=on; b.classList.toggle('noche',on); if(tn) tn.setAttribute('aria-pressed',on); try{ localStorage.setItem('mu-noche',on?'1':'0'); }catch(e){} }
  if(noche) setNoche(true);
  if(tn) tn.addEventListener('click',function(){ setNoche(!noche); if(window.dataLayer) dataLayer.push({event:'noche',on:noche}); });
  /* ---- aparición al hacer scroll ---- */
  var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} }); },{rootMargin:'0px 0px -6% 0px',threshold:.05});
  d.querySelectorAll('[data-reveal],[data-clip]').forEach(function(el){ io.observe(el); });
  /* ---- barra clara/oscura según la sección visible + enlace activo ---- */
  var secs=d.querySelectorAll('[data-theme-section]'), links=d.querySelectorAll('#bar nav a[href^="#"]');
  var io2=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ b.classList.toggle('on-dark', e.target.getAttribute('data-theme-section')==='dark'); var id=e.target.id; if(id&&links.length){ links.forEach(function(a){ a.classList.toggle('active', a.getAttribute('href')==='#'+id); }); } } }); },{rootMargin:'-52px 0px -85% 0px',threshold:0});
  secs.forEach(function(s){ io2.observe(s); });
  /* ---- horario: marcar el día de hoy (hora de Cancún) ---- */
  var day=new Date(new Date().toLocaleString('en-US',{timeZone:'America/Cancun'})).getDay();
  d.querySelectorAll('table.hours tr[data-d="'+day+'"]').forEach(function(r){r.classList.add('today')});
  var y=d.getElementById('y'); if(y) y.textContent=new Date().getFullYear();
  /* ---- destino del hash visible de inmediato ---- */
  if(location.hash){ try{ var el=d.querySelector(location.hash); if(el) el.classList.add('in'); }catch(e){} }
})();
