/* backup.js — backup/restauração (JSON) e intercâmbio .ics.
   NÃO há sincronização com o Calendário/Lembretes da Apple: uma PWA não acessa esses bancos. Só exporta/importa arquivos. */
async function saveFile(name,text,type){
 const f=new File([text],name,{type});
 if(navigator.canShare?.({files:[f]})){try{await navigator.share({files:[f],title:name});return}catch(e){if(e.name==='AbortError')return}}
 const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);
}
const KEEP='prev-backup';
function validBackup(j){
 if(!j||j.app!=='minha-central'||typeof j.data!=='object'||!j.data)return 'Este arquivo não é um backup da Minha Central.';
 for(const s of DB.STORES){const a=j.data[s];if(a===undefined)continue;if(!Array.isArray(a))return `Dados inválidos em "${s}".`;
  const k=s==='settings'?'key':'id';if(a.some(x=>!x||typeof x[k]!=='string'))return `Registro inválido em "${s}".`}
 return null;
}
async function applyData(data){ // guarda o estado atual como "versão anterior" ANTES de sobrescrever
 const snap={};for(const s of DB.STORES)snap[s]=(await DB.all(s)).filter(x=>x.key!==KEEP);
 await DB.put('settings',{key:KEEP,value:{date:new Date().toISOString(),data:snap}});
 for(const s of DB.STORES){
  if(s==='settings'){for(const x of await DB.all(s))if(x.key!==KEEP)await DB.del(s,x.key)}else await DB.clear(s);
  for(const x of data[s]||[])if(x.key!==KEEP)await DB.put(s,x);
 }
 await refresh();
}
/* ---- .ics ---- */
const icsEsc=s=>String(s||'').replace(/[\\;,]/g,m=>'\\'+m).replace(/\n/g,'\\n');
const icsDt=(d,t)=>d.replace(/-/g,'')+'T'+t.replace(':','')+'00';
const stamp=()=>new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z';
const ical=b=>'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Minha Central//PT\r\nCALSCALE:GREGORIAN\r\n'+b+'END:VCALENDAR\r\n';
const vev=(id,title,d,s,e,x='')=>`BEGIN:VEVENT\r\nUID:${id}@minha-central\r\nDTSTAMP:${stamp()}\r\nSUMMARY:${icsEsc(title)}\r\nDTSTART:${icsDt(d,s)}\r\nDTEND:${icsDt(d,e)}\r\n${x}END:VEVENT\r\n`;
const endOf=(s,dur)=>fromMin(Math.min(1439,toMin(s)+dur));
function buildCal(){
 let b='';
 S.events.forEach(e=>b+=vev(e.uid||e.id,e.title,e.date,e.start,e.end));
 S.tasks.filter(t=>t.date&&t.time&&t.status!=='cancelada').forEach(t=>b+=vev(t.id,t.name,t.date,t.time,endOf(t.time,t.dur||60),t.desc?`DESCRIPTION:${icsEsc(t.desc)}\r\n`:''));
 S.routines.filter(r=>r.active).forEach(r=>{
  let d=r.from;for(let i=0;i<15&&!occurs(r,d);i++)d=addDays(d,1);
  if(!occurs(r,d))return;
  const by=r.days.map(x=>['SU','MO','TU','WE','TH','FR','SA'][x]).join(',');
  b+=vev(r.id,r.name,d,r.start,endOf(r.start,r.dur||60),`RRULE:FREQ=WEEKLY;INTERVAL=${r.every};BYDAY=${by};WKST=SU\r\n`);
 });
 return ical(b);
}
function buildTodos(){
 return ical(S.tasks.filter(isActive).map(t=>`BEGIN:VTODO\r\nUID:${t.id}@minha-central\r\nDTSTAMP:${stamp()}\r\nSUMMARY:${icsEsc(t.name)}\r\n`+
  (t.date?(t.time?`DUE:${icsDt(t.date,t.time)}\r\n`:`DUE;VALUE=DATE:${t.date.replace(/-/g,'')}\r\n`):'')+
  `PRIORITY:${{alta:1,media:5,baixa:9}[t.prio]||5}\r\nSTATUS:${t.status==='andamento'?'IN-PROCESS':'NEEDS-ACTION'}\r\n`+(t.desc?`DESCRIPTION:${icsEsc(t.desc)}\r\n`:'')+'END:VTODO\r\n').join(''));
}
function parseICS(txt){
 const un=s=>s.replace(/\\n/gi,'\n').replace(/\\([,;\\])/g,'$1');
 const lines=txt.replace(/\r?\n[ \t]/g,'').split(/\r?\n/),out=[];let cur=null;
 for(const l of lines){
  if(l==='BEGIN:VEVENT')cur={};else if(l==='END:VEVENT'){if(cur)out.push(cur);cur=null}
  else if(cur){const i=l.indexOf(':');if(i<0)continue;const k=l.slice(0,i).split(';')[0].toUpperCase();cur[k]=un(l.slice(i+1))}
 }
 return out;
}
function icsWhen(v){
 const m=/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})\d{2}(Z)?)?$/.exec((v||'').trim());if(!m)return null;
 if(m[4]===undefined)return{d:`${m[1]}-${m[2]}-${m[3]}`};
 let dt=new Date(+m[1],m[2]-1,+m[3],+m[4],+m[5]);
 if(m[6])dt=new Date(Date.UTC(+m[1],m[2]-1,+m[3],+m[4],+m[5]));
 return{d:ymd(dt),t:pad(dt.getHours())+':'+pad(dt.getMinutes())};
}
const counts=d=>['tasks','events','routines'].map(s=>`${(d[s]||[]).length} ${{tasks:'tarefas',events:'compromissos',routines:'rotinas'}[s]}`).join(', ');
function backupUI(){
 return `<h2>Dados e backup</h2><div class="card">
 <button class="btn" data-a="exportBackup">Exportar backup</button><button class="btn sec" data-a="pickBackup">Importar backup</button><button class="btn sec" data-a="restorePrev">Restaurar versão anterior</button>
 <input type="file" id="imp" accept="application/json,.json" hidden>
 <div class="meta" style="margin-top:6px">A importação substitui os dados atuais, mas guarda uma cópia para "Restaurar versão anterior".</div></div>
 <h2>Calendário e Lembretes (Apple)</h2><div class="card">
 <button class="btn" data-a="exportCal">Exportar calendário (.ics)</button><button class="btn sec" data-a="exportTodos">Exportar tarefas (.ics)</button><button class="btn sec" data-a="pickIcs">Importar .ics</button><button class="btn sec" data-a="shareList">Compartilhar lista de tarefas</button>
 <input type="file" id="impics" accept=".ics,text/calendar" hidden>
 <div class="meta" style="margin-top:6px">Uma PWA não acessa os bancos do Calendário e dos Lembretes da Apple, então não há sincronização: apenas arquivos. Abra o .ics pelo menu Compartilhar para adicionar ao Calendário. O iOS pode ignorar tarefas (.ics) no Lembretes; nesse caso use "Compartilhar lista de tarefas" e cole no Lembretes.</div></div>`;
}
const _me=V.me;V.me=()=>_me()+notifUI()+backupUI();
Object.assign(A,{
 exportBackup:async()=>{const data={};for(const s of DB.STORES)data[s]=(await DB.all(s)).filter(x=>x.key!==KEEP);
  await saveFile(`minha-central-backup-${today()}.json`,JSON.stringify({app:'minha-central',version:1,exported:new Date().toISOString(),data}),'application/json');toast('Backup gerado.')},
 pickBackup:()=>$('#imp').click(),
 restorePrev:async()=>{const p=await DB.get('settings',KEEP);if(!p)return toast('Não há versão anterior guardada.');
  if(confirm(`Restaurar a versão de ${new Date(p.value.date).toLocaleString('pt-BR')}?\nOs dados atuais serão substituídos (uma cópia deles ficará guardada).`)){await applyData(p.value.data);toast('Versão restaurada.')}},
 exportCal:async()=>{await saveFile('minha-central-calendario.ics',buildCal(),'text/calendar')},
 exportTodos:async()=>{await saveFile('minha-central-tarefas.ics',buildTodos(),'text/calendar')},
 pickIcs:()=>$('#impics').click(),
 shareList:async()=>{const t=S.tasks.filter(isActive).map(t=>'- '+t.name+(t.date?` (${t.date}${t.time?' '+t.time:''})`:'')).join('\n');
  if(!t)return toast('Sem tarefas pendentes.');
  if(navigator.share){try{await navigator.share({text:t})}catch(e){}}else{await saveFile('tarefas.txt',t,'text/plain')}}
});
document.addEventListener('change',async e=>{
 const f=e.target.files&&e.target.files[0];if(!f)return;
 try{
  if(e.target.id==='imp'){
   const j=JSON.parse(await f.text()),err=validBackup(j);if(err)return toast(err,4000);
   if(confirm(`Importar este backup (${counts(j.data)})?\nIsso SUBSTITUI todos os dados atuais.`)){await applyData(j.data);toast('Backup importado.')}
  }else if(e.target.id==='impics'){
   const evs=parseICS(await f.text());let ne=0,nt=0,sk=0,rec=0;
   for(const v of evs){
    const s=icsWhen(v.DTSTART),en=icsWhen(v.DTEND),uidv=v.UID;
    if(!s||!(v.SUMMARY||'').trim()){sk++;continue}
    if(uidv&&(S.events.some(x=>x.uid===uidv)||S.tasks.some(x=>x.uid===uidv))){sk++;continue}
    if(v.RRULE)rec++;
    if(s.t){let end=en&&en.t&&en.d===s.d?en.t:endOf(s.t,60);if(end<=s.t)end=endOf(s.t,60);
     await DB.put('events',{id:uid(),uid:uidv,title:v.SUMMARY.trim(),cat:'',date:s.d,start:s.t,end});ne++}
    else{await DB.put('tasks',{id:uid(),uid:uidv,name:v.SUMMARY.trim(),desc:'',cat:'',date:s.d,time:'',dur:0,deadline:'',prio:'media',status:'pendente',subs:[]});nt++}
   }
   await refresh();toast(`Importado: ${ne} compromissos, ${nt} tarefas (dia inteiro). Ignorados: ${sk}.${rec?` ${rec} recorrente(s) só na 1ª ocorrência.`:''}`,6000);
  }
 }catch(x){toast('Não foi possível ler o arquivo: '+x.message,4000)}
 e.target.value='';
});
