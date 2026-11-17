/* notifications.js — lembretes.
   LIMITAÇÃO REAL: sem servidor Web Push, os avisos só disparam com o app ABERTO (ou em segundo plano recente).
   Dentro do app sempre aparece um aviso na tela; notificação do sistema só se o iOS permitir (PWA instalada + autorização). */
const nset=()=>({on:false,lead:10,late:true,groups:Object.keys(S.cats),...JSON.parse(localStorage.getItem('notif')||'{}')});
const nsave=o=>localStorage.setItem('notif',JSON.stringify(o));
const groupOf=c=>Object.keys(S.cats).find(g=>S.cats[g].includes(c));
function notify(title,body,key){
 const done=JSON.parse(localStorage.getItem('notified')||'{}'),td=today();
 if(done[key])return;done[key]=1;
 for(const k in done)if(!k.startsWith(td))delete done[k];
 localStorage.setItem('notified',JSON.stringify(done));
 toast('🔔 '+title+' — '+body,7000);
 if('Notification'in window&&Notification.permission==='granted'){
  const o={body,icon:'assets/icons/icon-192.png'};
  navigator.serviceWorker?.ready.then(r=>r.showNotification(title,o)).catch(()=>{try{new Notification(title,o)}catch(e){}});
 }
}
function checkReminders(){
 const c=nset();if(!c.on||!S.tasks)return;
 const td=today(),n=new Date(),now=n.getHours()*60+n.getMinutes(),ok=cat=>{const g=groupOf(cat);return !g||c.groups.includes(g)};
 items(td).forEach(x=>{if(!x.s||x.done||!ok(x.cat))return;const m=toMin(x.s);
  if(now>=m-c.lead&&now<m)notify(x.title,`começa às ${x.s} (em ${m-now} min)`,`${td}|s|${x.k}${x.id}`)});
 if(c.late){const l=S.tasks.filter(t=>isLate(t)&&ok(t.cat));
  if(l.length&&now>=480)notify('Tarefas atrasadas',`${l.length} tarefa(s) atrasada(s)`,`${td}|late|${Math.floor(now/180)}`)}
}
setInterval(checkReminders,30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkReminders()});
function notifUI(){
 const c=nset(),p='Notification'in window?Notification.permission:'indisponível';
 return `<h2>Notificações</h2><div class="card"><div class="seg"><button class="${c.on?'on':''}" data-a="notifOn" data-v="1">Ativadas</button><button class="${c.on?'':'on'}" data-a="notifOn" data-v="0">Desativadas</button></div>
 <label class="l">Avisar com antecedência de</label><select id="nlead">${[5,10,15,30,60].map(m=>`<option value="${m}" ${c.lead===m?'selected':''}>${m} min</option>`).join('')}</select>
 <label class="l">Categorias</label><div>${Object.keys(S.cats).map(g=>`<label style="margin-right:10px"><input type="checkbox" style="width:auto;margin:0 4px 0 0" data-a="notifGroup" data-g="${esc(g)}" ${c.groups.includes(g)?'checked':''}>${esc(g)}</label>`).join('')}</div>
 <label style="display:block;margin:10px 0"><input type="checkbox" style="width:auto;margin:0 4px 0 0" data-a="notifLate" ${c.late?'checked':''}>Avisar sobre tarefas atrasadas</label>
 <button class="btn sec" data-a="notifPerm">Permitir notificações do sistema</button><button class="btn sec" data-a="notifTest">Testar</button>
 <div class="meta">Permissão do sistema: ${p}. Sem um servidor de Web Push, os avisos só aparecem com o app aberto; quando fechado, o iOS não os entrega.</div></div>`;
}
Object.assign(A,{
 notifOn:async b=>{const c=nset();c.on=b.dataset.v==='1';nsave(c);
  if(c.on&&'Notification'in window&&Notification.permission==='default')await Notification.requestPermission();render();checkReminders()},
 notifGroup:b=>{const c=nset(),g=b.dataset.g;c.groups=b.checked?[...new Set([...c.groups,g])]:c.groups.filter(x=>x!==g);nsave(c)},
 notifLate:b=>{const c=nset();c.late=b.checked;nsave(c)},
 notifPerm:async()=>{if(!('Notification'in window))return toast('Indisponível aqui. Use o app instalado na Tela de Início (iOS 16.4+). Os lembretes dentro do app continuam.',5000);
  const r=await Notification.requestPermission();toast('Permissão: '+r);render()},
 notifTest:()=>notify('Teste','Lembrete de teste','test'+Date.now())
});
document.addEventListener('change',e=>{if(e.target.id==='nlead'){const c=nset();c.lead=+e.target.value;nsave(c)}});
