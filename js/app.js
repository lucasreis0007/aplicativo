'use strict';
/* Minha Central — app.js (etapa 1): navegação, dashboard, tarefas, calendário, temas */
const DAYS=['dom','seg','ter','qua','qui','sex','sáb'];
const MONTHS=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const DEFCATS={
 Estudos:['Ensino médio','SENAI','Matemática','Português','Eletricidade','Mecânica','Metrologia','Manutenção industrial','Eletromecânica','ENEM','Espanhol','Inglês','Provas','Trabalhos','Simulados','Revisões'],
 Profissional:['Emprego','Currículo','Processos seletivos','Cursos','Faculdade','Engenharia Mecânica'],
 Pessoal:['Caminhadas','Exercícios físicos','Descanso','Lazer','Família','Atividades domésticas'],
 Financeiro:['Despesas','Pagamentos','Vencimentos','Entradas','Economia']};
const PL={alta:'Alta',media:'Média',baixa:'Baixa'},PR={alta:0,media:1,baixa:2};
const STL={pendente:'Pendente',andamento:'Em andamento',concluida:'Concluída',cancelada:'Cancelada',atrasada:'Atrasada'};

/* ---------- utilidades ---------- */
const $=(s,e=document)=>e.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=()=>ymd(new Date());
const nowIso=()=>{const n=new Date();return ymd(n)+'T'+pad(n.getHours())+':'+pad(n.getMinutes())};
const addDays=(s,n)=>{const d=new Date(s+'T12:00');d.setDate(d.getDate()+n);return ymd(d)};
const toMin=t=>+t.slice(0,2)*60+ +t.slice(3,5);
const fromMin=m=>pad(Math.floor(m/60))+':'+pad(m%60);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const find=(a,id)=>a.find(x=>x.id===id);
const fmtD=s=>{const d=new Date(s+'T12:00');return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}`};
const S={tasks:[],events:[],routines:[],cats:DEFCATS,tab:'home',cal:{mode:'month',date:today()},f:{q:'',st:'todas'}};

/* ---------- tema ---------- */
const mq=matchMedia('(prefers-color-scheme: dark)');
function applyTheme(){const m=localStorage.getItem('theme')||'auto';
 document.documentElement.dataset.theme=(m==='dark'||(m==='auto'&&mq.matches))?'dark':'light'}
mq.addEventListener('change',applyTheme);applyTheme();

/* ---------- dados ---------- */
async function load(){
 S.tasks=await DB.all('tasks');S.events=await DB.all('events');S.routines=await DB.all('routines');
 const c=await DB.get('settings','cats');
 if(c)S.cats=c.value;else await DB.put('settings',{key:'cats',value:DEFCATS});
}
const isActive=t=>!['concluida','cancelada'].includes(t.status);
const isLate=t=>isActive(t)&&((t.deadline&&t.deadline<today())||(t.date&&(t.date+'T'+(t.time||'23:59'))<nowIso()));
const stOf=t=>isLate(t)?'atrasada':t.status;
const items=d=>[
 ...S.routines.filter(r=>occurs(r,d)).map(r=>({k:'r',id:r.id,title:r.name,date:d,s:r.start,e:r.dur?fromMin(Math.min(1439,toMin(r.start)+r.dur)):null,cat:r.cat})),
 ...S.events.filter(e=>e.date===d).map(e=>({k:'e',id:e.id,title:e.title,date:d,s:e.start,e:e.end,cat:e.cat})),
 ...S.tasks.filter(t=>t.date===d&&t.status!=='cancelada').map(t=>({k:'t',id:t.id,title:t.name,date:d,s:t.time,
   e:t.time&&t.dur?fromMin(Math.min(1439,toMin(t.time)+ +t.dur)):null,cat:t.cat,done:t.status==='concluida'}))
].sort((a,b)=>(a.s||'99').localeCompare(b.s||'99'));
function free(d){ // horários livres entre 07:00 e 22:00 (itens com início e fim)
 const busy=items(d).filter(x=>x.s&&x.e).map(x=>[toMin(x.s),toMin(x.e)]).sort((a,b)=>a[0]-b[0]);
 let cur=420;const out=[];
 for(const[s,e]of busy){if(s>cur)out.push([cur,Math.min(s,1320)]);cur=Math.max(cur,e)}
 if(cur<1320)out.push([cur,1320]);
 return out.filter(x=>x[1]-x[0]>=15);
}

/* ---------- UI básica ---------- */
const sheet=h=>{$('#panel').innerHTML=h;$('#sheet').hidden=false};
const closeSheet=()=>{$('#sheet').hidden=true};
let tt;const toast=(m,ms=2600)=>{const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(tt);tt=setTimeout(()=>t.hidden=true,ms)};
const catOpts=sel=>Object.entries(S.cats).map(([g,l])=>`<optgroup label="${esc(g)}">${l.map(c=>`<option ${c===sel?'selected':''}>${esc(c)}</option>`).join('')}</optgroup>`).join('');
const dpre=(it,td)=>it.date===td?'':fmtD(it.date).slice(0,3)+' ';
const row=(it,td)=>`<div class="card row" data-a="open" data-k="${it.k}" data-id="${it.id}"><div class="t">${td?dpre(it,td):''}${it.s||'—'}</div><div class="grow"><b class="${it.done?'done':''}">${esc(it.title)}</b><div class="meta">${it.k==='e'?'Compromisso':it.k==='r'?'Rotina':'Tarefa'} · ${esc(it.cat||'')}${it.e?' · até '+it.e:''}</div></div></div>`;

/* ---------- Início ---------- */
function home(){
 const n=new Date(),h=n.getHours(),g=h<12?'Bom dia':h<18?'Boa tarde':'Boa noite',td=today();
 const act=S.tasks.filter(isActive),late=act.filter(isLate);
 const dayT=S.tasks.filter(t=>t.date===td&&t.status!=='cancelada');
 const dn=dayT.filter(t=>t.status==='concluida').length,pct=dayT.length?Math.round(dn/dayT.length*100):0;
 const top=[...act].sort((a,b)=>(PR[a.prio]-PR[b.prio])||String(a.date||'9').localeCompare(b.date||'9')).slice(0,3);
 const nt=pad(h)+':'+pad(n.getMinutes());
 const up=[];for(let i=0;i<7;i++){const d=addDays(td,i);items(d).forEach(x=>{if(!x.done&&(i>0||!x.s||x.s>=nt))up.push(x)})}
 const next=up.find(x=>x.s);
 return `<h1>${g}!</h1><div class="mut">${fmtD(td)} de ${n.getFullYear()}</div>
 <div class="card" style="margin-top:14px"><b>Hoje: ${dn} de ${dayT.length} tarefas concluídas</b><div class="bar"><i style="width:${pct}%"></i></div></div>
 <div class="grid"><div class="card stat"><b>${act.length}</b><span class="meta">Pendentes</span></div><div class="card stat"><b>${S.tasks.filter(t=>t.status==='concluida').length}</b><span class="meta">Concluídas</span></div><div class="card stat"><b class="${late.length?'bad':''}">${late.length}</b><span class="meta">Atrasadas</span></div></div>
 <h2>Próximo compromisso</h2>${next?row(next,td):'<div class="card empty">Nada agendado com horário.</div>'}
 <h2>Três prioridades</h2>${top.length?top.map(taskCard).join(''):'<div class="card empty">Sem tarefas pendentes.</div>'}
 <h2>Próximos 7 dias</h2>${up.length?up.slice(0,6).map(x=>row(x,td)).join(''):'<div class="card empty">Nada agendado.</div>'}`;
}

/* ---------- Tarefas ---------- */
const taskCard=t=>{const st=stOf(t);return `<div class="card task"><button class="chk ${t.status==='concluida'?'on':''}" data-a="toggle" data-id="${t.id}" aria-label="Concluir">✓</button><div class="grow"><b class="${t.status==='concluida'?'done':''}">${esc(t.name)}</b>
<div class="meta">${[esc(t.cat),t.date?fmtD(t.date)+(t.time?' '+t.time:''):'',t.dur?t.dur+' min':'',`<span class="p ${t.prio}">${PL[t.prio]}</span>`,st==='atrasada'?'<span class="bad">Atrasada</span>':STL[st]].filter(Boolean).join(' · ')}</div>
${t.desc?`<div class="meta">${esc(t.desc)}</div>`:''}
${(t.subs||[]).map((s,i)=>`<label class="sub"><input type="checkbox" style="width:auto;margin:0 6px 0 0" data-a="sub" data-id="${t.id}" data-i="${i}" ${s.d?'checked':''}>${esc(s.t)}</label>`).join('')}
<div class="acts"><button data-a="editTask" data-id="${t.id}">Editar</button><button data-a="dupTask" data-id="${t.id}">Duplicar</button><button data-a="postpone" data-id="${t.id}">Adiar</button><button class="bad" data-a="delTask" data-id="${t.id}">Excluir</button></div></div></div>`};
function taskList(){
 const q=S.f.q.toLowerCase();
 const l=S.tasks.filter(t=>(S.f.st==='todas'||stOf(t)===S.f.st)&&(!q||(t.name+' '+(t.desc||'')+' '+t.cat).toLowerCase().includes(q)))
  .sort((a,b)=>(isActive(b)-isActive(a))||(String(a.date||'9')+(a.time||'')).localeCompare(String(b.date||'9')+(b.time||'')));
 return l.length?l.map(taskCard).join(''):'<div class="empty">Nenhuma tarefa encontrada.</div>';
}
const tasksV=()=>`<h1>Tarefas</h1><input id="q" placeholder="Pesquisar…" value="${esc(S.f.q)}">
<select id="fs">${['todas','pendente','andamento','atrasada','concluida','cancelada'].map(s=>`<option value="${s}" ${S.f.st===s?'selected':''}>${s==='todas'?'Todas':STL[s]}</option>`).join('')}</select>
<button class="btn" data-a="newTask">Nova tarefa</button><div id="tl" style="margin-top:8px">${taskList()}</div>`;
function taskForm(t={}){
 sheet(`<h3>${t.id?'Editar':'Nova'} tarefa</h3><form id="f" onsubmit="return false">
 <label class="l">Nome *</label><input name="name" value="${esc(t.name)}">
 <label class="l">Descrição</label><textarea name="desc" rows="2">${esc(t.desc)}</textarea>
 <label class="l">Categoria</label><select name="cat">${catOpts(t.cat)}</select>
 <div class="two"><div><label class="l">Data</label><input type="date" name="date" value="${t.date||''}"></div><div><label class="l">Horário</label><input type="time" name="time" value="${t.time||''}"></div></div>
 <div class="two"><div><label class="l">Duração (min)</label><input type="number" min="0" name="dur" value="${t.dur||''}"></div><div><label class="l">Prazo</label><input type="date" name="deadline" value="${t.deadline||''}"></div></div>
 <div class="two"><div><label class="l">Prioridade</label><select name="prio">${Object.keys(PL).map(p=>`<option value="${p}" ${(t.prio||'media')===p?'selected':''}>${PL[p]}</option>`).join('')}</select></div>
 <div><label class="l">Status</label><select name="status">${['pendente','andamento','concluida','cancelada'].map(s=>`<option value="${s}" ${(t.status||'pendente')===s?'selected':''}>${STL[s]}</option>`).join('')}</select></div></div>
 <label class="l">Subtarefas (uma por linha)</label><textarea name="subs" rows="3">${esc((t.subs||[]).map(s=>s.t).join('\n'))}</textarea></form>
 <button class="btn" data-a="saveTask" data-id="${t.id||''}">Salvar</button><button class="btn sec" data-a="close">Cancelar</button>`);
}

/* ---------- Calendário ---------- */
function calV(){
 const{mode,date}=S.cal,d=new Date(date+'T12:00'),td=today();let title,body='';
 if(mode==='month'){
  title=`${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const off=new Date(d.getFullYear(),d.getMonth(),1).getDay();
  body='<div class="cal7">'+DAYS.map(x=>`<div class="h">${x}</div>`).join('');
  for(let i=0;i<42;i++){const c=new Date(d.getFullYear(),d.getMonth(),1-off+i),s=ymd(c),n=items(s).length;
   body+=`<button class="cell ${c.getMonth()!==d.getMonth()?'out':''} ${s===td?'today':''} ${s===date?'sel':''}" data-a="day" data-d="${s}">${c.getDate()}<small>${n?'●'.repeat(Math.min(n,3)):''}</small></button>`}
  body+='</div>';
 }else if(mode==='week'){
  const st=addDays(date,-d.getDay());title=`${fmtD(st)} – ${fmtD(addDays(st,6))}`;
  for(let i=0;i<7;i++){const s=addDays(st,i),l=items(s);
   body+=`<h2 ${s===td?'style="color:var(--ac)"':''}>${fmtD(s)}</h2>`+(l.length?l.map(x=>row(x)).join(''):'<div class="meta" style="padding:0 4px">Livre</div>')}
 }else{
  title=fmtD(date);const l=items(date),f=free(date);
  body=`<button class="btn" data-a="newEvent" data-d="${date}">Novo compromisso</button>`+(l.length?l.map(x=>row(x)).join(''):'<div class="empty">Nada neste dia.</div>')
  +`<h2>Horários livres (07h–22h)</h2><div class="card">${f.length?f.map(x=>`${fromMin(x[0])} – ${fromMin(x[1])}`).join('<br>'):'Sem horários livres.'}</div><div class="meta">Tarefas sem duração não bloqueiam horários.</div>`;
 }
 return `<h1>Calendário</h1><div class="seg">${[['day','Dia'],['week','Semana'],['month','Mês']].map(([m,l])=>`<button class="${mode===m?'on':''}" data-a="mode" data-m="${m}">${l}</button>`).join('')}</div>
 <div class="nav2"><button data-a="shift" data-n="-1">‹</button><button data-a="today"><b>${title}</b></button><button data-a="shift" data-n="1">›</button></div>${body}`;
}
function eventForm(e={},d){
 sheet(`<h3>${e.id?'Editar':'Novo'} compromisso</h3><form id="f" onsubmit="return false">
 <label class="l">Título *</label><input name="title" value="${esc(e.title)}">
 <label class="l">Categoria</label><select name="cat">${catOpts(e.cat)}</select>
 <label class="l">Data *</label><input type="date" name="date" value="${e.date||d||today()}">
 <div class="two"><div><label class="l">Início *</label><input type="time" name="start" value="${e.start||''}"></div><div><label class="l">Fim *</label><input type="time" name="end" value="${e.end||''}"></div></div></form>
 <button class="btn" data-a="saveEvent" data-id="${e.id||''}">Salvar</button><button class="btn sec" data-a="close">Cancelar</button>${e.id?`<button class="btn del" data-a="delEvent" data-id="${e.id}">Excluir</button>`:''}`);
}

