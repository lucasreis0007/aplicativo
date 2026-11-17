/* focus.js — modo foco. Usa carimbos de data/hora (não contagem de ticks), então continua correto se o iOS suspender o app.
   Limite: com o app fechado nada é avisado; ao reabrir, o período que já terminou é registrado. */
const fcfg=()=>({f:25,b:5,...JSON.parse(localStorage.getItem('focuscfg')||'{}')});
let FS=JSON.parse(localStorage.getItem('focus')||'null');
const fsave=()=>FS?localStorage.setItem('focus',JSON.stringify(FS)):localStorage.removeItem('focus');
const felapsed=()=>FS.elapsed+(FS.startedAt?Date.now()-FS.startedAt:0);
const fleft=()=>FS.dur-felapsed();
const mmss=ms=>{const s=Math.max(0,Math.ceil(ms/1000));return pad(Math.floor(s/60))+':'+pad(s%60)};
V.focus=()=>{const c=fcfg(),td=today(),hist=S.sessions.filter(x=>x.source==='foco'&&x.date===td);
 const tot=hist.reduce((a,x)=>a+x.min,0);
 return back()+`<h1>Modo foco</h1>`+(FS?`<div class="card" style="text-align:center"><div class="meta">${FS.phase==='foco'?'Concentração':'Descanso'} · ${esc(subj(FS.subject)?.name||'Sem matéria')}</div>
 <div id="ftime" style="font-size:56px;font-weight:700;font-variant-numeric:tabular-nums">${mmss(fleft())}</div>
 ${FS.startedAt?'<button class="btn" data-a="fPause">Pausar</button>':'<button class="btn" data-a="fResume">'+(felapsed()?'Retomar':'Iniciar')+'</button>'}<button class="btn sec" data-a="fFinish">Finalizar</button></div>`
 :`<div class="card"><label class="l">Matéria</label><select id="fsub">${subjOpts('')}</select>
 <div class="two"><div><label class="l">Foco (min)</label><input type="number" id="fmin" min="1" max="180" value="${c.f}"></div><div><label class="l">Descanso (min)</label><input type="number" id="fbk" min="1" max="60" value="${c.b}"></div></div><button class="btn" data-a="fStart">Iniciar</button></div>`)
 +`<h2>Hoje: ${hm(tot)} de foco</h2>${hist.length?hist.map(x=>`<div class="card"><b>${esc(subj(x.subject)?.name||'Sem matéria')}</b> <span class="meta">${hm(x.min)}</span></div>`).join(''):'<div class="empty">Nenhuma sessão de foco hoje.</div>'}`};
Object.assign(A,{
 fStart:()=>{const f=+$('#fmin').value,b=+$('#fbk').value;if(!(f>=1&&f<=180&&b>=1&&b<=60))return toast('Foco: 1–180 min. Descanso: 1–60 min.');
  localStorage.setItem('focuscfg',JSON.stringify({f,b}));FS={phase:'foco',dur:f*6e4,elapsed:0,startedAt:Date.now(),subject:$('#fsub').value,fmin:f,bmin:b};fsave();render()},
 fPause:()=>{FS.elapsed=felapsed();FS.startedAt=null;fsave();render()},
 fResume:()=>{FS.startedAt=Date.now();fsave();render()},
 fFinish:async()=>{if(FS.phase==='foco'){const m=Math.round(felapsed()/6e4);if(m>=1){await addSession(FS.subject,m,'Estudo','foco');toast('Registrado: '+hm(m))}}
  FS=null;fsave();await refresh()}
});
async function fComplete(){
 if(FS.phase==='foco'){await addSession(FS.subject,FS.fmin,'Estudo','foco');notify('Foco concluído',`${FS.fmin} min registrados. Hora do descanso.`,`${today()}|focus|${Date.now()}`);
  FS={...FS,phase:'pausa',dur:FS.bmin*6e4,elapsed:0,startedAt:null}}
 else{notify('Descanso terminado','Pronto para outro período de foco?',`${today()}|break|${Date.now()}`);FS={...FS,phase:'foco',dur:FS.fmin*6e4,elapsed:0,startedAt:null}}
 fsave();await refresh();
}
let fBusy=false;
setInterval(async()=>{if(!FS||fBusy)return;
 if(FS.startedAt&&fleft()<=0){fBusy=true;try{await fComplete()}finally{fBusy=false}}
 else if(S.tab==='focus'&&$('#ftime'))$('#ftime').textContent=mmss(fleft())},1000);
