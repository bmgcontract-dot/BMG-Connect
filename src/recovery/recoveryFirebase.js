import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

import { createFirebaseBusinessAuth } from '../auth/firebaseAuthAdapter.js';
import { initializeFirebaseBrowserAuth } from '../auth/firebaseBrowserAuth.js';
import { BMG_FIREBASE_CONFIG } from '../firebase/browserConfig.js';

export function initializeRecoveryFirebase() {
  const app = getApps().length > 0 ? getApp() : initializeApp(BMG_FIREBASE_CONFIG);
  let auth;
  try {
    auth = initializeFirebaseBrowserAuth({
      app,
      initializeAuth,
      indexedDBLocalPersistence,
      browserLocalPersistence,
    });
  } catch (error) {
    if (error?.code !== 'auth/already-initialized') throw error;
    auth = getAuth(app);
  }
  const db = getFirestore(app);
  const businessAuth = createFirebaseBusinessAuth({
    auth,
    db,
    authDomain: import.meta.env.VITE_INTERNAL_AUTH_DOMAIN || 'auth.bmg-connect.local',
    getSessionExpiry: () => Date.now() + (12 * 60 * 60 * 1000),
  });
  return { auth, businessAuth };
}

