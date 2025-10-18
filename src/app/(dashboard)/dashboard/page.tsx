'use client';

import useRequireAuth from '@/app/hooks/useRequireAuth';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';

type ClosestGoalComplete = {
  _id: string;
  name: string;
  description: string;
  due_date: string;
  progress: number;
  target_amount: number;
  current_amount: number;
};

type ClosestGoalEmpty = {
  name: 'Sin metas activas';
};

type ClosestGoal = ClosestGoalComplete | ClosestGoalEmpty;

type Summary = {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlySavings: number;
  totalSaved: number;
  recentTransactions: any[];
  closestGoal: ClosestGoal;
};

type StatType = 'total' | 'income' | 'expense' | 'savings';

function isCompleteGoal(goal: ClosestGoal): goal is ClosestGoalComplete {
  return (goal as ClosestGoalComplete).name !== 'Sin metas activas';
}

export default function DashboardPage() {
  const isAuthenticated = useRequireAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const {
    setShowTokenExpiredModal,
    showTokenExpiredModal,
    isRefreshingSession,
    token,
    isAuthReady,
  } = useAuth();

  const fetchSummary = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const res = await api.get(`/summary?month=${currentMonth}`);
      setSummary(res.data);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setShowTokenExpiredModal(true);
        return;
      }
      console.error('Error fetching summary:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, setShowTokenExpiredModal]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchSummary();
  }, [isAuthenticated, token, fetchSummary]);

  useEffect(() => {
    if (!showTokenExpiredModal && isAuthenticated) {
      fetchSummary();
    }
  }, [showTokenExpiredModal, isAuthenticated, fetchSummary]);

  useEffect(() => {
    if (isAuthenticated === false) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  if (!isAuthReady) {
    return <div className="p-6">Cargando sesión...</div>;
  }
  if (isAuthenticated === false) {
    return null;
  }

  if (showTokenExpiredModal) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-xl font-semibold mb-4">Tu sesión ha expirado</h2>
          <p className="text-gray-600 mb-6">
            Se detectó que tu sesión expiró. Puedes reanudarla desde la modal. Si ya la reanudaste,
            esta vista se recargará automáticamente.
          </p>
          <div className="flex items-center justify-center space-x-3">
            <div className="h-10 w-10 rounded-full border-t-4 border-b-4 animate-spin" />
            <span className="text-sm text-gray-500">{isRefreshingSession ? 'Reanudando sesión...' : 'Esperando acción...'}</span>
          </div>
        </div>
      </div>
    );
  }

  if (loading)
    return (
      <div className="p-6">
        <div className="animate-pulse max-w-7xl mx-auto">
          <div className="h-8 bg-gray-200 rounded w-2/3 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(amount);

  const expensePercentage =
    summary && summary.totalBalance > 0
      ? Math.min((summary.monthlyExpense / summary.totalBalance) * 100, 100)
      : 0;

  function StatCard({
    title,
    value,
    trend,
    type,
    percentage,
  }: {
    title: string;
    value: string;
    trend?: string;
    type: StatType;
    percentage?: number;
  }) {
    const styles: Record<StatType, string> = {
      total: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white',
      income: 'bg-emerald-50 border border-emerald-200 text-emerald-700',
      expense: 'bg-rose-50 border border-rose-200 text-rose-700',
      savings: 'bg-blue-50 border border-blue-200 text-blue-700',
    };

    return (
      <div className={`rounded-xl p-6 ${styles[type] || 'bg-white  dark:bg-gray-800 border border-gray-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <p className={`text-sm font-medium ${type === 'total' ? 'text-emerald-100' : 'text-gray-600'}`}>{title}</p>
          {type === 'expense' && percentage !== undefined && (
            <span className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded-full">{percentage.toFixed(0)}% del saldo</span>
          )}
        </div>
        <p className={`text-3xl font-bold mb-1 ${type === 'total' ? 'text-white' : styles[type]?.split(' ')[1]}`}>{value}</p>
        {trend && <p className={`text-xs ${type === 'total' ? 'text-emerald-100' : 'text-gray-500'}`}>{trend}</p>}
        {type === 'savings' && percentage !== undefined && (
          <p className={`text-xs text-blue-600 font-medium`}>{percentage.toFixed(0)}% del mes</p>
        )}
      </div>
    );
  }

  function QuickActions() {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
          <span className="text-emerald-500">⚡</span> Acciones Rápidas
        </h3>
         <div className="space-y-3">
          <button
            onClick={() => router.push('/transactions?view=add')}
            className="w-full bg-emerald-500 text-white px-4 py-3 rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
          >
            + Agregar Transacción
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push('/transactions?view=list')}
              className="bg-gray-50 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm"
            >
              Ver Gastos
            </button>
            <button
              onClick={() => router.push('/budgets')}
              className="bg-gray-50 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm"
            >
              Presupuesto
            </button>
          </div>
          <button
            onClick={() => router.push('/savings')}
            className="w-full bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors text-sm"
          >
            Metas de Ahorro
          </button>
        </div>
      </div>
    );
  }

  function SavingsGoal() {
    if (!summary) return null;
    const goal = summary.closestGoal;

    if (!goal) {
      return (
        <div className="bg-white  dark:bg-gray-800 rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <span className="text-blue-500">🎯</span> Meta de Ahorro
          </h3>
          <p className="text-gray-500 text-sm mt-4">No hay datos de metas. Intenta recargar o revisa la API.</p>
        </div>
      );
    }

    if (goal.name === 'Sin metas activas') {
      return (
        <div className="bg-white  dark:bg-gray-800 rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <span className="text-blue-500">🎯</span> Meta de Ahorro
          </h3>
          <p className="text-gray-500 text-sm mt-4">No tienes metas activas. Crea una nueva meta para comenzar a ahorrar.</p>
          <button
            onClick={() => (window.location.href = '/savings')}
            className="mt-4 w-full bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors text-sm"
          >
            Crear Meta
          </button>
        </div>
      );
    }

    if (isCompleteGoal(goal)) {
      const percentage = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
      const missing = goal.target_amount - goal.current_amount;

      return (
        <div className="bg-white  dark:bg-gray-800 rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <span className="text-blue-500">🎯</span> Meta de Ahorro
            </h3>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{percentage.toFixed(0)}%</span>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2 dark:text-gray-100">{goal.name}</p>
            <p className="text-xs text-gray-500 mb-2 dark:text-gray-100">{goal.description}</p>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">{formatCurrency(goal.current_amount)}</span>
              <span className="text-sm text-gray-500 dark:text-gray-100">de {formatCurrency(goal.target_amount)}</span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>

            <p className="text-xs text-blue-600 font-medium dark:text-gray-100">
              {percentage >= 100 ? '¡Meta alcanzada! 🎉' : `Faltan ${formatCurrency(missing)} para alcanzar tu meta`}
            </p>
          </div>
        </div>
      );
    }
    return null;
  }

  function RecentActivity() {
    // versión estética: 3 items (como en tu "asi")
    const transactions = summary?.recentTransactions?.slice(0, 3) || [];

    if (transactions.length === 0) {
      return (
        <div className="bg-white  dark:bg-gray-800 rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Actividad Reciente</h3>
          <p className="text-gray-500 text-sm text-center py-8">No hay transacciones recientes</p>
        </div>
      );
    }

    return (
      <div className="bg-white  dark:bg-gray-800 rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">Actividad Reciente</h3>
          <p className="text-xs text-gray-500">Tus últimas transacciones</p>
        </div>

        <div className="space-y-4">
          {transactions.map((tx: any) => (
            <div key={tx._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tx.type === 'ingreso' ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                  <span className="text-sm">{tx.type === 'ingreso' ? '💰' : '📄'}</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800 text-sm">{tx.description || tx.name}</p>
                  <p className="text-xs text-gray-500"> {tx.category || (tx.type === 'ingreso' ? 'Ingreso' : 'Gasto')} • {new Date(tx.createdAt).toLocaleDateString('es-ES')}</p>
                </div>
              </div>
              <p className={`font-bold text-sm ${tx.type === 'ingreso' ? 'text-emerald-600' : 'text-red-600'}`}>
                {tx.type === 'ingreso' ? '+' : '-'} {formatCurrency(tx.amount)}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-800 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">Bienvenido de vuelta</h1>
        <p className="text-gray-600 dark:text-gray-100 flex items-center gap-2">
          Tu resumen financiero
          <span className="text-sm dark:text-gray-100 px-2 py-1 rounded">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </p>
      </div>

      <div className="mb-8">
        <StatCard
          title="Saldo Total"
          value={formatCurrency(summary?.totalBalance ?? 0)}
          trend="+2.5% vs mes anterior"
          type="total"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Ingresos del Mes"
          value={formatCurrency(summary?.monthlyIncome ?? 0)}
          trend="Estable"
          type="income"
        />
        <StatCard
          title="Gastos del Mes"
          value={formatCurrency(summary?.monthlyExpense ?? 0)}
          type="expense"
          percentage={expensePercentage}
        />
        <StatCard
          title="Ahorros del Mes"
          value={formatCurrency(summary?.monthlySavings ?? 0)}
          type="savings"
          percentage={summary?.monthlyIncome ? (summary.monthlySavings / summary.monthlyIncome) * 100 : 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <QuickActions />
        <SavingsGoal />
      </div>

      <div className="mt-6">
        <RecentActivity />
      </div>

    </div>
  );
}
