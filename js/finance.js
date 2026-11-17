/* finance.js — controle básico: entradas, despesas, vencimentos e metas de economia (metas do tipo Financeira). */
S.fm=today().slice(0,7);
const shiftM=(m,n)=>{const d=new Date(+m.slice(0,4),+m.slice(5)-1+n,1);return d.getFullYear()+'-'+pad(d.getMonth()+1)};
V.finance=()=>{
 const l=S.finance.filter(x=>x.date.startsWith(S.fm)).sort((a,b)=>b.date.localeCompare(a.date));
 const en=l.filter(x=>x.type==='entrada').reduce((a,x)=>a+x.value,0),de=l.filter(x=>x.type==='despesa').reduce((a,x)=>a+x.value,0);
 const dues=S.finance.filter(x=>x.type==='despesa'&&!x.paid&&x.due).sort((a,b)=>a.due.localeCompare(b.due));
 const sv=S.goals.filter(g=>g.type==='Financeira');
 return back()+`<h1>Finanças</h1><button class="btn" data-a="newFin">Novo lançamento</button>
 <div class="nav2"><button data-a="finShift" data-n="-1">‹</button><b>${MONTHS[+S.fm.slice(5)-1]} ${S.fm.slice(0,4)}</b><button data-a="finShift" data-n="1">›</button></div>
 <div class="grid"><div class="card stat"><b style="font-size:16px">${brl(en)}</b><span class="meta">Entradas</span></div><div class="card stat"><b style="font-size:16px">${brl(de)}</b><span class="meta">Despesas</span></div><div class="card stat"><b style="font-size:16px" class="${en-de<0?'bad':''}">${brl(en-de)}</b><span class="meta">Saldo</span></div></div>
 <h2>Vencimentos</h2>${dues.length?dues.map(x=>`<div class="card row"><div class="grow"><b>${esc(x.desc)}</b><div class="meta ${x.due<today()?'bad':''}">${x.due<today()?'Vencida · ':''}${fmtD(x.due)} · ${brl(x.value)}</div></div><button data-a="finPay" data-id="${x.id}" style="color:var(--ok)">Pago</button></div>`).join(''):'<div class="card empty">Nenhum vencimento pendente.</div>'}
 <h2>Lançamentos do mês</h2>${l.length?l.map(x=>`<div class="card row" data-a="editFin" data-id="${x.id}"><div class="grow"><b>${esc(x.desc)}</b><div class="meta">${fmtD(x.date)} · ${x.type==='entrada'?'Entrada':'Despesa'}${x.paid?' · '+(x.type==='entrada'?'recebido':'pago'):''}</div></div><b class="${x.type==='despesa'?'bad':''}">${x.type==='despesa'?'−':'+'}${brl(x.value)}</b></div>`).join(''):'<div class="card empty">Nada neste mês.</div>'}
 <h2>Metas de economia</h2>${sv.length?sv.map(g=>`<div class="card"><b>${esc(g.name)}</b><div class="meta">${gProg(g)}%${g.target>0?` · ${brl(g.saved)} de ${brl(g.target)}`:''}</div>${bar(gProg(g),100)}</div>`).join(''):'<div class="card empty">Crie uma meta do tipo Financeira em Metas.</div>'}`};
function finForm(x={}){
 sheet(`<h3>${x.id?'Editar':'Novo'} lançamento</h3><form id="f" onsubmit="return false"><label class="l">Tipo</label><select name="type"><option value="despesa" ${x.type!=='entrada'?'selected':''}>Despesa</option><option value="entrada" ${x.type==='entrada'?'selected':''}>Entrada</option></select>
 <label class="l">Descrição *</label><input name="desc" value="${esc(x.desc)}"><label class="l">Valor (R$) *</label><input name="value" inputmode="decimal" value="${x.value||''}">
 <div class="two"><div><label class="l">Data *</label><input type="date" name="date" value="${x.date||today()}"></div><div><label class="l">Vencimento (despesa)</label><input type="date" name="due" value="${x.due||''}"></div></div>
 <label style="display:block;margin:6px 0"><input type="checkbox" name="paid" style="width:auto;margin:0 6px 0 0" ${x.paid?'checked':''}>Pago / recebido</label></form>
 <button class="btn" data-a="saveFin" data-id="${x.id||''}">Salvar</button><button class="btn sec" data-a="close">Cancelar</button>${x.id?`<button class="btn del" data-a="delFin" data-id="${x.id}">Excluir</button>`:''}`);
}
Object.assign(A,{
 newFin:()=>finForm(),editFin:b=>{if(!b.dataset.id)return;finForm(find(S.finance,b.dataset.id))},
 saveFin:async b=>{const f=Object.fromEntries(new FormData($('#f'))),v=parseFloat(String(f.value).replace(',','.'));
  if(!f.desc.trim())return toast('Informe a descrição.');if(!(v>0))return toast('Informe um valor maior que zero.');if(!f.date)return toast('Informe a data.');
  const old=find(S.finance,b.dataset.id)||{};await DB.put('finance',{...old,id:old.id||uid(),type:f.type,desc:f.desc.trim(),value:v,date:f.date,due:f.type==='despesa'?f.due:'',paid:!!f.paid});
  closeSheet();await refresh()},
 delFin:async b=>{if(confirm('Excluir este lançamento?')){await DB.del('finance',b.dataset.id);closeSheet();await refresh()}},
 finPay:async b=>{const x=find(S.finance,b.dataset.id);x.paid=true;await DB.put('finance',x);await refresh()},
 finShift:b=>{S.fm=shiftM(S.fm,+b.dataset.n);render()}
});