/* ---------- Rotinas (etapa 2) e Perfil ---------- */
const routinesV=()=>`<h1>Rotinas</h1><div class="empty">As rotinas recorrentes serão entregues na próxima etapa.</div>`;
function meV(){const m=localStorage.getItem('theme')||'auto';
 return `<h1>Perfil</h1><h2>Aparência</h2><div class="seg">${[['light','Claro'],['dark','Escuro'],['auto','Automático']].map(([v,l])=>`<button class="${m===v?'on':''}" data-a="theme" data-v="${v}">${l}</button>`).join('')}</div>
 <h2>Categorias</h2>${Object.entries(S.cats).map(([g,l])=>`<div class="card"><b>${esc(g)}</b><div>${l.map(c=>`<span class="chip">${esc(c)}<b data-a="delCat" data-g="${esc(g)}" data-c="${esc(c)}">×</b></span>`).join('')}</div></div>`).join('')}
 <div class="two"><select id="cg">${Object.keys(S.cats).map(g=>`<option>${esc(g)}</option>`).join('')}</select><input id="cn" placeholder="Nova categoria"></div><button class="btn sec" data-a="addCat">Adicionar categoria</button>
 <h2>Sobre</h2><div class="card meta">Seus dados ficam apenas neste aparelho (IndexedDB). Estudos, metas, relatórios, foco e "Organizar meu dia" chegam na próxima etapa.</div>`}

