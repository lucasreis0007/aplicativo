/* reports.js — estatísticas calculadas a partir dos registros reais (tarefas e sessões). */
const bars=rows=>{const mx=Math.max(1,...rows.map(r=>r[1]));return rows.map(r=>`<div class="row" style="margin:4px 0"><div class="t" style="width:64px">${esc(r[0])}</div><div class="grow bar" style="margin:0"><i style="width:${Math.round(r[1]/mx*100)}%"></i></div><div class="meta" style="width:56px;text-align:right">${r[2]}</div></div>`).join('')};
V.reports=()=>{
 const td=today(),doneD=t=>t.doneAt||t.date||'';
 const dn=d=>S.tasks.filter(t=>t.status==='concluida'&&doneD(t)===d).length,mn=d=>S.sessions.filter(s=>s.date===d).reduce((a,s)=>a+s.min,0);
 const days=[...Array(7)].map((_,i)=>addDays(td,i-6));
 const wk=[...Array(4)].map((_,i)=>{const e=addDays(td,-7*(3-i)),s=addDays(e,-6),inr=d=>d>=s&&d<=e;
  return[fmtD(s).split(', ')[1],S.tasks.filter(t=>t.status==='concluida'&&inr(doneD(t))).length,S.sessions.filter(x=>inr(x.date)).reduce((a,x)=>a+x.min,0)]});
 const act=S.tasks.filter(isActive),mon=td.slice(0,7);
 const bySub={};S.sessions.forEach(s=>{const n=subj(s.subject)?.name||'Sem matéria';bySub[n]=(bySub[n]||0)+s.min});
 const byCat={};S.tasks.filter(t=>t.status==='concluida'&&t.dur).forEach(t=>{byCat[t.cat||'Sem categoria']=(byCat[t.cat||'Sem categoria']||0)+t.dur});
 const top=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>[k,v,hm(v)]);
 const mm=S.sessions.filter(s=>s.date.startsWith(mon)).reduce((a,s)=>a+s.min,0);
 return back()+`<h1>Relatórios</h1><div class="grid"><div class="card stat"><b>${S.tasks.filter(t=>t.status==='concluida').length}</b><span class="meta">Concluídas</span></div><div class="card stat"><b>${act.length}</b><span class="meta">Pendentes</span></div><div class="card stat"><b>${act.filter(isLate).length}</b><span class="meta">Atrasadas</span></div></div>
 <div class="card"><b>${hm(S.sessions.reduce((a,s)=>a+s.min,0))}</b> estudados no total · <b>${hm(mm)}</b> neste mês</div>
 <h2>Tarefas concluídas — últimos 7 dias</h2><div class="card">${bars(days.map(d=>[fmtD(d).slice(0,3)+' '+d.slice(8),dn(d),dn(d)]))}</div>
 <h2>Estudo — últimos 7 dias</h2><div class="card">${bars(days.map(d=>[fmtD(d).slice(0,3)+' '+d.slice(8),mn(d),hm(mn(d))]))}</div>
 <h2>Progresso por semana (4 semanas)</h2><div class="card">${bars(wk.map(w=>[w[0],w[1],w[1]+' tar.']))}${bars(wk.map(w=>[w[0],w[2],hm(w[2])]))}</div>
 <h2>Tempo por matéria</h2><div class="card">${Object.keys(bySub).length?bars(top(bySub)):'<span class="meta">Sem sessões registradas.</span>'}</div>
 <h2>Tempo por categoria (tarefas concluídas)</h2><div class="card">${Object.keys(byCat).length?bars(top(byCat)):'<span class="meta">Sem tarefas concluídas com duração.</span>'}</div>
 <div class="meta">Tarefas concluídas antes desta versão usam a data da tarefa como data de conclusão.</div>`};
