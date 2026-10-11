/**
 * Leser firebase-applet-config.json (fra Google AI Studio) og skriver .env.
 * Kjør: node scripts/fill-env-from-applet-config.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = resolve(root, 'firebase-applet-config.json');
const envPath = resolve(root, '.env');

if (!existsSync(configPath)) {
  console.error('Fant ikke firebase-applet-config.json i prosjektroten.');
  console.error('Eksporter fra Google AI Studio, eller fyll inn .env manuelt.');
  process.exit(1);
}

const cfg = JSON.parse(readFileSync(configPath, 'utf8'));
const lines = [
  '# Generert fra firebase-applet-config.json – sjekk at verdiene stemmer',
  '',
  `VITE_FIREBASE_API_KEY=${cfg.apiKey ?? ''}`,
  `VITE_FIREBASE_AUTH_DOMAIN=${cfg.authDomain ?? ''}`,
  `VITE_FIREBASE_PROJECT_ID=${cfg.projectId ?? ''}`,
  `VITE_FIREBASE_STORAGE_BUCKET=${cfg.storageBucket ?? ''}`,
  `VITE_FIREBASE_MESSAGING_SENDER_ID=${cfg.messagingSenderId ?? ''}`,
  `VITE_FIREBASE_APP_ID=${cfg.appId ?? ''}`,
  `VITE_FIREBASE_FIRESTORE_DATABASE_ID=${cfg.firestoreDatabaseId ?? 'ai-studio-remixhomeapp-625f37a7-cb03-43da-929f-5f2c6b42511e'}`,
  `VITE_GOOGLE_OAUTH_CLIENT_ID=${cfg.oAuthClientId ?? ''}`,
  '',
];

writeFileSync(envPath, lines.join('\n'), 'utf8');
console.log('Skrev', envPath);
console.log('Start dev-server på nytt: npm run dev');
