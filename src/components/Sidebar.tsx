// src/components/Sidebar.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';

import { HiMenu, HiX } from 'react-icons/hi';
import { FiLogOut, FiBarChart2, FiPlusSquare, FiCreditCard, FiTarget, FiUser, FiMoon, FiSun } from 'react-icons/fi';

const items = [
    { label: 'Resumen', href: '/dashboard', icon: <FiBarChart2 className="w-5 h-5" /> },
    { label: 'Agregar Transacción', href: '/transactions', icon: <FiPlusSquare className="w-5 h-5" /> },
    { label: 'Control de Gastos', href: '/budgets', icon: <FiCreditCard className="w-5 h-5" /> },
    { label: 'Metas de Ahorro', href: '/savings', icon: <FiTarget className="w-5 h-5" /> },
    { label: 'Configuración de Perfil', href: '/profile', icon: <FiUser className="w-5 h-5" /> },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [open, setOpen] = useState(false);
    const displayName = user?.full_name || user?.email || 'Usuario';

    // Estado real del tema (inicializamos desde el DOM si se puede)
    const [isDark, setIsDark] = useState<boolean>(() => {
        try {
            return typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
        } catch (e) {
            return false;
        }
    });

    // Flag para saber si ya estamos en cliente (evita hydration mismatch)
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    // Escuchar cambios en storage (otro tab) — actualiza estado de tema
    useEffect(() => {
        const updateTheme = () => {
            try {
                setIsDark(document.documentElement.classList.contains('dark'));
            } catch (e) {
                /* ignore */
            }
        };
        window.addEventListener('storage', updateTheme);
        return () => window.removeEventListener('storage', updateTheme);
    }, []);

    // Aplicar tema en <html>, localStorage y cookie cuando isDark cambia
    useEffect(() => {
        try {
            const el = document.documentElement;
            if (isDark) el.classList.add('dark');
            else el.classList.remove('dark');

            try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch (e) {}

            // Escribimos cookie para que el server pueda leerla en la próxima navegación.
            // max-age = 1 año (31536000)
            try {
                document.cookie = `theme=${isDark ? 'dark' : 'light'}; path=/; max-age=31536000; samesite=lax`;
            } catch (e) {
                // algunos entornos (p. ej. bloqueo cookies) pueden fallar
            }
        } catch (e) {
            console.warn('No se pudo aplicar tema', e);
        }
    }, [isDark]);

    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const toggleTheme = () => setIsDark(prev => !prev);

    return (
        <>
            {/* Móvil header */}
            <div className="md:hidden flex items-center justify-between p-3 bg-white dark:bg-gray-800 dark:border-b dark:border-gray-700 border-b">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold">S</div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">SpendSmart</div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        aria-label="Cambiar tema"
                        onClick={toggleTheme}
                        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                        title={mounted ? (isDark ? 'Modo claro' : 'Modo oscuro') : 'Cambiar tema'}
                    >
                        {mounted ? (
                            isDark ? <FiSun className="w-5 h-5 text-yellow-400" /> : <FiMoon className="w-5 h-5 text-gray-600" />
                        ) : (
                            <span className="inline-block w-5 h-5" />
                        )}
                    </button>

                    <span className="text-xs text-gray-500 hidden sm:inline">Hola, {displayName.split(' ')[0]}</span>

                    <button
                        aria-label="Abrir menú"
                        onClick={() => setOpen(true)}
                        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <HiMenu className="w-6 h-6 text-gray-700 dark:text-gray-100" />
                    </button>
                </div>
            </div>

            {/* Sidebar escritorio */}
            <aside className="hidden md:flex md:flex-col md:w-64 bg-white dark:bg-gray-900 h-screen sticky top-0 p-4 border-r dark:border-gray-800">
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold">S</div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">SpendSmart</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Control financiero</p>
                        </div>
                    </div>

                    <div className="p-2">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{displayName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Bienvenido de vuelta</p>
                    </div>
                </div>

                <nav className="flex-1">
                    <ul className="space-y-1">
                        {items.map(item => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${pathname === item.href
                                            ? 'bg-emerald-500 text-white'
                                            : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    <span className="text-lg">{item.icon}</span>
                                    <span className="text-sm font-medium">{item.label}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="mt-4 space-y-2">
                    <div className="flex gap-2">
                        <button
                            aria-label="Cambiar tema"
                            onClick={toggleTheme}
                            className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 text-sm w-full flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                            title={mounted ? (isDark ? 'Modo claro' : 'Modo oscuro') : 'Cambiar tema'}
                        >
                            {mounted ? (isDark ? <FiSun className="w-4 h-4" /> : <FiMoon className="w-4 h-4" />) : <span className="inline-block w-4 h-4" />}
                            <span>{mounted ? (isDark ? 'Modo Claro' : 'Modo Oscuro') : 'Cambiar tema'}</span>
                        </button>
                    </div>

                    <button
                        onClick={() => logout()}
                        className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg dark:text-gray-300 dark:hover:bg-red-900/30"
                    >
                        <div className="flex items-center gap-2">
                            <FiLogOut className="w-5 h-5" />
                            <span className="ml-2">Cerrar Sesión</span>
                        </div>
                    </button>
                </div>
            </aside>

            {/* Menú móvil */}
            {open && (
                <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
                    <div
                        className="absolute inset-0 bg-black bg-opacity-40"
                        onClick={() => setOpen(false)}
                        aria-hidden="true"
                    />
                    <div className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900 shadow-xl p-4 overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold">S</div>
                                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">SpendSmart</div>
                            </div>
                            <button onClick={() => setOpen(false)} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Cerrar menú">
                                <HiX className="w-6 h-6 text-gray-700 dark:text-gray-100" />
                            </button>
                        </div>

                        <div className="mb-4">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{displayName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Bienvenido de vuelta</p>
                        </div>

                        <nav>
                            <ul className="space-y-1">
                                {items.map(item => (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            onClick={() => setOpen(false)}
                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${pathname === item.href
                                                    ? 'bg-emerald-500 text-white'
                                                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                                                }`}
                                        >
                                            <span className="text-lg">{item.icon}</span>
                                            <span className="text-sm font-medium">{item.label}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </nav>

                        <div className="mt-6">
                            <div className="mb-2">
                                <button
                                    aria-label="Cambiar tema"
                                    onClick={() => { toggleTheme(); setOpen(false); }}
                                    className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 text-left text-sm flex items-center gap-2"
                                    title={mounted ? (isDark ? 'Modo claro' : 'Modo oscuro') : 'Cambiar tema'}
                                >
                                    {mounted ? (isDark ? <FiSun className="w-4 h-4" /> : <FiMoon className="w-4 h-4" />) : <span className="inline-block w-4 h-4" />}
                                    <span>{mounted ? (isDark ? 'Modo Claro' : 'Modo Oscuro') : 'Cambiar tema'}</span>
                                </button>
                            </div>

                            <button
                                onClick={() => { setOpen(false); logout(); }}
                                className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg dark:text-gray-300 dark:hover:bg-red-900/30"
                            >
                                <div className="flex items-center gap-2">
                                    <FiLogOut className="w-5 h-5" />
                                    <span className="ml-2">Cerrar Sesión</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
