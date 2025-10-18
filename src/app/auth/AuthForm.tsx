'use client';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api, { setAuthToken } from '@/lib/api';
import LoginForm from './login';
import RegisterForm from './register';
import ForgotPassword from './ForgotPassword';
import { useSystemTheme } from '@/app/hooks/useSystemTheme';
import ResetPassword from './ResetPassword';
import { useAuth } from '@/app/contexts/AuthContext';
import { jwtDecode } from 'jwt-decode';
import { IoWallet, IoTimeOutline, IoAnalyticsOutline, IoFlagOutline, IoAlertCircleOutline } from 'react-icons/io5';

type Mode = 'login' | 'register' | 'forgot-password' | 'reset-password';

interface TokenPayload {
  _id?: string;
  email?: string;
  full_name?: string;
  exp?: number;
  iat?: number;
}

const iconMap: Record<string, React.ElementType> = {
  teal: IoTimeOutline,
  blue: IoAnalyticsOutline,
  purple: IoFlagOutline,
  orange: IoAlertCircleOutline,
};

export default function AuthPage() {
  const systemTheme = useSystemTheme(); 
  const [mode, setMode] = useState<Mode>('login');
  const [error, setError] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const router = useRouter();

  const { setIsAuthenticated, setUser, login: authLogin } = useAuth();

  const handleAuthSuccess = async (token: string) => {
    setError('');

    try {
      if (!token && token !== '') {
        throw new Error('No se recibió token del servidor');
      }

      if (typeof authLogin === 'function' && token) {
        authLogin(token);
      } else if (typeof authLogin === 'function' && token === '') {
        authLogin('');
      } else {
        try {
          if (token) localStorage.setItem('token', token);
        } catch (e) {
          console.warn('No se pudo escribir en localStorage', e);
        }
        if (token) setAuthToken(token);
        if (token) {
          try {
            const decoded = jwtDecode<TokenPayload>(token);
            setUser({ email: decoded.email, full_name: decoded.full_name });
          } catch (e) {
            console.error('Error decodificando token en fallback:', e);
            setUser({ email: '' });
          }
        }
        setIsAuthenticated(true);
      }

      router.push('/dashboard');
    } catch (err: any) {
      console.error('Error después del login/register:', err);
      try { localStorage.removeItem('token'); } catch { }
      setAuthToken(null);
      setIsAuthenticated(false);
      setError('Error al validar el inicio de sesión. Intenta nuevamente.');
    }
  };

  const handleRegisterSuccess = async (token: string) => {
    await handleAuthSuccess(token);
  };

  const handleForgotPassword = () => {
    setMode('forgot-password');
    setError('');
  };

  const handleCodeSent = (email: string) => {
    setResetEmail(email);
    setMode('reset-password');
  };

  const handlePasswordReset = () => {
    setMode('login');
    setError('');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-black">
      <ThemeToggle />
      <div className="w-full md:flex-1 flex flex-col justify-center px-6 md:px-12 py-8">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center mr-3">
            <IoWallet className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">SpendSmart</h1>
        </div>

        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-8 md:mb-12 leading-tight">
          Toma el control de tus finanzas personales con inteligencia y simplicidad
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 ">
          <Feature color="teal" title="Seguimiento en Tiempo Real" desc="Monitorea tus ingresos y gastos al instante" />
          <Feature color="blue" title="Análisis Inteligente" desc="Obtén insights sobre tus hábitos financieros" />
          <Feature color="purple" title="Metas de Ahorro" desc="Establece y alcanza tus objetivos financieros" />
          <Feature color="orange" title="Control de Presupuesto" desc="Mantén tus gastos bajo control con alertas" />
        </div>
      </div>

      <div className="w-full md:w-[540px] flex flex-col justify-center px-6 md:px-8 py-8">
        {mode === 'forgot-password' ? (
          <ForgotPassword onCodeSent={handleCodeSent} onBackToLogin={() => setMode('login')} />
        ) : mode === 'reset-password' ? (
          <ResetPassword email={resetEmail} onPasswordReset={handlePasswordReset} onChangeEmail={() => setMode('forgot-password')} />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2 text-center">Bienvenido</h2>
            <p className="text-gray-500 text-sm mb-6 text-center dark:text-gray-100">Accede a tu cuenta o crea una nueva para comenzar</p>

            <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
              <TabButton active={mode === 'login'} onClick={() => { setMode('login'); setError(''); }}>Iniciar Sesión</TabButton>
              <TabButton active={mode === 'register'} onClick={() => { setMode('register'); setError(''); }}>Registrarse</TabButton>
            </div>

            {mode === 'login' ? (
              <>
                <LoginForm onSuccess={handleAuthSuccess} />
                <div className="mt-4 text-center">
                  <button onClick={handleForgotPassword} className="text-teal-600 hover:text-teal-700 text-sm dark:text-teal-400">¿Olvidaste tu contraseña?</button>
                </div>
              </>
            ) : (
              <RegisterForm onSuccess={handleRegisterSuccess} />
            )}

            {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function Feature({ color, title, desc }: { color: string; title: string; desc: string }) {
  const Icon = iconMap[color] || IoAlertCircleOutline;

  const bgColor = {
    teal: 'bg-teal-100 dark:bg-teal-900/20',
    blue: 'bg-blue-100 dark:bg-blue-900/20',
    purple: 'bg-purple-100 dark:bg-purple-900/20',
    orange: 'bg-orange-100 dark:bg-orange-900/20',
  }[color];

  const textColor = {
    teal: 'text-teal-600 dark:text-teal-400',
    blue: 'text-blue-600 dark:text-blue-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400',
  }[color];

  return (
    <div className="flex items-start gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${bgColor}`}>
        <Icon className={`w-6 h-6 ${textColor}`} />
      </div>
      <div>
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">{title}</h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm">{desc}</p>
      </div>
    </div>
  );
}

function TabButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void; }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors
        ${active
          ? 'bg-white dark:bg-teal-400 text-gray-900 dark:text-gray-100 shadow-sm'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-600'
        }`}
    >
      {children}
    </button>
  );
}

