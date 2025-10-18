'use client';
import { useState, FormEvent } from 'react';
import api from '@/lib/api';
import { getToken } from '@/lib/auth';

const validatePassword = (pwd: string) => {
    if (!pwd) return 'La contraseña es obligatoria';
    if (pwd.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/.test(pwd)) return 'Debe incluir mayúscula, minúscula, número y símbolo';
    return '';
};

interface ResetPasswordProps {
    email: string;
    onPasswordReset: () => void;
    onChangeEmail: () => void;
}

export default function ResetPassword({ email, onPasswordReset, onChangeEmail }: ResetPasswordProps) {
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [serverError, setServerError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [codeTouched, setCodeTouched] = useState(false);
    const [passwordTouched, setPasswordTouched] = useState(false);

    const passwordError = validatePassword(password);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setServerError('');
        setCodeTouched(true);
        setPasswordTouched(true);

        if (!code || !password || passwordError) return;

        setIsLoading(true);
        try {
            await api.post('/users/auth/reset-password', { code, password }, { headers: { Authorization: `Bearer ${getToken()}` } });
            onPasswordReset();
        } catch (err: any) {
            setServerError(err.response?.data?.message || 'Error al restablecer la contraseña');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendCode = async () => {
        try {
            await api.post('/users/auth/forgot-password', { email }, { headers: { Authorization: `Bearer ${getToken()}` } });
            setServerError('Se ha reenviado el código a tu correo');
        } catch (err: any) {
            setServerError(err.response?.data?.message || 'Error al reenviar el código');
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 md:p-8 w-full max-w-md mx-auto">
            <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center dark:text-gray-100">Código de Verificación</h2>
                <p className="text-gray-500 text-sm mb-4 text-center">Ingresa el código de 6 dígitos que enviamos a tu email</p>
            </div>

            <div className="mb-4 bg-blue-50 p-3 rounded-md">
                <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="ml-2">
                        <p className="text-sm text-blue-800">Código enviado a <span className="font-semibold">{email}</span></p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-100">Código de Verificación</label>
                    <input type="text" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} onBlur={() => setCodeTouched(true)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-100">Nueva Contraseña</label>
                    <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => setPasswordTouched(true)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${passwordTouched && passwordError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-teal-500'}`} />
                    {passwordTouched && passwordError && <p className="text-red-500 text-xs mt-1">{passwordError}</p>}
                </div>

                {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

                <button type="submit" disabled={!code || !password || Boolean(passwordError) || isLoading}
                    className={`w-full py-3 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 ${!code || !password || Boolean(passwordError) ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-teal-500 text-white hover:bg-teal-600'}`}>
                    {isLoading ? 'Verificando...' : 'Verificar Código'}
                </button>

                <div className="flex justify-between">
                    <button type="button" onClick={onChangeEmail} className="text-teal-600 hover:text-teal-700 flex items-center text-sm">Cambiar email</button>
                    <button type="button" onClick={handleResendCode} className="text-teal-600 hover:text-teal-700 text-sm">Reenviar código</button>
                </div>
            </form>
        </div>
    );
}
