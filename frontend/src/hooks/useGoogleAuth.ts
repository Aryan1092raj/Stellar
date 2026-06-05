import { useState } from 'react';
import { apiRoutes } from '../lib/api/routes';
import { saveSession } from '../lib/auth';
import { signInWithGoogle } from '../lib/firebase';

type Role = 'donor' | 'ngo';

export function useGoogleAuth(role: Role = 'donor') {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginWithGoogle = async () => {
    setLoading(true);
    setError(null);

    try {
      const idToken = await signInWithGoogle();
      const res = await fetch(apiRoutes.auth.google, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Google login failed');
      }

      if (!data.token) {
        throw new Error('Google login did not return a token');
      }

      const sessionRole = data.user?.role || role;
      saveSession(data.token, sessionRole);

      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'geoledger-auth',
          JSON.stringify({
            email: data.user?.email || '',
            role: sessionRole,
            token: data.token,
          })
        );
      }

      return data.user;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Google login failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { loginWithGoogle, loading, error };
}
