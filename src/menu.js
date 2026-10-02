/* Mu. Burgerhouse — menú: chips de sección que siguen el scroll. Generado por build.py */
(function(){
  var d=document;
  var chips=d.querySelectorAll('#chips a'), secs=d.querySelectorAll('[data-sec]');
  var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ var id=e.target.id; chips.forEach(function(a){ var on=a.getAttribute('href')==='#'+id; a.classList.toggle('active',on); if(on) a.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'}); }); } }); },{rootMargin:'-40% 0px -55% 0px',threshold:0});
  secs.forEach(function(s){ io.observe(s); });
  chips.forEach(function(a){ a.addEventListener('click',function(){ if(window.dataLayer) dataLayer.push({event:'menu_section',section:a.getAttribute('href').slice(1)}); }); });
})();
