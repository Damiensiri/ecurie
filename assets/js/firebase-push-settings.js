(function(){
  const FIREBASE_PUSH_READ_ONLY=false;
  const FCM_VAPID_KEY="BKf6TU4UsZgu-dAYLre0KWyK6qOk55ZeCzYNG6hMuWWBSZVLIC02sBvmZQXhauGS1sI790nQ6MS6Dx3nC56FQj8";
  const firebaseConfig={
    apiKey:"AIzaSyBn6Hgu-xvsWqpwJ-i4lZyI0QjKMBvOeXA",
    authDomain:"ecurie-paddock.firebaseapp.com",
    projectId:"ecurie-paddock",
    storageBucket:"ecurie-paddock.firebasestorage.app",
    messagingSenderId:"501153278739",
    appId:"1:501153278739:web:824b4344c381f2a94548e6"
  };
  const button=document.getElementById("enablePushBtn");
  const status=document.getElementById("pushSettingsStatus");
  if(!button||!status)return;

  function setState(message,type=""){
    status.textContent=message;
    status.className="status"+(type?" "+type:"");
    button.classList.toggle("is-on",type==="success");
    button.classList.toggle("is-error",type==="error");
  }

  function subscriptionIdFromToken(token){
    return btoa(token).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  }

  async function enablePushNotifications(){
    if(FIREBASE_PUSH_READ_ONLY){
      setState("Production en lecture seule : l’abonnement Firebase n’a pas été modifié.");
      return;
    }
    if(!window.firebase||!firebase.firestore||!firebase.messaging){
      setState("Firebase est indisponible sur cet appareil.","error");
      return;
    }
    if(!("Notification" in window)||!("serviceWorker" in navigator)){
      setState("Ce navigateur ne prend pas en charge ces notifications.","error");
      return;
    }
    try{
      const permission=await Notification.requestPermission();
      if(permission!=="granted"){
        setState("Notifications refusées ou bloquées.","error");
        return;
      }
      if(!firebase.apps.length)firebase.initializeApp(firebaseConfig);
      const workerUrl=new URL("firebase-messaging-sw.js",document.baseURI);
      const registration=await navigator.serviceWorker.register(workerUrl.pathname);
      const messaging=firebase.messaging();
      const token=await messaging.getToken({
        vapidKey:FCM_VAPID_KEY,
        serviceWorkerRegistration:registration
      });
      if(!token)throw new Error("Abonnement impossible");
      const db=firebase.firestore();
      await db.collection("notificationSubscriptions").doc(subscriptionIdFromToken(token)).set({
        token,
        enabled:true,
        source:"backstage",
        userAgent:navigator.userAgent,
        updatedAt:firebase.firestore.FieldValue.serverTimestamp()
      },{merge:true});
      button.textContent="Notifications actives";
      setState("Notifications activées sur cet appareil.","success");
    }catch(error){
      setState(error?.message||"Activation impossible.","error");
    }
  }

  if("Notification" in window&&Notification.permission==="granted"){
    button.textContent="Notifications autorisées";
  }
  button.addEventListener("click",enablePushNotifications);
})();
