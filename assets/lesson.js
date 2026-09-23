/* ==========================================================================
   lesson.js · общи механики за уроците „Машината на времето“
   Скриптът не съдържа съдържание от уроците. Всичко (текстове, отговори,
   точки, условия) се чете от HTML-а чрез класове и data- атрибути.
   Пълен списък на атрибутите: CLAUDE.md → „Модел на урок“.
   При промяна тук всички стари уроци трябва да продължат да работят:
   добавяй нови атрибути, не променяй значението на съществуващите.
   ========================================================================== */
(function(){
"use strict";
var $=function(s,r){return (r||document).querySelector(s)}, $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}
function num(el,attr,def){var v=el&&el.getAttribute(attr);return v===null||v===undefined||v===''?def:+v}
function words(s){return (s||'').split(/[\s,]+/).filter(Boolean)}
function tpl(t){return t?t.innerHTML:''}
function fill(str,map){return (str||'').replace(/\{(\w+)\}/g,function(_,k){return map[k]!==undefined?map[k]:'{'+k+'}'})}

/* ================= ОБЩИ ЕЛЕМЕНТИ (toast, речник, аудио) ================= */
function ensure(id,html){if(!document.getElementById(id))document.body.insertAdjacentHTML('beforeend',html)}
ensure('toast','<div class="toast" id="toast"></div>');
ensure('sheet','<div class="sheet-bg" id="sheetBg"></div><div class="sheet" id="sheet"><h3 id="sheetT"></h3><p id="sheetD" style="margin:0 0 12px"></p><button class="btn ghost small" id="sheetClose">Разбрах</button></div>');
ensure('audiobar','<div class="audiobar" id="audiobar"><div class="audiobar-in"><button class="btn small" id="aPause" aria-label="Пауза">⏸</button><button class="btn ghost small" id="aStop" aria-label="Спри">⏹</button><span class="t" id="aText">Чета…</span><select id="aRate" aria-label="Скорост"><option value="0.8">0.8×</option><option value="1" selected>1×</option><option value="1.2">1.2×</option></select></div></div>');

/* ================= СЪСТОЯНИЕ, XP, ПРОГРЕС ================= */
var S={xp:0,goals:{},badges:{},cards:{},clues:{}};
var GOAL_KEYS=(function(){var k={};$$('[data-goal]').forEach(function(e){k[e.getAttribute('data-goal')]=1});$$('[data-done]').forEach(function(e){k[e.getAttribute('data-done')]=1});return Object.keys(k)})();
function progress(){
  var bar=$('#progBar');if(!bar)return;
  var n=GOAL_KEYS.filter(function(k){return S.goals[k]}).length;
  bar.style.width=Math.min(100,Math.round(n/Math.max(1,GOAL_KEYS.length)*100))+'%';
}
function toast(msg){var t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(function(){t.classList.remove('show')},1800)}
function addXP(n,msg){if(!n)return;S.xp+=n;var x=$('#xp');if(x)x.textContent=S.xp;var b=$('#xpBox');if(b){b.classList.remove('bump');void b.offsetWidth;b.classList.add('bump')}toast('+'+n+' XP'+(msg?' · '+msg:''));progress()}
/* goal(key): отбелязва изпълнена цел. Връща true само първия път. */
function goal(key){if(!key||S.goals[key])return false;S.goals[key]=true;progress();evalNeeds();return true}
function has(list){return words(list).every(function(k){return S.goals[k]})}

/* ================= ЗАВИСИМОСТИ: data-need / data-goal-all ================= */
var evaluating=false,again=false;
function evalNeeds(){
  if(evaluating){again=true;return}evaluating=true;
  do{again=false;
    $$('[data-goal-all]').forEach(function(m){var k=m.getAttribute('data-goal-all');if(!S.goals[k]&&has(m.getAttribute('data-of'))){if(goal(k))addXP(num(m,'data-xp',0),m.getAttribute('data-msg'))}});
    $$('.badge[data-badge]').forEach(function(b){if(!S.badges[b.getAttribute('data-badge')]&&has(b.getAttribute('data-need')))award(b)});
    $$('.clue[data-clue]').forEach(function(c){var n=c.getAttribute('data-clue');if(!S.clues[n]&&c.hasAttribute('data-need')&&has(c.getAttribute('data-need'))){S.clues[n]='pending';setTimeout(function(){giveClue(c)},700)}});
    $$('.pcard[data-card]').forEach(function(c){if(!S.cards[c.getAttribute('data-card')]&&has(c.getAttribute('data-need')))unlockCard(c)});
  }while(again);
  evaluating=false;updateReveal();
}

/* ================= ЗНАЧКИ ================= */
function badgeCount(){var el=$('#bCount');if(el)el.textContent=Object.keys(S.badges).length}
function award(b){var id=b.getAttribute('data-badge');if(S.badges[id])return;S.badges[id]=true;b.classList.add('on');badgeCount();
  var name=($('b',b)||b).textContent;setTimeout(function(){toast('🏅 Нова значка: '+name)},900);progress()}
(function(){var t=$('#bTotal');if(t)t.textContent=$$('.badge[data-badge]').length;badgeCount()})();

/* ================= УЛИКИ И РАЗКРИВАНЕ ================= */
function giveClue(c){var n=c.getAttribute('data-clue');S.clues[n]=true;c.classList.add('on');
  c.innerHTML='<b>УЛИКА '+n+' ✓</b>'+tpl($('template',c));toast('🔎 Нова улика!');updateReveal()}
function updateReveal(){
  var lock=$('[data-reveal-lock]');if(!lock)return;
  var all=$$('.clue[data-clue]'),n=all.filter(function(c){return S.clues[c.getAttribute('data-clue')]===true}).length;
  var quizDone=$$('.quiz .node[data-goal]').every(function(nd){return S.goals[nd.getAttribute('data-goal')]});
  if(n===all.length){lock.textContent=quizDone?lock.getAttribute('data-ready-quiz'):lock.getAttribute('data-ready');var body=$('[data-reveal-body]');if(body)body.style.display='block'}
  else lock.textContent=fill(lock.getAttribute('data-partial'),{n:n,N:all.length});
}

/* ================= БУТОНИ „ПРОЧЕТОХ“ ================= */
$$('[data-done]').forEach(function(b){b.addEventListener('click',function(){
  var k=b.getAttribute('data-done');if(S.goals[k])return;
  b.classList.add('done');b.disabled=true;b.textContent='✓ Готово';
  addXP(num(b,'data-xp',10));goal(k);
})});

/* ================= РЕЧНИК ================= */
var G={};$$('.glossary [data-g]').forEach(function(e){G[e.getAttribute('data-g')]=[e.getAttribute('data-title'),e.innerHTML]});
var sheet=$('#sheet'),sbg=$('#sheetBg');
function openSheet(k){if(!G[k])return;$('#sheetT').textContent=G[k][0];$('#sheetD').innerHTML=G[k][1];sbg.style.display='block';requestAnimationFrame(function(){sheet.classList.add('open')})}
function closeSheet(){sheet.classList.remove('open');setTimeout(function(){sbg.style.display='none'},250)}
$$('.term[data-t]').forEach(function(t){t.addEventListener('click',function(){openSheet(t.getAttribute('data-t'))})});
sbg.addEventListener('click',closeSheet);$('#sheetClose').addEventListener('click',closeSheet);

/* ================= МАШИНАТА НА ВРЕМЕТО ================= */
function setDial(el,val){if(!el||el.textContent===val)return;el.textContent=val;el.classList.remove('roll');void el.offsetWidth;el.classList.add('roll')}
function setTM(v){setDial($('#tmY'),v[0]);setDial($('#tmC'),v[1]);setDial($('#tmP'),v[2])}
var jumped=!$('[data-jump]');
$$('[data-jump]').forEach(function(b){b.addEventListener('click',function(){
  if(jumped)return;jumped=true;b.disabled=true;
  var v=b.getAttribute('data-jump').split('|'),box=b.closest('.board')||document,dy=$('[data-dial="y"]',box);
  var from=parseInt(dy&&dy.textContent,10)||2026,to=parseInt(v[0],10),t0=null,dur=1400;
  function step(ts){if(!t0)t0=ts;var k=Math.min(1,(ts-t0)/dur),e=1-Math.pow(1-k,3);
    if(dy)dy.textContent=Math.round(from-(from-to)*e);
    if(k<1){requestAnimationFrame(step);return}
    if(dy)dy.textContent=v[0];setDial($('[data-dial="c"]',box),v[1]);setDial($('[data-dial="p"]',box),v[2]);setTM(v);
    b.textContent=b.getAttribute('data-done-text')||'✓';b.classList.add('done');
    if(goal(b.getAttribute('data-goal')))addXP(num(b,'data-xp',5),b.getAttribute('data-msg'));
    var then=b.getAttribute('data-then');if(then&&$(then))setTimeout(function(){$(then).scrollIntoView({behavior:'smooth',block:'start'})},500);
  }
  requestAnimationFrame(step);
})});
if('IntersectionObserver' in window){
  var io=new IntersectionObserver(function(ents){ents.forEach(function(en){
    if(en.isIntersecting&&(jumped||!en.target.contains($('[data-jump]'))))setTM(en.target.getAttribute('data-tm').split('|'));
  })},{rootMargin:'-45% 0px -50% 0px'});
  $$('[data-tm]').forEach(function(s){io.observe(s)});
}

/* ================= АУДИО (Web Speech API) ================= */
var synth=window.speechSynthesis,voices=[],queue=[],qi=0,speaking=false,paused=false,curLang='bg-BG',gen=0;
function pickVoice(lang){var l=lang.toLowerCase();var v=voices.filter(function(x){return x.lang&&x.lang.toLowerCase().replace('_','-').indexOf(l)===0});
  var g=v.filter(function(x){return /google/i.test(x.name)});return g[0]||v[0]||null}
function loadVoices(){if(!synth)return;voices=synth.getVoices()||[];var w=$('.voicewarn');if(w)w.style.display=(voices.length&&!pickVoice('bg'))?'block':'none'}
if(synth){loadVoices();if(typeof synth.onvoiceschanged!=='undefined')synth.onvoiceschanged=loadVoices}
function splitText(t){t=t.replace(/\s+/g,' ').trim();var parts=t.match(/[^.!?…]+[.!?…]*/g)||[t];var out=[];
  parts.forEach(function(p){p=p.trim();if(!p)return;while(p.length>180){var i=p.lastIndexOf(',',180);if(i<60)i=180;out.push(p.slice(0,i+1));p=p.slice(i+1).trim()}if(p)out.push(p)});return out}
function speakNext(){
  if(qi>=queue.length){stopSpeech();return}
  var my=gen,u=new SpeechSynthesisUtterance(queue[qi]),v=pickVoice(curLang.slice(0,2));if(v)u.voice=v;u.lang=curLang;u.rate=+$('#aRate').value;
  u.onend=u.onerror=function(){if(my!==gen||!speaking||paused)return;qi++;speakNext()};
  $('#aText').textContent=queue[qi];synth.speak(u);
}
function speak(text,lang,showBar){
  if(!synth){toast('Този браузър не може да чете на глас');return}
  gen++;synth.cancel();queue=splitText(text);qi=0;speaking=true;paused=false;curLang=lang||'bg-BG';
  $('#aPause').textContent='⏸';if(showBar!==false)$('#audiobar').classList.add('show');
  var g0=gen;setTimeout(function(){if(g0===gen)speakNext()},60);
}
function stopSpeech(){gen++;speaking=false;paused=false;if(synth)synth.cancel();$('#audiobar').classList.remove('show')}
$('#aPause').addEventListener('click',function(){
  if(!speaking)return;
  if(!paused){paused=true;gen++;synth.cancel();this.textContent='▶'}  // cancel + продължаване от изречението: надеждно на Android
  else{paused=false;gen++;this.textContent='⏸';speakNext()}
});
$('#aStop').addEventListener('click',stopSpeech);
$('#aRate').addEventListener('change',function(){if(speaking&&!paused){gen++;synth.cancel();setTimeout(speakNext,60)}});
$$('[data-read-all]').forEach(function(b){b.addEventListener('click',function(){speak($$(b.getAttribute('data-read-all')).map(function(e){return e.innerText}).join('. '),'bg-BG')})});
$$('[data-read]').forEach(function(b){b.addEventListener('click',function(){var t=$(b.getAttribute('data-read'));if(t)speak(t.innerText,'bg-BG')})});
var heard={};
$$('[data-say]').forEach(function(b){b.addEventListener('click',function(){
  speak(b.getAttribute('data-say'),b.getAttribute('data-lang')||'en-US',false);
  var k=b.getAttribute('data-say');if(!heard[k]){heard[k]=1;addXP(1);if(Object.keys(heard).length>=5)goal('say5')}
})});

/* ================= ТОЧКИ ЗА ДОКОСВАНЕ (карти, ленти) ================= */
$$('[data-hotspots]').forEach(function(box){
  var ids=[],seen={},info=box.getAttribute('data-infobox')?$(box.getAttribute('data-infobox')):$('.infobox',box);
  $$('[data-hs]',box).forEach(function(e){var id=e.getAttribute('data-hs');if(ids.indexOf(id)<0)ids.push(id)});
  var subs=(box.getAttribute('data-subgoals')||'').split(';').filter(Boolean).map(function(s){var p=s.split(':');return [p[0].trim(),words(p[1])]});
  function show(id){
    $$('[data-hs]',box).forEach(function(e){e.classList.toggle('active',e.getAttribute('data-hs')===id)});
    var t=$('template[data-info="'+id+'"]',box);if(info&&t)info.innerHTML=t.innerHTML;
    if(seen[id])return;seen[id]=1;$$('[data-hs="'+id+'"]',box).forEach(function(e){e.classList.add('seen')});addXP(num(box,'data-xp-each',2));
    subs.forEach(function(s){if(s[1].every(function(k){return seen[k]}))goal(s[0])});
    if(ids.every(function(k){return seen[k]})&&goal(box.getAttribute('data-goal')))addXP(num(box,'data-xp',0),box.getAttribute('data-msg'));
  }
  $$('[data-hs]',box).forEach(function(e){e.addEventListener('click',function(){show(e.getAttribute('data-hs'))})});
});

/* ================= СТЪПКИ „ПРЕДИ → СЛЕД“ (плъзгач и бутони) ================= */
$$('[data-steps]').forEach(function(box){
  var btns=$$('[data-st]',box),range=$('input[data-steps-range]',box),n=+box.getAttribute('data-steps')||btns.length,seen={};
  var cap=$('[data-steps-cap]',box),leg=$('[data-steps-legend]',box);
  function apply(i,user){
    if(range)range.value=i;
    btns.forEach(function(b){var on=+b.getAttribute('data-st')===i;b.classList.toggle('active',on);if(on)b.classList.add('seen')});
    $$('[data-fills]',box).forEach(function(e){var f=e.getAttribute('data-fills').split('|');e.style.fill=f[Math.min(i,f.length-1)]});
    $$('[data-steps-on]',box).forEach(function(e){var on=words(e.getAttribute('data-steps-on')).indexOf(String(i))>=0,cls=e.getAttribute('data-steps-add');
      if(!cls){e.setAttribute('opacity',on?1:0);return}
      if(on&&e.hasAttribute('data-restart')){e.classList.remove(cls);void e.getBoundingClientRect();e.classList.add(cls)}else e.classList.toggle(cls,on)});
    var ct=$('template[data-cap="'+i+'"]',box);if(cap&&ct&&(user||box.hasAttribute('data-cap-init')))cap.innerHTML=ct.innerHTML;
    var lt=$('template[data-legend="'+i+'"]',box);if(leg&&lt)leg.innerHTML=lt.innerHTML;
    if(seen[i])return;seen[i]=1;if(user)addXP(num(box,'data-xp-each',2));
    if(Object.keys(seen).length===n&&goal(box.getAttribute('data-goal')))addXP(num(box,'data-xp',0),box.getAttribute('data-msg'));
  }
  if(range)range.addEventListener('input',function(){apply(+this.value,true)});
  btns.forEach(function(b){b.addEventListener('click',function(){apply(+b.getAttribute('data-st'),true)})});
  apply(num(box,'data-start',0),false);
});

/* ================= ОТКРИВАНЕ ПО ЕДНО (плочки, верига) ================= */
$$('[data-revealset]').forEach(function(box){
  var items=$$('[data-rv]',box),seq=box.hasAttribute('data-seq');
  if(seq)items.forEach(function(b,i){if(i>0)b.disabled=true});
  items.forEach(function(b,i){b.addEventListener('click',function(){
    if(b.classList.contains('open'))return;
    b.innerHTML=tpl($('template.rv-open',b))||b.innerHTML;b.classList.add('open');addXP(num(box,'data-xp-each',2));
    var nx=items[i+1];if(seq&&nx&&nx.disabled){nx.disabled=false;var r=$('template.rv-ready',nx);if(r){var keep=$('template.rv-open',nx);nx.innerHTML=r.innerHTML;if(keep)nx.appendChild(keep)}}
    if(items.every(function(x){return x.classList.contains('open')})&&goal(box.getAttribute('data-goal')))addXP(num(box,'data-xp',0),box.getAttribute('data-msg'));
  })});
});

/* ================= ЕДИН ВЪПРОС С ИЗБОР ================= */
function initOneQ(box){
  var opts=$$('[data-opt]',box),tried=false,fb=$('.fb',box);
  if(!box.hasAttribute('data-noshuffle')&&opts.length){var par=opts[0].parentNode;shuffle(opts).forEach(function(o){par.appendChild(o)})}
  opts.forEach(function(b){b.addEventListener('click',function(){
    var e=b.getAttribute('data-e');
    if(b.hasAttribute('data-ok')){
      b.classList.add(b.classList.contains('btn')?'done':'right');opts.forEach(function(x){x.disabled=true});
      fb.className='fb ok';fb.innerHTML='<b>'+(box.getAttribute('data-ok-title')||'Точно така!')+'</b> '+(e||box.getAttribute('data-e')||'');
      var xp=num(box,'data-xp',5);if(goal(box.getAttribute('data-goal')))addXP(tried?num(box,'data-xp-retry',Math.ceil(xp/2)):xp,box.getAttribute('data-msg'));
      var st=box.getAttribute('data-stamp');if(st&&$(st))$(st).classList.add('show');
      var fin=box.getAttribute('data-final');if(fin&&$(fin))$(fin).textContent=fill($(fin).getAttribute('data-text'),{xp:S.xp,b:Object.keys(S.badges).length,B:$$('.badge[data-badge]').length,c:Object.keys(S.cards).length,C:$$('.pcard[data-card]').length});
    }else{
      tried=true;if(!b.classList.contains('btn'))b.classList.add('wrong');b.disabled=true;
      fb.className='fb bad';fb.innerHTML='<b>'+(box.getAttribute('data-bad-title')||'Не съвсем.')+'</b> '+(e||box.getAttribute('data-hint')||'Опитай друг отговор.');
    }
  })});
}
$$('.oneq').forEach(initOneQ);

/* ================= СОРТИРАНЕ В ДВЕ КОЛОНИ ================= */
$$('.sorter[data-left]').forEach(function(box){
  var L=box.getAttribute('data-left'),R=box.getAttribute('data-right');
  var items=shuffle($$('.sort-items [data-side]',box).map(function(e){return [e.innerHTML,e.getAttribute('data-side')]}));
  var i=0,miss=0,stage=$('.sort-stage',box)||box;
  function col(side){return items.slice(0,i).filter(function(x){return x[1]===side}).map(function(x){return '<div>✓ '+x[0]+'</div>'}).join('')}
  function render(){
    var cols='<div class="cols"><div class="col w"><h4>⬅ '+L.toUpperCase()+'</h4>'+col('l')+'</div><div class="col e"><h4>'+R.toUpperCase()+' ➡</h4>'+col('r')+'</div></div>';
    if(i>=items.length){stage.innerHTML='<p style="margin:0;font-weight:700;color:var(--ok)">✓ Всички '+items.length+' са подредени!'+(miss?' (грешки: '+miss+')':' Без нито една грешка!')+'</p>'+cols;
      if(goal(box.getAttribute('data-goal')))addXP(miss?num(box,'data-xp-miss',5):num(box,'data-xp',10),box.getAttribute('data-msg'));return}
    stage.innerHTML='<div style="font-size:.85rem;color:var(--muted);margin-bottom:6px">Карта '+(i+1)+' от '+items.length+'</div><div class="sortcard">'+items[i][0]+'</div>'+
      '<div class="sortbtns"><button class="btn" data-side-btn="l">⬅ '+L+'</button><button class="btn navy" data-side-btn="r">'+R+' ➡</button></div><div class="fb"></div>'+cols;
    $$('[data-side-btn]',stage).forEach(function(b){b.addEventListener('click',function(){
      if(b.getAttribute('data-side-btn')===items[i][1]){i++;addXP(num(box,'data-xp-each',2));render()}
      else{miss++;var fb=$('.fb',stage);fb.className='fb bad';fb.innerHTML='<b>Опа!</b> '+(box.getAttribute('data-hint')||'Помисли пак.')}
    })});
  }
  render();
});

/* ================= ЛИНИЯ НА ВРЕМЕТО (плъзгане + стрелки) ================= */
$$('ol.sortl').forEach(function(ol){
  var src=$$('li[data-order]',ol).map(function(li){return {o:+li.getAttribute('data-order'),y:li.getAttribute('data-year'),h:li.innerHTML}});
  var order;do{order=shuffle(src)}while(src.length>1&&order.every(function(x,i){return x.o===i}));
  ol.innerHTML=order.map(function(x){return '<li class="sitem" data-i="'+x.o+'"><span class="handle" aria-label="Плъзни">☰</span><span class="txt"><span class="yr">'+x.y+' ·</span>'+x.h+'</span><span class="mark"></span><span class="mv"><button data-mv="-1" aria-label="Нагоре">▲</button><button data-mv="1" aria-label="Надолу">▼</button></span></li>'}).join('');
  var sec=ol.closest('section')||document,fb=$('.fb',sec),chk=$('[data-check]',sec);
  function locked(){return ol.classList.contains('sorted')}
  function clearMarks(){if(locked())return;$$('.sitem',ol).forEach(function(li){li.classList.remove('ok','bad');$('.mark',li).textContent=''});if(fb)fb.className='fb'}
  $$('.sitem',ol).forEach(function(li){
    $$('[data-mv]',li).forEach(function(b){b.addEventListener('click',function(){
      if(locked())return;var d=+b.getAttribute('data-mv');
      if(d<0&&li.previousElementSibling)ol.insertBefore(li,li.previousElementSibling);
      else if(d>0&&li.nextElementSibling)ol.insertBefore(li.nextElementSibling,li);
      clearMarks();
    })});
    var h=$('.handle',li),startY=0,dragging=false,pid=null;
    h.addEventListener('pointerdown',function(ev){if(locked())return;dragging=true;pid=ev.pointerId;startY=ev.clientY;li.classList.add('dragging');try{h.setPointerCapture(pid)}catch(e){}ev.preventDefault()});
    h.addEventListener('pointermove',function(ev){
      if(!dragging||ev.pointerId!==pid)return;
      var dy=ev.clientY-startY;li.style.transform='translateY('+dy+'px)';
      var prev=li.previousElementSibling,next=li.nextElementSibling;
      if(next&&dy>next.offsetHeight/2+4){var nh=next.offsetHeight+8;ol.insertBefore(next,li);startY+=nh;dy-=nh;li.style.transform='translateY('+dy+'px)'}
      else if(prev&&dy<-(prev.offsetHeight/2+4)){var ph=prev.offsetHeight+8;ol.insertBefore(li,prev);startY-=ph;dy+=ph;li.style.transform='translateY('+dy+'px)'}
    });
    function end(ev){if(!dragging||(ev&&ev.pointerId!==pid))return;dragging=false;li.classList.remove('dragging');li.style.transform='';clearMarks()}
    h.addEventListener('pointerup',end);h.addEventListener('pointercancel',end);
  });
  var tries=0;
  if(chk)chk.addEventListener('click',function(){
    if(locked())return;tries++;var items=$$('.sitem',ol),ok=0;
    items.forEach(function(li,pos){var good=+li.getAttribute('data-i')===pos;li.classList.toggle('ok',good);li.classList.toggle('bad',!good);$('.mark',li).textContent=good?'✓':'✗';if(good)ok++});
    if(ok===items.length){ol.classList.add('sorted');chk.disabled=true;if(fb){fb.className='fb ok';fb.innerHTML='<b>'+(ol.getAttribute('data-ok-title')||'Отлично!')+'</b> '+(ol.getAttribute('data-ok')||'')}
      if(goal(ol.getAttribute('data-goal')))addXP(tries===1?num(ol,'data-xp',15):num(ol,'data-xp-retry',8),ol.getAttribute('data-msg'))}
    else if(fb){fb.className='fb bad';fb.innerHTML='<b>Верни места: '+ok+' от '+items.length+'.</b> '+(ol.getAttribute('data-bad')||'Премести събитията с ✗ и провери пак.')}
  });
});

/* ================= КАРТИ-ЛИЧНОСТИ ================= */
function avFallback(root){$$('.av img',root).forEach(function(img){img.addEventListener('error',function(){img.replaceWith(document.createTextNode('👤'))})})}
function cardCount(){var el=$('[data-card-count]');if(el)el.textContent='Отключени: '+Object.keys(S.cards).length+' от '+$$('.pcard[data-card]').length}
$$('.pcard[data-card]').forEach(function(c){
  var front=$('.pfront',c);c._front=front.innerHTML;c.classList.add('locked');
  front.innerHTML='<div class="av">❔</div><b>Заключена карта</b><small>🔒</small><div class="sp">Как се отключва: '+c.getAttribute('data-how')+'</div>';
  c.addEventListener('click',function(){if(c.classList.contains('locked')){toast('🔒 '+c.getAttribute('data-how'));return}c.classList.toggle('flip')});
});
function unlockCard(c){var id=c.getAttribute('data-card');if(S.cards[id])return;S.cards[id]=true;
  c.classList.remove('locked');$('.pfront',c).innerHTML=c._front;avFallback(c);c.classList.add('new');cardCount();
  setTimeout(function(){toast('🃏 Нова карта: '+c.getAttribute('data-name'))},1200);addXP(3);goal('card-'+id)}
cardCount();

/* ================= ИНТЕРВЮ ================= */
$$('.iv').forEach(function(box){
  var qs=$$('template[data-q]',box),i=0,chat=$('.chat',box),btns=$('.qbtns',box),asker=box.getAttribute('data-asker')||'Венета';
  function render(){
    if(i>=qs.length){btns.innerHTML='<p class="note" style="margin:0">'+(box.getAttribute('data-end')||'✓ Интервюто е готово.')+'</p>';return}
    btns.innerHTML='<button class="btn navy">❓ '+qs[i].getAttribute('data-q')+'</button>';
    $('button',btns).addEventListener('click',function(){
      chat.insertAdjacentHTML('beforeend','<div class="bubble q"><small>'+asker+'</small>'+qs[i].getAttribute('data-q')+'</div>'+qs[i].innerHTML);
      i++;addXP(num(box,'data-xp-each',2));if(i===qs.length&&goal(box.getAttribute('data-goal')))addXP(num(box,'data-xp',0));render();
    });
  }
  render();
});

/* ================= ЗАГАДКА „ГРЕШКАТА В СВИТЪКА“ ================= */
$$('.scroll[data-goal]').forEach(function(box){
  var need=$$('.frag[data-bad]',box).length,found=0,wrong=0,fb=$(box.getAttribute('data-fb'))||box.nextElementSibling;
  $$('.frag',box).forEach(function(b){b.addEventListener('click',function(){
    if(b.classList.contains('found')||b.classList.contains('okay'))return;var e=b.getAttribute('data-e')||'';
    if(b.hasAttribute('data-bad')){b.classList.add('found');found++;fb.className='fb ok';fb.innerHTML='<b>Хванах те!</b> '+e+' ('+found+' от '+need+')';addXP(num(box,'data-xp-each',3));
      if(found===need){fb.innerHTML+='<br>Свитъкът е изчистен!'+(wrong?'':' Без нито един фалшив сигнал.');goal(box.getAttribute('data-goal'))}}
    else{b.classList.add('okay');wrong++;fb.className='fb bad';fb.innerHTML='<b>Това е наред.</b> '+e}
  })});
});

/* ================= ДУМИ С ИСТОРИЯ ================= */
var etySeen=[];
$$('.ety').forEach(function(b){b.addEventListener('click',function(){b.classList.toggle('open');if(etySeen.indexOf(b)<0){etySeen.push(b);addXP(2)}})});

/* ================= ТЕСТ ПО НИВА ================= */
$$('.quiz').forEach(function(quiz){
  var nodes=$$('.node[data-lvl]',quiz),area=$('.q-area',quiz),firstTotal=0,st=null;
  var FB_OK=['Браво!','Точно!','Отлично, детективе!','Вярно!'],FB_BAD=['Почти…','Не съвсем.','Опа!'];
  var LV=$$('template[data-level]',quiz).map(function(t){var d=document.createElement('div');d.innerHTML=t.innerHTML;
    return $$('.q',d).map(function(q){var o=[],a=0;$$('button',q).forEach(function(b,i){o.push(b.innerHTML);if(b.hasAttribute('data-ok'))a=i});return {q:$('p',q).innerHTML,o:o,a:a,e:q.getAttribute('data-e')||''}})});
  function start(l){st={l:l,queue:LV[l].map(function(_,i){return i}),firstOk:0,missed:{}};area.scrollIntoView({behavior:'smooth',block:'start'});renderQ()}
  function renderQ(){
    if(!st.queue.length){finish();return}
    var n=LV[st.l].length,qi=st.queue[0],Q=LV[st.l][qi],order=shuffle(Q.o.map(function(_,i){return i}));
    area.innerHTML='<div class="stage"><div class="qhead"><span>Ниво '+(st.l+1)+'</span><button class="btn ghost small" data-quit aria-label="Затвори">✕</button></div>'+
      '<div class="qprog"><i style="width:'+Math.round((n-st.queue.length)/n*100)+'%"></i></div>'+
      '<p class="qtext">'+Q.q+'</p><div class="opts">'+order.map(function(i){return '<button class="opt" data-i="'+i+'">'+Q.o[i]+'</button>'}).join('')+'</div><div class="fb"></div></div>';
    $('[data-quit]',area).addEventListener('click',function(){st=null;area.innerHTML=''});
    $$('.opt',area).forEach(function(b){b.addEventListener('click',function(){
      var i=+b.getAttribute('data-i'),fb=$('.fb',area);$$('.opt',area).forEach(function(x){x.disabled=true;if(+x.getAttribute('data-i')===Q.a)x.classList.add('right')});
      if(i===Q.a){fb.className='fb ok';fb.innerHTML='<b>'+FB_OK[Math.floor(Math.random()*FB_OK.length)]+'</b> '+Q.e;
        if(!st.missed[qi]){st.firstOk++;addXP(10)}else addXP(3);st.queue.shift()}
      else{b.classList.add('wrong');fb.className='fb bad';fb.innerHTML='<b>'+FB_BAD[Math.floor(Math.random()*FB_BAD.length)]+'</b> '+Q.e+' <i>Въпросът ще се върне по-късно.</i>';
        st.missed[qi]=true;st.queue.push(st.queue.shift())}
      fb.insertAdjacentHTML('beforeend','<div style="margin-top:10px"><button class="btn small '+(i===Q.a?'done':'')+'" data-next>Продължи →</button></div>');
      $('[data-next]',area).addEventListener('click',renderQ);
    })});
  }
  function finish(){
    var l=st.l,nd=nodes[l],n=LV[l].length;
    if(!S.goals[nd.getAttribute('data-goal')])firstTotal+=st.firstOk;
    nd.classList.add('done');if(nodes[l+1])nodes[l+1].disabled=false;
    var name=($('span',nd)||nd).textContent;
    area.innerHTML='<div class="stage" style="text-align:center"><div style="font-size:2.4rem">⭐</div><p class="qtext">Ниво „'+name+'“ е преминато!</p><p>От първи опит: <b>'+st.firstOk+' от '+n+'</b></p>'+
      (nodes[l+1]?'<button class="btn gold" data-next-lvl>Към ниво '+(l+2)+' →</button>':'<p>'+(quiz.getAttribute('data-end')||'Всички нива са готови!')+'</p>')+'</div>';
    if(nodes[l+1])$('[data-next-lvl]',area).addEventListener('click',function(){start(l+1)});
    st=null;goal(nd.getAttribute('data-goal'));
    if(nodes.every(function(x){return S.goals[x.getAttribute('data-goal')]})&&firstTotal>=num(quiz,'data-chief',8))goal('chief');
  }
  nodes.forEach(function(n){n.addEventListener('click',function(){if(!n.disabled)start(+n.getAttribute('data-lvl'))})});
});

/* ================= ФЛАШКАРТИ ================= */
$$('.flash').forEach(function(flash){
  var sec=flash.closest('section')||document,FC=$$('.fc-data [data-front]',sec).map(function(e){return [e.getAttribute('data-front'),e.innerHTML]}),i=0;
  if(!FC.length)return;
  function render(){flash.classList.remove('flip');setTimeout(function(){$('.face.front',flash).textContent=FC[i][0];$('.face.back',flash).innerHTML=FC[i][1];var nm=$('.fc-num',sec);if(nm)nm.textContent=(i+1)+' / '+FC.length},150)}
  flash.addEventListener('click',function(){flash.classList.toggle('flip')});
  $('.fc-prev',sec).addEventListener('click',function(){i=(i-1+FC.length)%FC.length;render()});
  $('.fc-next',sec).addEventListener('click',function(){i=(i+1)%FC.length;render()});
  render();
});

/* ================= ТЕКСТ ЗА КОПИРАНЕ ================= */
$$('textarea.plain[data-from]').forEach(function(ta){
  var items=$$(ta.getAttribute('data-from')+' li').map(function(li,i){return (i+1)+'. '+li.innerText});
  ta.value=(ta.getAttribute('data-head')||'')+items.join('\n')+(ta.getAttribute('data-tail')||'');
});
$$('[data-copy]').forEach(function(btn){btn.addEventListener('click',function(){
  var ta=$(btn.getAttribute('data-copy')),text=ta.value;function ok(){toast('Текстът е копиран ✓')}
  if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(text).then(ok,function(){ta.select();document.execCommand('copy');ok()})}
  else{ta.removeAttribute('readonly');ta.select();try{document.execCommand('copy');ok()}catch(e){toast('Маркирай текста и го копирай ръчно')}ta.setAttribute('readonly','')}
})});

/* ================= СНИМКИ: резервен вариант без интернет ================= */
$$('figure img').forEach(function(img){img.addEventListener('click',function(){window.open(img.src.replace(/\?width=\d+/,''),'_blank','noopener')});
  var cap=img.parentNode.querySelector('figcaption small');if(cap)cap.insertAdjacentHTML('beforeend','<span class="zoomhint"><br>🔍 Докосни снимката, за да я видиш в пълен размер.</span>');
  img.addEventListener('error',function(){var d=document.createElement('div');d.className='noimg';d.textContent='📷 Снимката се показва, когато има интернет.';img.replaceWith(d)})});

progress();evalNeeds();
/* Малко API за уникални неща в самия урок */
window.Lesson={goal:goal,addXP:addXP,toast:toast,speak:speak,state:S};
})();
