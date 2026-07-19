(function(){
  const API=(localStorage.getItem("notifications_prod_api_url")||"https://ecurie-notifications-prod.damiensiri-pro.workers.dev").replace(/\/$/,"");
  const TOKEN=localStorage.getItem("notifications_prod_admin_token")||"";
  const fields={billing:document.getElementById("summaryBilling"),orders:document.getElementById("summaryOrders"),requests:document.getElementById("summaryRequests"),users:document.getElementById("summaryUsers")};
  const status=document.getElementById("summaryStatus"),refresh=document.getElementById("summaryRefresh");
  async function api(path){if(!TOKEN)throw new Error("Configurez la connexion dans Paramètres");const response=await fetch(API+path,{headers:{authorization:"Bearer "+TOKEN},cache:"no-store"});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||`Erreur ${response.status}`);return data;}
  function show(key,value){fields[key].textContent=String(value);fields[key].closest("a").classList.toggle("has-items",value>0);}
  async function load(){refresh.disabled=true;status.textContent="Actualisation…";status.className="home-summary-status";try{const [billingData,orderData,liberteData,users]=await Promise.all([api("/api/admin/billing"),api("/api/admin/orders"),api("/api/admin/liberte"),api("/api/admin/users")]);const customers=billingData.customers||[];show("billing",customers.reduce((total,item)=>total+(item.paddockUsages||[]).length+(item.orders||[]).length,0));show("orders",(orderData.orders||[]).filter(item=>item.status==="pending").length);show("requests",(liberteData.requests||[]).filter(item=>item.status==="pending").length);show("users",(users||[]).filter(item=>item.approvalStatus==="pending").length);status.textContent="Compteurs D1 actualisés.";}catch(error){Object.keys(fields).forEach(key=>show(key,"—"));status.textContent=error.message;status.className="home-summary-status error";}finally{refresh.disabled=false;}}
  refresh.addEventListener("click",load);load();
})();
