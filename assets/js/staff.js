(()=>{
"use strict";
const API=(localStorage.getItem("notifications_prod_api_url")||"https://ecurie-notifications-prod.damiensiri-pro.workers.dev").replace(/\/$/,"");
const TOKEN=localStorage.getItem("notifications_prod_admin_token")||"";
const TYPES={work:"Travail",cfa:"CFA",rest:"Repos",leave:"Congés",sick:"Arrêt maladie",absence:"Absence"};
const $=id=>document.getElementById(id);
let state={employees:[],shifts:[],range:null,month:"",google:{configured:false,connected:false,events:[],visible:true}};
const undoStack=[];
let undoing=false;

function esc(value){return String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]))}
function setStatus(message,type=""){$("staffStatus").textContent=message;$("staffStatus").className="staff-status "+type}
async function api(path,options={}){
  if(!TOKEN)throw Error("Configurez le jeton dans Paramètres");
  const response=await fetch(API+path,{...options,headers:{authorization:"Bearer "+TOKEN,...(options.body?{"content-type":"application/json"}:{})},cache:"no-store"});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||`Erreur ${response.status}`);
  return data;
}
function iso(date){return date.toISOString().slice(0,10)}
function parseDate(value){return new Date(value+"T12:00:00Z")}
function addDays(value,count){const date=parseDate(value);date.setUTCDate(date.getUTCDate()+count);return iso(date)}
function currentMonth(){const date=new Date();return`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`}
function monthLabel(month){return new Intl.DateTimeFormat("fr-FR",{month:"long",year:"numeric",timeZone:"UTC"}).format(parseDate(month+"-01"))}
function dateLabel(value){return new Intl.DateTimeFormat("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(parseDate(value))}
function rowDate(value){return new Intl.DateTimeFormat("fr-FR",{weekday:"short",day:"2-digit",month:"2-digit",timeZone:"UTC"}).format(parseDate(value)).replace(".","")}
function shortDate(value){return new Intl.DateTimeFormat("fr-FR",{day:"2-digit",month:"2-digit",timeZone:"UTC"}).format(parseDate(value))}
function minutes(start,end){if(!start||!end)return 0;const [sh,sm]=start.split(":").map(Number),[eh,em]=end.split(":").map(Number);return Math.max(0,eh*60+em-sh*60-sm)}
function shiftMinutes(shift){
  if(shift?.status==="cfa")return 420;
  return shift?.status==="work"?minutes(shift.morningStart,shift.morningEnd)+minutes(shift.afternoonStart,shift.afternoonEnd):0;
}
function duration(value){const total=Math.max(0,Number(value)||0);return`${Math.floor(total/60)}h${String(total%60).padStart(2,"0")}`}
function shiftKey(employeeId,date){return`${employeeId}:${date}`}
function shiftMap(){return new Map(state.shifts.map(shift=>[shiftKey(shift.employeeId,shift.date),shift]))}
function shiftSnapshot(shift,employeeId=shift?.employeeId,date=shift?.date){
  if(!shift)return null;
  return{employeeId:Number(employeeId),date,status:shift.status||"rest",
    morningStart:shift.morningStart||"",morningEnd:shift.morningEnd||"",
    afternoonStart:shift.afternoonStart||"",afternoonEnd:shift.afternoonEnd||"",note:shift.note||""};
}
function sameShift(left,right){return JSON.stringify(left)===JSON.stringify(right)}
function rememberChange(employeeId,date,before,after){
  undoStack.push({employeeId,date,before:shiftSnapshot(before,employeeId,date),after:shiftSnapshot(after,employeeId,date)});
  if(undoStack.length>30)undoStack.shift();
}
async function undoLastChange(){
  if(undoing)return;
  const change=undoStack.at(-1);
  if(!change){setStatus("Aucune modification à annuler.","error");return}
  undoing=true;
  try{
    const planning=await api("/api/admin/staff-planning?month="+encodeURIComponent(change.date.slice(0,7)));
    const current=planning.shifts.find(item=>item.employeeId===change.employeeId&&item.date===change.date);
    if(!sameShift(shiftSnapshot(current,change.employeeId,change.date),change.after)){
      setStatus("Annulation impossible : cette journée a été modifiée depuis.","error");return;
    }
    if(change.before){
      await api("/api/admin/staff-planning/shifts",{method:"PUT",body:JSON.stringify(change.before)});
    }else{
      await api(`/api/admin/staff-planning/shifts/${change.employeeId}/${change.date}`,{method:"DELETE"});
    }
    undoStack.pop();
    await load(true);
    setStatus("Dernière modification annulée.","success");
  }catch(error){setStatus(error.message,"error")}
  finally{undoing=false}
}
function isoWeek(value){
  const date=parseDate(value);const day=(date.getUTCDay()+6)%7;date.setUTCDate(date.getUTCDate()-day+3);
  const firstThursday=new Date(Date.UTC(date.getUTCFullYear(),0,4));const firstDay=(firstThursday.getUTCDay()+6)%7;
  firstThursday.setUTCDate(firstThursday.getUTCDate()-firstDay+3);
  return 1+Math.round((date-firstThursday)/604800000);
}
function weeks(){
  if(!state.range)return[];
  const result=[];let cursor=state.range.start;
  while(cursor<=state.range.end){result.push(Array.from({length:7},(_,index)=>addDays(cursor,index)));cursor=addDays(cursor,7)}
  return result;
}
function monthDates(){
  const first=state.month+"-01";const date=parseDate(first);date.setUTCMonth(date.getUTCMonth()+1);date.setUTCDate(0);
  return Array.from({length:date.getUTCDate()},(_,index)=>`${state.month}-${String(index+1).padStart(2,"0")}`);
}
function displayHour(value){return String(value||"").replace(":","h")}
function workText(shift){
  if(!shift)return'<span class="rest-label">Repos</span>';
  if(shift.status!=="work")return esc(TYPES[shift.status]||shift.status);
  const lines=[];
  if(shift.morningStart&&shift.morningEnd)lines.push(`${displayHour(shift.morningStart)}-${displayHour(shift.morningEnd)}`);
  if(shift.afternoonStart&&shift.afternoonEnd)lines.push(`${displayHour(shift.afternoonStart)}-${displayHour(shift.afternoonEnd)}`);
  return lines.join("<br>")||"Travail";
}
function directText(shift){
  if(!shift)return"";
  if(shift.status!=="work")return TYPES[shift.status]||shift.status;
  const ranges=[];
  if(shift.morningStart&&shift.morningEnd)ranges.push(`${shift.morningStart.replace(":","h")}-${shift.morningEnd.replace(":","h")}`);
  if(shift.afternoonStart&&shift.afternoonEnd)ranges.push(`${shift.afternoonStart.replace(":","h")}-${shift.afternoonEnd.replace(":","h")}`);
  return ranges.join(" / ");
}
function normalizeWord(value){return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim()}
function parseDirectEntry(value,employeeId,date,currentShift=null){
  const text=String(value||"").trim();const normalized=normalizeWord(text);
  if(!text)return{empty:true};
  if(normalized==="del")return{empty:true};
  if(normalized==="amdel"||normalized==="pmdel"){
    if(currentShift?.status!=="work")return{empty:true};
    const payload={employeeId,date,status:"work",morningStart:currentShift.morningStart||"",morningEnd:currentShift.morningEnd||"",
      afternoonStart:currentShift.afternoonStart||"",afternoonEnd:currentShift.afternoonEnd||"",note:currentShift.note||""};
    if(normalized==="amdel"){payload.morningStart="";payload.morningEnd=""}
    else{payload.afternoonStart="";payload.afternoonEnd=""}
    if(!payload.morningStart&&!payload.afternoonStart)return{empty:true};
    return payload;
  }
  if(["repos","repo"].includes(normalized))return{employeeId,date,status:"rest"};
  if(normalized==="cfa")return{employeeId,date,status:"cfa"};
  if(["conge","conges"].includes(normalized))return{employeeId,date,status:"leave"};
  if(normalized==="at"||normalized.includes("arret")||normalized.includes("maladie"))return{employeeId,date,status:"sick"};
  if(normalized.includes("absence"))return{employeeId,date,status:"absence"};
  const clockText=text.replace(/\b(\d{1,2})[.,](\d{2})\b/g,"$1$2");
  const compact=[...clockText.matchAll(/\b(\d{3,4})\s*[.,\s]\s*(\d{3,4})\b/g)];
  const written=[...clockText.matchAll(/(\d{1,2})(?:\s*[:hH]\s*(\d{1,2}))?\s*[-–—]\s*(\d{1,2})(?:\s*[:hH]\s*(\d{1,2}))?/g)];
  const rawRanges=compact.length?compact.map(match=>{
    const from=match[1].padStart(4,"0"),to=match[2].padStart(4,"0");
    return[from.slice(0,2),from.slice(2),to.slice(0,2),to.slice(2)];
  }):written.map(match=>[match[1],match[2]||"0",match[3],match[4]||"0"]);
  if(!rawRanges.length||rawRanges.length>2)return{error:"Écrivez 0700,1200/1300,1700, CFA, Congés ou Arrêt maladie"};
  const ranges=rawRanges.map(parts=>{
    const start=`${String(Number(parts[0])).padStart(2,"0")}:${String(Number(parts[1])).padStart(2,"0")}`;
    const end=`${String(Number(parts[2])).padStart(2,"0")}:${String(Number(parts[3])).padStart(2,"0")}`;
    if(Number(parts[0])>23||Number(parts[2])>23||Number(parts[1])>59||Number(parts[3])>59||minutes(start,end)<=0)return null;
    return{start,end};
  });
  if(ranges.includes(null))return{error:"Les horaires saisis ne sont pas cohérents"};
  const payload={employeeId,date,status:"work",morningStart:"",morningEnd:"",afternoonStart:"",afternoonEnd:"",note:""};
  if(ranges.length===1&&Number(ranges[0].start.slice(0,2))>=13){
    payload.afternoonStart=ranges[0].start;payload.afternoonEnd=ranges[0].end;
    if(currentShift?.status==="work"){
      payload.morningStart=currentShift.morningStart||"";payload.morningEnd=currentShift.morningEnd||"";
    }
  }else{
    payload.morningStart=ranges[0].start;payload.morningEnd=ranges[0].end;
    if(ranges[1]){payload.afternoonStart=ranges[1].start;payload.afternoonEnd=ranges[1].end}
    else if(currentShift?.status==="work"){
      payload.afternoonStart=currentShift.afternoonStart||"";payload.afternoonEnd=currentShift.afternoonEnd||"";
    }
  }
  return payload;
}
function weekEmployeeTotal(employeeId,monday){
  const end=addDays(monday,6);
  return state.shifts.filter(shift=>shift.employeeId===employeeId&&shift.date>=monday&&shift.date<=end)
    .reduce((sum,shift)=>sum+shiftMinutes(shift),0);
}
function googleEventsByDate(){
  const result=new Map();
  for(const event of state.google.events||[]){
    let cursor=String(event.start||event.date||"").slice(0,10);
    let last=String(event.end||cursor).slice(0,10);
    if(event.allDay&&last>cursor)last=addDays(last,-1);
    let guard=0;
    while(cursor&&cursor<=last&&guard++<40){
      if(cursor.startsWith(state.month)){
        if(!result.has(cursor))result.set(cursor,[]);
        result.get(cursor).push(event);
      }
      cursor=addDays(cursor,1);
    }
  }
  return result;
}
function googleTime(event){
  if(event.allDay)return"Journée";
  const options={hour:"2-digit",minute:"2-digit",timeZone:"Europe/Paris",hourCycle:"h23"};
  const start=new Intl.DateTimeFormat("fr-FR",options).format(new Date(event.start));
  const end=new Intl.DateTimeFormat("fr-FR",options).format(new Date(event.end));
  return`${start}–${end}`;
}
function calendarColor(event){
  return/^#[0-9a-f]{6}$/i.test(event.calendarColor||"")?event.calendarColor:"#6FA6FF";
}
function googleEventHtml(event,extraClass=""){
  return`<div class="google-event ${extraClass}" style="--calendar-color:${calendarColor(event)}" title="${esc(event.calendarName||"Calendrier")}">
    <strong>${esc(googleTime(event))}</strong><span>${esc(event.title)}</span>${event.location?`<small>${esc(event.location)}</small>`:""}
  </div>`;
}
function dayDistance(from,to){return Math.round((parseDate(to)-parseDate(from))/86400000)}
function googleWeekHtml(days){
  const first=days[0],last=days[6];
  const events=(state.google.events||[]).filter(event=>{
    const start=String(event.start||event.date||"").slice(0,10);
    let end=String(event.end||start).slice(0,10);
    if(event.allDay&&end>start)end=addDays(end,-1);
    return start<=last&&end>=first;
  });
  if(!events.length)return'<span class="google-empty">—</span>';
  const occupied=[];
  const items=events.map(event=>{
    const eventStart=String(event.start||event.date||"").slice(0,10);
    let eventEnd=String(event.end||eventStart).slice(0,10);
    if(event.allDay&&eventEnd>eventStart)eventEnd=addDays(eventEnd,-1);
    const start=eventStart<first?first:eventStart;
    const end=eventEnd>last?last:eventEnd;
    const column=dayDistance(first,start)+1;
    const span=Math.max(1,dayDistance(start,end)+1);
    let row=0;
    while(occupied[row]?.some(day=>day>=column&&day<column+span))row++;
    if(!occupied[row])occupied[row]=[];
    for(let day=column;day<column+span;day++)occupied[row].push(day);
    return{event,eventStart,eventEnd,column,span,row:row+1};
  });
  return`<div class="google-week-grid">${items.map(({event,eventStart,eventEnd,column,span,row})=>
    `<div class="google-event google-week-event" style="--calendar-color:${calendarColor(event)};grid-column:${column}/span ${span};grid-row:${row}"
      title="${esc(event.calendarName||"Calendrier")}"><strong>${span>1?`${shortDate(eventStart)} → ${shortDate(eventEnd)}`:esc(googleTime(event))}</strong>
      <span>${esc(event.title)}</span>${event.location?`<small>${esc(event.location)}</small>`:""}</div>`).join("")}</div>`;
}
function renderGooglePanel(){
  const google=state.google;
  $("googleConfiguredMessage").hidden=google.configured;
  $("googleConnected").hidden=!google.connected;
  $("googleCalendarName").textContent=google.calendarName||"Calendrier Damien Siri";
  $("googleEventCount").textContent=`${google.events?.length||0} événement(s) ce mois`;
  $("googleToggle").checked=google.visible;
}
async function loadGoogleCalendar(force=false){
  const visible=state.google.visible;
  try{
    const status=await api("/api/admin/google-calendar/status");
    state.google={...status,events:[],visible};
    if(status.connected){
      const events=await api("/api/admin/google-calendar/events?month="+encodeURIComponent(state.month)+
        (force?"&refresh=1&_="+Date.now():""));
      state.google={...state.google,...events,visible};
    }
  }catch(error){
    state.google={...state.google,events:[],visible,error:error.message};
    setStatus(error.message,"error");
    if(force)throw error;
  }
  renderGooglePanel();
}
function renderEmployees(){
  $("employeeList").innerHTML=state.employees.map(employee=>`<div class="employee-chip" style="--employee-color:${employee.color}">
    <span class="employee-dot"></span>
    <button class="employee-edit" type="button" data-edit-employee="${employee.id}">${esc(employee.name)}</button>
    <button class="employee-delete" type="button" data-delete-employee="${employee.id}" aria-label="Supprimer ${esc(employee.name)}">×</button>
  </div>`).join("");
  document.querySelectorAll("[data-edit-employee]").forEach(button=>button.onclick=()=>editEmployee(Number(button.dataset.editEmployee)));
  document.querySelectorAll("[data-delete-employee]").forEach(button=>button.onclick=()=>deleteEmployee(Number(button.dataset.deleteEmployee)));
  const selected=$("printEmployee").value;
  $("printEmployee").innerHTML='<option value="">Tous les salariés</option>'+state.employees.map(employee=>
    `<option value="${employee.id}">${esc(employee.name)}</option>`).join("");
  if([...$("printEmployee").options].some(option=>option.value===selected))$("printEmployee").value=selected;
}
function renderCopyControls(){
  const options=weeks().map(days=>`<option value="${days[0]}">Semaine ${isoWeek(days[0])} · ${shortDate(days[0])}</option>`).join("");
  $("copySourceWeek").innerHTML=options;$("copyTargetWeek").innerHTML=options;
  if(weeks().length>1)$("copyTargetWeek").selectedIndex=1;
  if(!$("copySourceMonth").value)$("copySourceMonth").value=state.month;
  if(!$("copyTargetMonth").value){
    const next=parseDate(state.month+"-01");next.setUTCMonth(next.getUTCMonth()+1);
    $("copyTargetMonth").value=iso(next).slice(0,7);
  }
}
function renderMonth(){
  const map=shiftMap();const today=new Date().toISOString().slice(0,10);const dates=monthDates();
  const googleMap=googleEventsByDate();const showGoogle=state.google.connected&&state.google.visible;
  let rows="";let currentWeek="";
  dates.forEach((date,index)=>{
    const monday=addDays(date,-((parseDate(date).getUTCDay()+6)%7));
    if(monday!==currentWeek){
      currentWeek=monday;
      rows+=`<tr class="week-divider"><th colspan="${state.employees.length+1}">Semaine ${isoWeek(date)} · ${shortDate(monday)} au ${shortDate(addDays(monday,6))}</th></tr>`;
    }
    const googleEvents=showGoogle?(googleMap.get(date)||[]):[];
    const cells=state.employees.map(employee=>{
      const shift=map.get(shiftKey(employee.id,date));const total=shiftMinutes(shift);
      return`<td class="month-cell status-${shift?.status||"empty"}${date===today?" today":""}" data-employee="${employee.id}" data-date="${date}">
        <button class="cell-details" type="button" data-details-employee="${employee.id}" data-details-date="${date}" aria-label="Ouvrir les détails">•••</button>
        <span class="day-main">${workText(shift)}</span>${total?`<span class="day-total">${duration(total)}</span>`:""}
        ${shift?.note?`<span class="day-note">${esc(shift.note)}</span>`:""}
        ${googleEvents.length?`<div class="cell-google-events">${googleEvents.map(event=>googleEventHtml(event)).join("")}</div>`:""}
      </td>`;
    }).join("");
    rows+=`<tr><th class="date-cell">${rowDate(date)}</th>${cells}</tr>`;
    const nextDate=dates[index+1];const nextMonday=nextDate?addDays(nextDate,-((parseDate(nextDate).getUTCDay()+6)%7)):"";
    if(!nextDate||nextMonday!==monday){
      const totals=state.employees.map(employee=>`<td>${duration(weekEmployeeTotal(employee.id,monday))}</td>`).join("");
      rows+=`<tr class="weekly-total"><th>Total semaine ${isoWeek(monday)}</th>${totals}</tr>`;
    }
  });
  $("staffMonthGrid").innerHTML=`<article class="month-card"><div class="month-scroll">
    <table class="month-table" style="min-width:${Math.max(760,190+state.employees.length*180)}px">
      <thead><tr><th>Date</th>${state.employees.map(employee=>`<th style="--employee-color:${employee.color}">${esc(employee.name)}</th>`).join("")}</tr></thead>
      <tbody>${rows}</tbody>
    </table></div></article>`;
  document.querySelectorAll(".month-cell").forEach(cell=>cell.onclick=event=>{if(!event.target.closest(".cell-details"))beginInlineEdit(cell)});
  document.querySelectorAll(".cell-details").forEach(button=>button.onclick=event=>{event.stopPropagation();openShift(Number(button.dataset.detailsEmployee),button.dataset.detailsDate)});
  renderOverview(map,today);renderEmployees();renderCopyControls();
}
function renderOverview(map,today){
  const googleMap=googleEventsByDate();
  const showGoogle=state.google.visible&&(state.google.configured||state.google.connected||state.google.events.length>0);
  $("staffOverviewGrid").innerHTML=weeks().map(days=>{
    const monday=days[0];
    const head=days.map(date=>`<th class="${date.startsWith(state.month)?"":"outside-month"}">${rowDate(date)}</th>`).join("");
    const rows=state.employees.map(employee=>{
      const cells=days.map(date=>{
        const shift=map.get(shiftKey(employee.id,date));const total=shiftMinutes(shift);
        return`<td class="day-cell overview-cell status-${shift?.status||"empty"}${date===today?" today":""}${date.startsWith(state.month)?"":" outside-month"}"
          data-employee="${employee.id}" data-date="${date}">
          <button class="cell-details overview-details" type="button" data-details-employee="${employee.id}" data-details-date="${date}" aria-label="Ouvrir les détails">•••</button>
          <span class="day-main">${workText(shift)}</span>${total?`<span class="day-total">${duration(total)}</span>`:""}
          ${shift?.note?`<span class="day-note">${esc(shift.note)}</span>`:""}
        </td>`;
      }).join("");
      return`<tr data-overview-employee="${employee.id}"><td class="employee-name" style="--employee-color:${employee.color}">${esc(employee.name)}</td>${cells}
        <td class="week-total">${duration(weekEmployeeTotal(employee.id,monday))}</td></tr>`;
    }).join("");
    const calendarRow=showGoogle?`<tr class="google-overview-row"><td class="employee-name google-overview-name">📅 Agendas Google</td>
      <td class="google-events google-week-events" colspan="7">${googleWeekHtml(days)}</td><td class="week-total">—</td></tr>`:"";
    return`<article class="week-card"><header class="week-heading"><h2>Semaine ${isoWeek(monday)}</h2>
      <span>${shortDate(monday)} au ${shortDate(days[6])}</span></header><div class="week-scroll">
      <table class="week-table"><thead><tr><th>Salarié</th>${head}<th>Total</th></tr></thead>
      <tbody>${calendarRow}${rows}</tbody>
      </table></div></article>`;
  }).join("");
  document.querySelectorAll(".overview-cell").forEach(cell=>cell.onclick=event=>{
    if(!event.target.closest(".cell-details"))beginInlineEdit(cell);
  });
  document.querySelectorAll(".overview-details").forEach(button=>button.onclick=event=>{
    event.stopPropagation();openShift(Number(button.dataset.detailsEmployee),button.dataset.detailsDate);
  });
}
function beginInlineEdit(cell){
  if(cell.querySelector(".inline-entry"))return;
  const employeeId=Number(cell.dataset.employee),date=cell.dataset.date;
  const shift=state.shifts.find(item=>item.employeeId===employeeId&&item.date===date);
  const input=document.createElement("input");input.className="inline-entry";input.type="text";
  const progressive=shift?.status==="work";
  input.value=progressive?"":directText(shift);
  input.placeholder=progressive?"Horaire, AMDEL, PMDEL ou DEL":"0700,1200/1300,1700";
  cell.innerHTML="";cell.append(input);input.focus();if(!progressive)input.select();
  let saving=false;
  let moveAfterSave=0;
  const save=async()=>{
    if(saving)return;saving=true;
    if(progressive&&!input.value.trim()){renderMonth();return}
    const payload=parseDirectEntry(input.value,employeeId,date,shift);
    if(payload.error){saving=false;setStatus(payload.error,"error");input.focus();input.select();return}
    if(!payload.empty)payload.note=shift?.note||"";
    try{
      if(payload.empty){
        if(shift)await api(`/api/admin/staff-planning/shifts/${employeeId}/${date}`,{method:"DELETE"});
      }else await api("/api/admin/staff-planning/shifts",{method:"PUT",body:JSON.stringify(payload)});
      if(shift||!payload.empty)rememberChange(employeeId,date,shift,payload.empty?null:payload);
      await load(true);setStatus(payload.empty?"Journée en repos.":"Case enregistrée.","success");
      if(moveAfterSave){
        const nextDate=addDays(date,moveAfterSave);
        const cellSelector=cell.classList.contains("overview-cell")?".overview-cell":".month-cell";
        const nextCell=document.querySelector(`${cellSelector}[data-employee="${employeeId}"][data-date="${nextDate}"]`);
        if(nextCell)beginInlineEdit(nextCell);
      }
    }catch(error){saving=false;setStatus(error.message,"error");renderMonth()}
  };
  input.onkeydown=event=>{
    if(event.key==="Enter"){event.preventDefault();moveAfterSave=event.shiftKey?-1:1;void save()}
    if(event.key==="Escape"){event.preventDefault();renderMonth()}
  };
  input.onblur=save;
}
async function load(silent=false){
  if(!silent)setStatus("Chargement…");
  try{const planning=await api("/api/admin/staff-planning?month="+encodeURIComponent($("staffMonth").value));
    state={...state,...planning};await loadGoogleCalendar();renderMonth();if(!silent&&!state.google.error)setStatus("Planning actualisé.","success")}
  catch(error){setStatus(error.message,"error")}
}
function updateTotal(){
  const status=$("shiftType").value;const total=status==="cfa"?420:status==="work"?
    minutes($("morningStart").value,$("morningEnd").value)+minutes($("afternoonStart").value,$("afternoonEnd").value):0;
  $("shiftHours").hidden=status!=="work";
  $("shiftRange").hidden=!["leave","sick"].includes(status);
  $("shiftTotal").textContent=duration(total);
}
function openShift(employeeId,date){
  const employee=state.employees.find(item=>item.id===employeeId);const shift=state.shifts.find(item=>item.employeeId===employeeId&&item.date===date);
  $("shiftEmployeeId").value=employeeId;$("shiftIsoDate").value=date;$("shiftEmployee").textContent=employee?.name||"";
  $("shiftDate").textContent=dateLabel(date);$("shiftType").value=shift?.status||"work";
  $("shiftRangeStart").value=date;$("shiftRangeEnd").value=date;
  $("morningStart").value=shift?.morningStart||"";$("morningEnd").value=shift?.morningEnd||"";
  $("afternoonStart").value=shift?.afternoonStart||"";$("afternoonEnd").value=shift?.afternoonEnd||"";
  $("shiftNote").value=shift?.note||"";$("deleteShift").hidden=!shift;updateTotal();$("shiftDialog").showModal();
}
async function editEmployee(id){
  const employee=state.employees.find(item=>item.id===id);if(!employee)return;
  const name=prompt("Nom du salarié",employee.name);if(name===null)return;
  const color=prompt("Couleur au format #RRGGBB",employee.color);if(color===null)return;
  try{await api("/api/admin/staff-planning/employees/"+id,{method:"PATCH",body:JSON.stringify({name,color})});await load(true);setStatus("Salarié modifié.","success")}
  catch(error){setStatus(error.message,"error")}
}
async function deleteEmployee(id){
  const employee=state.employees.find(item=>item.id===id);if(!employee)return;
  if(!confirm(`Supprimer définitivement ${employee.name} et toutes ses heures ?`))return;
  try{await api("/api/admin/staff-planning/employees/"+id,{method:"DELETE"});await load(true);setStatus("Salarié supprimé.","success")}
  catch(error){setStatus(error.message,"error")}
}
function selectSection(section){
  $("planningSection").hidden=section!=="planning";
  $("settingsSection").hidden=section!=="settings";
  document.querySelectorAll("[data-section]").forEach(button=>button.classList.toggle("active",button.dataset.section===section));
}
function selectView(view){
  $("staffMonthGrid").hidden=view!=="entry";
  $("staffOverviewGrid").hidden=view!=="overview";
  document.querySelectorAll("[data-view]").forEach(button=>button.classList.toggle("active",button.dataset.view===view));
  localStorage.setItem("staff_prod_view",view);
}

function plainWorkText(shift){
  if(!shift||shift.status==="rest")return"Repos";
  if(shift.status!=="work")return TYPES[shift.status]||shift.status;
  const lines=[];
  if(shift.morningStart&&shift.morningEnd)lines.push(`${displayHour(shift.morningStart)}-${displayHour(shift.morningEnd)}`);
  if(shift.afternoonStart&&shift.afternoonEnd)lines.push(`${displayHour(shift.afternoonStart)}-${displayHour(shift.afternoonEnd)}`);
  if(shift.note)lines.push(shift.note);
  return lines.join("\n")||"Repos";
}

async function shareStaffPdf(employeeId){
  const JsPdf=window.jspdf?.jsPDF;
  if(!JsPdf)throw Error("Le générateur PDF n’a pas pu être chargé. Vérifiez la connexion puis réessayez.");

  const employee=state.employees.find(item=>String(item.id)===employeeId);
  const selected=employee?[employee]:state.employees;
  const shifts=shiftMap();
  const documentPdf=new JsPdf({orientation:"portrait",unit:"mm",format:"a4"});
  const pageWidth=documentPdf.internal.pageSize.getWidth();
  let cursorY=12;

  documentPdf.setFont("helvetica","bold");
  documentPdf.setFontSize(14);
  documentPdf.text("Planning salariés",10,cursorY);
  documentPdf.setFont("helvetica","normal");
  documentPdf.setFontSize(8);
  documentPdf.text(`${monthLabel(state.month)} · ${employee?.name||"Toute l’équipe"}`,10,cursorY+5);
  cursorY+=10;

  weeks().forEach((dates,weekIndex)=>{
    if(cursorY>254){documentPdf.addPage();cursorY=12}
    documentPdf.setFont("helvetica","bold");
    documentPdf.setFontSize(8);
    documentPdf.text(`Semaine ${isoWeek(dates[0])}`,10,cursorY);
    cursorY+=2;

    const rowStatuses=[];
    const body=selected.map(item=>{
      rowStatuses.push(dates.map(date=>shifts.get(shiftKey(item.id,date))?.status||"rest"));
      const cells=dates.map(date=>plainWorkText(shifts.get(shiftKey(item.id,date))));
      const total=dates.reduce((sum,date)=>sum+shiftMinutes(shifts.get(shiftKey(item.id,date))),0);
      return[item.name,...cells,duration(total)];
    });

    documentPdf.autoTable({
      startY:cursorY,
      margin:{left:10,right:10},
      tableWidth:pageWidth-20,
      head:[["Salarié",...dates.map(rowDate),"Total"]],
      body,
      theme:"grid",
      styles:{font:"helvetica",fontSize:5.2,cellPadding:.8,valign:"middle",lineColor:[130,140,150],lineWidth:.15,textColor:[20,25,30]},
      headStyles:{fillColor:[220,231,241],textColor:[0,0,0],fontStyle:"bold"},
      columnStyles:{0:{cellWidth:23,fontStyle:"bold"},8:{cellWidth:14,fontStyle:"bold",halign:"center"}},
      didParseCell(data){
        if(data.section!=="body"||data.column.index<1||data.column.index>7)return;
        const status=rowStatuses[data.row.index]?.[data.column.index-1]||"rest";
        const colors={
          rest:[232,234,237],
          leave:[220,234,255],
          sick:[255,223,226],
          absence:[247,231,207],
          cfa:[217,243,245]
        };
        if(colors[status])data.cell.styles.fillColor=colors[status];
      }
    });
    cursorY=documentPdf.lastAutoTable.finalY+6;
    if(weekIndex<weeks().length-1&&cursorY>265){documentPdf.addPage();cursorY=12}
  });

  const safeName=(employee?.name||"equipe").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase();
  const filename=`planning-${state.month}-${safeName||"equipe"}.pdf`;
  const blob=documentPdf.output("blob");
  const file=new File([blob],filename,{type:"application/pdf"});

  if(navigator.share&&navigator.canShare?.({files:[file]})){
    await navigator.share({files:[file],title:`Planning ${monthLabel(state.month)}`});
    return;
  }
  documentPdf.save(filename);
}

function isAppleMobile(){
  return/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
}

$("staffMonth").value=currentMonth();
$("previousMonth").onclick=()=>{const date=parseDate($("staffMonth").value+"-01");date.setUTCMonth(date.getUTCMonth()-1);$("staffMonth").value=iso(date).slice(0,7);load()};
$("nextMonth").onclick=()=>{const date=parseDate($("staffMonth").value+"-01");date.setUTCMonth(date.getUTCMonth()+1);$("staffMonth").value=iso(date).slice(0,7);load()};
$("staffMonth").onchange=()=>load();$("refreshStaff").onclick=()=>load();
$("exportStaffPdf").onclick=async()=>{
  const employeeId=$("printEmployee").value;
  const employee=state.employees.find(item=>String(item.id)===employeeId);
  if(isAppleMobile()){
    const button=$("exportStaffPdf");
    button.disabled=true;
    setStatus("Création du PDF…");
    try{
      await shareStaffPdf(employeeId);
      setStatus("PDF prêt à être partagé ou enregistré.","success");
    }catch(error){
      if(error?.name!=="AbortError")setStatus(error.message||"Création du PDF impossible.","error");
    }finally{
      button.disabled=false;
    }
    return;
  }
  $("printTitle").textContent=`${monthLabel(state.month)} · ${employee?.name||"Toute l’équipe"}`;
  document.querySelectorAll("[data-overview-employee]").forEach(row=>
    row.classList.toggle("print-excluded",Boolean(employeeId)&&row.dataset.overviewEmployee!==employeeId));
  document.body.dataset.printEmployee=employeeId||"all";
  window.print();
};
window.addEventListener("afterprint",()=>{
  document.querySelectorAll(".print-excluded").forEach(row=>row.classList.remove("print-excluded"));
  $("printTitle").textContent="";
  delete document.body.dataset.printEmployee;
});
document.addEventListener("keydown",event=>{
  if(!(event.metaKey||event.ctrlKey)||event.altKey||event.shiftKey||event.key.toLowerCase()!=="z")return;
  const inline=document.activeElement?.classList?.contains("inline-entry")?document.activeElement:null;
  if(inline?.value.trim())return;
  event.preventDefault();
  void undoLastChange();
});
document.querySelectorAll("[data-section]").forEach(button=>button.onclick=()=>selectSection(button.dataset.section));
document.querySelectorAll("[data-view]").forEach(button=>button.onclick=()=>selectView(button.dataset.view));
$("googleToggle").onchange=()=>{state.google.visible=$("googleToggle").checked;renderMonth();renderGooglePanel()};
$("refreshGoogleCalendar").onclick=async()=>{
  const button=$("refreshGoogleCalendar");button.disabled=true;setStatus("Synchronisation Google Agenda…");
  try{await loadGoogleCalendar(true);renderMonth();setStatus("Google Agenda synchronisé à l’instant.","success")}
  catch(error){setStatus(error.message,"error")}
  finally{button.disabled=false}
};
$("copyWeek").onclick=async()=>{
  const sourceStart=$("copySourceWeek").value,targetStart=$("copyTargetWeek").value;
  if(sourceStart===targetStart){setStatus("Choisissez deux semaines différentes.","error");return}
  const targetLabel=$("copyTargetWeek").selectedOptions[0]?.textContent||"la semaine cible";
  if(!confirm(`Remplacer les horaires de ${targetLabel} par ceux de la semaine source ?`))return;
  try{await api("/api/admin/staff-planning/copy-week",{method:"POST",body:JSON.stringify({sourceStart,targetStart})});await load(true);setStatus("Semaine copiée avec succès.","success")}
  catch(error){setStatus(error.message,"error")}
};
$("copyMonth").onclick=async()=>{
  const sourceMonth=$("copySourceMonth").value,targetMonth=$("copyTargetMonth").value;
  if(!sourceMonth||!targetMonth){setStatus("Choisissez les deux mois.","error");return}
  if(sourceMonth===targetMonth){setStatus("Choisissez deux mois différents.","error");return}
  const label=monthLabel(targetMonth);
  if(!confirm(`Remplacer tous les horaires de ${label} par ceux du mois source ?`))return;
  try{
    await api("/api/admin/staff-planning/copy-month",{method:"POST",body:JSON.stringify({sourceMonth,targetMonth})});
    $("staffMonth").value=targetMonth;await load(true);setStatus("Mois copié avec succès.","success");
  }catch(error){setStatus(error.message,"error")}
};
$("toggleEmployeeForm").onclick=()=>{$("employeeForm").hidden=!$("employeeForm").hidden;if(!$("employeeForm").hidden)$("employeeName").focus()};
$("employeeForm").onsubmit=async event=>{event.preventDefault();try{await api("/api/admin/staff-planning/employees",{method:"POST",body:JSON.stringify({name:$("employeeName").value,color:$("employeeColor").value})});event.target.reset();$("employeeColor").value="#F27D2C";await load(true);setStatus("Salarié ajouté.","success")}catch(error){setStatus(error.message,"error")}};
$("shiftType").onchange=updateTotal;["morningStart","morningEnd","afternoonStart","afternoonEnd"].forEach(id=>$(id).oninput=updateTotal);
$("closeShiftDialog").onclick=()=>$("shiftDialog").close();
$("shiftForm").onsubmit=async event=>{event.preventDefault();const payload={employeeId:Number($("shiftEmployeeId").value),date:$("shiftIsoDate").value,status:$("shiftType").value,
  morningStart:$("morningStart").value,morningEnd:$("morningEnd").value,afternoonStart:$("afternoonStart").value,afternoonEnd:$("afternoonEnd").value,note:$("shiftNote").value};
  try{
    if(["leave","sick"].includes(payload.status)){
      const result=await api("/api/admin/staff-planning/shift-range",{method:"PUT",body:JSON.stringify({
        employeeId:payload.employeeId,status:payload.status,startDate:$("shiftRangeStart").value,
        endDate:$("shiftRangeEnd").value,note:payload.note
      })});
      $("shiftDialog").close();await load(true);setStatus(`${result.dayCount} journée(s) enregistrée(s).`,"success");
    }else{
      await api("/api/admin/staff-planning/shifts",{method:"PUT",body:JSON.stringify(payload)});
      $("shiftDialog").close();await load(true);setStatus("Journée enregistrée.","success");
    }
  }catch(error){setStatus(error.message,"error")}};
$("deleteShift").onclick=async()=>{if(!confirm("Effacer cette journée ? Elle sera affichée comme Repos."))return;try{await api(`/api/admin/staff-planning/shifts/${$("shiftEmployeeId").value}/${$("shiftIsoDate").value}`,{method:"DELETE"});$("shiftDialog").close();await load(true);setStatus("Journée remise en repos.","success")}catch(error){setStatus(error.message,"error")}};
selectView(localStorage.getItem("staff_prod_view")==="overview"?"overview":"entry");
load();
})();
