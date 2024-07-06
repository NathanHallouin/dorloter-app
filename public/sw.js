// Service Worker — Miaou (notifications push)
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};

  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Miaou", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
