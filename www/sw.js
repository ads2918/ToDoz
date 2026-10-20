// Minimal service worker: needed so Android Chrome can show notifications.
// No offline caching yet, so file changes always show up on refresh.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Tapping a notification opens (or focuses) the app.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      if (wins.length) return wins[0].focus();
      return self.clients.openWindow("./");
    })
  );
});
