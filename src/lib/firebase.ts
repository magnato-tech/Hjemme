import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID as required
const dbId = (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-remixhomeapp-625f37a7-cb03-43da-929f-5f2c6b42511e';
export const db = getFirestore(app, dbId);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Google Auth Provider
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
});

export const signInWithGoogle = async () => {
  return await signInWithPopup(auth, googleAuthProvider);
};

export const logoutFirebase = async () => {
  return await signOut(auth);
};

// Test connection on boot
export async function testFirestoreConnection(): Promise<boolean> {
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

testFirestoreConnection();
