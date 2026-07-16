const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");

const paddocks=fs.readFileSync("paddocks.html","utf8");
const administration=fs.readFileSync("administration.html","utf8");
const adminScript=fs.readFileSync("assets/js/administration.js","utf8");
const realtime=fs.readFileSync("assets/js/status-realtime.js","utf8");
const pushSettings=fs.readFileSync("assets/js/firebase-push-settings.js","utf8");
const firebaseConfig=JSON.parse(fs.readFileSync("firebase.json","utf8"));

test("l’administration utilise uniquement Cloudflare production",()=>{
  assert.match(adminScript,/ecurie-notifications-prod\.damiensiri-pro\.workers\.dev/);
  assert.doesNotMatch(adminScript,/ecurie-notifications-beta/);
  assert.match(realtime,/ecurie-notifications-prod\.damiensiri-pro\.workers\.dev/);
  assert.doesNotMatch(realtime,/ecurie-notifications-beta/);
  assert.match(administration,/PRODUCTION · PUSH ACTIF/);
});

test("les écritures Firebase sont activées en production",()=>{
  assert.match(paddocks,/const FIREBASE_READ_ONLY = false;/);
  assert.match(pushSettings,/const FIREBASE_PUSH_READ_ONLY=false;/);
});

test("les clés locales de production sont conservées",()=>{
  assert.match(adminScript,/notifications_prod_api_url/);
  assert.match(adminScript,/notifications_prod_admin_token/);
  assert.doesNotMatch(adminScript,/notifications_beta_/);
});

test("les notifications Firebase sont uniquement dans Paramètres",()=>{
  assert.doesNotMatch(paddocks,/id="enablePushBtn"/);
  assert.match(administration,/data-admin-section="settings"/);
  assert.match(administration,/id="enablePushBtn"/);
});

test("Firebase Hosting publie l’interface unifiée",()=>{
  assert.equal(firebaseConfig.hosting.site,"ecurie-paddock");
  assert.equal(firebaseConfig.hosting.public,".");
});
