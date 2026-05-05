self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "LoveConnect";
  const options = {
    body: data.body || "Nouvelle notification",
    data: { url: data.url || "index.html" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "index.html";
  event.waitUntil(clients.openWindow(url));
});
