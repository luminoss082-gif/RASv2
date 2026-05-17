const CACHE_NAME = "loveconnect-v1";

const FILES_TO_CACHE = [
  "index.html",
  "liste.html",
  "chat.html",
  "notifications.html",
  "support.html",
  "settings.html",
  "styles.css",
  "js/app-init.js",
  "manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
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