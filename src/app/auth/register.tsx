'use client';
import { useState, FormEvent, useMemo } from 'react';
import api from '@/lib/api';

const validateRegister = (f: { fullName: string; email: string; password: string; confirmPassword: string }) => {
    const e: Record<string, string> = {};
    if (!f.fullName) e.fullName = 'El nombre es obligatorio';
    else if (f.fullName.length < 3) e.fullName = 'Mínimo 3 caracteres';
    else if (f.fullName.length > 60) e.fullName = 'Máximo 60 caracteres';
    else if (!/^[a-zA-ZáéíóúüñÑ\s'-]+$/.test(f.fullName)) e.fullName = 'Caracteres no válidos';

    if (!f.email) e.email = 'El correo es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Formato de correo inválido';

    if (!f.password) e.password = 'La contraseña es obligatoria';
    else if (f.password.length < 8) e.password = 'Mínimo 8 caracteres';
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/.test(f.password)) e.password = 'Debe incluir mayúscula, minúscula, número y símbolo';

    if (!f.confirmPassword) e.confirmPassword = 'Confirma la contraseña';
    else if (f.password !== f.confirmPassword) e.confirmPassword = 'No coinciden';

    return e;
};

interface Props { onSuccess: (token: string) => void; }

export default function RegisterForm({ onSuccess }: Props) {
    const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
    const [touched, setTouched] = useState<Record<keyof typeof form, boolean>>({ fullName: false, email: false, password: false, confirmPassword: false });
    const [backendErrors, setBackendErrors] = useState<Record<string, string>>({});
    const [serverError, setServerError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const errors = useMemo(() => ({ ...validateRegister(form), ...backendErrors }), [form, backendErrors]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((p) => ({ ...p, [name]: value }));
        if (backendErrors[name]) {
            setBackendErrors((p) => {
                const { [name]: _, ...rest } = p;
                return rest;
            });
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name } = e.target as { name: keyof typeof touched };
        setTouched((p) => ({ ...p, [name]: true }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setServerError('');
        setBackendErrors({});
        setIsLoading(true);

        setTouched({ fullName: true, email: true, password: true, confirmPassword: true });

        if (Object.keys(validateRegister(form)).length > 0) {
            setIsLoading(false);
            return;
        }

        try {
            const { data } = await api.post('/users/auth/register', {
                full_name: form.fullName,
                email: form.email,
                password: form.password,
            });

            onSuccess(data?.token || '');
        } catch (err: any) {
            const status = err.response?.status;
            const msg: string = (err.response?.data?.message || err.response?.data?.messages?.[0] || 'Error al registrarse');

            const map: Record<string, string> = {};
            const msgs: string[] = err.response?.data?.messages || [];
            msgs.forEach((m: string) => {
                const lower = m.toLowerCase();
                if (lower.includes('nombre')) map.fullName = m;
                else if (lower.includes('correo') || lower.includes('email')) map.email = m;
                else if (lower.includes('contraseña') || lower.includes('password')) map.password = m;
            });

            if (status === 409 && /correo|email/i.test(msg)) {
                map.email = msg;
            }

            setTouched({ fullName: true, email: true, password: true, confirmPassword: true });

            const isFieldError = Object.keys(map).length > 0;
            if (isFieldError) setBackendErrors(map);
            else setServerError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const isValid = Object.keys(validateRegister(form)).length === 0;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-100">Nombre completo</label>
                <input name="fullName" type="text" placeholder="Tu nombre" value={form.fullName} onChange={handleChange} onBlur={handleBlur}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${touched.fullName && errors.fullName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'}`} />
                {touched.fullName && errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-100">Correo electrónico</label>
                <input name="email" type="email" placeholder="tu@email.com" value={form.email} onChange={handleChange} onBlur={handleBlur}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${touched.email && errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'}`} />
                {touched.email && errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-100">Contraseña</label>
                <input name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} onBlur={handleBlur}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${touched.password && errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'}`} />
                {touched.password && errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-100">Confirmar contraseña</label>
                <input name="confirmPassword" type="password" placeholder="••••••••" value={form.confirmPassword} onChange={handleChange} onBlur={handleBlur}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${touched.confirmPassword && errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'}`} />
                {touched.confirmPassword && errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>

            {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

            <button type="submit" disabled={!isValid || isLoading}
                className={`w-full py-3 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isValid && !isLoading ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                {isLoading ? 'Creando cuenta…' : 'Crear Cuenta'}
            </button>
        </form>
    );
}
