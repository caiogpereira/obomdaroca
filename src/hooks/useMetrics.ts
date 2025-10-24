import { useState, useEffect } from 'react';
import { Metric, Periodo } from '../types';

// GET /api/metricas?periodo={periodo} - Buscar métricas do período
// Parâmetros: periodo (hoje, ontem, 7dias, semana, mes, personalizado)
// Para personalizado, adicionar: &dataInicial=YYYY-MM-DD&dataFinal=YYYY-MM-DD
// Resposta: Array de objetos Metric: { label: string, value: string | number, change?: number, icon: string }

const metricsData: Record<Periodo, Metric[]> = {
  hoje: [
    { label: 'Atendimentos Totais', value: 147, change: 12, icon: 'users' },
    { label: 'Pedidos Gerados', value: 23, change: 8, icon: 'shopping-bag' },
    { label: 'Taxa de Conversão', value: '15.6%', change: -2, icon: 'trending-up' },
    { label: 'Valor Total Vendas', value: 'R$ 2.840,50', change: 25, icon: 'dollar-sign' },
    { label: 'Ticket Médio', value: 'R$ 123,50', change: 18, icon: 'credit-card' },
    { label: 'Pedidos Pendentes', value: 8, icon: 'clock' },
  ],
  ontem: [
    { label: 'Atendimentos Totais', value: 131, change: 5, icon: 'users' },
    { label: 'Pedidos Gerados', value: 21, change: 3, icon: 'shopping-bag' },
    { label: 'Taxa de Conversão', value: '16.0%', change: 1, icon: 'trending-up' },
    { label: 'Valor Total Vendas', value: 'R$ 2.272,00', change: 15, icon: 'dollar-sign' },
    { label: 'Ticket Médio', value: 'R$ 108,19', change: 12, icon: 'credit-card' },
    { label: 'Pedidos Pendentes', value: 5, icon: 'clock' },
  ],
  '7dias': [
    { label: 'Atendimentos Totais', value: 892, change: 18, icon: 'users' },
    { label: 'Pedidos Gerados', value: 145, change: 22, icon: 'shopping-bag' },
    { label: 'Taxa de Conversão', value: '16.3%', change: 4, icon: 'trending-up' },
    { label: 'Valor Total Vendas', value: 'R$ 17.920,00', change: 30, icon: 'dollar-sign' },
    { label: 'Ticket Médio', value: 'R$ 123,59', change: 8, icon: 'credit-card' },
    { label: 'Pedidos Pendentes', value: 12, icon: 'clock' },
  ],
  semana: [
    { label: 'Atendimentos Totais', value: 654, change: 10, icon: 'users' },
    { label: 'Pedidos Gerados', value: 98, change: 15, icon: 'shopping-bag' },
    { label: 'Taxa de Conversão', value: '15.0%', change: 5, icon: 'trending-up' },
    { label: 'Valor Total Vendas', value: 'R$ 12.100,00', change: 20, icon: 'dollar-sign' },
    { label: 'Ticket Médio', value: 'R$ 123,47', change: 5, icon: 'credit-card' },
    { label: 'Pedidos Pendentes', value: 10, icon: 'clock' },
  ],
  mes: [
    { label: 'Atendimentos Totais', value: 2847, change: 25, icon: 'users' },
    { label: 'Pedidos Gerados', value: 412, change: 28, icon: 'shopping-bag' },
    { label: 'Taxa de Conversão', value: '14.5%', change: 3, icon: 'trending-up' },
    { label: 'Valor Total Vendas', value: 'R$ 51.890,00', change: 35, icon: 'dollar-sign' },
    { label: 'Ticket Médio', value: 'R$ 125,95', change: 7, icon: 'credit-card' },
    { label: 'Pedidos Pendentes', value: 18, icon: 'clock' },
  ],
  personalizado: [
    { label: 'Atendimentos Totais', value: 450, change: 0, icon: 'users' },
    { label: 'Pedidos Gerados', value: 67, change: 0, icon: 'shopping-bag' },
    { label: 'Taxa de Conversão', value: '14.9%', change: 0, icon: 'trending-up' },
    { label: 'Valor Total Vendas', value: 'R$ 8.250,00', change: 0, icon: 'dollar-sign' },
    { label: 'Ticket Médio', value: 'R$ 123,13', change: 0, icon: 'credit-card' },
    { label: 'Pedidos Pendentes', value: 6, icon: 'clock' },
  ],
};

export const useMetrics = (periodo: Periodo) => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setMetrics(metricsData[periodo]);
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [periodo]);

  return { metrics, loading };
};
