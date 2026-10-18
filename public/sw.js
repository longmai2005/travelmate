// Only the public offline shell and an explicit asset list may enter this cache.
// Authentication, API responses, admin, invitation and shared pages are never cached.
const CACHE="travelmate-shell-v2";
const ASSETS=["/offline","/offline.html","/css/style.css","/css/responsive.css","/css/trip.css","/css/upgrades.css","/images/logo.svg","/images/placeholder.svg","/vendor/lucide.js","/js/api.js","/js/budget.js","/js/group-budget.js","/js/common.js","/js/offline.js","/js/session-idle.js","/js/auth.js","/js/trip-view.js","/js/offline-page.js"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("travelmate-shell-")&&key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener("fetch",event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=="GET"||url.origin!==self.location.origin||url.search||!ASSETS.includes(url.pathname))return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}return response;
  }).catch(()=>caches.match(event.request).then(response=>response||Response.error())));
});
