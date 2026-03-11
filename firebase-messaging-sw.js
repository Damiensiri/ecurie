importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js")

firebase.initializeApp({
apiKey:"AIzaSyBn6Hgu-xvsWqpwJ-i4lZyI0QjKMBvOeXA",
authDomain:"ecurie-paddock.firebaseapp.com",
projectId:"ecurie-paddock",
storageBucket:"ecurie-paddock.firebasestorage.app",
messagingSenderId:"501153278739",
appId:"1:501153278739:web:824b4344c381f2a94548e6"
})

const db = firebase.firestore()

let initialized=false

if(!initialized){

initialized=true

db.collection("reservations").onSnapshot(snapshot=>{

snapshot.docChanges().forEach(change=>{

if(change.type==="added"){

const r=change.doc.data()

self.registration.showNotification(
"Nouvelle réservation paddock",
{
body:r.name+" — "+r.paddock+" "+r.time,
icon:"/icon.png"
}
)

}

})

})

}