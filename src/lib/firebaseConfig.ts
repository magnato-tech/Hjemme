import fallbackConfig from '../../firebase-applet-config.json';

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

const rawFallback: Partial<FirebaseAppletConfig> = fallbackConfig || {};

function envOrFallback(key: string, fallbackKey: keyof FirebaseAppletConfig, defaultVal = ''): string {
  const envVal = import.meta.env[key];
  if (typeof envVal === 'string' && envVal.trim()) {
    return envVal.trim();
  }
  const fileVal = rawFallback[fallbackKey];
  if (typeof fileVal === 'string' && fileVal.trim()) {
    return fileVal.trim();
  }
  return defaultVal;
}

export const firebaseConfig: FirebaseAppletConfig = {
  apiKey: envOrFallback('VITE_FIREBASE_API_KEY', 'apiKey'),
  authDomain: envOrFallback('VITE_FIREBASE_AUTH_DOMAIN', 'authDomain'),
  projectId: envOrFallback('VITE_FIREBASE_PROJECT_ID', 'projectId'),
  storageBucket: envOrFallback('VITE_FIREBASE_STORAGE_BUCKET', 'storageBucket'),
  messagingSenderId: envOrFallback('VITE_FIREBASE_MESSAGING_SENDER_ID', 'messagingSenderId'),
  appId: envOrFallback('VITE_FIREBASE_APP_ID', 'appId'),
  firestoreDatabaseId: envOrFallback(
    'VITE_FIREBASE_FIRESTORE_DATABASE_ID',
    'firestoreDatabaseId',
    'ai-studio-remixhomeapp-625f37a7-cb03-43da-929f-5f2c6b42511e'
  ),
  oAuthClientId: envOrFallback('VITE_GOOGLE_OAUTH_CLIENT_ID', 'oAuthClientId'),
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);


