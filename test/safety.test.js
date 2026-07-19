const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");

const paddocks=fs.readFileSync("paddocks.html","utf8");
const administration=fs.readFileSync("administration.html","utf8");
const adminScript=fs.readFileSync("assets/js/administration.js","utf8");
const realtime=fs.readFileSync("assets/js/status-realtime.js","utf8");
const shell=fs.readFileSync("assets/js/backstage-shell.js","utf8");
const pushSettings=fs.readFileSync("assets/js/backstage-push.js","utf8");
const users=fs.readFileSync("assets/js/users.js","utf8");
const usersPage=fs.readFileSync("users.html","utf8");
const home=fs.readFileSync("index.html","utf8");
const homeSummary=fs.readFileSync("assets/js/home-summary.js","utf8");
const stablePlanning=fs.readFileSync("assets/js/planning.js","utf8");

test("le planning Backstage utilise uniquement Cloudflare D1 production",()=>{
  assert.match(paddocks,/ecurie-notifications-prod\.damiensiri-pro\.workers\.dev/);
  assert.doesNotMatch(paddocks,/beta|bêta/i);
  assert.doesNotMatch(paddocks,/firebase-app-compat|firebase-firestore-compat|firebaseConfig|\.collection\(/);
});

test("les comptes utilisent uniquement le Worker Cloudflare production",()=>{
  assert.match(users,/ecurie-notifications-prod\.damiensiri-pro\.workers\.dev/);
  assert.doesNotMatch(users,/firebase/i);
  assert.match(usersPage,/PRODUCTION · D1/);
  assert.match(shell,/\["Utilisateurs","users\.html"/);
});

test("chaque action paddock sensible appelle l’API D1 production",()=>{
  for(const name of ["createBlockage","deleteBlockage","cancelReservation","saveRestriction","deleteRestriction","saveHours"]){
    const start=paddocks.indexOf(`function ${name}`);
    assert.notEqual(start,-1,`${name} doit exister`);
    assert.match(paddocks.slice(start,start+1800),/paddockAdminApi/,`${name} doit utiliser D1`);
  }
});

test("le formulaire de réservation client conserve un vrai bouton de soumission",()=>{
  assert.match(paddocks,/id="adminReservationSubmit" type="submit"/);
  assert.match(paddocks,/if \(!button\.hasAttribute\("type"\)\) button\.type = "button"/);
  assert.match(paddocks,/adminReservationForm"\)\.addEventListener\("submit", createAdminReservation\)/);
});

test("l’administration utilise uniquement Cloudflare production",()=>{
  assert.match(adminScript,/ecurie-notifications-prod\.damiensiri-pro\.workers\.dev/);
  assert.doesNotMatch(adminScript,/ecurie-notifications-beta/);
  assert.match(realtime,/ecurie-notifications-prod\.damiensiri-pro\.workers\.dev/);
  assert.doesNotMatch(realtime,/ecurie-notifications-beta/);
  assert.doesNotMatch(administration,/>BÊTA</);
});

test("la navigation et les paramètres ne sont pas dupliqués",()=>{
  assert.doesNotMatch(administration,/class="admin-tabs"/);
  assert.match(administration,/data-admin-section="settings"/);
  assert.match(shell,/\["Paramètres","administration\.html\?section=settings"/);
  assert.ok(shell.indexOf('["Paramètres"')>shell.indexOf('["Utilisateurs"'));
});

test("l’éditeur des espaces est une fenêtre modale",()=>{
  assert.match(administration,/class="space-editor-overlay"/);
  assert.match(administration,/role="dialog" aria-modal="true"/);
  assert.match(adminScript,/document\.body\.classList\.add\("space-editor-open"\)/);
});

test("les notifications Backstage utilisent OneSignal et l’API Cloudflare production",()=>{
  assert.doesNotMatch(paddocks,/id="enablePushBtn"/);
  assert.match(administration,/id="enablePushBtn"/);
  assert.match(administration,/OneSignalSDK\.page\.js/);
  assert.doesNotMatch(administration,/firebase/i);
  assert.match(pushSettings,/api\/admin\/push\/subscription/);
  assert.match(pushSettings,/ecurie-notifications-prod\.damiensiri-pro\.workers\.dev/);
  assert.match(pushSettings,/104b740c-3a7b-4e39-87b2-847d00f300fb/);
});

test("le nouveau planning utilise uniquement D1 production",()=>{
  assert.match(home,/href="planning\.html"/);
  assert.match(shell,/\["Planning","planning\.html"/);
  assert.match(stablePlanning,/ecurie-notifications-prod\.damiensiri-pro\.workers\.dev/);
  assert.doesNotMatch(stablePlanning,/notifications_beta|notifications-beta|bêta/i);
});

test("l’accueil récapitule uniquement les actions D1 à traiter",()=>{
  for(const id of ["summaryBilling","summaryOrders","summaryRequests","summaryUsers"])assert.match(home,new RegExp(`id="${id}"`));
  for(const endpoint of ["billing","orders","liberte","users"])assert.match(homeSummary,new RegExp(`api/admin/${endpoint}`));
  assert.match(homeSummary,/ecurie-notifications-prod\.damiensiri-pro\.workers\.dev/);
  assert.doesNotMatch(homeSummary,/planning|reservations|beta/i);
});
