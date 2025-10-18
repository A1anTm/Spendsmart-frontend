'use client';

import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/app/contexts/AuthContext';
import { setupApiInterceptors, setAuthToken } from '@/lib/api';
import TokenExpiredModal from './Modal/TokenExpiredModal';

export function AuthProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthWrapper>{children}</AuthWrapper>
    </AuthProvider>
  );
}

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const {
    token,
    setShowTokenExpiredModal,
    showTokenExpiredModal,
    continueSession,
    exitApplication,
    isRefreshingSession,
  } = useAuth();

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  useEffect(() => {
    const cleanup = setupApiInterceptors((err?: any) => {
      try {
        const requestConfig = err?.config || err || {};
        const headers = requestConfig.headers || {};
        const skipHeader = headers['x-skip-token-modal'] || headers['X-Skip-Token-Modal'];
        const skipFlag = (requestConfig as any).skipTokenModal;

        if (skipHeader || skipFlag) {
          return;
        }

        const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

        const isAuthPath =
          pathname === '/' ||
          pathname.startsWith('/auth') ||
          pathname.startsWith('/login') ||
          pathname.startsWith('/register') ||
          pathname.startsWith('/users/auth') ||
          pathname.startsWith('/api/auth');

        if (isAuthPath) return;

        const resp = err?.response;
        const status = resp?.status;
        if (status !== 401) return;

        try {
          const respData = resp?.data;
          const msg = typeof respData === 'string' ? respData : respData?.message || '';
          const code = respData?.code || '';

          const nonAuthCodes = ['INVALID_CURRENT_PASSWORD', 'INVALID_CREDENTIALS', 'WRONG_PASSWORD', 'BAD_CREDENTIALS'];
          if (code && nonAuthCodes.includes(String(code))) {
            return;
          }


          if (typeof msg === 'string' && /contraseñ|contraseña|wrong password|invalid password|invalid credentials|credenciales inválidas|credenciales invalidas|bad credentials/i.test(msg)) {
            return;
          }
        } catch (e) {

          console.debug('Auth interceptor heuristics failed', e);
        }

        setShowTokenExpiredModal(true);
      } catch (e) {

        console.error('Auth interceptor decision error', e);
      }
    });

    return cleanup;
  }, [setShowTokenExpiredModal]);

  return (
    <>
      {children}
      {showTokenExpiredModal && (
        <TokenExpiredModal
          onContinue={continueSession}
          onExit={exitApplication}
          isLoading={isRefreshingSession}
        />
      )}
    </>
  );
}
