(function(){
  const APP_ID="104b740c-3a7b-4e39-87b2-847d00f300fb";
  const promptMemoryKey="backstage_prod_push_prompt_last_seen";
  const promptDelayMs=14*24*60*60*1000;
  const button=document.getElementById("enablePushBtn");
  const status=document.getElementById("pushSettingsStatus");
  if(!button||!status)return;
  function settings(){return{base:(localStorage.getItem("notifications_prod_api_url")||"https://ecurie-notifications-prod.damiensiri-pro.workers.dev").replace(/\/$/,""),token:localStorage.getItem("notifications_prod_admin_token")||""};}
  function setState(message,type=""){status.textContent=message;status.className="status"+(type?" "+type:"");button.classList.toggle("is-on",type==="success");button.classList.toggle("is-error",type==="error");}
  async function registerSubscription(OneSignal){
    const subscriptionId=OneSignal.User.PushSubscription.id;if(!subscriptionId)throw new Error("Abonnement OneSignal indisponible");
    const config=settings();if(!config.token)throw new Error("Enregistrez d’abord le jeton dans Paramètres");
    const response=await fetch(config.base+"/api/admin/push/subscription",{method:"PUT",headers:{authorization:"Bearer "+config.token,"content-type":"application/json"},body:JSON.stringify({subscriptionId})});
    const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"Enregistrement push impossible");
    button.textContent="Notifications actives";setState("Notifications Backstage activées sur cet appareil.","success");
  }
  window.OneSignalDeferred=window.OneSignalDeferred||[];
  window.OneSignalDeferred.push(async OneSignal=>{
    try{
      await OneSignal.init({appId:APP_ID,notifyButton:{enable:false},welcomeNotification:{disable:true},serviceWorkerPath:"OneSignalSDKWorker.js",serviceWorkerParam:{scope:"/"},promptOptions:{slidedown:{prompts:[{type:"push",autoPrompt:false,text:{actionMessage:"Souhaitez-vous recevoir les notifications Backstage ?",acceptButton:"Autoriser",cancelButton:"Plus tard"}}]}}});
      OneSignal.User.PushSubscription.addEventListener("change",()=>{if(OneSignal.User.PushSubscription.id)registerSubscription(OneSignal).catch(()=>{});});
      if(Notification.permission==="granted"&&OneSignal.User.PushSubscription.id)await registerSubscription(OneSignal);
      const nativePermission=OneSignal.Notifications?.permissionNative||Notification?.permission||"default";
      const pushOptedIn=Boolean(OneSignal.User.PushSubscription.optedIn||OneSignal.User.PushSubscription.id);
      const lastPrompt=Number(localStorage.getItem(promptMemoryKey)||0);
      if(nativePermission==="default"&&!pushOptedIn&&Date.now()-lastPrompt>promptDelayMs){
        localStorage.setItem(promptMemoryKey,String(Date.now()));
      }
      button.addEventListener("click",async()=>{try{localStorage.setItem(promptMemoryKey,String(Date.now()));await OneSignal.Notifications.requestPermission();if(!OneSignal.Notifications.permission)throw new Error("Notifications refusées ou bloquées");await registerSubscription(OneSignal);}catch(error){setState(error?.message||"Activation impossible.","error");}});
    }catch(error){setState(error?.message||"OneSignal est indisponible.","error");}
  });
})();
