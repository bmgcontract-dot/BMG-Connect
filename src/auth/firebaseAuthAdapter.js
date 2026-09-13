import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { createBusinessAuth } from './businessAuth.js';

export function createFirebaseBusinessAuth({
  auth,
  db,
  authDomain,
  getSessionExpiry,
  profileCollection = 'users',
}) {
  if (!auth || !db) return null;

  return createBusinessAuth({
    authDomain,
    getSessionExpiry,
    signInWithEmail: (email, password) =>
      signInWithEmailAndPassword(auth, email, password),
    signOut: () => firebaseSignOut(auth),
    loadProfile: async (uid) => {
      const snapshot = await getDoc(doc(db, profileCollection, uid));
      return snapshot.exists() ? snapshot.data() : null;
    },
  });
}
