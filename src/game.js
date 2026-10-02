/* Torre Mu — minijuego sin fin. Canvas, sin librerías. Generado por build.py */
(function(){
  var EN=(window.MU_LANG==='en');
  var TXT=EN?{capas:'Layers',mejor:'Best',nadie:'Nobody has played yet. Be the first.',campeon:'Congrats, champ!',nadamal:'Not bad.',cayo:'The tower fell.',llegaste:function(n){return 'You reached '+n+' layer'+(n===1?'':'s')+'.'},inclino:'The tower leaned too far.',piso:'The ingredient hit the floor.',cayoIng:'You dropped an ingredient.',guardando:'Saving…',guardar:'Save',guardadoGeneral:'Saved to the leaderboard.',guardadoLocal:'Saved on this device.'}
              :{capas:'Capas',mejor:'Mejor',nadie:'Nadie ha jugado aún. Sé el primero.',campeon:'¡Felicidades, campeón!',nadamal:'Nada mal.',cayo:'Se cayó la torre.',llegaste:function(n){return 'Llegaste a '+n+' capa'+(n===1?'':'s')+'.'},inclino:'La torre se inclinó demasiado.',piso:'El ingrediente cayó al piso.',cayoIng:'Se te cayó un ingrediente.',guardando:'Guardando…',guardar:'Guardar',guardadoGeneral:'Guardado en el marcador general.',guardadoLocal:'Guardado en este dispositivo.'};
  var d=document, overlay=d.getElementById('game'), cv=d.getElementById('gc'), ctx=cv.getContext('2d');
  var openBtns=d.querySelectorAll('[data-play]'), closeBtn=d.getElementById('gclose'), msg=d.getElementById('gmsg'), hud=d.getElementById('ghud');
  var form=d.getElementById('gform'), nameIn=d.getElementById('gname'), boardEl=d.getElementById('gboard'), bestEl=d.getElementById('gbest'), landingBoard=d.getElementById('scores');
  var W,H,DPR, raf=null, running=false, reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= marcador ================= */
  var API = window.MU_SCORE_API || '';           /* endpoint propio (GET lista / POST {name,score}) */
  var LS_KEY='mu-tower-scores', dbp=null;
  var scores={
    async list(limit){
      limit=limit||20;
      try{
        if(window.claude && window.claude.use){ var db=await getDb(); if(db){ var q=await db.collection('scores').orderBy('score','desc').limit(limit).get(); return q.docs.map(function(x){return x.data();}); } }
        if(API){ var r=await fetch(API+'?limit='+limit); if(r.ok) return await r.json(); }
      }catch(e){}
      try{ return (JSON.parse(localStorage.getItem(LS_KEY)||'[]')).sort(function(a,b){return b.score-a.score;}).slice(0,limit); }catch(e){ return []; }
    },
    async submit(entry){
      var ok=false;
      try{
        if(window.claude && window.claude.use){ var db=await getDb(); if(db){ var id=entry.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'anon'; var ref=db.collection('scores').doc(id); var cur=await ref.get(); var prev=cur.exists?cur.data():null; if(!prev||entry.score>prev.score){ await ref.set({name:entry.name,score:entry.score,ts:Date.now(),plays:(prev&&prev.plays||0)+1}); } else { await ref.update({plays:(prev.plays||0)+1}); } ok=true; } }
        if(!ok && API){ var r=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(entry)}); ok=r.ok; }
      }catch(e){}
      try{ var l=JSON.parse(localStorage.getItem(LS_KEY)||'[]'); l.push(entry); l.sort(function(a,b){return b.score-a.score;}); localStorage.setItem(LS_KEY,JSON.stringify(l.slice(0,50))); }catch(e){}
      return ok;
    }
  };
  async function getDb(){ if(dbp===null){ try{ dbp=await Promise.race([window.claude.use('db'), new Promise(function(r){setTimeout(function(){r(null)},4000)})]); }catch(e){ dbp=null; } if(dbp===null) dbp=false; } return dbp||null; }
  function renderBoard(el, list, mine){
    if(!el) return;
    if(!list.length){ el.innerHTML='<div class="srow mono"><span>—</span><span>'+TXT.nadie+'</span><span></span></div>'; return; }
    el.innerHTML=list.map(function(s,i){ var me=mine&&s.name===mine.name&&s.score===mine.score; return '<div class="srow'+(me?' me':'')+'"><span class="mono">'+String(i+1).padStart(2,'0')+'</span><span class="nm">'+esc(s.name)+'</span><span class="sc">'+s.score+'</span></div>'; }).join('');
  }
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  scores.list(10).then(function(l){ renderBoard(landingBoard,l); });

  /* ================= juego ================= */
  var ING=[
    {id:'carne', h:30, draw:patty},
    {id:'queso', h:14, draw:cheese},
    {id:'hongos',h:20, draw:mush},
    {id:'tocino',h:14, draw:bacon},
    {id:'salsa', h:12,  draw:sauce},
    {id:'cebolla',h:12, draw:onion},
    {id:'jitomate',h:15,draw:tomato},
    {id:'pepinillo',h:11,draw:pickle}
  ];
  var st; window.__muTower=function(){return st;};
  function reset(){
    var bw=Math.min(150,W*0.3);
    st={ n:0, stack:[], bunX:W/2, bunW:bw, falling:null, t:0, over:false, cam:0, lean:0, leanV:0, shake:0, best:0, started:false };
    try{ st.best=parseInt(localStorage.getItem('mu-tower-best')||'0',10)||0; }catch(e){}
    spawn(); hudUpdate(); msg.hidden=true;
  }
  function level(){ return st.n; }
  function spawn(){
    var n=level();
    var ing=ING[n<3?n:Math.floor(Math.random()*ING.length)];
    var speed=(H/230)*(1+n*0.07);                 /* más rápido cada capa */
    var amp=Math.min(W*0.42, 30+n*9);              /* zigzag más amplio */
    var w=Math.max(st.bunW*0.5, st.bunW*(0.95-n*0.012)); /* piezas más angostas */
    st.falling={ing:ing, x0:60+Math.random()*(W-120), x:0, y:-60-st.cam, w:w, vy:speed, amp:amp, freq:0.02+Math.min(0.07,n*0.004), ph:Math.random()*6.28, rot:(Math.random()-.5)*(0.2+n*0.03), drop:false};
    st.falling.x=st.falling.x0;
  }
  function topY(){ var y=H-80-30; for(var k=0;k<st.stack.length;k++) y-=st.stack[k].ing.h-2; return y; }
  function topX(){ var x=st.bunX; for(var k=0;k<st.stack.length;k++) x+=st.stack[k].dx; return x+st.lean; }
  function hudUpdate(){ hud.innerHTML='<span>'+TXT.capas+': <b>'+st.n+'</b></span><span>'+TXT.mejor+': '+Math.max(st.best,st.n)+'</span>'; }

  function gameOver(reason){
    st.over=true; running=false;
    try{ if(st.n>st.best){ localStorage.setItem('mu-tower-best',String(st.n)); } }catch(e){}
    var t = st.n>=25?TXT.campeon: st.n>=12?TXT.nadamal:TXT.cayo;
    msg.hidden=false; msg.querySelector('h3').textContent=t;
    msg.querySelector('.r').textContent=reason+' '+TXT.llegaste(st.n);
    msg.querySelector('.big').textContent=st.n;
    form.hidden=st.n===0; d.getElementById('gagain').hidden=false;
    boardEl.innerHTML=''; bestEl.textContent='';
    scores.list(10).then(function(l){ renderBoard(boardEl,l); });
    if(st.n>0) setTimeout(function(){ nameIn.focus(); },50);
  }
  form.addEventListener('submit',async function(e){
    e.preventDefault(); var name=nameIn.value.trim().slice(0,16); if(!name) return;
    var btn=form.querySelector('button'); btn.disabled=true; btn.textContent=TXT.guardando;
    try{ localStorage.setItem('mu-tower-name',name); }catch(er){}
    var entry={name:name,score:st.n,ts:Date.now()};
    var ok=await scores.submit(entry);
    form.hidden=true; btn.disabled=false; btn.textContent=TXT.guardar;
    var l=await scores.list(20); renderBoard(boardEl,l,entry); renderBoard(landingBoard,l.slice(0,10));
    bestEl.textContent= ok?TXT.guardadoGeneral:TXT.guardadoLocal;
  });
  try{ nameIn.value=localStorage.getItem('mu-tower-name')||''; }catch(e){}

  /* ---- dibujo ---- */
  function rr(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
  function bottombun(x,y,w){ var h=30; ctx.fillStyle='#d9a25a'; rr(x-w/2,y-h,w,h,10); ctx.fill(); ctx.fillStyle='#b9823f'; ctx.fillRect(x-w/2+6,y-h+4,w-12,3); }
  function patty(x,y,w,h){ ctx.fillStyle='#4a2d26'; rr(x-w/2,y-h,w,h,9); ctx.fill(); ctx.fillStyle='#6b4036'; for(var i=0;i<5;i++){ ctx.beginPath(); ctx.arc(x-w/2+12+i*(w-24)/4,y-h/2,2.5,0,7); ctx.fill(); } }
  function cheese(x,y,w,h){ ctx.fillStyle='#f3b63a'; rr(x-w/2-5,y-h,w+10,h,3); ctx.fill(); ctx.beginPath(); ctx.moveTo(x+w/2+5,y); ctx.lineTo(x+w/2+5,y+12); ctx.lineTo(x+w/2-5,y); ctx.fill(); }
  function mush(x,y,w,h){ ctx.fillStyle='#8a6a4e'; for(var i=0;i<6;i++){ var cx=x-w/2+9+i*(w-18)/5; ctx.beginPath(); ctx.ellipse(cx,y-h/2,w/10,h/2,0,0,7); ctx.fill(); } }
  function bacon(x,y,w,h){ ctx.strokeStyle='#8f2f1d'; ctx.lineWidth=h; ctx.lineCap='round'; ctx.beginPath(); for(var i=0;i<=8;i++){ var px=x-w/2-8+i*(w+16)/8, py=y-h/2+(i%2?-3:3); i?ctx.lineTo(px,py):ctx.moveTo(px,py);} ctx.stroke(); ctx.strokeStyle='#e7a77c'; ctx.lineWidth=2.5; ctx.stroke(); }
  function sauce(x,y,w,h){ ctx.fillStyle='#f4ecd8'; rr(x-w/2,y-h,w,h,5); ctx.fill(); for(var i=0;i<5;i++){ ctx.beginPath(); ctx.arc(x-w/2+9+i*(w-18)/4,y,5,0,7); ctx.fill(); } }
  function onion(x,y,w,h){ ctx.strokeStyle='#e8d6ee'; ctx.lineWidth=3; for(var i=0;i<3;i++){ ctx.beginPath(); ctx.ellipse(x-w/4+i*w/4,y-h/2,w/5,h/2,0,0,7); ctx.stroke(); } }
  function tomato(x,y,w,h){ ctx.fillStyle='#c8322b'; rr(x-w/2,y-h,w,h,h/2); ctx.fill(); ctx.fillStyle='#e85a4a'; ctx.fillRect(x-w/2+8,y-h+3,w-16,2); }
  function pickle(x,y,w,h){ ctx.fillStyle='#5f8a3a'; for(var i=0;i<4;i++){ ctx.beginPath(); ctx.ellipse(x-w/2+w/8+i*w/4,y-h/2,w/9,h/2,0,0,7); ctx.fill(); } }

  function frame(){
    if(!running) return;
    ctx.clearRect(0,0,W,H);
    var n=st.n;
    /* cámara: sigue la cima de la torre */
    var ty=topY(); var want=Math.max(0,(H*0.55)-ty); st.cam+= (want-st.cam)*0.08;
    /* inclinación: la torre se mece más mientras más alta */
    var sway=Math.min(1,n/30);
    st.leanV += (-st.lean*0.006 + Math.sin(st.t*0.03)*0.06*sway*(1+n*0.02)); st.leanV*=0.97; st.lean+=st.leanV;
    var limit=st.bunW*0.7;
    if(Math.abs(st.lean)>limit && n>0){ gameOver(TXT.inclino); }
    ctx.save(); ctx.translate((Math.random()-.5)*st.shake,st.cam+(Math.random()-.5)*st.shake); st.shake*=0.85;
    /* piso */
    ctx.fillStyle='rgba(242,240,235,.08)'; ctx.fillRect(0,H-70,W,1);
    var baseY=H-80;
    bottombun(st.bunX,baseY,st.bunW);
    var y=baseY-30, x=st.bunX;
    for(var k=0;k<st.stack.length;k++){ var s=st.stack[k]; var fr=(k+1)/Math.max(1,st.stack.length); x+=s.dx+ st.lean*(fr*fr); s.ing.draw(x,y,s.w,s.ing.h); y-=s.ing.h-2; }
    var tx=x, top=y;
    /* indicador de inclinación */
    ctx.fillStyle='rgba(216,121,42,'+(0.2+0.8*Math.min(1,Math.abs(st.lean)/limit))+')'; ctx.fillRect(W/2-60,H-58,120*Math.min(1,Math.abs(st.lean)/limit),2);
    /* ingrediente cayendo */
    var f=st.falling;
    if(f && !st.over){
      f.y+=f.vy; f.x=f.x0+Math.sin(st.t*f.freq*(1+n*0.02)+f.ph)*f.amp; f.x=Math.max(30,Math.min(W-30,f.x));
      ctx.save(); ctx.translate(f.x,f.y); ctx.rotate(f.rot*Math.sin(st.t*0.05)); f.ing.draw(0,0,f.w,f.ing.h); ctx.restore();
      if(f.y>=top-6 && f.y<=top+f.vy+4){
        var dx=f.x-tx, tol=st.bunW*0.45;
        if(Math.abs(dx)<tol){
          st.stack.push({ing:f.ing, dx:dx*0.6, w:f.w}); st.n++; st.shake=3+Math.min(6,n*0.3);
          st.leanV += dx*0.008;                       /* aterrizar de lado empuja la torre */
          st.falling=null; hudUpdate(); setTimeout(function(){ if(running) spawn(); }, reduce?0:200);
        }
      }
      if(f.y>top+40 && !st.over){ gameOver(n===0?TXT.piso:TXT.cayoIng); }
    }
    ctx.restore();
    st.t++;
    raf=requestAnimationFrame(frame);
  }

  /* ---- controles ---- */
  function moveTo(px){ var old=st.bunX; st.bunX=Math.max(st.bunW/2,Math.min(W-st.bunW/2,px)); var dm=Math.max(-25,Math.min(25,st.bunX-old)); st.leanV -= dm*0.006*Math.min(1,st.n/10); /* mover brusco mece la torre */ }
  cv.addEventListener('pointermove',function(e){ if(running){ var r=cv.getBoundingClientRect(); moveTo(e.clientX-r.left); } });
  cv.addEventListener('touchmove',function(e){ e.preventDefault(); if(running){ var r=cv.getBoundingClientRect(); moveTo(e.touches[0].clientX-r.left); } },{passive:false});
  var keys={};
  d.addEventListener('keydown',function(e){ if(overlay.hidden) return; if(e.key==='Escape') close(); if(d.activeElement===nameIn) return; keys[e.key]=true; if(e.key==='ArrowLeft'||e.key==='ArrowRight') e.preventDefault(); if(!running && !msg.hidden && (e.key==='Enter'||e.key===' ') && form.hidden){ start(); } });
  d.addEventListener('keyup',function(e){ keys[e.key]=false; });
  setInterval(function(){ if(!running||!st) return; if(keys.ArrowLeft) moveTo(st.bunX-10); if(keys.ArrowRight) moveTo(st.bunX+10); },16);

  function size(){ DPR=Math.min(2,devicePixelRatio||1); W=overlay.clientWidth; H=overlay.clientHeight; cv.width=W*DPR; cv.height=H*DPR; cv.style.width=W+'px'; cv.style.height=H+'px'; ctx.setTransform(DPR,0,0,DPR,0,0); }
  function start(){ size(); running=true; reset(); cancelAnimationFrame(raf); raf=requestAnimationFrame(frame); }
  function open(){ overlay.hidden=false; d.body.classList.add('locked'); start(); closeBtn.focus(); }
  function close(){ running=false; cancelAnimationFrame(raf); overlay.hidden=true; d.body.classList.remove('locked'); scores.list(10).then(function(l){ renderBoard(landingBoard,l); }); }
  openBtns.forEach(function(b){ b.addEventListener('click',open); b.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); open(); } }); });
  closeBtn.addEventListener('click',close);
  d.getElementById('gagain').addEventListener('click',start);
  addEventListener('resize',function(){ if(running){ size(); st.bunW=Math.min(150,W*0.3); moveTo(st.bunX); } });
})();
