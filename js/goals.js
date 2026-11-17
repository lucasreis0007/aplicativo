/* goals.js — metas com prazo, progresso e tarefas relacionadas.
   Progresso: (1) valor alcançado/alvo, se houver alvo; (2) senão tarefas concluídas/relacionadas; (3) senão o valor manual. */
const GT=['Acadêmica','Profissional','Financeira','Pessoal','Saúde'];
const gTasks=g=>S.tasks.filter(t=>t.goal===g.id&&t.status!=='cancelada');
function gProg(g){if(g.target>0)return Math.min(100,Math.round((g.saved||0)/g.target*100));
 const t=gTasks(g);return t.length?Math.round(t.filter(x=>x.status==='concluida').length/t.length*100):(g.manual||0)}
const gnum=(g,v)=>g.type==='Financeira'?brl(v):v;
V.goals=()=>back()+`<h1>Metas</h1><button class="btn" data-a="newGoal">Nova meta</button><div style="margin-top:8px">${S.goals.length?S.goals.map(g=>{const p=gProg(g),ts=gTasks(g);
 return `<div class="card"><b>${esc(g.name)}</b> <span class="meta">${g.type}${g.deadline?' · prazo '+fmtD(g.deadline):''}</span><div class="meta">${p}% ${g.target>0?`(${gnum(g,g.saved||0)} de ${gnum(g,g.target)})`:''}</div>${bar(p,100)}
 ${ts.length?`<div class="meta" style="margin-top:6px">${ts.slice(0,5).map(t=>(t.status==='concluida'?'✓ ':'• ')+esc(t.name)).join('<br>')}${ts.length>5?'<br>…':''}</div>`:''}
 <div class="acts"><button data-a="editGoal" data-id="${g.id}">Editar</button><button class="bad" data-a="delGoal" data-id="${g.id}">Excluir</button></div></div>`}).join(''):'<div class="empty">Nenhuma meta cadastrada. Vincule tarefas a uma meta no formulário da tarefa.</div>'}</div>`;
function goalForm(g={}){
 sheet(`<h3>${g.id?'Editar':'Nova'} meta</h3><form id="f" onsubmit="return false"><label class="l">Nome *</label><input name="name" value="${esc(g.name)}">
 <div class="two"><div><label class="l">Tipo</label><select name="type">${GT.map(t=>`<option ${g.type===t?'selected':''}>${t}</option>`).join('')}</select></div><div><label class="l">Prazo</label><input type="date" name="deadline" value="${g.deadline||''}"></div></div>
 <div class="two"><div><label class="l">Alvo numérico (opcional)</label><input type="number" min="0" step="any" name="target" value="${g.target||''}"></div><div><label class="l">Já alcançado</label><input type="number" min="0" step="any" name="saved" value="${g.saved||''}"></div></div>
 <label class="l">Progresso manual % (usado sem alvo nem tarefas)</label><input type="number" min="0" max="100" name="manual" value="${g.manual||''}"></form>
 <button class="btn" data-a="saveGoal" data-id="${g.id||''}">Salvar</button><button class="btn sec" data-a="close">Cancelar</button>`);
}
Object.assign(A,{
 newGoal:()=>goalForm(),editGoal:b=>goalForm(find(S.goals,b.dataset.id)),
 saveGoal:async b=>{const f=Object.fromEntries(new FormData($('#f')));if(!f.name.trim())return toast('Informe o nome da meta.');
  const man=+f.manual||0;if(man<0||man>100||+f.target<0||+f.saved<0)return toast('Valores inválidos.');
  const old=find(S.goals,b.dataset.id)||{};await DB.put('goals',{...old,id:old.id||uid(),name:f.name.trim(),type:f.type,deadline:f.deadline,target:+f.target||0,saved:+f.saved||0,manual:man});
  closeSheet();await refresh()},
 delGoal:async b=>{if(!confirm('Excluir a meta? As tarefas vinculadas são mantidas.'))return;
  for(const t of S.tasks.filter(t=>t.goal===b.dataset.id)){t.goal='';await DB.put('tasks',t)}
  await DB.del('goals',b.dataset.id);await refresh()}
});
