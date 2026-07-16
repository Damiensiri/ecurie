importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBn6Hgu-xvsWqpwJ-i4lZyI0QjKMBvOeXA",
  authDomain: "ecurie-paddock.firebaseapp.com",
  projectId: "ecurie-paddock",
  storageBucket: "ecurie-paddock.firebasestorage.app",
  messagingSenderId: "501153278739",
  appId: "1:501153278739:web:824b4344c381f2a94548e6"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  if (payload.notification && !payload.data?.title) return;

  const title = payload.data?.title || payload.notification?.title || "Backstage";
  const body = payload.data?.body || payload.notification?.body || "Nouvelle notification";

  self.registration.showNotification(title, {
    body,
    data: payload.data || {},
    tag: payload.data?.reservationId || "backstage-notification",
    requireInteraction: true
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "https://ecurie-paddock.web.app/"));
});
