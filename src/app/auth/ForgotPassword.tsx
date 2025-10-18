'use client';
import { useState, FormEvent } from 'react';
import api from '@/lib/api';
import { getToken } from '@/lib/auth';

interface ForgotPasswordProps {
    onCodeSent: (email: string) => void;
    onBackToLogin: () => void;
}

export default function ForgotPassword({ onCodeSent, onBackToLogin }: ForgotPasswordProps) {
    const [email, setEmail] = useState('');
    const [serverError, setServerError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setServerError('');
        if (!email) return;
        setIsLoading(true);
        try {
            await api.post('/users/auth/forgot-password', { email }, { headers: { Authorization: `Bearer ${getToken()}` } });
            onCodeSent(email);
        } catch (err: any) {
            setServerError(err.response?.data?.message || 'Error al enviar el código de recuperación');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 md:p-8 w-full max-w-md mx-auto">
            <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center dark:text-gray-100">¿Olvidaste tu contraseña?</h2>
                <p className="text-gray-500 text-sm mb-4 text-center dark:text-gray-100">Ingresa tu email y te enviaremos un código de verificación.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-100">Correo Electrónico</label>
                    <input type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 border-gray-300 focus:ring-teal-500" />
                    <p className="text-xs text-gray-500 mt-1 dark:text-gray-100">Te enviaremos un código de verificación para crear una nueva contraseña.</p>
                </div>

                {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

                <button type="submit" disabled={!email || isLoading}
                    className="w-full py-3 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 bg-teal-500 text-white hover:bg-teal-600 flex items-center justify-center">
                    {isLoading ? 'Enviando...' : 'Enviar Código'}
                </button>

                <button type="button" onClick={onBackToLogin} className="w-full py-2 px-4 text-sm text-teal-600 hover:text-teal-700 flex items-center justify-center">
                    Volver al inicio de sesión
                </button>
            </form>

            
        </div>
    );
}
