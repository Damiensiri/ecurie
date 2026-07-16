const { logger } = require("firebase-functions");
const { onDocumentCreated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();
const REGION = "europe-west1";
const BACKSTAGE_URL = "https://ecurie-paddock.web.app/";

function isBlocage(data) {
  return String(data?.name || "").toLowerCase().startsWith("blocage");
}

function paddockLabel(id) {
  return {
    maison: "Maison",
    grande: "Grande voie",
    beudot: "Beudot"
  }[id] || id || "Paddock";
}

function formatReservation(data) {
  const name = data?.name || "Reservation";
  const date = data?.date || "";
  const time = data?.time || "";
  const paddock = paddockLabel(data?.paddock);
  return `${name} - ${paddock} - ${date} ${time}`.trim();
}

async function getEnabledTokens() {
  const snapshot = await db.collection("notificationSubscriptions")
    .where("enabled", "==", true)
    .get();

  const tokens = snapshot.docs
    .map((doc) => ({ id: doc.id, token: doc.data().token }))
    .filter((item) => item.token);

  return Array.from(new Map(tokens.map((item) => [item.token, item])).values());
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function deleteInvalidTokens(tokens, response) {
  const batch = db.batch();
  let count = 0;

  response.responses.forEach((result, index) => {
    const code = result.error?.code || "";
    if (
      code === "messaging/invalid-registration-token" ||
      code === "messaging/registration-token-not-registered"
    ) {
      batch.delete(db.collection("notificationSubscriptions").doc(tokens[index].id));
      count += 1;
    }
  });

  if (count > 0) {
    await batch.commit();
    logger.info("Invalid notification tokens removed", { count });
  }
}

async function sendNotification({ title, body, reservationId, type }) {
  const tokens = await getEnabledTokens();
  if (!tokens.length) {
    logger.info("No enabled notification subscriptions");
    return;
  }

  for (const tokenChunk of chunk(tokens, 500)) {
    const response = await messaging.sendEachForMulticast({
      tokens: tokenChunk.map((item) => item.token),
      data: {
        title,
        body,
        reservationId,
        type,
        url: BACKSTAGE_URL
      },
      webpush: {
        fcmOptions: {
          link: BACKSTAGE_URL
        }
      }
    });

    await deleteInvalidTokens(tokenChunk, response);
    logger.info("Notification batch sent", {
      successCount: response.successCount,
      failureCount: response.failureCount
    });
  }
}

exports.notifyReservationCreated = onDocumentCreated({
  document: "reservations/{reservationId}",
  region: REGION
}, async (event) => {
  const data = event.data?.data();
  if (!data || isBlocage(data)) return;

  await sendNotification({
    title: "Nouvelle reservation",
    body: formatReservation(data),
    reservationId: event.params.reservationId,
    type: "reservation_created"
  });
});

exports.notifyReservationDeleted = onDocumentDeleted({
  document: "reservations/{reservationId}",
  region: REGION
}, async (event) => {
  const data = event.data?.data();
  if (!data || isBlocage(data)) return;

  await sendNotification({
    title: "Reservation annulee",
    body: formatReservation(data),
    reservationId: event.params.reservationId,
    type: "reservation_deleted"
  });
});
