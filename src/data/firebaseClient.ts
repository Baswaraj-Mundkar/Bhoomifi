'use client';

import { getApp, getApps, initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

const requiredConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export const firebaseConfigured = Boolean(
  requiredConfig.apiKey
  && requiredConfig.authDomain
  && requiredConfig.projectId
  && requiredConfig.appId
);

export async function getFirebaseServices(): Promise<FirebaseServices | null> {
  if (
    !requiredConfig.apiKey
    || !requiredConfig.authDomain
    || !requiredConfig.projectId
    || !requiredConfig.appId
  ) return null;

  const app = getApps().length > 0
    ? getApp()
    : initializeApp({
        ...requiredConfig,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
      });

  const [{ getAuth }, { getFirestore }] = await Promise.all([
    import('firebase/auth'),
    import('firebase/firestore')
  ]);

  return {
    app,
    auth: getAuth(app),
    db: getFirestore(app)
  };
}
