/* routines.js — rotinas semanais (toda semana ou a cada 2 semanas). Aparecem no calendário. */
const occurs=(r,d)=>{
 if(!r.active||d<r.from)return false;
 if(!r.days.includes(new Date(d+'T12:00').getDay()))return false;
 const wk=x=>addDays(x,-new Date(x+'T12:00').getDay());
 return Math.round((new Date(wk(d)+'T12:00')-new Date(wk(r.from)+'T12:00'))/6048e5)%r.every===0;
};
V.routines=()=>`<h1>Rotinas</h1><button class="btn" data-a="newRoutine">Nova rotina</button><div style="margin-top:8px">${S.routines.length?S.routines.map(r=>`<div class="card"><b>${esc(r.name)}</b>${r.active?'':' <span class="meta">(suspensa)</span>'}
<div class="meta">${r.days.map(d=>DAYS[d]).join(', ')} · ${r.start}${r.dur?' · '+r.dur+' min':''} · ${r.every===1?'toda semana':'a cada 2 semanas'} · ${esc(r.cat)}</div>
<div class="acts"><button data-a="editRoutine" data-id="${r.id}">Editar</button><button data-a="toggleRoutine" data-id="${r.id}">${r.active?'Suspender':'Reativar'}</button><button class="bad" data-a="delRoutine" data-id="${r.id}">Excluir</button></div></div>`).join(''):'<div class="empty">Nenhuma rotina cadastrada.</div>'}</div>`;
function routineForm(r={}){
 sheet(`<h3>${r.id?'Editar':'Nova'} rotina</h3><form id="f" onsubmit="return false">
 <label class="l">Nome *</label><input name="name" value="${esc(r.name)}">
 <label class="l">Categoria</label><select name="cat">${catOpts(r.cat)}</select>
 <label class="l">Dias *</label><div style="margin:6px 0 12px">${DAYS.map((x,i)=>`<label style="margin-right:8px"><input type="checkbox" name="d" value="${i}" style="width:auto;margin:0 3px 0 0" ${(r.days||[]).includes(i)?'checked':''}>${x}</label>`).join('')}</div>
 <div class="two"><div><label class="l">Horário *</label><input type="time" name="start" value="${r.start||''}"></div><div><label class="l">Duração (min)</label><input type="number" min="0" name="dur" value="${r.dur||''}"></div></div>
 <div class="two"><div><label class="l">Frequência</label><select name="every"><option value="1" ${r.every!==2?'selected':''}>Toda semana</option><option value="2" ${r.every===2?'selected':''}>A cada 2 semanas</option></select></div><div><label class="l">Começa em *</label><input type="date" name="from" value="${r.from||today()}"></div></div></form>
 <button class="btn" data-a="saveRoutine" data-id="${r.id||''}">Salvar</button><button class="btn sec" data-a="close">Cancelar</button>`);
}
Object.assign(A,{
 newRoutine:()=>routineForm(),
 editRoutine:b=>routineForm(find(S.routines,b.dataset.id)),
 saveRoutine:async b=>{
  const fd=new FormData($('#f')),days=fd.getAll('d').map(Number),name=fd.get('name').trim(),start=fd.get('start'),from=fd.get('from');
  if(!name)return toast('Informe o nome.');if(!days.length)return toast('Escolha ao menos um dia.');
  if(!start)return toast('Informe o horário.');if(!from)return toast('Informe a data de início.');
  const old=find(S.routines,b.dataset.id)||{};
  await DB.put('routines',{...old,id:old.id||uid(),name,cat:fd.get('cat'),days,start,dur:+fd.get('dur')||0,every:+fd.get('every'),from,active:old.id?old.active:true});
  closeSheet();await refresh();toast('Rotina salva.');
 },
 toggleRoutine:async b=>{const r=find(S.routines,b.dataset.id);r.active=!r.active;await DB.put('routines',r);await refresh()},
 delRoutine:async b=>{if(confirm('Excluir esta rotina?')){await DB.del('routines',b.dataset.id);await refresh()}}
});
