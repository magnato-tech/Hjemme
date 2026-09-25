export interface FirebaseAppletConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId: string;
  oAuthClientId: string;
}

function env(key: string): string {
  const value = import.meta.env[key];
  if (!value || typeof value !== 'string') {
    throw new Error(
      `Mangler miljøvariabel ${key}. Kopier .env.example til .env og fyll inn Firebase-verdier.`
    );
  }
  return value;
}

export const firebaseConfig: FirebaseAppletConfig = {
  apiKey: env('VITE_FIREBASE_API_KEY'),
  authDomain: env('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: env('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: env('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: env('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: env('VITE_FIREBASE_APP_ID'),
  firestoreDatabaseId: env('VITE_FIREBASE_FIRESTORE_DATABASE_ID'),
  oAuthClientId: env('VITE_GOOGLE_OAUTH_CLIENT_ID'),
};
