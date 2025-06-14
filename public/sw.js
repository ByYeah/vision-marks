self.addEventListener("install", (event) => {
    event.waitUntil(
      caches.open("marcadores-cache").then((cache) => {
        return cache.addAll(["/", "/manifest.json"]);
      })
    );
  });
  
  self.addEventListener("fetch", (event) => {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  });
  