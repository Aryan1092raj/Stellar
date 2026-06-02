import { initializeApp, getApps } from 'firebase/app';
import { type Auth, getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

function hasFirebaseConfig() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.authDomain !== 'your-project.firebaseapp.com' &&
      firebaseConfig.projectId !== 'your-project-id'
  );
}

function getFirebaseAuth() {
  if (!hasFirebaseConfig()) {
    throw new Error('Firebase public env keys are not configured');
  }

  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return getAuth(app);
}

export const auth: Auth | null = typeof window !== 'undefined' && hasFirebaseConfig()
  ? getFirebaseAuth()
  : null;
export const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<string> {
  const result = await signInWithPopup(auth || getFirebaseAuth(), googleProvider);
  return result.user.getIdToken();
}

export { signOut };