/* ---------- ações ---------- */
const refresh=async()=>{await load();render()};
const A={
 nav:b=>{S.tab=b.dataset.v;render()},
 close:closeSheet,
 add:()=>sheet(`<h3>Adicionar</h3><button class="btn" data-a="newTask">Tarefa</button><button class="btn sec" data-a="newEvent">Compromisso</button>`),
 newTask:()=>taskForm(),
 editTask:b=>taskForm(find(S.tasks,b.dataset.id)),
 saveTask:async b=>{
  const f=Object.fromEntries(new FormData($('#f')));
  if(!f.name.trim())return toast('Informe o nome da tarefa.');
  if(f.time&&!f.date)return toast('Defina a data para usar horário.');
  if(f.deadline&&f.date&&f.deadline<f.date)return toast('O prazo não pode ser anterior à data.');
  const old=find(S.tasks,b.dataset.id)||{};
  const subs=f.subs.split('\n').map(x=>x.trim()).filter(Boolean).map(x=>({t:x,d:!!(old.subs||[]).find(s=>s.t===x&&s.d)}));
  await DB.put('tasks',{...old,id:old.id||uid(),name:f.name.trim(),desc:f.desc.trim(),cat:f.cat,date:f.date,time:f.time,dur:f.dur?+f.dur:0,deadline:f.deadline,prio:f.prio,status:f.status,subs});
  closeSheet();await refresh();toast('Tarefa salva.');
 },
 toggle:async b=>{const t=find(S.tasks,b.dataset.id);t.status=t.status==='concluida'?'pendente':'concluida';await DB.put('tasks',t);await refresh()},
 sub:async b=>{const t=find(S.tasks,b.dataset.id);t.subs[+b.dataset.i].d=b.checked;await DB.put('tasks',t);await refresh()},
 dupTask:async b=>{const t=find(S.tasks,b.dataset.id);await DB.put('tasks',{...t,id:uid(),name:t.name+' (cópia)',status:'pendente',subs:(t.subs||[]).map(s=>({t:s.t,d:false}))});await refresh();toast('Tarefa duplicada.')},
 postpone:async b=>{const t=find(S.tasks,b.dataset.id);t.date=addDays(t.date&&t.date>today()?t.date:today(),1);await DB.put('tasks',t);await refresh();toast('Adiada para '+fmtD(t.date)+'.')},
 delTask:async b=>{if(confirm('Excluir esta tarefa?')){await DB.del('tasks',b.dataset.id);await refresh()}},
 newEvent:b=>eventForm({},b.dataset.d),
 open:b=>{const k=b.dataset.k,id=b.dataset.id;k==='e'?eventForm(find(S.events,id)):k==='r'?routineForm(find(S.routines,id)):taskForm(find(S.tasks,id))},
 saveEvent:async b=>{
  const f=Object.fromEntries(new FormData($('#f')));
  if(!f.title.trim())return toast('Informe o título.');
  if(!f.date||!f.start||!f.end)return toast('Informe data, início e fim.');
  if(f.end<=f.start)return toast('O fim deve ser depois do início.');
  const id=b.dataset.id,c=items(f.date).filter(x=>!(x.k==='e'&&x.id===id)&&x.s&&x.e&&toMin(x.s)<toMin(f.end)&&toMin(f.start)<toMin(x.e));
  if(c.length&&!confirm('Conflito de horário com: '+c.map(x=>x.title+' ('+x.s+'–'+x.e+')').join(', ')+'.\nSalvar mesmo assim?'))return;
  await DB.put('events',{id:id||uid(),title:f.title.trim(),cat:f.cat,date:f.date,start:f.start,end:f.end});
  closeSheet();await refresh();toast('Compromisso salvo.');
 },
 delEvent:async b=>{if(confirm('Excluir este compromisso?')){await DB.del('events',b.dataset.id);closeSheet();await refresh()}},
 mode:b=>{S.cal.mode=b.dataset.m;render()},
 day:b=>{S.cal={mode:'day',date:b.dataset.d};render()},
 today:()=>{S.cal.date=today();render()},
 shift:b=>{const n=+b.dataset.n,{mode,date}=S.cal,d=new Date(date+'T12:00');
  S.cal.date=mode==='month'?ymd(new Date(d.getFullYear(),d.getMonth()+n,1)):addDays(date,n*(mode==='week'?7:1));render()},
 theme:b=>{localStorage.setItem('theme',b.dataset.v);applyTheme();render()},
 addCat:async()=>{const g=$('#cg').value,n=$('#cn').value.trim();
  if(!n)return toast('Digite o nome da categoria.');
  if(S.cats[g].includes(n))return toast('Essa categoria já existe.');
  S.cats[g].push(n);await DB.put('settings',{key:'cats',value:S.cats});render()},
 delCat:async b=>{if(!confirm('Remover a categoria "'+b.dataset.c+'"? As tarefas existentes mantêm o nome.'))return;
  S.cats[b.dataset.g]=S.cats[b.dataset.g].filter(c=>c!==b.dataset.c);await DB.put('settings',{key:'cats',value:S.cats});render()}
};
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-a]');if(!b)return;
 // clicar em botões dentro de um cartão "open" não deve abrir o cartão
 if(b.dataset.a==='open'&&e.target.closest('button'))return;
 try{await A[b.dataset.a]?.(b,e)}catch(x){console.error(x);toast('Erro: '+x.message)}
});
document.addEventListener('input',e=>{if(e.target.id==='q'){S.f.q=e.target.value;$('#tl').innerHTML=taskList()}});
document.addEventListener('change',e=>{if(e.target.id==='fs'){S.f.st=e.target.value;$('#tl').innerHTML=taskList()}});

/* ---------- render e inicialização ---------- */
const V={home,cal:calV,tasks:tasksV,routines:routinesV,me:meV};
function render(){
 $('#view').innerHTML=V[S.tab]();
 document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===S.tab));
}
(async()=>{
 try{await load()}catch(e){toast('Erro ao abrir o banco de dados local.')}
 render();
 navigator.storage?.persist?.();
 if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
 setInterval(()=>{if(S.tab==='home')render()},60000);
})();
