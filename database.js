/* database.js — camada simples sobre o IndexedDB.
   Todas as lojas são criadas já na versão 1 (as etapas seguintes só as usam). */
const DB=(()=>{
  let db;
  const STORES={tasks:'id',events:'id',routines:'id',subjects:'id',sessions:'id',goals:'id',history:'id',finance:'id',settings:'key'};
  const open=()=>db?Promise.resolve(db):new Promise((res,rej)=>{
    const r=indexedDB.open('minha-central',1);
    r.onupgradeneeded=()=>{const d=r.result;for(const[n,k]of Object.entries(STORES))if(!d.objectStoreNames.contains(n))d.createObjectStore(n,{keyPath:k})};
    r.onsuccess=()=>{db=r.result;res(db)};r.onerror=()=>rej(r.error);
  });
  const tx=async(s,m,f)=>{const d=await open();return new Promise((res,rej)=>{
    const t=d.transaction(s,m);const q=f(t.objectStore(s));
    t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error);
  })};
  return{
    all:s=>tx(s,'readonly',o=>o.getAll()),
    get:(s,k)=>tx(s,'readonly',o=>o.get(k)),
    put:(s,v)=>tx(s,'readwrite',o=>o.put(v)),
    del:(s,k)=>tx(s,'readwrite',o=>o.delete(k)),
    STORES:Object.keys(STORES)
  };
})();
