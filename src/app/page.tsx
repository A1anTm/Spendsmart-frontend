'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthForm from '@/app/auth/AuthForm';
import { useAuth } from '@/app/contexts/AuthContext';

export default function Home() {
  const { isAuthenticated, isAuthReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthReady) return;
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isAuthReady, router]);

  if (!isAuthReady) {
    return null;
  }

  if (isAuthenticated) {
    return null;
  }

  return <AuthForm mode="login" />;
}