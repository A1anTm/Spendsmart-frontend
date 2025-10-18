'use client';
import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import useRequireAuth from '@/app/hooks/useRequireAuth';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface Category {
  _id: string;
  name: string;
}

const validateBudgetForm = (
  category_id: string,
  month: string,
  limit: string,
  threshold: string
): { ok: false; msg: string } | { ok: true } => {
  if (!category_id) return { ok: false, msg: 'Selecciona una categoría' };
  if (!/^\d{4}-\d{2}$/.test(month)) return { ok: false, msg: 'El mes debe estar en formato AAAA-MM' };
  const [y, m] = month.split('-').map(Number);
  if (y < 2000 || y > 2100 || m < 1 || m > 12) return { ok: false, msg: 'Mes fuera de rango' };
  const lim = parseFloat(limit);
  if (isNaN(lim) || lim < 0.01) return { ok: false, msg: 'El límite debe ser mayor a 0' };
  const thr = parseInt(threshold, 10);
  if (isNaN(thr) || thr < 0 || thr > 100) return { ok: false, msg: 'El umbral debe estar entre 0 y 100' };
  return { ok: true };
};

interface Budget {
  _id: string;
  category: string;
  month: string;
  limit: number;
  threshold: number;
  isActive: boolean;
  spent: number;
  available: number;
  percentUsed: number;
  alert: boolean;
}

