'use client';
import React, { useState, useEffect, ChangeEvent, FormEvent, useCallback } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { JSX } from 'react/jsx-runtime';
import validator from 'validator';

const isValidPhone = (v: string) =>
  !v || /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/.test(v);

const isValidUrl = (u: string) =>
  !u || validator.isURL(u, { protocols: ['http','https'], require_protocol: true });

const validateProfile = (d: UserData) => {
  if (!d.full_name || d.full_name.length < 3 || d.full_name.length > 60)
    return 'El nombre debe tener entre 3 y 60 caracteres';
  if (!/^[a-zA-ZáéíóúüñÑ\s\'-]+$/.test(d.full_name))
    return 'El nombre contiene caracteres no válidos';
  if (d.bio && d.bio.length > 250) return 'La bio no puede superar 250 caracteres';
  if (d.phone_number && !isValidPhone(d.phone_number))
    return 'Número de teléfono inválido';
  for (const sc of d.social_accounts) {
    if (sc.account_url && !isValidUrl(sc.account_url))
      return `URL inválida en ${sc.provider}`;
  }
  return null;
};

const COUNTRIES = [
  "United States", "Canada", "Mexico", "United Kingdom", "Germany", "France", "Spain", "Italy",
  "Netherlands", "Belgium", "Switzerland", "Austria", "Sweden", "Norway", "Denmark", "Finland",
  "Ireland", "Portugal", "Poland", "Czech Republic", "Greece", "Turkey", "Russia", "China",
  "Japan", "South Korea", "India", "Pakistan", "Brazil", "Argentina", "Colombia", "Chile",
  "Peru", "Venezuela", "Australia", "New Zealand", "Indonesia", "Malaysia", "Philippines",
  "Thailand", "Vietnam", "Singapore", "Hong Kong", "Israel", "United Arab Emirates", "Saudi Arabia",
  "South Africa", "Nigeria", "Egypt", "Kenya", "Morocco", "Romania", "Hungary", "Bulgaria",
  "Slovakia", "Slovenia", "Estonia", "Lithuania", "Latvia", "Ukraine"
];

const validatePasswordFields = (current: string, nw: string, confirm: string) => {
  const e: Record<string, string> = {};
  if (!current) e.currentPassword = 'La contraseña actual es obligatoria';
  if (!nw) e.newPassword = 'La contraseña nueva es obligatoria';
  else {
    if (nw.length < 8) e.newPassword = 'Mínimo 8 caracteres';
    else if (nw.length > 128) e.newPassword = 'Máximo 128 caracteres';
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/.test(nw))
      e.newPassword = 'Debe incluir mayúscula, minúscula, número y símbolo';
  }
  if (current && nw && current === nw) e.newPassword = 'La nueva contraseña debe ser diferente a la actual';
  if (!confirm) e.confirmPassword = 'Confirma la contraseña';
  else if (nw && nw !== confirm) e.confirmPassword = 'No coinciden';
  return e;
};


interface SocialAccount {
  provider: string;
  account_url: string;
}

interface UserData {
  full_name: string;
  phone_number: string;
  country: string;
  birthdate: string;
  bio: string;
  social_accounts: SocialAccount[];
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationProps {
  message: string;
  type: 'error' | 'success';
}

export default function ProfileSettingsPage(): JSX.Element {
  const { setShowTokenExpiredModal } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'perfil' | 'seguridad'>('perfil');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [userData, setUserData] = useState<UserData>({
    full_name: '',
    phone_number: '',
    country: '',
    birthdate: '',
    bio: '',
    social_accounts: [],
  });

  const [passwordData, setPasswordData] = useState<PasswordData>({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' | '' }>({
    show: false,
    message: '',
    type: '',
  });
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

    const fetchUserData = useCallback(async (): Promise<void> => {
      try {
        setLoading(true);
        setError('');
        setSuccess('');
        const res = await api.get('/users');
        const data = res.data?.user ?? res.data;
        if (!data) throw new Error('Respuesta inesperada del servidor');

        setUserData({
          full_name: data.full_name || '',
          phone_number: data.phone_number || '',
          country: data.country ? String(data.country).trim() : '',
          birthdate: data.birthdate ? new Date(data.birthdate).toISOString().split('T')[0] : '',
          bio: data.bio || '',
          social_accounts: Array.isArray(data.social_accounts) ? data.social_accounts : [],
        });
      } catch (err: any) {
        if (err?.response?.status === 401) {
          setShowTokenExpiredModal(true);
          return;
        }
        console.error('Error fetching user data:', err);
        setError('Error al obtener datos de usuario');
      } finally {
        setLoading(false);
      }
    }, [setShowTokenExpiredModal]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
  const { name, value } = e.target;
  setUserData((prev) => ({ ...prev, [name]: value } as unknown as UserData));
  };

  const handleSocialAccountChange = (index: number, field: keyof SocialAccount, value: string): void => {
    setUserData((prev) => {
      const updated = [...prev.social_accounts];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, social_accounts: updated };
    });
  };

  const addSocialAccount = (): void => {
    setUserData((prev) => ({ ...prev, social_accounts: [...prev.social_accounts, { provider: '', account_url: '' }] }));
  };

  const removeSocialAccount = (index: number): void => {
    setUserData((prev) => {
      const updated = [...prev.social_accounts];
      updated.splice(index, 1);
      return { ...prev, social_accounts: updated };
    });
  };

  const updateProfile = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const err = validateProfile(userData);
    if (err) { setError(err); showNotification(err, 'error'); return; }
    try {
      setSaving(true);
      const payload = {
      ...userData,
      country: userData.country ? String(userData.country).trim() : ''
    };
      const res = await api.put('/users', payload);

      const returned = res.data?.user ?? res.data;
      if (returned) {
        setUserData({
          full_name: returned.full_name || '',
          phone_number: returned.phone_number || '',
          country: returned.country || '',
          birthdate: returned.birthdate ? new Date(returned.birthdate).toISOString().split('T')[0] : '',
          bio: returned.bio || '',
          social_accounts: Array.isArray(returned.social_accounts) ? returned.social_accounts : [],
        });
      }
      setSuccess('Perfil actualizado con éxito');
      showNotification('Perfil actualizado', 'success');
    } catch (err: any) {
      console.error('Error updating profile:', err);
      if (err?.response?.status === 401) setShowTokenExpiredModal(true);
      else {
        setError(err?.response?.data?.message || 'Error al actualizar el perfil');
        showNotification(err?.response?.data?.message || 'Error al actualizar el perfil', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    const updated = { ...passwordData, [name]: value };
    setPasswordData(updated);

    const errs = validatePasswordFields(updated.currentPassword, updated.newPassword, updated.confirmPassword);
    setPasswordErrors(errs);
  };

  const changePassword = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const errs = validatePasswordFields(passwordData.currentPassword, passwordData.newPassword, passwordData.confirmPassword);
    setPasswordErrors(errs);
    if (Object.keys(errs).length > 0) {
      const first = Object.values(errs)[0];
      setError(first || 'Corrige los campos de contraseña');
      showNotification(first || 'Corrige los campos de contraseña', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = { currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword };
      const res = await api.put('/users/change-password', payload, {
      headers: { 'x-skip-token-modal': '1' }
    });

      setSuccess(res.data?.message || 'Contraseña actualizada con éxito');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordErrors({});
      showNotification(res.data?.message || 'Contraseña actualizada', 'success');
    } catch (err: any) {
      console.error('Error changing password:', err);
      
      if (!err.response) {
      // err.request existe cuando hubo petición pero no respuesta
      console.error('Request info:', err.request);
      setError('No se pudo conectar con el servidor. Revisa tu conexión o el backend (CORS / servidor).');
      showNotification('No se pudo conectar con el servidor.', 'error');
      return;
    }

    if (err.response?.status === 401) {
      setShowTokenExpiredModal(true);
      return;
    }

    const serverMessage = err?.response?.data?.message;
    setError(serverMessage || 'Error al cambiar la contraseña');
    showNotification(serverMessage || 'Error al cambiar la contraseña', 'error');
      
    } finally {
      setSaving(false);
    }
  };

  const getUserInitials = (): string => {
    if (!userData.full_name) return 'U';
    return userData.full_name
      .split(' ')
      .map((n) => n[0] ?? '')
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const Notification = ({ message, type }: NotificationProps): JSX.Element | null => {
    if (!message) return null;
    return (
      <div role="status" aria-live="polite" className={`p-3 rounded-md mb-4 ${type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
        {message}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 min-h-screen p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Configuración de Perfil</h1>
          <p className="text-sm text-gray-600 dark:text-gray-100">Gestiona tu información personal y preferencias</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('perfil')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeTab === 'perfil' ? 'bg-white dark:bg-gray-800 shadow-sm border' : 'text-gray-600 hover:bg-gray-100'}`}
              type="button"
              aria-pressed={activeTab === 'perfil'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Perfil
            </button>

            <button
              onClick={() => setActiveTab('seguridad')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeTab === 'seguridad' ? 'bg-white dark:bg-gray-800 shadow-sm border' : 'text-gray-600 hover:bg-gray-100'}`}
              type="button"
              aria-pressed={activeTab === 'seguridad'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Seguridad
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center text-white text-lg font-semibold">
              {getUserInitials()}
            </div>
          </div>
        </div>

        {error && <Notification message={error} type="error" />}
        {success && <Notification message={success} type="success" />}
        {notification.show && (
          <div role="status" aria-live="polite" className="fixed bottom-4 left-4 p-3 rounded-md shadow-md z-50" style={{ backgroundColor: notification.type === 'success' ? '#10b981' : '#ef4444', color: 'white' }}>
            {notification.message}
          </div>
        )}

        {activeTab === 'perfil' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 sm:p-6">
            <div className="mb-4 sm:flex sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Información Personal</h2>
                <p className="text-sm text-gray-600 dark:text-gray-100">Actualiza tu información básica</p>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
              </div>
            ) : (
              <form onSubmit={updateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-100">Nombre Completo</label>
                    <input name="full_name" value={userData.full_name} maxLength={150} onChange={handleInputChange} disabled={saving} className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-gray-100" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-100">Teléfono</label>
                    <input name="phone_number" maxLength={11} value={userData.phone_number} onChange={handleInputChange} disabled={saving} className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-gray-100" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-100">País</label>
                    <select
                      name="country"
                      value={userData.country}
                      onChange={handleInputChange}
                      disabled={saving}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-gray-100"
                    >
                      <option value="">Selecciona un país</option>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-100">Fecha de Nacimiento</label>
                    <input name="birthdate" type="date" value={userData.birthdate} onChange={handleInputChange} disabled={saving} className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-gray-100" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-100">Bio</label>
                    <textarea name="bio" value={userData.bio} maxLength={250} onChange={handleInputChange} rows={3} disabled={saving} className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-gray-100" />
                  </div>
                </div>

                <div>
                  <h3 className="text-md font-semibold text-gray-800 mb-2 dark:text-gray-100">Redes Sociales</h3>
                  <div className="space-y-3">
                    {userData.social_accounts.length === 0 && (
                      <div className="text-sm text-gray-500 dark:bg-gray-700 dark:text-gray-100">Añade tus perfiles sociales (opcional).</div>
                    )}

                    {userData.social_accounts.map((account, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <select
                          value={account.provider}
                          onChange={(e) => handleSocialAccountChange(idx, 'provider', e.target.value)}
                          disabled={saving}
                          className="w-full sm:w-1/3 px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-gray-100"
                        >
                          <option value="">Seleccionar red</option>
                          <option value="twitter">Twitter</option>
                          <option value="linkedin">LinkedIn</option>
                          <option value="facebook">Facebook</option>
                          <option value="instagram">Instagram</option>
                        </select>

                        <input
                          maxLength={200}
                          type="url"
                          value={account.account_url}
                          onChange={(e) => handleSocialAccountChange(idx, 'account_url', e.target.value)}
                          placeholder="URL del perfil"
                          disabled={saving}
                          className="w-full sm:flex-1 px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-gray-100"
                        />

                        <button
                          type="button"
                          onClick={() => removeSocialAccount(idx)}
                          disabled={saving}
                          className="mt-2 sm:mt-0 inline-flex items-center justify-center bg-red-100 text-red-600 p-2 rounded-md hover:bg-red-200"
                          aria-label={`Eliminar cuenta social ${idx + 1}`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}

                    <div>
                      <button type="button" onClick={addSocialAccount} disabled={saving} className="mt-2 text-teal-600 flex items-center gap-1 hover:text-teal-800">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Añadir red social
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="mt-4 w-full bg-teal-500 text-white py-2 px-4 rounded-md hover:bg-teal-600 flex items-center justify-center gap-2"
                    aria-label="Guardar cambios de perfil"
                  >
                    {saving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Guardar Cambios
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {activeTab === 'seguridad' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Seguridad de la Cuenta</h2>
              <p className="text-sm text-gray-600 dark:text-gray-100">Actualiza tu contraseña</p>
            </div>

            <form onSubmit={changePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-100">Contraseña Actual</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-gray-100"
                  required
                  disabled={saving}
                />
                {passwordErrors.currentPassword && <p className="text-red-500 text-xs mt-1">{passwordErrors.currentPassword}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-100">Nueva Contraseña</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-gray-100"
                  required
                  disabled={saving}
                />
                <ul className="text-xs text-gray-500 mt-1 list-disc ml-4 dark:text-gray-100">
                  <li>Entre 8 y 128 caracteres</li>
                  <li>Al menos una mayúscula, una minúscula, un número y un símbolo</li>
                  <li>Debe ser diferente a la contraseña actual</li>
                </ul>
                {passwordErrors.newPassword && <p className="text-red-500 text-xs mt-1">{passwordErrors.newPassword}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-100">Confirmar Nueva Contraseña</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-gray-100"
                  required
                  disabled={saving}
                />
                {passwordErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{passwordErrors.confirmPassword}</p>}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-teal-500 text-white py-2 px-4 rounded-md hover:bg-teal-600 flex items-center justify-center gap-2"
                >
                  {saving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Actualizar Contraseña
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
