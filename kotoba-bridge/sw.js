/* Kotoba Bridge offline cache; scope stays within /kotoba-bridge/. */
const CACHE="kotoba-bridge-v0.3.0";
const ASSETS=["./","./index.html","./style.css?v=0.3.0","./data.js?v=0.3.0","./data-extra.js?v=0.3.0","./app.js?v=0.3.0","./vocabulary.js?v=0.3.0","./vocab-ui.js?v=0.3.0","./memory-data.js?v=0.3.0","./memory-ui.js?v=0.3.0","./manifest.webmanifest","./icon.svg"];
self.addEventListener("install",function(event){
 event.waitUntil(caches.open(CACHE).then(function(cache){return cache.addAll(ASSETS);}).then(function(){return self.skipWaiting();}));
});
self.addEventListener("activate",function(event){
 event.waitUntil(caches.keys().then(function(keys){return Promise.all(keys.filter(function(k){return k.startsWith("kotoba-bridge-")&&k!==CACHE;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();}));
});
self.addEventListener("fetch",function(event){
 const req=event.request;
 if(req.method!=="GET" || new URL(req.url).origin!==self.location.origin)return;
 event.respondWith(caches.match(req).then(function(cached){
  if(cached)return cached;
  return fetch(req).then(function(res){if(res&&res.ok){const copy=res.clone();caches.open(CACHE).then(function(c){c.put(req,copy);});}return res;}).catch(function(){if(req.mode==="navigate")return caches.match("./index.html");throw new Error("Offline resource not cached");});
 }));
});
