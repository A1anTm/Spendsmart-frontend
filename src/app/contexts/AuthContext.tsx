'use client';

import React, {
    createContext,
    useState,
    useEffect,
    useContext,
    ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { setAuthToken, refreshAccessToken, setupApiInterceptors } from '@/lib/api';
import { jwtDecode } from 'jwt-decode';

interface TokenPayload {
    _id?: string;
    email?: string;
    full_name?: string;
    exp?: number;
}

interface AuthContextType {
    token: string | null;
    user: { email?: string; full_name?: string } | null;
    isAuthenticated: boolean;
    setIsAuthenticated: (v: boolean) => void;
    setUser: (u: any | null) => void;
    login: (token: string) => void;
    logout: () => void;
    silentLogout: () => void;
    showTokenExpiredModal: boolean;
    setShowTokenExpiredModal: (show: boolean) => void;
    continueSession: () => Promise<void>;
    exitApplication: () => void;
    isAuthReady: boolean;
    isRefreshingSession: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<{ email?: string; full_name?: string } | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showTokenExpiredModal, setShowTokenExpiredModal] = useState(false);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isRefreshingSession, setIsRefreshingSession] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const initAuth = () => {
            if (typeof window === 'undefined') {
                setIsAuthReady(true);
                return;
            }

            const storedToken = localStorage.getItem('token');
            if (!storedToken) {
                setToken(null);
                setIsAuthenticated(false);
                setIsAuthReady(true);
                return;
            }

            try {
                const decoded = jwtDecode<TokenPayload>(storedToken);
                if (decoded?.exp && decoded.exp * 1000 < Date.now()) {
                    throw new Error('Token expirado');
                }

                setAuthToken(storedToken);
                setToken(storedToken);
                setUser({ email: decoded.email, full_name: decoded.full_name });
                setIsAuthenticated(true);
            } catch (err) {
                console.error('initAuth error:', err);
                localStorage.removeItem('token');
                setAuthToken(null);
                setToken(null);
                setUser(null);
                setIsAuthenticated(false);
            } finally {
                setIsAuthReady(true);
            }
        };

        initAuth();
    }, []);

    useEffect(() => {
        const onUnauthorized = () => {
            setShowTokenExpiredModal(true);
        };

        const eject = setupApiInterceptors(onUnauthorized);

        return () => {
            try {
                eject();
            } catch (e) {
            }
        };
    }, []);

    const login = (newToken: string) => {
        try { localStorage.setItem('token', newToken); } catch { }
        setAuthToken(newToken);
        try {
            const decoded = jwtDecode<TokenPayload>(newToken);
            setUser({ email: decoded.email, full_name: decoded.full_name });
        } catch (err) {
            console.error('login: jwt decode failed', err);
            setUser(null);
        }
        setToken(newToken);
        setIsAuthenticated(true);
    };

    const logout = () => {
        try { localStorage.removeItem('token'); } catch { }
        setAuthToken(null);
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setShowTokenExpiredModal(false);
        router.push('/');
    };

    const silentLogout = () => {
        try { localStorage.removeItem('token'); } catch { }
        setAuthToken(null);
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setShowTokenExpiredModal(false);
    };

    const continueSession = async () => {
        setIsRefreshingSession(true);
        setShowTokenExpiredModal(true);

        try {
            const data = await refreshAccessToken();
            const newAccessToken: string | undefined = data?.accessToken || data?.token;

            if (!newAccessToken) {
                setIsRefreshingSession(false);
                exitApplication();
                return;
            }

            try { localStorage.setItem('token', newAccessToken); } catch { }

            setAuthToken(newAccessToken);
            setToken(newAccessToken);

            try {
                const decoded = jwtDecode<TokenPayload>(newAccessToken);
                setUser({ email: decoded.email, full_name: decoded.full_name });
            } catch (err) {
                console.error('continueSession: jwt decode failed', err);
                setUser(null);
            }

            setIsAuthenticated(true);
            setShowTokenExpiredModal(false);
        } catch (err) {
            console.error('Error refrescando token:', err);
            exitApplication();
        } finally {
            setIsRefreshingSession(false);
        }
    };

    const exitApplication = () => {
        setShowTokenExpiredModal(false);
        silentLogout();
        router.push('/');
    };

    return (
        <AuthContext.Provider
            value={{
                token,
                user,
                isAuthenticated,
                setIsAuthenticated,
                setUser,
                login,
                logout,
                silentLogout,
                showTokenExpiredModal,
                setShowTokenExpiredModal,
                continueSession,
                exitApplication,
                isAuthReady,
                isRefreshingSession,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth debe usarse dentro de un <AuthProvider>');
    return context;
}
