'use client';
import { useState, FormEvent, useEffect } from 'react';
import api from '@/lib/api';

const validateLogin = (f: { email: string; password: string }) => {
  const errors: Record<string, string> = {};
  if (!f.email) errors.email = 'El correo es obligatorio';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) errors.email = 'Formato de correo inválido';
  if (!f.password) errors.password = 'La contraseña es obligatoria';
  return errors;
};

interface Props {
  onSuccess: (token: string) => void;
}

export default function LoginForm({ onSuccess }: Props) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const errors = validateLogin(form);

  useEffect(() => {
    if (serverError) setServerError('');
  }, [form.email, form.password]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    setTouched({ email: true, password: true });

    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);
    try {
      const resp = await api.post('/users/auth/login', form, { validateStatus: () => true });
      const { status, data } = resp;

      if (status === 200 && data?.token) {
        const token: string = data.token;
        try {
          localStorage.setItem('token', token);
        } catch (err) {
          console.warn('No se pudo guardar token', err);
        }

        try {
          if (api.defaults && (api.defaults as any).headers && (api.defaults as any).headers.common) {
            (api.defaults as any).headers.common['Authorization'] = `Bearer ${token}`;
          } else {
            // fallback
            // @ts-ignore
            api.defaults = { ...(api.defaults || {}), headers: { Authorization: `Bearer ${token}` } };
          }
        } catch (e) {
          console.warn('No se pudo setear header default en api', e);
        }

        onSuccess(token);
        return;
      }

      let message = 'Error al iniciar sesión. Intenta nuevamente.';

      if (data) {
        if (typeof data === 'string') {
          message = data;
        } else if (data.email) {
          message = String(data.email);
        } else if (data.password) {
          message = String(data.password);
        } else if (data.message) {
          message = String(data.message);
        } else {
          try {
            message = JSON.stringify(data);
          } catch {
            message = 'Respuesta de error no reconocida del servidor';
          }
        }
      } else if (status === 401) {
        message = 'Credenciales inválidas. Verifica correo y contraseña.';
      } else if (status >= 400 && status < 500) {
        message = `Error ${status}. Revisa los datos ingresados.`;
      } else if (status >= 500) {
        message = 'Error del servidor. Intenta de nuevo más tarde.';
      }

      setServerError(message);

      console.debug('Login response status:', status);
      console.debug('Login response data:', data);
    } catch (err: any) {
      console.error('Login error (network):', err);
      setServerError('No se pudo conectar al servidor. ¿Está corriendo en http://localhost:3002 ?');
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = Object.keys(errors).length === 0 && Object.values(touched).every(Boolean);

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Correo Electrónico</label>
        <input
          name="email"
          type="email"
          placeholder="tu@email.com"
          value={form.email}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${touched.email && errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'}`}
        />
        {touched.email && errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Contraseña</label>
        <input
          name="password"
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyUp={() => setTouched((t) => ({ ...t, password: true }))}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${touched.password && errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'}`}
        />
        {touched.password && errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
      </div>

      {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

      <button
        type="submit"
        disabled={!isValid || isLoading}
        className={`w-full py-3 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isValid && !isLoading ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
      >
        {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
      </button>
    </form>
  );
}
