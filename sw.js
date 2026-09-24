const CACHE="doki-hanja-app-v23-20260924";
const CORE=["./","./index.html","./manifest.webmanifest","./version.json","./icon.svg","./icon-maskable.svg"];

self.addEventListener("install",event=>{
  event.waitUntil(
    caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith("doki-hanja-")).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("message",event=>{
  if(event.data?.type==="SKIP_WAITING")self.skipWaiting();
});

async function networkFirst(request){
  const cache=await caches.open(CACHE);
  try{
    const response=await fetch(request,{cache:"no-store"});
    if(response&&response.ok)cache.put(request,response.clone());
    return response;
  }catch(err){
    return (await cache.match(request)) || (request.mode==="navigate" ? cache.match("./index.html") : Promise.reject(err));
  }
}

self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;

  if(req.mode==="navigate" || url.pathname.endsWith(".html") || url.pathname.includes("/data/")){
    event.respondWith(networkFirst(req));
    return;
  }

  event.respondWith(
    caches.match(req).then(hit=>hit||networkFirst(req))
  );
});