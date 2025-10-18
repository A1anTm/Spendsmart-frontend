'use client';
import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import useRequireAuth from '@/app/hooks/useRequireAuth';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface SavingsGoal {
    _id: string;
    name: string;
    description: string;
    target_amount: number;
    current_amount: number;
    due_date: string;
    status: string;
    progress: number;
    monthly_quota: number;
}

interface CreateGoalForm {
    name: string;
    description: string;
    target_amount: string;
    due_date: string;
}

export default function SavingsGoalsPage() {
    const isAuthenticated = useRequireAuth();
    const { isAuthReady, showTokenExpiredModal, setShowTokenExpiredModal } = useAuth();
    const router = useRouter();

    const [goals, setGoals] = useState<SavingsGoal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState<CreateGoalForm>({ name: '', description: '', target_amount: '', due_date: '' });

    const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
    const [selectedGoalId, setSelectedGoalId] = useState<string>('');
    const [selectedGoalName, setSelectedGoalName] = useState<string>('');
    const [addMoneyAmount, setAddMoneyAmount] = useState<string>('');

    const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' | '' }>({ show: false, message: '', type: '' });

    const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
    const [addMoneyError, setAddMoneyError] = useState<string>('');

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    };

    const fetchGoals = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/savings');
            setGoals(res.data.goals || []);
        } catch (err: any) {
            if (err?.response?.status === 401) {
                setShowTokenExpiredModal(true);
                return;
            }
            console.error('Error al obtener las metas de ahorro:', err);
            showNotification('Error al cargar las metas de ahorro', 'error');
        } finally {
            setLoading(false);
        }
    }, [setShowTokenExpiredModal]);

        useEffect(() => {
            if (!isAuthenticated) return;
            fetchGoals();
           // fetchGoals está memoizado con useCallback. Para evitar que el array de dependencias
           // cambie de tamaño (y el error que viste), no lo incluimos aquí.
           // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]);

    useEffect(() => {
        if (!showTokenExpiredModal && isAuthenticated) {
            fetchGoals();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showTokenExpiredModal, isAuthenticated]);

    if (!isAuthReady) return <div className="p-6">Cargando sesión...</div>;
    if (isAuthenticated === false) {
        router.push('/');
        return null;
    }

    const validateCreate = (f: CreateGoalForm) => {
        const e: Record<string, string> = {};

        if (!f.name || f.name.trim().length === 0) e.name = 'El nombre es obligatorio';
        else {
            const name = f.name.trim();
            if (name.length < 3) e.name = 'El nombre debe tener al menos 3 caracteres';
            else if (name.length > 60) e.name = 'El nombre no puede superar 60 caracteres';
            else if (!/^[a-zA-Z0-9áéíóúüñÑ\s'-]+$/.test(name)) e.name = 'Caracteres no válidos en el nombre';
        }

        if (f.description && f.description.length > 250) e.description = 'La descripción no puede superar 250 caracteres';

        const amt = Number(f.target_amount);
        if (!Number.isFinite(amt) || amt <= 0) e.target_amount = 'El monto objetivo debe ser mayor a 0';

        if (!f.due_date) e.due_date = 'La fecha límite es obligatoria';
        else {
            const due = new Date(f.due_date);
            const today = new Date(); today.setHours(0, 0, 0, 0);
            if (isNaN(due.getTime())) e.due_date = 'Fecha inválida';
            else if (due <= today) e.due_date = 'La fecha límite debe ser futura';
        }

        return e;
    };

    const createGoal = async () => {
        const errs = validateCreate(createForm);
        setCreateErrors(errs);
        if (Object.keys(errs).length > 0) {
            showNotification('Corrige los campos del formulario antes de enviar', 'error');
            return;
        }

        try {
            await api.post('/savings', {
                ...createForm,
                target_amount: Number(createForm.target_amount),
            });
            setShowCreateModal(false);
            setCreateForm({ name: '', description: '', target_amount: '', due_date: '' });
            setCreateErrors({});
            showNotification('Meta de ahorro creada exitosamente', 'success');
            await fetchGoals();
        } catch (err: any) {
            console.error('Error al crear la meta de ahorro:', err);
            if (err?.response?.status === 401) setShowTokenExpiredModal(true);
            else {
                const msg = err?.response?.data?.message || 'Error al crear la meta de ahorro';
                showNotification(msg, 'error');
            }
        }
    };

    const addMoney = async () => {
        try {
            const amount = Number(addMoneyAmount);
            if (!Number.isFinite(amount) || amount <= 0) {
                setAddMoneyError('Monto inválido');
                showNotification('Monto inválido', 'error');
                return;
            }

            // verificación defensiva: chequear que la meta no esté completa antes de enviar
            const goalNow = goals.find(g => g._id === selectedGoalId);
            if (!goalNow) {
                showNotification('Meta no encontrada', 'error');
                return;
            }
            if (Number(goalNow.current_amount) >= Number(goalNow.target_amount)) {
                showNotification('La meta ya está alcanzada. No se puede agregar más dinero.', 'error');
                setShowAddMoneyModal(false);
                return;
            }

            setAddMoneyError('');

            const resp = await api.patch(
                `/savings/${selectedGoalId}/add-money`,
                { amount },
                { validateStatus: () => true }
            );

            if (resp.status === 200) {
                setShowAddMoneyModal(false);
                setAddMoneyAmount('');
                setSelectedGoalId('');
                setAddMoneyError('');
                showNotification('Dinero abonado exitosamente', 'success');
                await fetchGoals();
            } else {
                const msg = resp.data?.message || 'Error al abonar dinero';
                setAddMoneyError(msg);
                showNotification(msg, 'error');
            }
        } catch (err: any) {
            console.error('Error al abonar dinero:', err);
            if (err?.response?.status === 401) setShowTokenExpiredModal(true);
            else {
                const msg = err?.response?.data?.message || 'Error al abonar dinero';
                setAddMoneyError(msg);
                showNotification(msg, 'error');
            }
        }
    };

    const resetCreateForm = () => {
        setCreateForm({ name: '', description: '', target_amount: '', due_date: '' });
        setCreateErrors({});
    };

    const handleOpenAddMoneyModal = (goalId: string, goalName: string) => {
        // comprobación: si la meta ya está completa, no abrir modal
        const g = goals.find(x => x._id === goalId);
        if (!g) {
            showNotification('Meta no encontrada', 'error');
            return;
        }
        if (Number(g.current_amount) >= Number(g.target_amount)) {
            showNotification('La meta ya alcanzó su objetivo. No se puede agregar más dinero.', 'error');
            return;
        }

        setSelectedGoalId(goalId);
        setSelectedGoalName(goalName);
        setShowAddMoneyModal(true);
        setAddMoneyAmount('');
        setAddMoneyError('');
    };

    const calculateRemainingDays = (dueDate: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 ? diffDays + 1 : 0;
    };

    const deleteGoal = async (id: string) => {
        try {
            await api.delete(`/savings/${id}`);
            showNotification('Meta eliminada', 'success');
            await fetchGoals();
        } catch (err: any) {
            console.error(err);
            if (err?.response?.status === 401) setShowTokenExpiredModal(true);
            else showNotification('Error al eliminar meta', 'error');
        }
    };

    return (
        <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-800 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Metas de Ahorro</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-100">Establece y alcanza tus objetivos financieros</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                setShowCreateModal(true);
                                setCreateErrors({});
                                setCreateForm({ name: '', description: '', target_amount: '', due_date: '' });
                            }}
                            className="bg-purple-500 text-white px-4 py-2 rounded-md text-sm flex items-center gap-2 hover:bg-purple-600"
                        >
                            <span className="text-lg">+</span> Nueva Meta
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-56">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {goals.map((goal) => {
                            const current = Number(goal.current_amount || 0);
                            const target = Number(goal.target_amount || 0);
                            const isComplete = current >= target;

                            return (
                                <div key={goal._id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 flex flex-col">
                                    <div className="flex items-start justify-between">
                                        <div className="flex gap-3 items-start">
                                            <div className="bg-purple-100 p-2 rounded-lg shrink-0">
                                                <span className="text-purple-600">🎯</span>
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-medium text-gray-800 dark:text-gray-100 truncate">{goal.name}</h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-100 line-clamp-2">{goal.description}</p>
                                            </div>
                                        </div>
                                        {/* Fecha  badge cuando está completa */}
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="text-sm text-gray-500">{new Date(goal.due_date).toLocaleDateString()}</div>
                                            {isComplete && (
                                                <span
                                                    title="Meta alcanzada"
                                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800"
                                                >
                                                    Alcanzada
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>Progreso</span>
                                            <span>{Number(goal.progress || 0).toFixed(1)}%</span>
                                        </div>
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-teal-600 rounded-full transition-all" style={{ width: `${Math.min(Number(goal.progress || 0), 100)}%` }} />
                                        </div>
                                        <div className="flex justify-between text-sm mt-2 text-gray-700 dark:text-gray-100">
                                            <span>${Number(goal.current_amount || 0).toFixed(2)}</span>
                                            <span>${Number(goal.target_amount || 0).toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mt-4">
                                        <div className="bg-gray-50 p-3 rounded-lg text-center">
                                            {goal.status === 'vencida' ? (
                                                <>
                                                    <span className="block text-sm text-gray-600">Estado</span>
                                                    <span className="block font-medium text-red-500">Vencida</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="block text-sm text-gray-600 dark:text-gray-800">Días restantes</span>
                                                    <span className="block font-medium dark:text-gray-800 ">{calculateRemainingDays(goal.due_date)}</span>
                                                </>
                                            )}
                                        </div>

                                        <div className="bg-gray-50 p-3 rounded-lg text-center">
                                            <span className="block text-sm text-gray-600">Mensual requerido</span>
                                            <span className="block font-medium text-green-600">${Number(goal.monthly_quota || 0).toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex gap-2">
                                        {/* Si la meta NO está completa mostramos Agregar Dinero */}
                                        {!isComplete && (
                                            <button
                                                onClick={() => handleOpenAddMoneyModal(goal._id, goal.name)}
                                                className="w-full border border-gray-200 rounded-lg py-2 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-50 hover:dark:bg-gray-700"
                                            >
                                                + Agregar Dinero
                                            </button>
                                        )}

                                        {/* Eliminar (si la meta está completa se muestra con más énfasis) */}
                                        <button
                                            onClick={() => deleteGoal(goal._id)}
                                            className={`w-full rounded-lg py-2 text-sm transition ${isComplete
                                                    ? 'bg-red-600 text-white hover:bg-red-700 border border-red-700'
                                                    : 'border border-red-100 text-red-600 hover:bg-red-50 hover:dark:bg-gray-700'
                                                }`}
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-0">
                        <div
                            className="absolute inset-0 bg-black bg-opacity-50"
                            onClick={() => {
                                setShowCreateModal(false);
                                resetCreateForm();
                                setCreateErrors({});
                            }}
                        />
                        <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full z-10">
                            <h2 className="text-xl font-semibold mb-4">Crear nueva meta de ahorro</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-100">Título</label>
                                    <input
                                        type="text"
                                        value={createForm.name}
                                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-gray-100"
                                    />
                                    {createErrors.name && <p className="text-red-500 text-xs mt-1">{createErrors.name}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-100">Monto objetivo</label>
                                    <input
                                        type="number"
                                        value={createForm.target_amount}
                                        onChange={(e) => setCreateForm({ ...createForm, target_amount: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-gray-100"
                                    />
                                    {createErrors.target_amount && <p className="text-red-500 text-xs mt-1">{createErrors.target_amount}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-100">Fecha límite</label>
                                    <input
                                        type="date"
                                        value={createForm.due_date}
                                        onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-gray-100"
                                    />
                                    {createErrors.due_date && <p className="text-red-500 text-xs mt-1">{createErrors.due_date}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-100">Descripción</label>
                                    <textarea
                                        value={createForm.description}
                                        onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-gray-100"
                                    />
                                    {createErrors.description && <p className="text-red-500 text-xs mt-1">{createErrors.description}</p>}
                                </div>

                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => {
                                            setShowCreateModal(false);
                                            resetCreateForm();
                                        }}
                                        className="px-4 py-2 text-sm border border-gray-300 rounded-md"
                                    >
                                        Cancelar
                                    </button>

                                    {(() => {
                                        const errsNow = validateCreate(createForm);
                                        const isValidNow = Object.keys(errsNow).length === 0;
                                        return (
                                            <button
                                                onClick={createGoal}
                                                disabled={!isValidNow}
                                                className={`px-4 py-2 text-sm text-white rounded-md ${isValidNow ? '' : 'opacity-60 cursor-not-allowed'}`}
                                                style={{ background: 'linear-gradient(to right, #4ade80, #38bdf8)' }}
                                            >
                                                Crear Meta
                                            </button>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showAddMoneyModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-0">
                        <div
                            className="absolute inset-0 bg-black bg-opacity-50"
                            onClick={() => {
                                setShowAddMoneyModal(false);
                                setAddMoneyAmount('');
                                setAddMoneyError('');
                                setSelectedGoalId('');
                            }}
                        />
                        <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full z-10">
                            <h2 className="text-xl font-semibold mb-2">Agregar dinero a tu meta</h2>
                            <p className="text-sm text-gray-600 mb-4 dark:text-gray-100">{selectedGoalName}</p>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Monto a abonar</label>
                                <input
                                    type="number"
                                    value={addMoneyAmount}
                                    onChange={(e) => {
                                        setAddMoneyAmount(e.target.value);
                                        setAddMoneyError('');
                                    }}
                                    className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-gray-100"
                                />
                                {addMoneyError && <p className="text-red-500 text-xs mt-1">{addMoneyError}</p>}
                            </div>

                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    onClick={() => {
                                        setShowAddMoneyModal(false);
                                        setAddMoneyAmount('');
                                        setAddMoneyError('');
                                        setSelectedGoalId('');
                                    }}
                                    className="px-4 py-2 text-sm border border-gray-300 rounded-md"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={addMoney}
                                    className="px-4 py-2 text-sm text-white rounded-md"
                                    style={{ background: 'linear-gradient(to right, #4ade80, #38bdf8)' }}
                                >
                                    Abonar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {notification.show && (
                    <div
                        role="status"
                        aria-live="polite"
                        className="fixed bottom-4 left-4 p-3 rounded-md shadow-md z-50"
                        style={{ backgroundColor: notification.type === 'success' ? '#10b981' : '#ef4444', color: 'white' }}
                    >
                        {notification.message}
                    </div>
                )}
            </div>
        </div>
    );
}
