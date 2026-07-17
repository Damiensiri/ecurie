(function(){
  const byId=id=>document.getElementById(id);
  const elements={connection:byId("connectionStatus"),
    form:byId("userForm"),firstName:byId("firstName"),lastName:byId("lastName"),email:byId("email"),
    role:byId("role"),password:byId("temporaryPassword"),createStatus:byId("createStatus"),refresh:byId("refreshBtn"),list:byId("usersList"),
    createToggle:byId("createPanelToggle"),createBody:byId("createPanelBody"),search:byId("usersSearch"),
    modal:byId("userDetailsModal"),modalTitle:byId("userDetailsTitle"),modalBody:byId("userDetailsBody"),modalClose:byId("closeUserDetails")};
  const apiBase=(localStorage.getItem("notifications_prod_api_url")||"https://ecurie-notifications-prod.damiensiri-pro.workers.dev").replace(/\/$/,"");
  const adminToken=localStorage.getItem("notifications_prod_admin_token")||"";
  let loadedUsers=[];
  function status(element,message,type=""){element.textContent=message;element.className="status"+(type?" "+type:"");}
  async function api(path,options={}){
    if(!apiBase||!adminToken)throw new Error("Configurez la connexion dans Paramètres");
    const response=await fetch(apiBase+path,{...options,headers:{authorization:"Bearer "+adminToken,...(options.body?{"content-type":"application/json"}:{})}});
    const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||`Erreur ${response.status}`);return data;
  }
  function render(users){
    if(!users.length){elements.list.innerHTML='<p class="empty">Aucun compte production.</p>';return;}
    const sorted=[...users].sort((a,b)=>(a.approvalStatus==="pending"?-1:0)-(b.approvalStatus==="pending"?-1:0));
    elements.list.replaceChildren(...sorted.map(user=>{
      const pending=user.approvalStatus==="pending";
      const row=document.createElement("article");row.className="user-row"+(pending?" is-pending":"");
      const copy=document.createElement("div");const name=document.createElement("strong");name.textContent=`${user.firstName} ${user.lastName}`;
      const meta=document.createElement("div");meta.className="user-meta";meta.textContent=pending?`${user.email} · Demande d’inscription à valider`:`${user.email} · ${user.role} · ${user.status}${user.paddockCard?` · carte ${user.paddockCard.remaining}/${user.paddockCard.total}`:" · sans carte"}${user.paddockInvoiceCount?` · ${"🌿".repeat(Math.min(user.paddockInvoiceCount,5))} ${user.paddockInvoiceCount} à facturer`:""}${user.orderDue?` · commandes à facturer ${Number(user.orderDue).toLocaleString("fr-FR",{maximumFractionDigits:2})} €`:""}${user.mustChangePassword?" · mot de passe temporaire":""}`;copy.append(name,meta);
      if(!pending)copy.onclick=()=>openDetails(user);
      const actions=document.createElement("div");actions.className="user-actions";
      if(pending){
        const approve=document.createElement("button");approve.type="button";approve.textContent="Accepter";approve.onclick=()=>approveUser(user);
        const reject=document.createElement("button");reject.type="button";reject.className="danger";reject.textContent="Refuser";reject.onclick=()=>rejectUser(user);
        actions.append(approve,reject);row.append(copy,actions);return row;
      }
      const role=document.createElement("select");role.setAttribute("aria-label","Rôle de "+user.firstName);
      [["client","Client"],["staff","Équipe"],["admin","Administrateur"]].forEach(([value,label])=>{const option=document.createElement("option");option.value=value;option.textContent=label;option.selected=user.role===value;role.append(option);});
      role.onchange=()=>changeRole(user,role.value);
      const reset=document.createElement("button");reset.type="button";reset.className="secondary";reset.textContent="Réinitialiser";reset.onclick=()=>resetPassword(user);
      const toggle=document.createElement("button");toggle.type="button";toggle.className=user.status==="active"?"danger":"secondary";toggle.textContent=user.status==="active"?"Désactiver":"Réactiver";toggle.onclick=()=>changeStatus(user);
      const details=document.createElement("button");details.type="button";details.className="secondary";details.textContent="Détails";details.onclick=()=>openDetails(user);
      const remove=document.createElement("button");remove.type="button";remove.className="danger";remove.textContent="Supprimer";remove.onclick=()=>deleteUser(user);
      actions.append(details,role,reset,toggle,remove);row.append(copy,actions);return row;
    }));
  }
  function normalizedSearch(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();}
  function renderSearch(){
    const query=normalizedSearch(elements.search.value);
    const filtered=query?loadedUsers.filter(user=>normalizedSearch(`${user.firstName} ${user.lastName} ${user.email}`).includes(query)):loadedUsers;
    render(filtered);
  }
  const escapeHTML=value=>String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
  const formatDate=value=>value?new Date(value+"T12:00:00").toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"}):"";
  async function openDetails(user){
    elements.modal.hidden=false;elements.modalTitle.textContent=`${user.firstName} ${user.lastName}`;elements.modalBody.innerHTML='<p class="empty">Chargement…</p>';
    try{renderDetails(await api(`/api/admin/users/${user.id}/details`));}catch(error){elements.modalBody.innerHTML=`<p class="status error">${escapeHTML(error.message)}</p>`;}
  }
  function renderDetails(data){
    const user=data.user,card=data.card,usages=data.usages||[],orders=data.orders||[];
    elements.modalBody.innerHTML=`
      <div class="detail-block"><h3>Compte</h3><p>${escapeHTML(user.email)}</p><p>Rôle : ${escapeHTML(user.role)} · Statut : ${escapeHTML(user.status)}</p><button id="deleteDetailUser" class="danger">Supprimer définitivement ce compte</button></div>
      <div class="detail-block"><h3>Carte paddock</h3>
        ${card?`<p><strong>${card.remaining} / ${card.total}</strong> mises restantes</p>`:'<p>Aucune carte active.</p>'}
        <div class="card-fields"><input id="detailCardRemaining" type="number" min="0" max="999" value="${card?.remaining??card?.total??10}" aria-label="Solde restant" title="Solde restant"><input id="detailCardTotal" type="number" min="1" max="999" value="${card?.total||10}" aria-label="Solde de base" title="Solde de base"><button id="saveDetailCard">${card?"Réinitialiser":"Créer la carte"}</button></div>
        ${card?'<button id="deleteDetailCard" class="secondary" style="margin-top:8px">Supprimer la carte</button>':''}
      </div>
      <div class="detail-block"><h3>Consommations et facturation</h3><div class="usage-list">
        ${usages.map(item=>`<div class="usage-row"><span class="${item.mode==="invoice"?"leaf":""}">${item.mode==="invoice"?"🌿 À facturer":"Carte débitée"} · ${formatDate(item.date)}</span><button class="danger" data-delete-usage="${item.id}">${item.mode==="invoice"?"Facturé · supprimer":"Annuler"}</button></div>`).join("")||'<p class="empty">Aucune consommation.</p>'}
      </div></div>
      <div class="detail-block"><h3>Commandes à facturer</h3><p><strong>${Number(data.orderDue||0).toLocaleString("fr-FR",{maximumFractionDigits:2})} €</strong></p><div class="usage-list">
        ${orders.filter(order=>!order.billed&&!['refused','cancelled'].includes(order.status)).map(order=>`<div class="usage-row"><span>#${escapeHTML(order.publicId)} · ${order.items.map(item=>`${escapeHTML(item.name)} × ${item.quantity}`).join(', ')}</span><strong>${Number(order.total).toLocaleString("fr-FR",{maximumFractionDigits:2})} €</strong></div>`).join('')||'<p class="empty">Aucune commande à facturer.</p>'}
      </div></div>`;
    byId("saveDetailCard").onclick=()=>saveCard(user.id);
    byId("deleteDetailUser").onclick=()=>deleteUser(user);
    if(byId("deleteDetailCard"))byId("deleteDetailCard").onclick=()=>deleteCard(user.id);
    elements.modalBody.querySelectorAll("[data-delete-usage]").forEach(button=>button.onclick=()=>deleteUsage(user.id,button.dataset.deleteUsage));
  }
  async function refreshDetails(userId){renderDetails(await api(`/api/admin/users/${userId}/details`));}
  async function saveCard(userId){
    const total=Number(byId("detailCardTotal").value),remaining=Number(byId("detailCardRemaining").value);
    try{await api(`/api/admin/users/${userId}/paddock-card`,{method:"PUT",body:JSON.stringify({total,remaining})});status(elements.connection,"Carte paddock enregistrée.","success");await refreshDetails(userId);}catch(error){status(elements.connection,error.message,"error");}
  }
  async function deleteCard(userId){if(!confirm("Supprimer cette carte paddock et ses consommations liées ?"))return;try{await api(`/api/admin/users/${userId}/paddock-card`,{method:"DELETE"});await refreshDetails(userId);}catch(error){status(elements.connection,error.message,"error");}}
  async function deleteUsage(userId,usageId){if(!confirm("Supprimer cette ligne ? Une unité sera restituée si elle provenait de la carte."))return;try{await api(`/api/admin/users/${userId}/paddock-usages/${usageId}`,{method:"DELETE"});await refreshDetails(userId);}catch(error){status(elements.connection,error.message,"error");}}
  async function load(){status(elements.connection,"Chargement…");try{loadedUsers=await api("/api/admin/users");renderSearch();status(elements.connection,`${loadedUsers.length} compte(s) production.`,"success");}catch(error){status(elements.connection,error.message,"error");}}
  async function changeStatus(user){try{await api(`/api/admin/users/${user.id}`,{method:"PATCH",body:JSON.stringify({status:user.status==="active"?"disabled":"active"})});await load();}catch(error){status(elements.connection,error.message,"error");}}
  async function approveUser(user){try{const result=await api(`/api/admin/users/${user.id}`,{method:"PATCH",body:JSON.stringify({approvalStatus:"approved",status:"active"})});const sent=result.email?.sent||result.email?.duplicate;status(elements.connection,sent?`Accès de ${user.firstName} validé · email envoyé.`:`Accès validé, mais l’email n’a pas pu être envoyé${result.email?.error?` : ${result.email.error}`:"."}`,sent?"success":"error");await load();}catch(error){status(elements.connection,error.message,"error");}}
  async function rejectUser(user){if(!confirm(`Refuser et supprimer la demande de ${user.firstName} ${user.lastName} ?`))return;try{await api(`/api/admin/users/${user.id}`,{method:"DELETE"});status(elements.connection,"Demande refusée et supprimée.","success");await load();}catch(error){status(elements.connection,error.message,"error");}}
  async function deleteUser(user){const confirmation=prompt(`Suppression définitive de ${user.firstName} ${user.lastName}, avec ses réservations, commandes, carte et photo.\n\nPour confirmer, saisissez son adresse email :`);if(confirmation===null)return;if(confirmation.trim().toLowerCase()!==user.email.toLowerCase()){status(elements.connection,"Suppression annulée : adresse email différente.","error");return;}try{await api(`/api/admin/users/${user.id}`,{method:"DELETE"});elements.modal.hidden=true;status(elements.connection,"Compte et données associées définitivement supprimés.","success");await load();}catch(error){status(elements.connection,error.message,"error");}}
  async function changeRole(user,role){try{await api(`/api/admin/users/${user.id}`,{method:"PATCH",body:JSON.stringify({role})});status(elements.connection,"Rôle mis à jour.","success");await load();}catch(error){status(elements.connection,error.message,"error");await load();}}
  async function resetPassword(user){const value=prompt(`Nouveau mot de passe temporaire pour ${user.firstName} (12 caractères minimum)`);if(value===null)return;try{await api(`/api/admin/users/${user.id}`,{method:"PATCH",body:JSON.stringify({temporaryPassword:value})});status(elements.connection,"Mot de passe temporaire remplacé et sessions fermées.","success");await load();}catch(error){status(elements.connection,error.message,"error");}}
  elements.form.addEventListener("submit",async event=>{event.preventDefault();status(elements.createStatus,"Création…");try{await api("/api/admin/users",{method:"POST",body:JSON.stringify({firstName:elements.firstName.value,lastName:elements.lastName.value,email:elements.email.value,cardNumber:"",role:elements.role.value,temporaryPassword:elements.password.value})});elements.form.reset();status(elements.createStatus,"Compte production créé.","success");await load();}catch(error){status(elements.createStatus,error.message,"error");}});
  elements.modalClose.onclick=()=>{elements.modal.hidden=true;};elements.modal.onclick=event=>{if(event.target===elements.modal)elements.modal.hidden=true;};
  elements.createToggle.addEventListener("click",()=>{const open=elements.createToggle.getAttribute("aria-expanded")!=="true";elements.createToggle.setAttribute("aria-expanded",String(open));elements.createBody.classList.toggle("is-open",open);elements.createBody.setAttribute("aria-hidden",String(!open));if(open)elements.firstName.focus();});
  elements.search.addEventListener("input",renderSearch);
  elements.refresh.addEventListener("click",load);load();
})();
