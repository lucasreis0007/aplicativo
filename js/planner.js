/* planner.js — "Organizar meu dia" + navegação "Mais". Algoritmo local (guloso):
   urgentes primeiro (atrasadas/prioridade alta), depois por prazo e prioridade; evita categorias iguais seguidas;
   encaixa nas janelas livres respeitando compromissos e descanso. Nada é gravado sem você aceitar. */
const back=()=>`<button class="btn sec" data-a="go" data-v="me">‹ Mais</button>`;
const brl=v=>(+v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const bar=(v,max)=>`<div class="bar"><i style="width:${max?Math.min(100,Math.round(v/max*100)):0}%"></i></div>`;
const moreUI=()=>`<h2>Mais</h2><div class="grid" style="grid-template-columns:1fr 1fr">${[['planner','Organizar meu dia'],['studies','Estudos'],['goals','Metas'],['reports','Relatórios'],['focus','Modo foco'],['finance','Finanças']].map(([v,l])=>`<button class="card stat" data-a="go" data-v="${v}"><b style="font-size:16px">${l}</b></button>`).join('')}</div>`;
const _meP=V.me;V.me=()=>_meP().replace('<h1>Perfil</h1>','<h1>Perfil</h1>'+moreUI());
const _homeP=V.home;V.home=()=>_homeP()+`<h2>Atalhos</h2><button class="btn" data-a="go" data-v="planner">Organizar meu dia</button><button class="btn sec" data-a="go" data-v="focus">Modo foco</button>`;
S.pl={d:today(),w1:'08:00',w2:'21:00',b:10,items:null,miss:[],nodur:[],refused:[]};
function makePlan(){
 const p=S.pl,d=p.d;let w1=toMin(p.w1);const w2=toMin(p.w2);
 if(d===today()){const n=new Date();w1=Math.max(w1,Math.ceil((n.getHours()*60+n.getMinutes())/5)*5)}
 const busy=items(d).filter(x=>x.s&&x.e).map(x=>[toMin(x.s),toMin(x.e)]).sort((a,b)=>a[0]-b[0]);
 const W=[];let cur=w1;for(const[s,e]of busy){if(s>cur)W.push([cur,Math.min(s,w2)]);cur=Math.max(cur,e)}if(cur<w2)W.push([cur,w2]);
 const cand=S.tasks.filter(t=>isActive(t)&&!t.time&&!p.refused.includes(t.id)&&(!t.date||t.date<=d));
 p.nodur=cand.filter(t=>!t.dur);
 const cls=t=>(isLate(t)||t.prio==='alta')?0:1;
 const rest=cand.filter(t=>t.dur>0).sort((a,b)=>cls(a)-cls(b)||String(a.deadline||a.date||'9').localeCompare(b.deadline||b.date||'9')||PR[a.prio]-PR[b.prio]);
 const out=[],miss=[];let last='';
 while(rest.length){
  const i=cls(rest[0])===0?0:Math.max(0,rest.findIndex(t=>t.cat!==last));const t=rest.splice(i,1)[0];
  const w=W.find(x=>x[1]-x[0]>=t.dur);if(!w){miss.push(t);continue}
  out.push({id:t.id,name:t.name,cat:t.cat,start:fromMin(w[0]),dur:t.dur,ok:true});w[0]+=t.dur+ +p.b;last=t.cat;
 }
 p.items=out.sort((a,b)=>a.start.localeCompare(b.start));p.miss=miss;
}
V.planner=()=>{const p=S.pl;return back()+`<h1>Organizar meu dia</h1><div class="card"><label class="l">Dia</label><input type="date" id="pd" value="${p.d}">
<div class="two"><div><label class="l">Início</label><input type="time" id="pw1" value="${p.w1}"></div><div><label class="l">Fim</label><input type="time" id="pw2" value="${p.w2}"></div></div>
<label class="l">Descanso entre atividades (min)</label><input type="number" id="pb" min="0" value="${p.b}"><button class="btn" data-a="plan">${p.items?'Recalcular':'Gerar sugestão'}</button>
<div class="meta">Usa tarefas pendentes sem horário e com duração. Compromissos e rotinas nunca são alterados.</div></div>
${p.items?(p.items.length?p.items.map((x,i)=>`<div class="card row"><input type="checkbox" data-a="pok" data-i="${i}" ${x.ok?'checked':''} style="width:auto;margin:0"><div class="grow"><b>${esc(x.name)}</b><div class="meta">${esc(x.cat)} · ${x.dur} min</div></div><input type="time" class="pt" data-i="${i}" value="${x.start}" style="width:110px;margin:0"></div>`).join('')
 +`<button class="btn" data-a="planAccept">Aceitar selecionadas</button><button class="btn sec" data-a="planClear">Recusar tudo</button><div class="meta">Desmarque o que não quer e toque em Recalcular para redistribuir.</div>`:'<div class="empty">Nenhuma tarefa coube ou há tarefas elegíveis.</div>')
 +(p.miss.length?`<h2>Não couberam</h2><div class="card meta">${p.miss.map(t=>esc(t.name)).join('<br>')}</div>`:'')
 +(p.nodur.length?`<h2>Sem duração (não planejadas)</h2><div class="card meta">${p.nodur.map(t=>esc(t.name)).join('<br>')}</div>`:''):''}`};
Object.assign(A,{
 go:b=>{S.tab=b.dataset.v;render();scrollTo(0,0)},
 plan:()=>{const w1=$('#pw1').value,w2=$('#pw2').value,d=$('#pd').value,br=+$('#pb').value;
  if(!d||!w1||!w2||w1>=w2)return toast('Informe dia e um período válido.');if(!(br>=0))return toast('Descanso inválido.');
  const p=S.pl;if(p.items)p.items.filter(x=>!x.ok).forEach(x=>p.refused.push(x.id));
  Object.assign(p,{d,w1,w2,b:br});makePlan();render()},
 pok:b=>{S.pl.items[+b.dataset.i].ok=b.checked},
 planClear:()=>{S.pl.items=null;S.pl.refused=[];render()},
 planAccept:async()=>{const p=S.pl,sel=p.items.filter(x=>x.ok);if(!sel.length)return toast('Nada selecionado.');
  const conf=[];sel.forEach(x=>{const e=endOfT(x.start,x.dur);
   items(p.d).filter(y=>!(y.k==='t'&&y.id===x.id)&&y.s&&y.e&&toMin(y.s)<toMin(e)&&toMin(x.start)<toMin(y.e)).forEach(y=>conf.push(x.name+' × '+y.title))});
  if(conf.length&&!confirm('Há conflitos de horário:\n'+conf.join('\n')+'\nAceitar mesmo assim?'))return;
  for(const x of sel){const t=find(S.tasks,x.id);t.date=p.d;t.time=x.start;await DB.put('tasks',t)}
  p.items=null;await refresh();toast(sel.length+' tarefa(s) agendada(s).')}
});
const endOfT=(s,d)=>fromMin(Math.min(1439,toMin(s)+d));
document.addEventListener('change',e=>{if(e.target.classList.contains('pt')&&e.target.value)S.pl.items[+e.target.dataset.i].start=e.target.value});
