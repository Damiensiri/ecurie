importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

firebase.initializeApp({
apiKey:"AIzaSyBn6Hgu-xvsWqpwJ-i4lZyI0QjKMBvOeXA",
authDomain:"ecurie-paddock.firebaseapp.com",
projectId:"ecurie-paddock",
messagingSenderId:"501153278739",
appId:"1:501153278739:web:824b4344c381f2a94548e6"
});

const messaging=firebase.messaging();

messaging.onBackgroundMessage(function(payload){

self.registration.showNotification(payload.notification.title,{
body:payload.notification.body,
icon:"/icon.png"
});

});