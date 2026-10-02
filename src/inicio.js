/* Mu. Burgerhouse — inicio: loader, modo loco, vitrina fija, parallax del hero. Generado por build.py */
(function(){
  var d=document, b=d.body;
  /* ---- loader ---- */
  var loader=d.getElementById('loader'), bar=loader.querySelector('.bar'), pct=d.getElementById('pct');
  var p=0, done=false; b.classList.add('locked');
  var t=setInterval(function(){ p=Math.min(p+Math.random()*18, done?100:92); bar.style.width=p+'%'; pct.textContent=Math.round(p)+'%'; if(p>=100){clearInterval(t); setTimeout(finish,250);} },140);
  function finish(){ loader.classList.add('done'); b.classList.remove('locked'); setTimeout(function(){loader.remove();},1000); }
  var img=d.querySelector('#heroimg img');
  function ready(){ done=true; }
  if(img.complete) ready(); else { img.addEventListener('load',ready); img.addEventListener('error',ready); }
  setTimeout(ready,2500);
  /* ---- modo loco ---- */
  var tl=d.getElementById('tloco'); tl.addEventListener('click',function(){ var on=tl.getAttribute('aria-pressed')!=='true'; tl.setAttribute('aria-pressed',on); b.classList.toggle('loco',on); });
  /* ---- vitrina: la foto cambia con el paso activo ---- */
  var steps=d.querySelectorAll('.step'), pins=d.querySelectorAll('#pin img');
  var io3=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ var i=e.target.getAttribute('data-i'); steps.forEach(function(s){s.classList.toggle('active', s.getAttribute('data-i')===i);}); pins.forEach(function(p){p.classList.toggle('on', p.getAttribute('data-i')===i);}); } }); },{rootMargin:'-45% 0px -45% 0px',threshold:0});
  steps.forEach(function(s){ io3.observe(s); });
  /* ---- logo: grande en el hero, se encoge hasta la barra al hacer scroll ---- */
  var hl=d.getElementById('herologo'), bl=d.querySelector('#bar .logo svg');
  function morph(){
    if(!hl||!bl) return;
    hl.style.transform='none'; var a=hl.getBoundingClientRect(), bb=bl.getBoundingClientRect();
    var ay=a.top+scrollY, by=bb.top; /* la barra es fija: su posición no depende del scroll */
    var dist=Math.max(260, ay-by+120), p=Math.min(1, scrollY/dist); p=1-Math.pow(1-p,2);
    var sc=1+(bb.height/a.height-1)*p, tx=(bb.left-a.left)*p, ty=((by+scrollY)-ay)*p;
    hl.style.transform='translate('+tx+'px,'+ty+'px) scale('+sc+')';
    b.classList.toggle('logo-docked', p>=1);
  }
  morph(); addEventListener('resize',morph);
  /* ---- parallax del hero ---- */
  var hero=d.getElementById('heroimg'), reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduce){ var ticking=false; addEventListener('scroll',function(){ if(ticking) return; ticking=true; requestAnimationFrame(function(){ var y=scrollY; if(y<innerHeight*1.2){ hero.firstElementChild.style.transform='translateY('+(y*0.18)+'px) scale('+(1+y*0.00012)+')'; } morph(); ticking=false; }); },{passive:true}); }
  else { addEventListener('scroll',morph,{passive:true}); }
})();
