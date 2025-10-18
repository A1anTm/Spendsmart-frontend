'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export default function useRequireAuth() {
  const { isAuthenticated, isAuthReady } = useAuth();
  const router = useRouter();

  return isAuthenticated && isAuthReady;
}