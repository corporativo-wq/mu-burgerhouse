/* Mu. Burgerhouse — menú: chips de sección que siguen el scroll. Generado por build.py */
(function(){
  var d=document;
  var chips=d.querySelectorAll('#chips a'), secs=d.querySelectorAll('[data-sec]');
  var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ var id=e.target.id; chips.forEach(function(a){ var on=a.getAttribute('href')==='#'+id; a.classList.toggle('active',on); if(on) a.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'}); }); } }); },{rootMargin:'-40% 0px -55% 0px',threshold:0});
  secs.forEach(function(s){ io.observe(s); });
  chips.forEach(function(a){ a.addEventListener('click',function(){ if(window.dataLayer) dataLayer.push({event:'menu_section',section:a.getAttribute('href').slice(1)}); }); });
  /* ---- especial: intro a pantalla completa, una vez por visita, dentro de la vigencia ---- */
  var intro=d.getElementById('intro');
  if(intro){
    var key='mu-intro-'+intro.getAttribute('data-id'), today=new Date(new Date().toLocaleString('en-US',{timeZone:'America/Cancun'})), iso=today.toISOString().slice(0,10);
    var vig=(!intro.getAttribute('data-desde')||iso>=intro.getAttribute('data-desde'))&&(!intro.getAttribute('data-hasta')||iso<=intro.getAttribute('data-hasta'));
    var seen=false; try{ seen=sessionStorage.getItem(key)==='1'; }catch(e){}
    var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(vig&&!seen&&!reduce&&!location.hash){
      var v=d.getElementById('introv'), bar=intro.querySelector('.bar i'), done=false;
      if(innerWidth>=900){ var mp=v.querySelector('source[type="video/mp4"]'); if(mp){ v.querySelectorAll('source').forEach(function(s){ if(s!==mp) s.remove(); }); mp.src=mp.src.replace(/\.mp4(\?.*)?$/,'-hd.mp4'); v.load(); } } /* pantallas grandes: versión 1080p */
      intro.hidden=false; d.body.classList.add('locked');
      function close(){ if(done) return; done=true; try{ sessionStorage.setItem(key,'1'); }catch(e){} intro.classList.add('out'); d.body.classList.remove('locked'); setTimeout(function(){ intro.remove(); },700); if(window.dataLayer) dataLayer.push({event:'intro_close',id:key}); }
      intro.querySelectorAll('[data-intro-close]').forEach(function(b){ b.addEventListener('click',function(e){ if(b.tagName==='A'){ e.preventDefault(); close(); var t=d.querySelector(b.getAttribute('href')); if(t) setTimeout(function(){ t.scrollIntoView({behavior:'smooth',block:'center'}); },350); } else close(); }); });
      v.addEventListener('timeupdate',function(){ if(v.duration&&bar) bar.style.width=(v.currentTime/v.duration*100)+'%'; });
      v.addEventListener('ended',function(){ setTimeout(close,400); });
      var p=v.play(); if(p&&p.catch) p.catch(function(){ /* sin autoplay: se queda el póster hasta que toquen Ver el menú */ });
      setTimeout(function(){ if(!done&&(v.paused||v.readyState<2)) close(); },14000); /* red lenta: no bloquear el menú */
      if(window.dataLayer) dataLayer.push({event:'intro_view',id:key});
    } else { intro.remove(); }
  }
})();
