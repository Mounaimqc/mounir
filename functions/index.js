const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

const db = getFirestore();
const messaging = getMessaging();

/**
 * Triggered whenever a new order document is created in the 'commandes' collection.
 * Sends a Web Push Notification to all registered admin FCM tokens.
 */
exports.onNewOrder = onDocumentCreated("commandes/{docId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log("⚠️ Aucune donnée associée à l'événement.");
    return;
  }

  const orderData = snapshot.data();
  const orderId = event.params.docId;
  const orderNumber = orderData.orderNumber || orderId;

  console.log(`📦 Nouvelle commande détectée: #${orderNumber} (ID: ${orderId})`);

  const clientName = `${orderData.firstName || ''} ${orderData.lastName || ''}`.trim() || "Client Inconnu";
  const totalAmount = (orderData.grandTotal || 0).toLocaleString('fr-FR');
  const wilaya = orderData.wilaya || 'Algérie';

  // 1. Récupérer les tokens FCM des administrateurs depuis la collection 'fcm_tokens'
  const tokensSnapshot = await db.collection("fcm_tokens").get();
  if (tokensSnapshot.empty) {
    console.log("⚠️ Aucun token FCM trouvé dans la collection 'fcm_tokens'.");
    return;
  }

  const tokens = [];
  tokensSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.token) {
      tokens.push(data.token);
    }
  });

  if (tokens.length === 0) {
    console.log("⚠️ Aucun token valide trouvé.");
    return;
  }

  console.log(`📱 Envoi de la notification Push à ${tokens.length} appareil(s)...`);

  // 2. Construire le payload Multicast pour Firebase Cloud Messaging
  const message = {
    tokens: tokens,
    notification: {
      title: `🔔 Nouvelle commande #${orderNumber}`,
      body: `Client: ${clientName}\nTotal: ${totalAmount} DA\nWilaya: ${wilaya}`
    },
    data: {
      orderNumber: String(orderNumber),
      orderId: String(orderId),
      url: `admin.html?orderNumber=${encodeURIComponent(orderNumber)}`
    },
    webpush: {
      headers: {
        Urgency: "high"
      },
      notification: {
        title: `🔔 Nouvelle commande #${orderNumber}`,
        body: `Client: ${clientName}\nTotal: ${totalAmount} DA`,
        icon: "logo.jpeg",
        badge: "logo.jpeg",
        requireInteraction: true,
        tag: `order-${orderNumber}`,
        renotify: true
      },
      fcmOptions: {
        link: `admin.html?orderNumber=${encodeURIComponent(orderNumber)}`
      }
    }
  };

  try {
    const response = await messaging.sendEachForMulticast(message);
    console.log(`✅ Push envoyés! Succès: ${response.successCount}, Échecs: ${response.failureCount}`);

    // Nettoyage des tokens expirés ou invalides
    if (response.failureCount > 0) {
      const tokensToDelete = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code;
          if (
            errCode === 'messaging/invalid-registration-token' ||
            errCode === 'messaging/registration-token-not-registered'
          ) {
            tokensToDelete.push(tokens[idx]);
          }
        }
      });

      for (const expiredToken of tokensToDelete) {
        console.log(`🧹 Suppression du token expiré: ${expiredToken}`);
        await db.collection("fcm_tokens").doc(expiredToken).delete().catch(() => {});
      }
    }
  } catch (error) {
    console.error("❌ Erreur d'envoi FCM:", error);
  }
});