export default function BudgetControlPage() {
  const isAuthenticated = useRequireAuth();
  const { isAuthReady, showTokenExpiredModal, setShowTokenExpiredModal } = useAuth();
  const router = useRouter();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    category_id: '',
    month: new Date().toISOString().substring(0, 7),
    limit: '',
    threshold: '80',
  });

  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' | '' }>(
    { show: false, message: '', type: '' }
  );
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.post('/categories', { type: 'gasto' });
      setCategories(res.data.categories || []);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setShowTokenExpiredModal(true);
        return;
      }
      console.error('Error loading categories:', err);
      setError('No se pudieron cargar las categorías.');
    }
  }, [setShowTokenExpiredModal]);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/budgets');
      setBudgets(res.data.budgets || []);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setShowTokenExpiredModal(true);
        return;
      }
      console.error('Error loading budgets:', err);
      setError('No se pudieron cargar los presupuestos.');
    } finally {
      setLoading(false);
    }
  }, [setShowTokenExpiredModal]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchCategories();
    fetchBudgets();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!showTokenExpiredModal && isAuthenticated) {
      fetchCategories();
      fetchBudgets();
    }
  }, [showTokenExpiredModal, isAuthenticated, fetchCategories, fetchBudgets]);

  useEffect(() => {
    if (isAuthReady && isAuthenticated === false) {
      router.push('/');
    }
  }, [isAuthReady, isAuthenticated, router]);

  if (!isAuthReady) return <div className="p-6">Cargando sesión...</div>;
  if (isAuthenticated === false) return null;

  if (showTokenExpiredModal) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-xl font-semibold mb-4">Tu sesión ha expirado</h2>
          <p className="text-gray-600 mb-6">
            Se detectó que tu sesión expiró. Usa la modal para reanudar la sesión. Cuando se reanude volveremos a cargar los presupuestos.
          </p>
          <div className="flex items-center justify-center space-x-3">
            <div className="h-10 w-10 rounded-full border-t-4 border-b-4 animate-spin" />
            <span className="text-sm text-gray-500">Esperando acción...</span>
          </div>
        </div>
      </div>
    );
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const validation = validateBudgetForm(form.category_id, form.month, form.limit, form.threshold);
    if (!validation.ok) {
      setError(validation.msg);
      return;
    }
    try {
      setFormLoading(true);
      await api.post('/budgets', {
        category_id: form.category_id,
        month: form.month,
        limit: parseFloat(form.limit),
        threshold: parseInt(form.threshold, 10),
      });
      await fetchBudgets();
      setForm({
        category_id: '',
        month: new Date().toISOString().substring(0, 7),
        limit: '',
        threshold: '80',
      });
      showNotification('Presupuesto creado correctamente', 'success');
    } catch (err: any) {
      console.error('Error creating budget:', err);
      if (err?.response?.status === 401) setShowTokenExpiredModal(true);
      else if (err?.response?.status === 409) setError(err.response.data.message);
      else setError('Error al crear presupuesto');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleBudget = async (id: string) => {
    try {
      await api.patch(`/budgets/${id}/toggle`);
      await fetchBudgets();
    } catch (err: any) {
      console.error('Error toggling budget:', err);
      if (err?.response?.status === 401) setShowTokenExpiredModal(true);
      else setError('Error al cambiar estado del presupuesto');
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este presupuesto?')) return;
    try {
      await api.delete(`/budgets/${id}`);
      await fetchBudgets();
      showNotification('Presupuesto eliminado correctamente', 'success');
    } catch (err: any) {
      console.error('Error deleting budget:', err);
      if (err?.response?.status === 401) setShowTokenExpiredModal(true);
      else setError('Error al eliminar presupuesto');
    }
  };

  const getProgressColor = (p: number) => (p < 50 ? 'bg-emerald-500' : p < 80 ? 'bg-yellow-500' : 'bg-red-500');
  const getStatusText = (p: number) => (p < 80 ? 'Dentro del presupuesto' : p < 100 ? 'Cerca del límite' : 'Límite excedido');
  const getStatusColor = (p: number) => (p < 80 ? 'text-emerald-600' : p < 100 ? 'text-yellow-600' : 'text-red-600');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Control de Gastos</h1>
          <p className="text-gray-600 dark:text-gray-100">Configura límites y recibe alertas sobre tus gastos</p>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </header>

        {loading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
            <p className="mt-2 text-gray-600">Cargando presupuestos...</p>
          </div>
        ) : (
          <>
            <section className="bg-white dark:bg-gray-600  rounded-lg border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Estado de Presupuestos</h2>

              {budgets.length === 0 ? (
                <div className="text-center py-10 text-gray-600 dark:text-gray-100">No tienes presupuestos activos</div>
              ) : (
                <div className="space-y-6">

                  {budgets
                    .filter(Boolean)
                    .sort((a, b) => (a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1))
                    .map((budget) => (
                      <div key={budget._id} className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 dark:text-gray-100">
                          <div>
                            <h3 className="font-medium text-gray-800 dark:text-gray-100">{budget.category}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-100">
                              {budget.month} · Límite: ${budget.limit.toFixed(2)}
                            </p>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-sm font-medium mr-2">
                              <span className={`${getStatusColor(budget.percentUsed)}`}>{getStatusText(budget.percentUsed)}</span>
                            </div>
                            <div className="w-40 sm:w-64 bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`${getProgressColor(budget.percentUsed)} h-2 rounded-full transition-all`}
                                style={{ width: `${Math.min(budget.percentUsed, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-100">
                          <div>
                            <div>
                              Gastado: <span className="font-medium text-gray-800 dark:text-gray-100">${budget.spent.toFixed(2)}</span>
                            </div>
                            <div className="text-emerald-600">
                              Disponible: <span className="font-medium">${budget.available.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="text-right dark:text-gray-100">
                            <div className="text-gray-600 dark:text-gray-100">Límite: <span className="font-medium text-gray-800 dark:text-gray-100">${budget.limit.toFixed(2)}</span></div>
                            <div className="text-gray-500 dark:text-gray-100">{budget.percentUsed.toFixed(1)}%</div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-600  rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Agregar Presupuesto</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Categoría</label>
                    <select
                      name="category_id"
                      value={form.category_id}
                      onChange={handleFormChange}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-700  focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:bg-gray-700 dark:text-gray-100"
                    >
                      <option value="">Selecciona una categoría</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Mes</label>
                    <input
                      type="month"
                      name="month"
                      value={form.month}
                      onChange={handleFormChange}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Límite</label>
                    <input
                      type="number"
                      name="limit"
                      value={form.limit}
                      onChange={handleFormChange}
                      required
                      step="0.01"
                      min="0"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Umbral de alerta (%)</label>
                    <input
                      type="number"
                      name="threshold"
                      value={form.threshold}
                      onChange={handleFormChange}
                      min="1"
                      max="100"
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={formLoading}
                    className={`w-full ${formLoading ? 'bg-gray-400' : 'bg-emerald-500 hover:bg-emerald-600'} text-white py-3 px-4 rounded-md font-medium`}
                  >
                    {formLoading ? 'Creando...' : 'Crear Presupuesto'}
                  </button>
                </form>
              </div>

              <div className="bg-white dark:bg-gray-600 rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Gestionar Presupuestos</h2>
                {budgets.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-100 text-center">No tienes presupuestos configurados</p>
                ) : (
                  <div className="space-y-3">
                    {budgets.map((b) => (
                      <div key={b._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-gray-100 rounded-lg p-3 dark:text-gray-100s">
                        <div className="flex items-center gap-3">
                          <div
                            role="switch"
                            tabIndex={0}
                            aria-checked={b.isActive}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggleBudget(b._id); }}
                            onClick={() => handleToggleBudget(b._id)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors ${b.isActive ? 'bg-emerald-500' : 'bg-gray-200'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-800 transition-transform ${b.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-800 dark:text-gray-100">{b.category}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-100">Límite: ${b.limit.toFixed(2)} · Alerta: {b.threshold}% · {b.month}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">

                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {notification.show && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-4 left-4 p-3 rounded-md shadow-md z-50"
            style={{
              backgroundColor: notification.type === 'success' ? '#10b981' : '#ef4444',
              color: 'white',
            }}
          >
            {notification.message}
          </div>
        )}
      </div>
    </div>
  );
}
