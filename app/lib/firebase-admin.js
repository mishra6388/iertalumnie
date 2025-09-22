// lib/firebase-admin.js
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Firebase Admin SDK Configuration
 * Used for server-side operations like updating user data after payment
 */

let app;

if (!getApps().length) {
  // Initialize Firebase Admin with service account
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  app = initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
} else {
  app = getApps()[0];
}

// Export Firestore instance
export const db = getFirestore(app);
export default app;

/**
 * IMPORTANT: Add these to your .env.local file:
 * 
 * # Firebase Admin SDK (Server-side only)
 * FIREBASE_PROJECT_ID=your-project-id
 * FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
 * FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
 * 
 * # Cashfree Configuration
 * CASHFREE_BASE_URL=https://api.cashfree.com (production) or https://sandbox.cashfree.com (sandbox)
 * CASHFREE_APP_ID=your_cashfree_app_id
 * CASHFREE_SECRET_KEY=your_cashfree_secret_key
 * NEXT_PUBLIC_BASE_URL=http://localhost:3000 (development) or https://yourdomain.com (production)
 * 
 * How to get Firebase Admin credentials:
 * 1. Go to Firebase Console → Project Settings → Service accounts
 * 2. Click "Generate new private key"
 * 3. Save the JSON file securely
 * 4. Extract project_id, client_email, and private_key from the JSON
 * 5. Add them to your .env.local file
 */