import { useState } from 'react';
import { PeriodFilter } from '../components/PeriodFilter';
import { MetricCard, MetricCardSkeleton } from '../components/MetricCard';
import { Charts } from '../components/Charts';
import { useMetrics } from '../hooks/useMetrics';
import { Periodo, Metric } from '../types';
import { FileDown } from 'lucide-react';

interface DashboardProps {
  onGenerateReport: (periodo: Periodo, metrics: Metric[]) => void;
}

export const Dashboard = ({ onGenerateReport }: DashboardProps) => {
  const [periodo, setPeriodo] = useState<Periodo>('hoje');
  const { metrics, loading } = useMetrics(periodo);

  const handleGenerateReport = () => {
    onGenerateReport(periodo, metrics);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-sm text-gray-600 mt-1">Visão geral das métricas e vendas</p>
          </div>

          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-sm hover:shadow font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <FileDown className="w-5 h-5" />
            Gerar Relatório PDF
          </button>
        </div>

        <PeriodFilter periodo={periodo} onChange={setPeriodo} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <MetricCardSkeleton key={i} />)
          : metrics.map((metric, index) => <MetricCard key={index} metric={metric} />)}
      </div>

      <Charts />
    </div>
  );
};
