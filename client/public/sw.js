self.addEventListener("push", event => {
  const data = event.data ? event.data.json() : { title: "تنبيه جديد من Neon AI", body: "لديك تصعيد أو رسالة جديدة." };
  const options = {
    body: data.body || data.message,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    dir: "rtl",
  };
  event.waitUntil(self.registration.showNotification(data.title || "Neon AI Agent", options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/notifications"));
});
