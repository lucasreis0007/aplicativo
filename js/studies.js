/* studies.js — cursos, matérias, sessões (tempo planejado x realizado) e histórico. */
const SK=['Estudo','Revisão','Prova','Trabalho','Simulado'];
const subj=id=>S.subjects.find(x=>x.id===id);
const weekStart=d=>addDays(d,-new Date(d+'T12:00').getDay());
const minWeek=id=>{const w=weekStart(today());return S.sessions.filter(s=>s.subject===id&&s.date>=w&&s.date<=addDays(w,6)).reduce((a,s)=>a+s.min,0)};
const hm=m=>m>=60?Math.floor(m/60)+'h'+(m%60?pad(m%60):''):m+' min';
V.studies=()=>{
 const cs=S.subjects.filter(x=>x.kind==='course'),ss=S.subjects.filter(x=>x.kind==='subject');
 const hist=[...S.sessions].sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id)).slice(0,30);
 return back()+`<h1>Estudos</h1><button class="btn" data-a="newSession">Registrar sessão</button><button class="btn sec" data-a="newSubject">Nova matéria</button><button class="btn sec" data-a="newCourse">Novo curso</button>
 <h2>Cursos</h2><div class="card">${cs.length?cs.map(c=>`<span class="chip">${esc(c.name)}<b data-a="delSubj" data-id="${c.id}">×</b></span>`).join(''):'<span class="meta">Nenhum curso cadastrado.</span>'}</div>
 <h2>Matérias — esta semana</h2>${ss.length?ss.map(s=>{const m=minWeek(s.id);return `<div class="card"><b>${esc(s.name)}</b> <span class="meta">${esc(s.course||'')}</span><div class="meta">${hm(m)} realizados${s.planned?' de '+hm(s.planned)+' planejados':''}</div>${s.planned?bar(m,s.planned):''}<div class="acts"><button data-a="editSubject" data-id="${s.id}">Editar</button><button class="bad" data-a="delSubj" data-id="${s.id}">Excluir</button></div></div>`}).join(''):'<div class="empty">Nenhuma matéria cadastrada.</div>'}
 <h2>Histórico</h2>${hist.length?hist.map(x=>`<div class="card row"><div class="grow"><b>${esc(subj(x.subject)?.name||'Sem matéria')}</b><div class="meta">${x.type} · ${fmtD(x.date)} · ${hm(x.min)}${x.source==='foco'?' · modo foco':''}</div></div><button class="bad" data-a="delSession" data-id="${x.id}">×</button></div>`).join(''):'<div class="empty">Nenhuma sessão registrada.</div>'}`};
const subjOpts=sel=>`<option value="">Sem matéria</option>`+S.subjects.filter(x=>x.kind==='subject').map(s=>`<option value="${s.id}" ${s.id===sel?'selected':''}>${esc(s.name)}</option>`).join('');
Object.assign(A,{
 newCourse:()=>sheet(`<h3>Novo curso</h3><form id="f" onsubmit="return false"><label class="l">Nome *</label><input name="name"></form><button class="btn" data-a="saveCourse">Salvar</button><button class="btn sec" data-a="close">Cancelar</button>`),
 saveCourse:async()=>{const n=new FormData($('#f')).get('name').trim();if(!n)return toast('Informe o nome.');
  await DB.put('subjects',{id:uid(),kind:'course',name:n});closeSheet();await refresh()},
 newSubject:()=>subjForm(),editSubject:b=>subjForm(find(S.subjects,b.dataset.id)),
 saveSubject:async b=>{const f=Object.fromEntries(new FormData($('#f')));if(!f.name.trim())return toast('Informe o nome.');
  const old=find(S.subjects,b.dataset.id)||{};await DB.put('subjects',{...old,id:old.id||uid(),kind:'subject',name:f.name.trim(),course:f.course,planned:+f.planned||0});
  closeSheet();await refresh()},
 delSubj:async b=>{if(confirm('Excluir? As sessões já registradas são mantidas.')){await DB.del('subjects',b.dataset.id);await refresh()}},
 newSession:()=>sheet(`<h3>Registrar sessão</h3><form id="f" onsubmit="return false"><label class="l">Matéria</label><select name="subject">${subjOpts('')}</select>
  <label class="l">Tipo</label><select name="type">${SK.map(k=>`<option>${k}</option>`).join('')}</select>
  <div class="two"><div><label class="l">Data</label><input type="date" name="date" value="${today()}"></div><div><label class="l">Minutos *</label><input type="number" min="1" name="min"></div></div></form>
  <button class="btn" data-a="saveSession">Salvar</button><button class="btn sec" data-a="close">Cancelar</button>`),
 saveSession:async()=>{const f=Object.fromEntries(new FormData($('#f')));if(!(+f.min>=1)||!f.date)return toast('Informe data e minutos (≥ 1).');
  await addSession(f.subject,+f.min,f.type,'manual',f.date);closeSheet();await refresh();toast('Sessão registrada.')},
 delSession:async b=>{if(confirm('Excluir esta sessão?')){await DB.del('sessions',b.dataset.id);await refresh()}}
});
function subjForm(s={}){
 sheet(`<h3>${s.id?'Editar':'Nova'} matéria</h3><form id="f" onsubmit="return false"><label class="l">Nome *</label><input name="name" value="${esc(s.name)}">
 <label class="l">Curso</label><select name="course"><option value="">—</option>${S.subjects.filter(x=>x.kind==='course').map(c=>`<option ${c.name===s.course?'selected':''}>${esc(c.name)}</option>`).join('')}</select>
 <label class="l">Tempo planejado por semana (min)</label><input type="number" min="0" name="planned" value="${s.planned||''}"></form>
 <button class="btn" data-a="saveSubject" data-id="${s.id||''}">Salvar</button><button class="btn sec" data-a="close">Cancelar</button>`);
}
const addSession=(subject,min,type,source,date)=>DB.put('sessions',{id:uid(),subject:subject||'',min,type:type||'Estudo',source,date:date||today()});
