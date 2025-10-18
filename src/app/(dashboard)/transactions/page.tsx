'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AxiosError } from 'axios';
import { IoCashOutline } from 'react-icons/io5';
import { useAuth } from '@/app/contexts/AuthContext';

interface Tx {
    _id: string;
    type: 'gasto' | 'ingreso';
    amount: number;
    description: string;
    date: string;
    category: string;
    category_id?: string;
}

interface Category {
    _id: string;
    name: string;
    appliesTo?: 'gasto' | 'ingreso';
}

export default function TransactionsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setShowTokenExpiredModal } = useAuth();

    const [transactions, setTransactions] = useState<Tx[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    // control de vistas (form vs lista)
    const [showForm, setShowForm] = useState(true);

    // bloqueo para evitar múltiples envíos
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [notification, setNotification] = useState({
        show: false,
        message: '',
        type: '' as 'success' | 'error' | '',
    });

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification({ show: false, message: '', type: '' });
        }, 3000);
    };

    const [form, setForm] = useState({
        type: 'gasto' as 'gasto' | 'ingreso',
        amount: '',
        description: '',
        category_id: '',
        date: new Date().toLocaleDateString('en-CA'),
    });

    const [filters, setFilters] = useState({
        type: '' as 'gasto' | 'ingreso' | '',
        categoryName: '',
        startDate: '',
        endDate: '',
        page: 1,
        limit: 20,
    });
    const [total, setTotal] = useState(0);

    const token = () => localStorage.getItem('token');

    const formCategories = allCategories.filter(
        (cat) => !form.type || !cat.appliesTo || cat.appliesTo === form.type
    );

    const filterCategories = allCategories.filter(
        (cat) => !filters.type || !cat.appliesTo || cat.appliesTo === (filters.type || undefined)
    );

    const validateTransaction = (f: typeof form) => {
        const e: Record<string, string> = {};

        if (!['gasto', 'ingreso'].includes(f.type)) e.type = 'Tipo inválido';

        const num = Number(f.amount);
        if (!Number.isFinite(num) || num <= 0) e.amount = 'El monto debe ser mayor a 0';

        if (!f.date) e.date = 'La fecha es obligatoria';
        else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const [y, m, d] = f.date.split('-').map(Number);
            const selected = new Date(y, m - 1, d); // meses empiezan en 0

            if (isNaN(selected.getTime())) e.date = 'Fecha inválida';
            else if (selected < today) e.date = 'No se permiten fechas anteriores a hoy';
        }

        if (f.description && f.description.length > 250) e.description = 'La descripción no puede superar 250 caracteres';

        if (f.category_id && f.category_id.trim() === '') e.category_id = 'Categoría inválida';

        return e;
    };

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const isFormValid = Object.keys(validateTransaction(form)).length === 0;

    const buildBody = () => ({
        type: filters.type || undefined,
        ...(filters.categoryName && { categoryName: filters.categoryName }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        page: filters.page,
        limit: filters.limit,
    });

    // load categories once
    useEffect(() => {
        const t = token();
        if (!t) return;

        const loadGastoCategories = api.post(
            '/categories',
            { type: 'gasto' },
            { headers: { Authorization: `Bearer ${t}` } }
        );

        const loadIngresoCategories = api.post(
            '/categories',
            { type: 'ingreso' },
            { headers: { Authorization: `Bearer ${t}` } }
        );

        Promise.all([loadGastoCategories, loadIngresoCategories])
            .then(([gastoRes, ingresoRes]) => {
                const gastoCategories = gastoRes.data.categories.map((cat: Category) => ({
                    ...cat,
                    appliesTo: 'gasto' as const,
                }));

                const ingresoCategories = ingresoRes.data.categories.map((cat: Category) => ({
                    ...cat,
                    appliesTo: 'ingreso' as const,
                }));

                setAllCategories([...gastoCategories, ...ingresoCategories]);
            })
            .catch((err) => console.error('Error al cargar categorías:', err));
    }, []);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        const t = token();

        try {
            const { data } = await api.post('/transactions/filter', buildBody(), {
                headers: { Authorization: `Bearer ${t}` },
            });

            setTransactions(data.transactions || []);
            setTotal(data.total || 0);
        } catch (err: any) {
            if (err?.response?.status === 401) {
                setShowTokenExpiredModal(true);
                return;
            }
            console.error('Error fetching transactions:', err);
            setTransactions([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [filters, setShowTokenExpiredModal]);

    const goToPage = (newPage: number) => {
        setFilters((prev) => ({ ...prev, page: newPage }));
    };

    const totalPages = Math.ceil(total / filters.limit);
    const hasNextPage = filters.page < totalPages;
    const hasPrevPage = filters.page > 1;

    // read URL query params and set view/filters accordingly
    useEffect(() => {
        const viewParam = searchParams?.get('view'); // 'add' | 'list' | null
        const filterParam = searchParams?.get('filter'); // 'gasto' | 'ingreso' | category name ?

        if (viewParam === 'list') {
            setShowForm(false);
        } else if (viewParam === 'add') {
            setShowForm(true);
        }

        // if filter param indicates type 'gasto' or 'ingreso', set type filter
        if (filterParam === 'gasto' || filterParam === 'ingreso') {
            setFilters((prev) => ({ ...prev, type: filterParam, page: 1 }));
        } else if (filterParam) {
            // if filter is a category name, set categoryName
            setFilters((prev) => ({ ...prev, categoryName: filterParam, page: 1 }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    // when filters change (or showForm switches to list) fetch
    useEffect(() => {
        if (!showForm) {
            fetchTransactions();
        }
    }, [filters, showForm, fetchTransactions]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'type') {
            setForm((prev) => ({ ...prev, type: value as 'gasto' | 'ingreso', category_id: '' }));
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'type') {
            setFilters((prev) => ({ ...prev, type: value as 'gasto' | 'ingreso' | '', categoryName: '', page: 1 }));
        } else {
            setFilters((prev) => ({ ...prev, [name]: value, page: 1 }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return; // evita reentradas

        const errors = validateTransaction(form);
        setFormErrors(errors);
        if (Object.keys(errors).length > 0) {
            showNotification('Corrige los campos del formulario antes de enviar', 'error');
            return;
        }

        const t = token();
        if (!t) {
            setShowTokenExpiredModal(true); // ← sin token, abre modal
            return;
        }
        try {
            setIsSubmitting(true);
            const dateTimeLocal = form.date + 'T' + new Date().toTimeString().slice(0, 8);
            await api.post(
                '/transactions',
                { ...form, amount: Number(form.amount), date: dateTimeLocal },
                { headers: { Authorization: `Bearer ${t}` } }
            );
            setForm({ ...form, amount: '', description: '', category_id: '' });
            // after creating, show list and refresh (and update URL)
            router.push('/transactions?view=list');
            showNotification('Transacción creada', 'success');
        } catch (err: any) {
            if (err?.response?.status === 401) {
                setShowTokenExpiredModal(true);
                return;
            }
            const error = err as AxiosError<{ message?: string }>;
            const msg = error.response?.data?.message || 'Error al agregar la transacción';
            showNotification(msg, 'error');
        } finally {
            // desactivar el bloqueo (si la navegación ocurre, el componente se desmontará)
            setIsSubmitting(false);
        }
    };

    // toggleView ahora actualiza URL, la effect de searchParams se encargará de cambiar showForm
    const toggleView = () => {
        if (showForm) {
            // queremos ver la lista
            router.push('/transactions?view=list');
        } else {
            router.push('/transactions?view=add');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-800 flex">
            {notification.show && (
                <div
                    className={`fixed bottom-4 left-4 px-4 py-3 rounded shadow text-white text-sm z-50 ${notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'
                        }`}
                >
                    {notification.message}
                </div>
            )}

            <main className="flex-1 p-6 max-w-5xl mx-auto">
                <div className="bg-white dark:bg-gray-600 border-b px-6 py-4 mb-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Gestión de Gastos</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-100">Agregar y administrar tus transacciones</p>
                    </div>
                    <button
                        onClick={toggleView}
                        className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {showForm ? 'Ver Transacciones' : 'Nueva Transacción'}
                    </button>
                </div>

                {showForm && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6 mb-6">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Nueva Transacción</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Tipo</label>
                                    <select
                                        name="type"
                                        value={form.type}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 border dark:bg-gray-700 dark:text-gray-100 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="gasto" className="dark:text-gray-100">
                                            Gasto
                                        </option>
                                        <option value="ingreso" className="dark:text-gray-100">
                                            Ingreso
                                        </option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Monto</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="amount"
                                        value={form.amount}
                                        onChange={handleFormChange}
                                        placeholder="0.00"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                                    />
                                    {formErrors.amount && <p className="text-red-500 text-xs mt-1">{formErrors.amount}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Descripción</label>
                                    <input
                                        type="text"
                                        name="description"
                                        value={form.description}
                                        onChange={handleFormChange}
                                        placeholder="Describe la transacción"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Categoría</label>
                                    <select
                                        name="category_id"
                                        value={form.category_id}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 border dark:bg-gray-700 dark:text-gray-100 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="" className="dark:text-gray-100">
                                            Selecciona una categoría
                                        </option>
                                        {formCategories.map((c) => (
                                            <option key={c._id} value={c._id} className="dark:text-gray-100">
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Fecha</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={form.date}
                                    onChange={handleFormChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!isFormValid || isSubmitting}
                                aria-busy={isSubmitting}
                                className={`w-full py-3 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isFormValid || isSubmitting
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-80'
                                        : 'bg-gradient-to-r from-green-500 to-blue-600 text-white hover:from-blue-600 hover:to-green-700'
                                    }`}
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25" />
                                            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                                        </svg>
                                        Cargando...
                                    </span>
                                ) : (
                                    'Agregar Transacción'
                                )}
                            </button>
                        </form>
                    </div>
                )}

                {!showForm && (
                    <>
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 mb-6">
                            <h3 className="font-medium text-gray-800  dark:text-gray-100 mb-3">Filtros y Búsqueda</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Tipo</label>
                                    <select
                                        name="type"
                                        value={filters.type}
                                        onChange={handleFilterChange}
                                        className="w-full px-3 py-2 border dark:bg-gray-700 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="" className="dark:text-gray-100">
                                            Todos los tipos
                                        </option>
                                        <option value="gasto" className="dark:text-gray-100">
                                            Gastos
                                        </option>
                                        <option value="ingreso" className="dark:text-gray-100">
                                            Ingresos
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-70 dark:text-gray-100 mb-1">Categoría</label>
                                    <select
                                        name="categoryName"
                                        value={filters.categoryName}
                                        onChange={handleFilterChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                                    >
                                        <option value="" className="dark:text-gray-100">
                                            Todas las categorías
                                        </option>
                                        {filterCategories.map((c) => (
                                            <option key={c._id} value={c.name} className="dark:text-gray-100">
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Desde</label>
                                    <input
                                        type="date"
                                        name="startDate"
                                        value={filters.startDate}
                                        onChange={handleFilterChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">Hasta</label>
                                    <input
                                        type="date"
                                        name="endDate"
                                        value={filters.endDate}
                                        onChange={handleFilterChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                                    />
                                </div>

                                <div>
                                    <button
                                        onClick={fetchTransactions}
                                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        Buscar
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
                            <div className="p-4 border-b flex items-center justify-between">
                                <h3 className="font-medium text-gray-800 dark:text-gray-100">Lista de Transacciones</h3>
                                <span className="text-sm text-blue-600">{total} resultado(s)</span>
                            </div>

                            {loading ? (
                                <div className="p-6 text-center">
                                    <p>Cargando...</p>
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="p-6 text-center text-gray-500">No se encontraron transacciones con los filtros aplicados.</div>
                            ) : (
                                <div className="divide-y">
                                    {transactions.map((tx) => (
                                        <div key={tx._id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-600">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-8 h-8 rounded-md flex items-center justify-center ${tx.type === 'ingreso' ? 'bg-emerald-100' : 'bg-blue-100'}`}
                                                >
                                                    <IoCashOutline
                                                        className={`w-4 h-4 ${tx.type === 'ingreso' ? 'text-emerald-600' : 'text-green-600'}`}
                                                    />
                                                </div>

                                                <div>
                                                    <h4 className="font-medium text-gray-800 dark:text-gray-100">{tx.description || 'Sin descripción'}</h4>
                                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                                        <span
                                                            className={`px-2 py-1 rounded text-xs font-medium ${tx.type === 'ingreso' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                                                }`}
                                                        >
                                                            {tx.type === 'ingreso' ? 'Ingreso' : 'Gasto'}
                                                        </span>
                                                        <span>•</span>
                                                        <span>{tx.category}</span>
                                                        <span>•</span>
                                                        <span>{tx.date.slice(0, 10).split('-').reverse().join('/')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className={`font-semibold ${tx.type === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {tx.type === 'ingreso' ? '+' : '-'}${tx.amount.toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Paginación */}
                            {!loading && transactions.length > 0 && totalPages > 1 && (
                                <div className="p-4 border-t flex items-center justify-between">
                                    <div className="text-sm text-gray-600">
                                        Página {filters.page} de {totalPages}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => goToPage(filters.page - 1)}
                                            disabled={!hasPrevPage}
                                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${hasPrevPage ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                }`}
                                        >
                                            ← Anterior
                                        </button>
                                        <button
                                            onClick={() => goToPage(filters.page + 1)}
                                            disabled={!hasNextPage}
                                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${hasNextPage ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                }`}
                                        >
                                            Siguiente →
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
