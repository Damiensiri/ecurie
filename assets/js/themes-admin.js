(function(){
  const themes=[
    {id:"summer",label:"Summer",colors:["#37b9ff","#7fd85c","#ffd25d"]},
    {id:"autumn",label:"Autumn",colors:["#d66a35","#f2b35f","#4b2d24"]},
    {id:"christmas",label:"Christmas",colors:["#0d4e88","#d33131","#f7f2d0"]},
    {id:"winter",label:"Winter",colors:["#2b7bb8","#d7edf8","#53618f"]},
    {id:"spring",label:"Spring",colors:["#88d96d","#f0ba72","#2c8fd1"]}
  ];
  const API=(localStorage.getItem("notifications_prod_api_url")||"https://ecurie-notifications-prod.damiensiri-pro.workers.dev").replace(/\/$/,"");
  const TOKEN=localStorage.getItem("notifications_prod_admin_token")||"";
  const choices=document.getElementById("themeChoices");
  const current=document.getElementById("currentTheme");
  const updated=document.getElementById("themeUpdatedAt");
  const status=document.getElementById("themeStatus");
  const refresh=document.getElementById("refreshTheme");
  const publish=document.getElementById("publishTheme");
  let selected="summer";

  function setStatus(message,type=""){
    status.textContent=message;
    status.className="theme-status"+(type?" "+type:"");
  }

  function label(theme){
    return themes.find(item=>item.id===theme)?.label||theme;
  }

  function formatDate(value){
    if(!value)return"";
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return"";
    return "Mis à jour le "+new Intl.DateTimeFormat("fr-FR",{dateStyle:"short",timeStyle:"short"}).format(date);
  }

  async function api(path,options={}){
    if(!TOKEN)throw new Error("Configurez le jeton Backstage dans Paramètres");
    const response=await fetch(API+path,{
      ...options,
      headers:{
        authorization:"Bearer "+TOKEN,
        ...(options.body?{"content-type":"application/json"}:{})
      },
      cache:"no-store"
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||`Erreur ${response.status}`);
    return data;
  }

  function renderChoices(){
    choices.replaceChildren(...themes.map(theme=>{
      const button=document.createElement("button");
      button.type="button";
      button.className="theme-choice";
      button.setAttribute("aria-pressed",String(theme.id===selected));
      button.innerHTML=`<span class="theme-swatch" style="background:linear-gradient(135deg,${theme.colors.join(",")})"></span><strong>${theme.label}</strong>`;
      button.addEventListener("click",()=>{
        selected=theme.id;
        renderChoices();
      });
      return button;
    }));
  }

  async function load(){
    try{
      setStatus("Lecture du thème publié…");
      const data=await api("/api/admin/theme");
      selected=data.theme||selected;
      current.textContent=label(selected);
      updated.textContent=formatDate(data.updatedAt);
      renderChoices();
      setStatus("Thème chargé.","success");
    }catch(error){
      renderChoices();
      setStatus(error.message,"error");
    }
  }

  async function save(){
    try{
      publish.disabled=true;
      setStatus("Publication du thème "+label(selected)+"…");
      const data=await api("/api/admin/theme",{method:"POST",body:JSON.stringify({theme:selected})});
      selected=data.theme||selected;
      current.textContent=label(selected);
      updated.textContent=formatDate(data.updatedAt);
      renderChoices();
      setStatus("Thème publié. Les appareils le récupéreront à l’ouverture ou au retour dans l’app.","success");
    }catch(error){
      setStatus(error.message,"error");
    }finally{
      publish.disabled=false;
    }
  }

  refresh.addEventListener("click",load);
  publish.addEventListener("click",save);
  renderChoices();
  load();
})();
