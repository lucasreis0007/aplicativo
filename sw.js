/* Service Worker: cache do "casco" do app. Os dados ficam no IndexedDB e NÃO são tocados aqui.
   Ao alterar arquivos, aumente CACHE para forçar atualização. */
const CACHE='minha-central-v3';
const FILES=['./','index.html','manifest.json','css/themes.css','css/styles.css','js/database.js','js/app.js','js/routines.js','js/notifications.js','js/backup.js','js/nlp.js','js/planner.js','js/studies.js','js/focus.js','js/goals.js','js/finance.js','js/reports.js','assets/icons/icon-180.png','assets/icons/icon-192.png','assets/icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;
e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).catch(()=>caches.match('index.html'))))});
