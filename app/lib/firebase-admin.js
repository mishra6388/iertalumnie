import admin from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let db;
if (!admin.getApps().length) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_BASE64 env variable");
  }

  const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8")
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  db = getFirestore();
} else {
  db = getFirestore(admin.getApps()[0]);
}

export { db };
