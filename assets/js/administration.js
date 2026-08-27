(function(){
  const elements={
    pageTitle:document.getElementById("adminPageTitle"),
    pageSubtitle:document.getElementById("adminPageSubtitle"),
    apiUrl:document.getElementById("apiUrl"),
    token:document.getElementById("adminToken"),
    connect:document.getElementById("connectBtn"),
    forgetToken:document.getElementById("forgetTokenBtn"),
    connectionStatus:document.getElementById("connectionStatus"),
    form:document.getElementById("alertForm"),
    editingId:document.getElementById("editingId"),
    categorie:document.getElementById("categorie"),
    titre:document.getElementById("titre"),
    message:document.getElementById("message"),
    epingle:document.getElementById("epingle"),
    scheduledDate:document.getElementById("scheduledDate"),
    scheduledTime:document.getElementById("scheduledTime"),
    formTitle:document.getElementById("formTitle"),
    publish:document.getElementById("publishBtn"),
    send:document.getElementById("sendBtn"),
    schedule:document.getElementById("scheduleBtn"),
    cancel:document.getElementById("cancelEditBtn"),
    formStatus:document.getElementById("formStatus"),
    refresh:document.getElementById("refreshBtn"),
    list:document.getElementById("alertsList"),
    refreshSpaces:document.getElementById("refreshSpacesBtn"),
    spacePills:document.getElementById("spacePills"),
    spaceListStatus:document.getElementById("spaceListStatus"),
    spaceEditor:document.getElementById("spaceEditor"),
    spaceEditorTitle:document.getElementById("spaceEditorTitle"),
    closeSpaceEditor:document.getElementById("closeSpaceEditorBtn"),
    spaceSelect:document.getElementById("spaceSelect"),
    spaceSpecial:document.getElementById("spaceSpecial"),
    spaceInfo:document.getElementById("spaceInfo"),
    saveSpace:document.getElementById("saveSpaceBtn"),
    spaceMessage:document.getElementById("spaceStatusMessage"),
    spaceSchedules:document.getElementById("spaceSchedules"),
    saveSpaceSchedules:document.getElementById("saveSpaceSchedulesBtn"),
    spaceSchedulesStatus:document.getElementById("spaceSchedulesStatus"),
    generalSchedules:document.getElementById("generalSchedules"),
    saveGeneralSchedules:document.getElementById("saveGeneralSchedulesBtn"),
    generalSchedulesStatus:document.getElementById("generalSchedulesStatus"),
    exceptionDate:document.getElementById("exceptionDate"),
    exceptionMessage:document.getElementById("exceptionMessage"),
    saveException:document.getElementById("saveExceptionBtn"),
    exceptionStatus:document.getElementById("exceptionStatus"),
    exceptionsList:document.getElementById("exceptionsList"),
    hourProgramId:document.getElementById("hourProgramId"),
    hourProgramName:document.getElementById("hourProgramName"),
    hourProgramStart:document.getElementById("hourProgramStart"),
    hourProgramEnd:document.getElementById("hourProgramEnd"),
    hourProgramBulkOpen:document.getElementById("hourProgramBulkOpen"),
    hourProgramBulkClose:document.getElementById("hourProgramBulkClose"),
    hourProgramBulkStatusWrap:document.getElementById("hourProgramBulkStatusWrap"),
    hourProgramBulkStatus:document.getElementById("hourProgramBulkStatus"),
    applyHourProgramBulk:document.getElementById("applyHourProgramBulkBtn"),
    hourProgramGrid:document.getElementById("hourProgramGrid"),
    applyAllPaddockHours:document.getElementById("applyAllPaddockHoursBtn"),
    saveHourProgram:document.getElementById("saveHourProgramBtn"),
    deleteHourProgram:document.getElementById("deleteHourProgramBtn"),
    resetHourProgram:document.getElementById("resetHourProgramBtn"),
    refreshHourPrograms:document.getElementById("refreshHourProgramsBtn"),
    hourProgramStatus:document.getElementById("hourProgramStatus"),
    hourProgramsList:document.getElementById("hourProgramsList"),
    activityProgramId:document.getElementById("activityProgramId"),
    activityProgramName:document.getElementById("activityProgramName"),
    activityProgramStart:document.getElementById("activityProgramStart"),
    activityProgramEnd:document.getElementById("activityProgramEnd"),
    activityProgramEnabled:document.getElementById("activityProgramEnabled"),
    activityProgramGrid:document.getElementById("activityProgramGrid"),
    saveActivityProgram:document.getElementById("saveActivityProgramBtn"),
    deleteActivityProgram:document.getElementById("deleteActivityProgramBtn"),
    resetActivityProgram:document.getElementById("resetActivityProgramBtn"),
    activityProgramStatus:document.getElementById("activityProgramStatus"),
    activityProgramsList:document.getElementById("activityProgramsList"),
    hourExceptionDate:document.getElementById("hourExceptionDate"),
    hourExceptionScope:document.getElementById("hourExceptionScope"),
    hourExceptionTarget:document.getElementById("hourExceptionTarget"),
    hourExceptionStatusSelect:document.getElementById("hourExceptionStatus"),
    hourExceptionOpen:document.getElementById("hourExceptionOpen"),
    hourExceptionClose:document.getElementById("hourExceptionClose"),
    saveHourException:document.getElementById("saveHourExceptionBtn"),
    hourExceptionStatusMessage:document.getElementById("hourExceptionStatusMessage"),
    hourExceptionsList:document.getElementById("hourExceptionsList"),
    homeAlertMessage:document.getElementById("homeAlertMessage"),
    homeAlertUrgent:document.getElementById("homeAlertUrgent"),
    saveHomeAlert:document.getElementById("saveHomeAlertBtn"),
    homeAlertStatus:document.getElementById("homeAlertStatus")
  };
  let alerts=[];
  let operations={spaces:[],spaceSchedules:[],generalSchedules:[],exceptions:[],hourExceptions:[],homeAlert:{},activityPrograms:[]};
  let hourProgramScope="general";
  let hourProgramDrafts=new Map();
  let publicStatuses=[];
  let liveRefreshTimer=null;
  const days=["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];

  const storedUrl=localStorage.getItem("notifications_prod_api_url")||
    "https://ecurie-notifications-prod.damiensiri-pro.workers.dev";
  const storedToken=localStorage.getItem("notifications_prod_admin_token")||"";
  elements.apiUrl.value=storedUrl;
  elements.token.value=storedToken;

  function settings(){
    return{
      base:elements.apiUrl.value.trim().replace(/\/$/,""),
      token:elements.token.value
    };
  }

  function readScheduledAt(){
    const date=elements.scheduledDate.value;
    const time=elements.scheduledTime.value;
    if(!date&&!time)return null;
    if(!date||!time)return "";
    const value=new Date(`${date}T${time}:00`);
    return Number.isNaN(value.getTime())?"":value.toISOString();
  }

  function scheduleToLocalFields(value){
    if(!value)return{date:"",time:""};
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return{date:"",time:""};
    const year=date.getFullYear();
    const month=String(date.getMonth()+1).padStart(2,"0");
    const day=String(date.getDate()).padStart(2,"0");
    const hour=String(date.getHours()).padStart(2,"0");
    const minute=String(date.getMinutes()).padStart(2,"0");
    return{date:`${year}-${month}-${day}`,time:`${hour}:${minute}`};
  }

  function formatScheduledAt(value){
    if(!value)return"";
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return"";
    return new Intl.DateTimeFormat("fr-FR",{
      day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"
    }).format(date).replace(":","h");
  }

  async function api(path,options={}){
    const config=settings();
    if(!config.base)throw new Error("Adresse API manquante");
    if(!config.token)throw new Error("Jeton d’administration manquant");
    const response=await fetch(config.base+path,{
      ...options,
      headers:{
        "authorization":"Bearer "+config.token,
        ...(options.body?{"content-type":"application/json"}:{}),
        ...(options.headers||{})
      }
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||`Erreur ${response.status}`);
    return data;
  }

  function setStatus(element,message,type=""){
    element.textContent=message;
    element.className="status"+(type?" "+type:"");
  }

  function esc(value){
    return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[char]));
  }

  async function loadAlerts(){
    setStatus(elements.connectionStatus,"Chargement…");
    try{
      const config=settings();
      localStorage.setItem("notifications_prod_api_url",config.base);
      alerts=await api("/api/admin/notifications");
      localStorage.setItem("notifications_prod_admin_token",config.token);
      render();
      setStatus(elements.connectionStatus,`${alerts.length} alerte(s) chargée(s).`,"success");
    }catch(error){
      setStatus(elements.connectionStatus,error.message,"error");
    }
  }

  async function loadAll(){
    setStatus(elements.connectionStatus,"Chargement…");
    try{
      const config=settings();
      localStorage.setItem("notifications_prod_api_url",config.base);
      [alerts,operations,publicStatuses]=await Promise.all([
        api("/api/admin/notifications"),
        api("/api/admin/operations"),
        fetch(config.base+"/api/statuses",{cache:"no-store"}).then(response=>response.json())
      ]);
      localStorage.setItem("notifications_prod_admin_token",config.token);
      render();
      renderOperations();
      setStatus(elements.connectionStatus,"Administration connectée.","success");
    }catch(error){
      setStatus(elements.connectionStatus,error.message,"error");
      showSection("settings");
    }
  }

  function renderOperations(){
    const selected=elements.spaceSelect.value||operations.spaces[0]?.slug||"";
    elements.spaceSelect.replaceChildren(...operations.spaces.map(space=>{
      const option=document.createElement("option");
      option.value=space.slug;
      option.textContent=space.label;
      return option;
    }));
    if(operations.spaces.some(space=>space.slug===selected))elements.spaceSelect.value=selected;
    renderSpacePills();
    renderSelectedSpace();
    renderScheduleInputs(elements.generalSchedules,operations.generalSchedules);
    renderHourExceptionTargets();
    renderHourExceptions();
    renderExceptions();
    renderHourProgramGrid();
    renderHourProgramsList();
    renderActivityProgramGrid();
    renderActivityProgramsList();
    elements.homeAlertMessage.value=operations.homeAlert?.message||"";
    elements.homeAlertUrgent.checked=operations.homeAlert?.urgent==="oui";
  }

  function renderSpacePills(){
    elements.spacePills.replaceChildren();
    const jsDay=new Date().getDay();
    const day=jsDay===0?7:jsDay;
    operations.spaces.forEach(space=>{
      const current=publicStatuses.find(item=>item.espace===space.slug)||{};
      const schedule=operations.spaceSchedules.find(item=>item.space_slug===space.slug&&Number(item.day)===day);
      const pill=document.createElement("article");
      pill.className="space-pill";

      const summary=document.createElement("div");
      summary.className="space-summary";
      const name=document.createElement("strong");
      name.textContent=space.label;
      const detail=document.createElement("span");
      const statusLabel={ouvert:"Ouvert",prevision:"Prévision",ferme:"Fermé","hors-service":"Hors service"}[current.statut_auto||space.manual_status]||"—";
      const baseHours=schedule?`${schedule.opens_at}–${schedule.closes_at}`:"—";
      const effectiveHours=current.horaire_affiche?current.horaire_affiche.replace(/\s-\s/g,"–"):baseHours;
      const effectiveNote=effectiveHours!==baseHours?` · aujourd’hui ${effectiveHours}`:"";
      detail.textContent=`${statusLabel} / actuel ${baseHours}${effectiveNote}${space.info?"  💬":""}`;
      summary.append(name,detail);

      const open=document.createElement("button");
      open.type="button";
      open.className="space-chevron";
      open.textContent="›";
      open.setAttribute("aria-label",`Modifier ${space.label}`);
      open.addEventListener("click",()=>openSpaceEditor(space.slug));

      const head=document.createElement("div");
      head.className="space-pill-head";
      head.append(summary,open);
      pill.appendChild(head);

      const statuses=document.createElement("div");
      statuses.className="quick-actions status-actions";
      [
        ["ouvert","Auto"],["prevision","Prévision"],["ferme","Fermé"],["hors-service","HS"]
      ].forEach(([value,label])=>{
        const button=document.createElement("button");
        button.type="button";
        button.textContent=label;
        button.classList.toggle("selected",space.manual_status===value);
        button.addEventListener("click",()=>quickSaveSpace(space,{manualStatus:value}));
        statuses.appendChild(button);
      });
      pill.appendChild(statuses);

      if(space.slug==="carriere"||space.slug==="manege"){
        const options=document.createElement("div");
        options.className="quick-options";
        options.append(
          quickToggle(space,"Liberté","liberte"),
          quickToggle(space,"Longe","longe")
        );
        pill.appendChild(options);
      }
      elements.spacePills.appendChild(pill);
    });
  }

  function quickToggle(space,label,field){
    const wrapper=document.createElement("div");
    wrapper.className="quick-toggle";
    const name=document.createElement("span");
    name.textContent=label;
    wrapper.appendChild(name);
    const hasAuto=hasActivityProgramFor(space.slug,field);
    ["auto","oui","non"].forEach(value=>{
      const button=document.createElement("button");
      button.type="button";
      button.textContent=value==="auto"?"Auto":value.toUpperCase();
      button.classList.toggle("selected",space[field]===value);
      if(value==="auto"&&!hasAuto){
        button.disabled=true;
        button.title="Aucune programmation d’activité active";
      }
      button.addEventListener("click",()=>quickSaveSpace(space,{[field]:value}));
      wrapper.appendChild(button);
    });
    return wrapper;
  }

  function hasActivityProgramFor(spaceSlug,activity){
    return (operations.activityPrograms||[]).some(program=>
      program.enabled==="oui"&&(program.entries||[]).some(entry=>
        entry.spaceSlug===spaceSlug&&entry.activity===activity
      )
    );
  }

  async function quickSaveSpace(space,changes){
    setStatus(elements.spaceListStatus,`Mise à jour de ${space.label}…`);
    try{
      await api(`/api/admin/spaces/${space.slug}`,{
        method:"PUT",
        body:JSON.stringify({
          manualStatus:changes.manualStatus??space.manual_status,
          liberte:changes.liberte??space.liberte,
          longe:changes.longe??space.longe,
          specialHours:space.special_hours,
          info:space.info
        })
      });
      await refreshOperations();
      setStatus(elements.spaceListStatus,`${space.label} mis à jour.`,"success");
    }catch(error){setStatus(elements.spaceListStatus,error.message,"error");}
  }

  function openSpaceEditor(slug){
    elements.spaceSelect.value=slug;
    renderSelectedSpace();
    const space=operations.spaces.find(item=>item.slug===slug);
    elements.spaceEditorTitle.textContent=`Modifier ${space?.label||"l’espace"}`;
    elements.spaceEditor.hidden=false;
    document.body.classList.add("space-editor-open");
    elements.closeSpaceEditor.focus();
  }

  function renderSelectedSpace(){
    const slug=elements.spaceSelect.value;
    const space=operations.spaces.find(item=>item.slug===slug);
    if(!space)return;
    elements.spaceSpecial.value=space.special_hours||"";
    elements.spaceInfo.value=space.info||"";
    renderScheduleInputs(elements.spaceSchedules,
      operations.spaceSchedules.filter(item=>item.space_slug===slug));
    setStatus(elements.spaceMessage,"");
    setStatus(elements.spaceSchedulesStatus,"");
  }

  function renderScheduleInputs(container,rows){
    container.replaceChildren();
    days.forEach((label,index)=>{
      const day=index+1;
      const row=rows.find(item=>Number(item.day)===day)||{};
      const wrapper=document.createElement("div");
      wrapper.className="schedule-row";
      const name=document.createElement("strong");
      name.textContent=label;
      const open=document.createElement("input");
      open.type="time";
      open.value=row.opens_at||"08:00";
      open.dataset.day=String(day);
      open.dataset.kind="open";
      open.setAttribute("aria-label",`Ouverture ${label}`);
      const close=document.createElement("input");
      close.type="time";
      close.value=row.closes_at||"21:00";
      close.dataset.day=String(day);
      close.dataset.kind="close";
      close.setAttribute("aria-label",`Fermeture ${label}`);
      wrapper.append(name,open,close);
      container.appendChild(wrapper);
    });
  }

  function readScheduleInputs(container){
    return days.map((_,index)=>{
      const day=index+1;
      return{
        day,
        opensAt:container.querySelector(`[data-day="${day}"][data-kind="open"]`).value,
        closesAt:container.querySelector(`[data-day="${day}"][data-kind="close"]`).value
      };
    });
  }

  function hourProgramTargets(scope=hourProgramScope){
    if(scope==="general")return[{slug:"general",label:"Écuries"}];
    if(scope==="paddocks")return[
      {slug:"maison",label:"Maison"},
      {slug:"grande",label:"Grande voie"},
      {slug:"beudot",label:"Beudot"}
    ];
    const wanted=["carriere","manege"];
    return operations.spaces.filter(space=>wanted.includes(space.slug))
      .map(space=>({slug:space.slug,label:space.label}));
  }

  function hourExceptionTargets(scope=elements.hourExceptionScope?.value||"general"){
    if(scope==="general")return[{slug:"general",label:"Écuries"}];
    if(scope==="paddocks")return[
      {slug:"maison",label:"Maison"},
      {slug:"grande",label:"Grande voie"},
      {slug:"beudot",label:"Beudot"}
    ];
    return operations.spaces
      .filter(space=>["carriere","manege"].includes(space.slug))
      .map(space=>({slug:space.slug,label:space.label}));
  }

  function renderHourExceptionTargets(){
    if(!elements.hourExceptionTarget)return;
    const current=elements.hourExceptionTarget.value;
    const targets=hourExceptionTargets();
    elements.hourExceptionTarget.replaceChildren(...targets.map(target=>{
      const option=document.createElement("option");
      option.value=target.slug;
      option.textContent=target.label;
      return option;
    }));
    if(targets.some(target=>target.slug===current))elements.hourExceptionTarget.value=current;
  }

  function baseHourProgramEntry(target,day){
    const source=hourProgramScope==="general"
      ?operations.generalSchedules.find(item=>Number(item.day)===day)
      :operations.spaceSchedules.find(item=>item.space_slug===target.slug&&Number(item.day)===day);
    const space=operations.spaces.find(item=>item.slug===target.slug)||{};
    return{
      targetSlug:target.slug,
      day,
      manualStatus:space.manual_status||"ouvert",
      opensAt:source?.opens_at||"08:00",
      closesAt:source?.closes_at||"21:00",
      specialHours:space.special_hours||"",
      info:space.info||"",
      liberte:space.liberte||"non",
      longe:space.longe||"non"
    };
  }

  function renderHourProgramGrid(entries=[]){
    if(!elements.hourProgramGrid)return;
    if(elements.applyAllPaddockHours)elements.applyAllPaddockHours.hidden=hourProgramScope!=="paddocks";
    if(elements.hourProgramBulkStatusWrap)elements.hourProgramBulkStatusWrap.hidden=hourProgramScope!=="paddocks";
    const currentEntries=entries.length?entries:(hourProgramDrafts.get(hourProgramScope)||[]);
    elements.hourProgramGrid.replaceChildren();
    hourProgramTargets().forEach(target=>{
      const card=document.createElement("article");
      card.className="hour-program-target";
      const title=document.createElement("h3");
      title.textContent=target.label;
      card.appendChild(title);
      days.forEach((label,index)=>{
        const day=index+1;
        const row=currentEntries.find(item=>item.targetSlug===target.slug&&Number(item.day)===day)||baseHourProgramEntry(target,day);
        const line=document.createElement("div");
        line.className=`hour-program-row is-${hourProgramScope}`;
        line.dataset.target=target.slug;
        line.dataset.day=String(day);
        const commonHours=`
          <label class="program-day-check" aria-label="Sélectionner ${target.label} ${label}">
            <input data-field="selected" type="checkbox">
          </label>
          <strong>${label}</strong>
          <input data-field="opensAt" type="time" value="${esc(row.opensAt)}" aria-label="Ouverture ${target.label} ${label}">
          <input data-field="closesAt" type="time" value="${esc(row.closesAt)}" aria-label="Fermeture ${target.label} ${label}">
        `;
        if(hourProgramScope==="general"){
          line.innerHTML=commonHours;
        }else if(hourProgramScope==="work"){
          line.innerHTML=`
            <label class="program-day-check" aria-label="Sélectionner ${target.label} ${label}">
              <input data-field="selected" type="checkbox">
            </label>
            <strong>${label}</strong>
            <input data-field="opensAt" type="time" value="${esc(row.opensAt)}" aria-label="Ouverture ${target.label} ${label}">
            <input data-field="closesAt" type="time" value="${esc(row.closesAt)}" aria-label="Fermeture ${target.label} ${label}">
          `;
        }else{
          line.innerHTML=`
            <label class="program-day-check" aria-label="Sélectionner ${target.label} ${label}">
              <input data-field="selected" type="checkbox">
            </label>
            <strong>${label}</strong>
            <select data-field="manualStatus" aria-label="Statut ${target.label} ${label}">
              <option value="ouvert">Ouvert</option>
              <option value="ferme">Fermé</option>
              <option value="hors-service">Hors service</option>
            </select>
            <input data-field="opensAt" type="time" value="${esc(row.opensAt)}" aria-label="Ouverture ${target.label} ${label}">
            <input data-field="closesAt" type="time" value="${esc(row.closesAt)}" aria-label="Fermeture ${target.label} ${label}">
          `;
          line.querySelector('[data-field="manualStatus"]').value=row.manualStatus||"ouvert";
        }
        card.appendChild(line);
      });
      elements.hourProgramGrid.appendChild(card);
    });
  }

  function readHourProgramEntriesFromDom(){
    if(!elements.hourProgramGrid?.children.length)return[];
    return[...elements.hourProgramGrid.querySelectorAll(".hour-program-row")].map(row=>{
      const value=field=>row.querySelector(`[data-field="${field}"]`)?.value||"";
      return{
        targetSlug:row.dataset.target,
        day:Number(row.dataset.day),
        manualStatus:value("manualStatus")||"ouvert",
        opensAt:value("opensAt"),
        closesAt:value("closesAt"),
        specialHours:value("specialHours"),
        info:value("info"),
        liberte:value("liberte"),
        longe:value("longe")
      };
    });
  }

  function rememberHourProgramDraft(){
    if(!elements.hourProgramGrid?.children.length)return;
    hourProgramDrafts.set(hourProgramScope,readHourProgramEntriesFromDom());
  }

  function filledHourProgramDrafts(){
    rememberHourProgramDraft();
    return["general","work","paddocks"]
      .map(scope=>({scope,entries:hourProgramDrafts.get(scope)||[]}))
      .filter(item=>item.entries.length);
  }

  function applyFirstPaddockProgramToAll(){
    if(hourProgramScope!=="paddocks"||!elements.hourProgramGrid)return;
    const targets=hourProgramTargets();
    const source=targets[0]?.slug;
    if(!source)return;
    const sourceRows=[...elements.hourProgramGrid.querySelectorAll(`.hour-program-row[data-target="${source}"]`)];
    const values=new Map(sourceRows.map(row=>[
      Number(row.dataset.day),
      {
        manualStatus:row.querySelector('[data-field="manualStatus"]')?.value||"ouvert",
        opensAt:row.querySelector('[data-field="opensAt"]')?.value||"",
        closesAt:row.querySelector('[data-field="closesAt"]')?.value||""
      }
    ]));
    targets.slice(1).forEach(target=>{
      [...elements.hourProgramGrid.querySelectorAll(`.hour-program-row[data-target="${target.slug}"]`)].forEach(row=>{
        const value=values.get(Number(row.dataset.day));
        if(!value)return;
        const status=row.querySelector('[data-field="manualStatus"]');
        const open=row.querySelector('[data-field="opensAt"]');
        const close=row.querySelector('[data-field="closesAt"]');
        if(status)status.value=value.manualStatus;
        if(open)open.value=value.opensAt;
        if(close)close.value=value.closesAt;
      });
    });
    setStatus(elements.hourProgramStatus,"Grille du premier paddock appliquée aux 3 paddocks.","success");
  }

  function applyBulkHourProgram(){
    if(!elements.hourProgramGrid)return;
    const selectedRows=[...elements.hourProgramGrid.querySelectorAll('.hour-program-row input[data-field="selected"]:checked')]
      .map(input=>input.closest(".hour-program-row"))
      .filter(Boolean);
    if(!selectedRows.length){
      setStatus(elements.hourProgramStatus,"Sélectionnez au moins un jour dans la grille.","error");
      return;
    }
    const opensAt=elements.hourProgramBulkOpen?.value||"";
    const closesAt=elements.hourProgramBulkClose?.value||"";
    const manualStatus=elements.hourProgramBulkStatus?.value||"";
    if(!opensAt&&!closesAt&&!manualStatus){
      setStatus(elements.hourProgramStatus,"Indiquez au moins une valeur à appliquer.","error");
      return;
    }
    selectedRows.forEach(row=>{
      const open=row.querySelector('[data-field="opensAt"]');
      const close=row.querySelector('[data-field="closesAt"]');
      const status=row.querySelector('[data-field="manualStatus"]');
      if(opensAt&&open)open.value=opensAt;
      if(closesAt&&close)close.value=closesAt;
      if(manualStatus&&status)status.value=manualStatus;
      const selected=row.querySelector('[data-field="selected"]');
      if(selected)selected.checked=false;
    });
    rememberHourProgramDraft();
    setStatus(elements.hourProgramStatus,`${selectedRows.length} jour(s) mis à jour dans l’onglet affiché.`,"success");
  }

  function resetHourProgram(){
    hourProgramDrafts=new Map();
    elements.hourProgramId.value="";
    elements.hourProgramName.value="";
    elements.hourProgramStart.value="";
    elements.hourProgramEnd.value="";
    elements.deleteHourProgram.hidden=true;
    renderHourProgramGrid([]);
    setStatus(elements.hourProgramStatus,"");
  }

  function editHourProgram(program){
    hourProgramDrafts=new Map([[program.scope,program.entries||[]]]);
    hourProgramScope=program.scope;
    document.querySelectorAll("[data-hour-program-scope]").forEach(button=>{
      button.classList.toggle("selected",button.dataset.hourProgramScope===hourProgramScope);
    });
    elements.hourProgramId.value=program.id;
    elements.hourProgramName.value=program.name;
    elements.hourProgramStart.value=program.startsOn;
    elements.hourProgramEnd.value=program.endsOn||"";
    elements.deleteHourProgram.hidden=false;
    renderHourProgramGrid(program.entries||[]);
    setStatus(elements.hourProgramStatus,`Programmation #${program.id} chargée.`);
  }

  function renderHourProgramsList(){
    if(!elements.hourProgramsList)return;
    elements.hourProgramsList.replaceChildren();
    const programs=operations.hourPrograms||[];
    if(!programs.length){
      const empty=document.createElement("p");
      empty.className="empty";
      empty.textContent="Aucune programmation enregistrée.";
      elements.hourProgramsList.appendChild(empty);
      return;
    }
    programs.forEach(program=>{
      const row=document.createElement("article");
      row.className="hour-program-item";
      const scopeLabel={general:"Écuries",work:"Travail",paddocks:"Paddocks"}[program.scope]||program.scope;
      row.innerHTML=`
        <div>
          <strong>${esc(program.name)}</strong>
          <p>${scopeLabel} · à partir du ${esc(program.startsOn)}${program.endsOn?` · jusqu’au ${esc(program.endsOn)}`:""} · ${program.entries.length} ligne(s)</p>
        </div>
      `;
      const edit=document.createElement("button");
      edit.type="button";
      edit.className="secondary compact";
      edit.textContent="Modifier";
      edit.addEventListener("click",()=>editHourProgram(program));
      row.appendChild(edit);
      elements.hourProgramsList.appendChild(row);
    });
  }

  function baseActivityEntry(spaceSlug,day,activity){
    return{spaceSlug,day,activity,enabled:"non",startsAt:"",endsAt:""};
  }

  function renderActivityProgramGrid(entries=[]){
    if(!elements.activityProgramGrid)return;
    const current=entries.length?entries:[];
    elements.activityProgramGrid.replaceChildren();
    ["carriere","manege"].forEach(spaceSlug=>{
      const space=operations.spaces.find(item=>item.slug===spaceSlug);
      const card=document.createElement("article");
      card.className="hour-program-target activity-program-target";
      const title=document.createElement("h3");
      title.textContent=space?.label||spaceSlug;
      card.appendChild(title);
      ["liberte","longe"].forEach(activity=>{
        const group=document.createElement("section");
        group.className="activity-program-group";
        const heading=document.createElement("h4");
        heading.textContent=activity==="liberte"?"Liberté":"Longe";
        group.appendChild(heading);
        days.forEach((label,index)=>{
          const day=index+1;
          const row=current.find(item=>item.spaceSlug===spaceSlug&&Number(item.day)===day&&item.activity===activity)||baseActivityEntry(spaceSlug,day,activity);
          const line=document.createElement("div");
          line.className="activity-program-row";
          line.dataset.space=spaceSlug;
          line.dataset.day=String(day);
          line.dataset.activity=activity;
          line.innerHTML=`
            <strong>${label}</strong>
            <span>${activity==="liberte"?"Liberté":"Longe"}</span>
            <select data-field="enabled" aria-label="${activity} ${label}">
              <option value="non">NON</option>
              <option value="oui">OUI</option>
            </select>
            <input data-field="startsAt" type="time" value="${esc(row.startsAt)}" aria-label="Début ${activity} ${label}">
            <input data-field="endsAt" type="time" value="${esc(row.endsAt)}" aria-label="Fin ${activity} ${label}">
          `;
          line.querySelector('[data-field="enabled"]').value=row.enabled||"non";
          group.appendChild(line);
        });
        card.appendChild(group);
      });
      elements.activityProgramGrid.appendChild(card);
    });
  }

  function readActivityProgramEntries(){
    if(!elements.activityProgramGrid)return[];
    return[...elements.activityProgramGrid.querySelectorAll(".activity-program-row")].map(row=>{
      const value=field=>row.querySelector(`[data-field="${field}"]`)?.value||"";
      return{
        spaceSlug:row.dataset.space,
        day:Number(row.dataset.day),
        activity:row.dataset.activity,
        enabled:value("enabled")||"non",
        startsAt:value("startsAt"),
        endsAt:value("endsAt")
      };
    });
  }

  function resetActivityProgram(){
    if(!elements.activityProgramId)return;
    elements.activityProgramId.value="";
    elements.activityProgramName.value="";
    elements.activityProgramStart.value="";
    elements.activityProgramEnd.value="";
    elements.activityProgramEnabled.checked=false;
    elements.deleteActivityProgram.hidden=true;
    renderActivityProgramGrid();
    setStatus(elements.activityProgramStatus,"");
  }

  function editActivityProgram(program){
    elements.activityProgramId.value=program.id;
    elements.activityProgramName.value=program.name;
    elements.activityProgramStart.value=program.startsOn;
    elements.activityProgramEnd.value=program.endsOn||"";
    elements.activityProgramEnabled.checked=program.enabled==="oui";
    elements.deleteActivityProgram.hidden=false;
    renderActivityProgramGrid(program.entries||[]);
    setStatus(elements.activityProgramStatus,`Options #${program.id} chargées.`);
  }

  function renderActivityProgramsList(){
    if(!elements.activityProgramsList)return;
    elements.activityProgramsList.replaceChildren();
    const programs=operations.activityPrograms||[];
    if(!programs.length){
      const empty=document.createElement("p");
      empty.className="empty";
      empty.textContent="Aucune option programmée.";
      elements.activityProgramsList.appendChild(empty);
      return;
    }
    programs.forEach(program=>{
      const row=document.createElement("article");
      row.className="hour-program-item";
      const active=program.enabled==="oui"?"active":"inactive";
      row.innerHTML=`
        <div>
          <strong>${esc(program.name)}</strong>
          <p>Options · ${active} · à partir du ${esc(program.startsOn)}${program.endsOn?` · jusqu’au ${esc(program.endsOn)}`:""} · ${program.entries.length} ligne(s)</p>
        </div>
      `;
      const edit=document.createElement("button");
      edit.type="button";
      edit.className="secondary compact";
      edit.textContent="Modifier";
      edit.addEventListener("click",()=>editActivityProgram(program));
      row.appendChild(edit);
      elements.activityProgramsList.appendChild(row);
    });
  }

  function renderExceptions(){
    elements.exceptionsList.replaceChildren();
    if(!operations.exceptions.length){
      const empty=document.createElement("p");
      empty.className="empty";
      empty.textContent="Aucune exception enregistrée.";
      elements.exceptionsList.appendChild(empty);
      return;
    }
    operations.exceptions.forEach(item=>{
      const row=document.createElement("article");
      row.className="exception-item";
      const text=document.createElement("div");
      const title=document.createElement("strong");
      title.textContent=item.date;
      const message=document.createElement("p");
      message.textContent=item.message;
      text.append(title,message);
      const remove=document.createElement("button");
      remove.type="button";
      remove.className="danger compact";
      remove.textContent="Supprimer";
      remove.addEventListener("click",()=>deleteException(item));
      row.append(text,remove);
      elements.exceptionsList.appendChild(row);
    });
  }

  function renderHourExceptions(){
    if(!elements.hourExceptionsList)return;
    elements.hourExceptionsList.replaceChildren();
    const list=operations.hourExceptions||[];
    if(!list.length){
      const empty=document.createElement("p");
      empty.className="empty";
      empty.textContent="Aucune exception horaire enregistrée.";
      elements.hourExceptionsList.appendChild(empty);
      return;
    }
    list.forEach(item=>{
      const row=document.createElement("article");
      row.className="exception-item";
      const scopeLabel={general:"Écuries",work:"Travail",paddocks:"Paddock"}[item.scope]||item.scope;
      const targetLabel=hourExceptionTargets(item.scope).find(target=>target.slug===item.targetSlug)?.label||item.targetSlug;
      const statusLabel={ouvert:"Ouvert",ferme:"Fermé","hors-service":"Hors service"}[item.manualStatus]||item.manualStatus;
      const text=document.createElement("div");
      const title=document.createElement("strong");
      title.textContent=`${item.date} · ${scopeLabel} · ${targetLabel}`;
      const message=document.createElement("p");
      message.textContent=`${statusLabel} · ${item.opensAt}–${item.closesAt}`;
      text.append(title,message);
      const remove=document.createElement("button");
      remove.type="button";
      remove.className="danger compact";
      remove.textContent="Supprimer";
      remove.addEventListener("click",()=>deleteHourException(item));
      row.append(text,remove);
      elements.hourExceptionsList.appendChild(row);
    });
  }

  async function refreshOperations(){
    const config=settings();
    [operations,publicStatuses]=await Promise.all([
      api("/api/admin/operations"),
      fetch(config.base+"/api/statuses",{cache:"no-store"}).then(response=>response.json())
    ]);
    renderOperations();
  }

  async function refreshOperationsWithFeedback(message="Données actualisées."){
    setStatus(elements.spaceListStatus,"Actualisation…");
    try{
      await refreshOperations();
      setStatus(elements.spaceListStatus,message,"success");
    }catch(error){
      setStatus(elements.spaceListStatus,error.message,"error");
    }
  }

  async function deleteException(item){
    if(!window.confirm(`Supprimer l’exception du ${item.date} ?`))return;
    try{
      await api(`/api/admin/exceptions/${item.id}`,{method:"DELETE"});
      await refreshOperations();
      setStatus(elements.exceptionStatus,"Exception supprimée.","success");
    }catch(error){setStatus(elements.exceptionStatus,error.message,"error");}
  }

  async function deleteHourException(item){
    if(!window.confirm(`Supprimer l’exception horaire du ${item.date} ?`))return;
    try{
      await api(`/api/admin/hour-exceptions/${item.id}`,{method:"DELETE"});
      await refreshOperations();
      setStatus(elements.hourExceptionStatusMessage,"Exception horaire supprimée.","success");
    }catch(error){setStatus(elements.hourExceptionStatusMessage,error.message,"error");}
  }

  function render(){
    elements.list.replaceChildren();
    if(!alerts.length){
      const empty=document.createElement("p");
      empty.className="empty";
      empty.textContent="Aucune alerte enregistrée.";
      elements.list.appendChild(empty);
      return;
    }

    alerts.forEach(alert=>{
      const card=document.createElement("article");
      card.className="alert-item";
      const top=document.createElement("div");
      top.className="alert-top";
      const titleBox=document.createElement("div");
      const title=document.createElement("h3");
      title.textContent=alert.titre;
      const meta=document.createElement("p");
      meta.className="alert-meta";
      meta.textContent=`#${alert.id} · ${alert.date} à ${alert.heure}${alert.categorie?" · "+alert.categorie:""}`;
      titleBox.append(title,meta);
      top.appendChild(titleBox);

      const message=document.createElement("p");
      message.className="alert-message";
      message.textContent=NotificationFormat.toPlainText(alert.message);

      const badges=document.createElement("div");
      badges.className="badges";
      const schedule=alert.schedule;
      badges.append(
        badge(alert.active==="oui"?"Publiée":"Inactive",alert.active==="oui"?"active":"inactive"),
        badge(alert.epingle==="oui"?"Épinglée":"Non épinglée"),
        badge(alert.push_sent_at?"Push envoyé":alert.push_requested?"Push en attente (bêta)":"Sans push")
      );
      if(schedule){
        const label=schedule.status==="sent"?"Programmation envoyée":
          schedule.status==="failed"?"Programmation en échec":
          schedule.status==="cancelled"?"Programmation annulée":
          `Programmée ${formatScheduledAt(schedule.scheduledAt)}`;
        badges.append(badge(label,schedule.status==="failed"?"inactive":schedule.status==="sent"?"active":""));
      }

      const edit=document.createElement("button");
      edit.type="button";
      edit.textContent="Modifier";
      edit.addEventListener("click",()=>startEdit(alert));
      const remove=document.createElement("button");
      remove.type="button";
      remove.className="danger";
      remove.textContent="Supprimer";
      remove.addEventListener("click",()=>deleteAlert(alert));
      const actions=document.createElement("div");
      actions.className="alert-actions";
      actions.append(edit,remove);
      card.append(top,message,badges,actions);
      elements.list.appendChild(card);
    });
  }

  async function deleteAlert(alert){
    if(!window.confirm(`Supprimer définitivement l’alerte #${alert.id} « ${alert.titre} » ?`))return;
    setStatus(elements.connectionStatus,"Suppression…");
    try{
      await api(`/api/admin/notifications/${alert.id}`,{method:"DELETE"});
      if(String(elements.editingId.value)===String(alert.id))resetForm();
      await loadAlerts();
      setStatus(elements.connectionStatus,"Alerte supprimée.","success");
    }catch(error){
      setStatus(elements.connectionStatus,error.message,"error");
    }
  }

  function badge(text,className=""){
    const node=document.createElement("span");
    node.className="badge"+(className?" "+className:"");
    node.textContent=text;
    return node;
  }

  function startEdit(alert){
    elements.editingId.value=alert.id;
    elements.categorie.value=alert.categorie||"";
    elements.titre.value=alert.titre;
    elements.message.value=alert.message;
    elements.epingle.checked=alert.epingle==="oui";
    const scheduledAt=alert.schedule?.status!=="sent"&&alert.schedule?.status!=="cancelled"?alert.schedule?.scheduledAt:"";
    const local=scheduleToLocalFields(scheduledAt);
    elements.scheduledDate.value=local.date;
    elements.scheduledTime.value=local.time;
    elements.formTitle.textContent=`Modifier l’alerte #${alert.id}`;
    elements.cancel.hidden=false;
    elements.form.scrollIntoView({behavior:"smooth",block:"start"});
  }

  function resetForm(){
    elements.form.reset();
    elements.editingId.value="";
    elements.formTitle.textContent="Nouvelle alerte";
    elements.scheduledDate.value="";
    elements.scheduledTime.value="";
    elements.cancel.hidden=true;
    setStatus(elements.formStatus,"");
  }

  elements.form.addEventListener("submit",async event=>{
    event.preventDefault();
    const id=elements.editingId.value;
    const delivery=event.submitter?.value||"publish";
    const sendPush=delivery==="send";
    const scheduledAt=delivery==="schedule"?readScheduledAt():null;
    if(delivery==="schedule"&&!scheduledAt){
      setStatus(elements.formStatus,"Choisissez une date et une heure de programmation.","error");
      return;
    }
    const payload={
      categorie:elements.categorie.value,
      titre:elements.titre.value,
      message:elements.message.value,
      epingle:elements.epingle.checked,
      active:true,
      pushRequested:sendPush,
      scheduledAt
    };
    setStatus(elements.formStatus,"Enregistrement…");
    elements.publish.disabled=true;
    elements.send.disabled=true;
    elements.schedule.disabled=true;
    try{
      const result=await api(id?`/api/admin/notifications/${id}`:"/api/admin/notifications",{
        method:id?"PATCH":"POST",
        body:JSON.stringify(payload)
      });
      resetForm();
      const pushMessages={
        sent:"Alerte enregistrée et push envoyé.",
        "already-sent":"Alerte enregistrée. Le push avait déjà été envoyé.",
        "not-requested":"Alerte enregistrée sans push.",
        "disabled-in-production":"Alerte enregistrée. Le push bêta n’est pas encore activé.",
        scheduled:"Alerte programmée. Elle restera invisible jusqu’à l’heure prévue.",
        failed:`Alerte enregistrée, mais le push a échoué${result.push?.error?" : "+result.push.error:"."}`
      };
      const pushFailed=result.push?.status==="failed";
      setStatus(elements.formStatus,pushMessages[result.push?.status]||"Alerte enregistrée.",pushFailed?"error":"success");
      await loadAlerts();
    }catch(error){
      setStatus(elements.formStatus,error.message,"error");
    }finally{
      elements.publish.disabled=false;
      elements.send.disabled=false;
      elements.schedule.disabled=false;
    }
  });

  elements.connect.addEventListener("click",loadAll);
  elements.forgetToken.addEventListener("click",()=>{
    localStorage.removeItem("notifications_prod_admin_token");
    elements.token.value="";
    setStatus(elements.connectionStatus,"Jeton oublié sur cet appareil.","success");
  });
  elements.refresh.addEventListener("click",loadAlerts);
  elements.refreshSpaces.addEventListener("click",()=>refreshOperationsWithFeedback());
  elements.cancel.addEventListener("click",resetForm);

  function showSection(name){
    const sections={
      spaces:{title:"Espaces",subtitle:"Statuts et horaires propres aux espaces de la PWA."},
      notifications:{title:"Notifications",subtitle:"Publication des informations et envoi des notifications push."},
      general:{title:"Horaires",subtitle:"Horaires des écuries et exceptions de date."},
      "home-alert":{title:"Alertes",subtitle:"Bandeau d’information affiché sur l’accueil de la PWA."},
      settings:{title:"Paramètres",subtitle:"Connexion sécurisée au backend de la bêta."}
    };
    const selectedName=sections[name]?name:"spaces";
    document.body.classList.toggle("admin-section-spaces",selectedName==="spaces");
    document.querySelectorAll("[data-admin-section]").forEach(section=>{
      section.hidden=section.dataset.adminSection!==selectedName;
    });
    if(selectedName!=="spaces")closeSpaceEditor();
    elements.pageTitle.textContent=sections[selectedName].title;
    elements.pageSubtitle.textContent=sections[selectedName].subtitle;
    document.title=`${sections[selectedName].title} — Backstage bêta`;
    const url=new URL(window.location.href);
    url.searchParams.set("section",selectedName);
    history.replaceState(null,"",url);
  }

  showSection(new URLSearchParams(window.location.search).get("section")||"spaces");

  elements.spaceSelect.addEventListener("change",renderSelectedSpace);
  function closeSpaceEditor(){
    elements.spaceEditor.hidden=true;
    document.body.classList.remove("space-editor-open");
  }
  elements.closeSpaceEditor.addEventListener("click",closeSpaceEditor);
  elements.spaceEditor.addEventListener("click",event=>{
    if(event.target===elements.spaceEditor)closeSpaceEditor();
  });
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&!elements.spaceEditor.hidden)closeSpaceEditor();
  });
  elements.saveSpace.addEventListener("click",async()=>{
    const slug=elements.spaceSelect.value;
    const space=operations.spaces.find(item=>item.slug===slug);
    if(!space)return;
    setStatus(elements.spaceMessage,"Enregistrement…");
    try{
      await api(`/api/admin/spaces/${slug}`,{
        method:"PUT",
        body:JSON.stringify({
          manualStatus:space.manual_status,
          liberte:space.liberte,
          longe:space.longe,
          specialHours:elements.spaceSpecial.value,
          info:elements.spaceInfo.value
        })
      });
      await refreshOperations();
      elements.spaceSelect.value=slug;
      renderSelectedSpace();
      setStatus(elements.spaceMessage,"Informations enregistrées.","success");
    }catch(error){setStatus(elements.spaceMessage,error.message,"error");}
  });

  elements.saveSpaceSchedules.addEventListener("click",async()=>{
    const slug=elements.spaceSelect.value;
    setStatus(elements.spaceSchedulesStatus,"Enregistrement…");
    try{
      await api(`/api/admin/spaces/${slug}/schedules`,{
        method:"PUT",body:JSON.stringify({schedules:readScheduleInputs(elements.spaceSchedules)})
      });
      await refreshOperations();
      elements.spaceSelect.value=slug;
      renderSelectedSpace();
      setStatus(elements.spaceSchedulesStatus,"Horaires enregistrés.","success");
    }catch(error){setStatus(elements.spaceSchedulesStatus,error.message,"error");}
  });

  elements.saveGeneralSchedules.addEventListener("click",async()=>{
    setStatus(elements.generalSchedulesStatus,"Enregistrement…");
    try{
      await api("/api/admin/general-schedules",{
        method:"PUT",body:JSON.stringify({schedules:readScheduleInputs(elements.generalSchedules)})
      });
      await refreshOperations();
      setStatus(elements.generalSchedulesStatus,"Horaires des écuries enregistrés.","success");
    }catch(error){setStatus(elements.generalSchedulesStatus,error.message,"error");}
  });

  elements.saveException.addEventListener("click",async()=>{
    setStatus(elements.exceptionStatus,"Enregistrement…");
    try{
      await api("/api/admin/exceptions",{
        method:"POST",body:JSON.stringify({date:elements.exceptionDate.value,message:elements.exceptionMessage.value})
      });
      elements.exceptionMessage.value="";
      await refreshOperations();
      setStatus(elements.exceptionStatus,"Exception enregistrée.","success");
    }catch(error){setStatus(elements.exceptionStatus,error.message,"error");}
  });

  elements.hourExceptionScope?.addEventListener("change",renderHourExceptionTargets);
  elements.saveHourException?.addEventListener("click",async()=>{
    setStatus(elements.hourExceptionStatusMessage,"Enregistrement…");
    try{
      await api("/api/admin/hour-exceptions",{
        method:"POST",
        body:JSON.stringify({
          date:elements.hourExceptionDate.value,
          scope:elements.hourExceptionScope.value,
          targetSlug:elements.hourExceptionTarget.value,
          manualStatus:elements.hourExceptionStatusSelect.value,
          opensAt:elements.hourExceptionOpen.value,
          closesAt:elements.hourExceptionClose.value
        })
      });
      await refreshOperations();
      setStatus(elements.hourExceptionStatusMessage,"Exception horaire enregistrée.","success");
    }catch(error){setStatus(elements.hourExceptionStatusMessage,error.message,"error");}
  });

  document.querySelectorAll("[data-hour-program-scope]").forEach(button=>{
    button.addEventListener("click",()=>{
      if(elements.hourProgramId.value&&button.dataset.hourProgramScope!==hourProgramScope){
        setStatus(elements.hourProgramStatus,"Terminez ou annulez la modification en cours avant de changer d’onglet.","error");
        return;
      }
      rememberHourProgramDraft();
      hourProgramScope=button.dataset.hourProgramScope;
      document.querySelectorAll("[data-hour-program-scope]").forEach(item=>item.classList.toggle("selected",item===button));
      if(!elements.hourProgramId.value)elements.deleteHourProgram.hidden=true;
      renderHourProgramGrid(hourProgramDrafts.get(hourProgramScope)||[]);
    });
  });

  elements.resetHourProgram.addEventListener("click",resetHourProgram);
  elements.applyAllPaddockHours?.addEventListener("click",applyFirstPaddockProgramToAll);
  elements.applyHourProgramBulk?.addEventListener("click",applyBulkHourProgram);
  elements.refreshHourPrograms.addEventListener("click",async()=>{
    setStatus(elements.hourProgramStatus,"Actualisation…");
    try{
      await refreshOperations();
      setStatus(elements.hourProgramStatus,"Programmations actualisées.","success");
    }catch(error){setStatus(elements.hourProgramStatus,error.message,"error");}
  });
  elements.saveHourProgram.addEventListener("click",async()=>{
    const id=elements.hourProgramId.value;
    rememberHourProgramDraft();
    setStatus(elements.hourProgramStatus,"Enregistrement…");
    try{
      if(id){
        await api(`/api/admin/hour-programs/${id}`,{
          method:"PATCH",
          body:JSON.stringify({
            name:elements.hourProgramName.value,
            scope:hourProgramScope,
            startsOn:elements.hourProgramStart.value,
            endsOn:elements.hourProgramEnd.value,
            entries:hourProgramDrafts.get(hourProgramScope)||[]
          })
        });
      }else{
        const drafts=filledHourProgramDrafts();
        if(!drafts.length)throw new Error("Préparez au moins un onglet d’horaires.");
        for(const draft of drafts){
          await api("/api/admin/hour-programs",{
            method:"POST",
            body:JSON.stringify({
              name:elements.hourProgramName.value,
              scope:draft.scope,
              startsOn:elements.hourProgramStart.value,
              endsOn:elements.hourProgramEnd.value,
              entries:draft.entries
            })
          });
        }
      }
      await refreshOperations();
      resetHourProgram();
      setStatus(elements.hourProgramStatus,id?"Programmation enregistrée.":"Programmations enregistrées.","success");
    }catch(error){setStatus(elements.hourProgramStatus,error.message,"error");}
  });
  elements.deleteHourProgram.addEventListener("click",async()=>{
    const id=elements.hourProgramId.value;
    if(!id||!window.confirm("Supprimer cette programmation ?"))return;
    setStatus(elements.hourProgramStatus,"Suppression…");
    try{
      await api(`/api/admin/hour-programs/${id}`,{method:"DELETE"});
      await refreshOperations();
      resetHourProgram();
      setStatus(elements.hourProgramStatus,"Programmation supprimée.","success");
    }catch(error){setStatus(elements.hourProgramStatus,error.message,"error");}
  });

  elements.resetActivityProgram?.addEventListener("click",resetActivityProgram);
  elements.saveActivityProgram?.addEventListener("click",async()=>{
    const id=elements.activityProgramId.value;
    setStatus(elements.activityProgramStatus,"Enregistrement…");
    try{
      const payload={
        name:elements.activityProgramName.value,
        startsOn:elements.activityProgramStart.value,
        endsOn:elements.activityProgramEnd.value,
        enabled:elements.activityProgramEnabled.checked?"oui":"non",
        entries:readActivityProgramEntries()
      };
      if(id){
        await api(`/api/admin/activity-programs/${id}`,{method:"PATCH",body:JSON.stringify(payload)});
      }else{
        await api("/api/admin/activity-programs",{method:"POST",body:JSON.stringify(payload)});
      }
      await refreshOperations();
      resetActivityProgram();
      setStatus(elements.activityProgramStatus,id?"Options enregistrées.":"Options programmées.","success");
    }catch(error){setStatus(elements.activityProgramStatus,error.message,"error");}
  });
  elements.deleteActivityProgram?.addEventListener("click",async()=>{
    const id=elements.activityProgramId.value;
    if(!id||!window.confirm("Supprimer cette programmation d’activités ?"))return;
    setStatus(elements.activityProgramStatus,"Suppression…");
    try{
      await api(`/api/admin/activity-programs/${id}`,{method:"DELETE"});
      await refreshOperations();
      resetActivityProgram();
      setStatus(elements.activityProgramStatus,"Options supprimées.","success");
    }catch(error){setStatus(elements.activityProgramStatus,error.message,"error");}
  });

  elements.saveHomeAlert.addEventListener("click",async()=>{
    setStatus(elements.homeAlertStatus,"Enregistrement…");
    try{
      await api("/api/admin/home-alert",{
        method:"PUT",body:JSON.stringify({message:elements.homeAlertMessage.value,urgent:elements.homeAlertUrgent.checked})
      });
      await refreshOperations();
      setStatus(elements.homeAlertStatus,"Alerte d’accueil enregistrée.","success");
    }catch(error){setStatus(elements.homeAlertStatus,error.message,"error");}
  });

  document.querySelectorAll("[data-format]").forEach(button=>{
    button.addEventListener("click",()=>applyFormat(button.dataset.format));
  });

  window.addEventListener("pwa-data-changed",()=>{
    if(!elements.token.value)return;
    clearTimeout(liveRefreshTimer);
    liveRefreshTimer=setTimeout(()=>refreshOperationsWithFeedback("Mis à jour en direct."),150);
  });

  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="visible"&&elements.token.value){
      refreshOperationsWithFeedback("Données synchronisées.");
    }
  });

  function replaceSelection(before,after,placeholder){
    const start=elements.message.selectionStart;
    const end=elements.message.selectionEnd;
    const selected=elements.message.value.slice(start,end)||placeholder;
    elements.message.setRangeText(before+selected+after,start,end,"select");
    elements.message.focus();
  }

  function applyFormat(format){
    if(format==="bold")replaceSelection("**","**","texte en gras");
    if(format==="underline")replaceSelection("__","__","texte souligné");
    if(format==="link"){
      const start=elements.message.selectionStart;
      const end=elements.message.selectionEnd;
      const selected=elements.message.value.slice(start,end);
      const label=selected||window.prompt("Texte du lien :","Voir le lien");
      if(!label)return;
      let url=window.prompt("Adresse du lien :","https://");
      if(!url)return;
      url=url.trim();
      if(!/^https?:\/\//i.test(url))url="https://"+url;
      try{
        const parsed=new URL(url);
        if(!["http:","https:"].includes(parsed.protocol))throw new Error();
        elements.message.setRangeText(`[${label}](${parsed.href})`,start,end,"end");
        elements.message.focus();
      }catch(error){
        window.alert("Adresse de lien invalide.");
      }
    }
  }

  if(storedToken){
    loadAll();
  }else{
    showSection("settings");
  }
})();
