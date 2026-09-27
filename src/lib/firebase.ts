import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, Auth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, Firestore } from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig';

// Initialize Firebase App only if credentials are configured
export const app: FirebaseApp | null = isFirebaseConfigured
  ? (getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig))
  : null;

// Initialize Firestore
const dbId = firebaseConfig.firestoreDatabaseId || undefined;
export const db: Firestore | null = app ? getFirestore(app, dbId) : null;

// Initialize Firebase Auth
export const auth: Auth | null = app ? getAuth(app) : null;

// Google Auth Provider
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
});

export const signInWithGoogle = async () => {
  if (!auth) {
    throw new Error('Firebase Auth er ikke konfigurert. Legg inn Firebase-nøkler i .env.');
  }
  return await signInWithPopup(auth, googleAuthProvider);
};

export const logoutFirebase = async () => {
  if (!auth) return;
  return await signOut(auth);
};

// Test connection on boot
export async function testFirestoreConnection(): Promise<boolean> {
  if (!db) {
    return false;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('✅ Firestore connection established successfully.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('⚠️ Firestore client is offline or waiting for network.');
      return false;
    }
    // Document does not need to exist for connection to succeed
    console.log('Firestore connection checked.');
    return true;
  }
}

if (isFirebaseConfigured) {
  testFirestoreConnection();
}

