/* nlp.js — adição por linguagem natural (pt-BR), 100% local. Só preenche o que está no texto; nada é inventado. */
const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const NUMW={um:1,uma:1,dois:2,duas:2,tres:3,quatro:4,cinco:5,seis:6};
const numw=x=>NUMW[x]||+x;
function parseNL(text){
 let o=text.normalize('NFC'),n=norm(o).toLowerCase();
 const r={name:'',cat:'',date:'',time:'',dur:0},td=today();
 const cut=re=>{const m=re.exec(n);if(!m)return null;const sp=' '.repeat(m[0].length);
  o=o.slice(0,m.index)+sp+o.slice(m.index+m[0].length);n=n.slice(0,m.index)+sp+n.slice(m.index+m[0].length);return m};
 let m;
 // duração
 if(m=cut(/\bpor\s+(\d{1,2})h(\d{2})?\b/))r.dur=+m[1]*60+(+m[2]||0);
 else if(m=cut(/\bpor\s+(\d+|um|uma|dois|duas|tres|quatro|cinco|seis)\s+horas?(\s+e\s+meia)?\b/))r.dur=numw(m[1])*60+(m[2]?30:0);
 else if(m=cut(/\bpor\s+meia\s+hora\b/))r.dur=30;
 else if(m=cut(/\bpor\s+(\d+)\s*min\w*/))r.dur=+m[1];
 // data
 const valid=(y,mo,d)=>{const t=new Date(y,mo-1,d);return t.getFullYear()===y&&t.getMonth()===mo-1&&t.getDate()===d?ymd(t):''};
 if(cut(/\bdepois\s+de\s+amanha\b/))r.date=addDays(td,2);
 else if(cut(/\bamanha\b/))r.date=addDays(td,1);
 else if(cut(/\bhoje\b/))r.date=td;
 else if(m=cut(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)){const y=m[3]?(+m[3]<100?2000+ +m[3]:+m[3]):new Date().getFullYear();r.date=valid(y,+m[2],+m[1])}
 else if(m=cut(/\bdia\s+(\d{1,2})\b/)){const t=new Date();let c=valid(t.getFullYear(),t.getMonth()+1,+m[1]);
  if(c&&c<td)c=valid(t.getFullYear(),t.getMonth()+2,+m[1]);r.date=c}
 else if(m=cut(/\b(?:(?:na|no|nesta|neste|proxim[ao])\s+)?(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:-feira)?\b/)){
  const wd=['domingo','segunda','terca','quarta','quinta','sexta','sabado'].indexOf(m[1]);
  r.date=addDays(td,((wd-new Date().getDay()+7)%7)||7)}
 // horário
 let h=null,mi=0;
 if(m=cut(/(?:\bas\s+)?\b(\d{1,2})(?:h(\d{2})?|:(\d{2}))(?!\w)/)){h=+m[1];mi=+(m[2]||m[3]||0)}
 else if(m=cut(/\bas\s+(\d{1,2})\b(?!\s*\/)/))h=+m[1];
 const per=cut(/\bda\s+(manha|tarde|noite|madrugada)\b/);
 if(h!==null&&per&&/tarde|noite/.test(per[1])&&h<12)h+=12;
 if(h!==null&&h<24&&mi<60)r.time=pad(h)+':'+pad(mi);
 // categoria (só se o nome de uma categoria existente aparece no texto)
 let best='';for(const g of Object.values(S.cats))for(const c of g){const k=norm(c).toLowerCase().replace(/s$/,'');
  if(k.length>3&&n.includes(k)&&k.length>norm(best).length)best=c}
 r.cat=best;
 // título
 let t=o.replace(/\s+/g,' ').trim();
 while(/\s(de|do|da|em|no|na|para|as|às|a|por|dia|e)$/i.test(t))t=t.replace(/\s\S+$/,'');
 t=t.replace(/[.,;!]+$/,'').trim();r.name=t?t[0].toUpperCase()+t.slice(1):'';
 return r;
}
const dash='<span class="meta">não informado</span>';
Object.assign(A,{
 add:()=>sheet(`<h3>Adicionar</h3><label class="l">Escreva do seu jeito</label>
  <input id="nltxt" placeholder="Estudar matemática amanhã às 16h por uma hora"><button class="btn" data-a="nlpGo">Interpretar</button>
  <div style="margin-top:10px"><button class="btn sec" data-a="newTask">Tarefa</button><button class="btn sec" data-a="newEvent">Compromisso</button><button class="btn sec" data-a="newRoutine">Rotina</button></div>`),
 nlpGo:()=>{const t=$('#nltxt').value.trim();if(!t)return toast('Digite o que deseja adicionar.');
  const p=S.nlp=parseNL(t);
  sheet(`<h3>Confirme</h3><div class="card"><b>Atividade:</b> ${p.name?esc(p.name):dash}<br><b>Categoria:</b> ${p.cat?esc(p.cat):dash}<br><b>Data:</b> ${p.date?fmtD(p.date)+' ('+p.date+')':dash}<br><b>Horário:</b> ${p.time||dash}<br><b>Duração:</b> ${p.dur?p.dur+' min':dash}</div>
  <div class="meta">O que não está no texto fica em branco. Prioridade: média (padrão).</div>
  <button class="btn" data-a="nlpSave">Salvar tarefa</button><button class="btn sec" data-a="nlpEdit">Editar</button><button class="btn sec" data-a="close">Cancelar</button>`)},
 nlpEdit:()=>taskForm({...S.nlp}),
 nlpSave:async()=>{const p=S.nlp;
  if(!p.name){taskForm({...p});return toast('Informe o nome da atividade.')}
  if(p.time&&!p.date){taskForm({...p});return toast('Informe a data para usar horário.')}
  await DB.put('tasks',{id:uid(),name:p.name,desc:'',cat:p.cat,date:p.date,time:p.time,dur:p.dur,deadline:'',prio:'media',status:'pendente',subs:[]});
  closeSheet();await refresh();toast('Tarefa salva.')}
});
