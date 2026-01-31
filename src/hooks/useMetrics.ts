import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Metric, Periodo } from '../types';

const getDateRange = (periodo: Periodo): { start: Date; end: Date } => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  let start = new Date(today);

  switch (periodo) {
    case 'hoje':
      break;
    case 'ontem':
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      break;
    case '7dias':
      start.setDate(start.getDate() - 6);
      break;
    case 'semana':
      const dayOfWeek = start.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      start.setDate(start.getDate() - diffToMonday);
      break;
    case 'mes':
      start.setDate(1);
      break;
    case 'personalizado':
      start.setDate(start.getDate() - 30);
      break;
  }

  start.setHours(0, 0, 0, 0);
  return { start, end };
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const useMetrics = (periodo: Periodo) => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(periodo);

      // Buscar pedidos ATIVOS do período atual
      const { data: pedidosAtivos, error: pedidosError } = await supabase
        .from('pedidos')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (pedidosError) throw pedidosError;

      // Buscar pedidos ARQUIVADOS do período atual
      const { data: pedidosArquivados, error: arquivadosError } = await supabase
        .from('pedidos_arquivados')
        .select('*')
        .gte('pedido_created_at', start.toISOString())
        .lte('pedido_created_at', end.toISOString());

      if (arquivadosError) throw arquivadosError;

      // Combinar pedidos ativos e arquivados
      const pedidosAtuais = [
        ...(pedidosAtivos || []).map(p => ({
          ...p,
          valor_total: parseFloat(p.valor_total) || 0,
          isArquivado: false,
        })),
        ...(pedidosArquivados || []).map(p => ({
          ...p,
          created_at: p.pedido_created_at,
          valor_total: parseFloat(p.valor_total) || 0,
          status: 'Finalizado',
          isArquivado: true,
        })),
      ];

      // Calcular período anterior
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const previousStart = new Date(start);
      previousStart.setDate(previousStart.getDate() - diffDays);
      const previousEnd = new Date(start);
      previousEnd.setMilliseconds(-1);

      // Buscar pedidos ATIVOS do período anterior
      const { data: pedidosAtivosAnt } = await supabase
        .from('pedidos')
        .select('*')
        .gte('created_at', previousStart.toISOString())
        .lte('created_at', previousEnd.toISOString());

      // Buscar pedidos ARQUIVADOS do período anterior
      const { data: pedidosArquivadosAnt } = await supabase
        .from('pedidos_arquivados')
        .select('*')
        .gte('pedido_created_at', previousStart.toISOString())
        .lte('pedido_created_at', previousEnd.toISOString());

      // Combinar pedidos anteriores
      const pedidosAnteriores = [
        ...(pedidosAtivosAnt || []).map(p => ({
          ...p,
          valor_total: parseFloat(p.valor_total) || 0,
        })),
        ...(pedidosArquivadosAnt || []).map(p => ({
          ...p,
          created_at: p.pedido_created_at,
          valor_total: parseFloat(p.valor_total) || 0,
          status: 'Finalizado',
        })),
      ];

      // Buscar atendimentos do período atual
      const { data: atendimentosAtuais } = await supabase
        .from('atendimentos')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      // Buscar atendimentos do período anterior
      const { data: atendimentosAnteriores } = await supabase
        .from('atendimentos')
        .select('*')
        .gte('created_at', previousStart.toISOString())
        .lte('created_at', previousEnd.toISOString());

      // Buscar pedidos pendentes (não finalizados) - apenas da tabela ativa
      const { data: pedidosPendentes } = await supabase
        .from('pedidos')
        .select('*')
        .neq('status', 'Finalizado');

      // Calcular métricas atuais
      const pedidosFinalizados = pedidosAtuais.filter(p => p.status === 'Finalizado');
      const totalVendas = pedidosFinalizados.reduce((acc, p) => acc + p.valor_total, 0);
      const ticketMedio = pedidosFinalizados.length > 0 ? totalVendas / pedidosFinalizados.length : 0;
      const totalAtendimentos = (atendimentosAtuais || []).length + pedidosAtuais.length;
      const taxaConversao = totalAtendimentos > 0 ? (pedidosAtuais.length / totalAtendimentos) * 100 : 0;

      // Calcular métricas anteriores
      const pedidosFinalizadosAnt = pedidosAnteriores.filter(p => p.status === 'Finalizado');
      const totalVendasAnt = pedidosFinalizadosAnt.reduce((acc, p) => acc + p.valor_total, 0);
      const ticketMedioAnt = pedidosFinalizadosAnt.length > 0 ? totalVendasAnt / pedidosFinalizadosAnt.length : 0;
      const totalAtendimentosAnt = (atendimentosAnteriores || []).length + pedidosAnteriores.length;
      const taxaConversaoAnt = totalAtendimentosAnt > 0 ? (pedidosAnteriores.length / totalAtendimentosAnt) * 100 : 0;

      // Calcular variações percentuais
      const calcChange = (atual: number, anterior: number): number => {
        if (anterior === 0) return atual > 0 ? 100 : 0;
        return Math.round(((atual - anterior) / anterior) * 100);
      };

      const metricsData: Metric[] = [
        {
          label: 'Atendimentos Totais',
          value: totalAtendimentos,
          change: calcChange(totalAtendimentos, totalAtendimentosAnt),
          icon: 'users',
        },
        {
          label: 'Pedidos Gerados',
          value: pedidosAtuais.length,
          change: calcChange(pedidosAtuais.length, pedidosAnteriores.length),
          icon: 'shopping-bag',
        },
        {
          label: 'Taxa de Conversão',
          value: `${taxaConversao.toFixed(1)}%`,
          change: calcChange(taxaConversao, taxaConversaoAnt),
          icon: 'trending-up',
        },
        {
          label: 'Valor Total Vendas',
          value: formatCurrency(totalVendas),
          change: calcChange(totalVendas, totalVendasAnt),
          icon: 'dollar-sign',
        },
        {
          label: 'Ticket Médio',
          value: formatCurrency(ticketMedio),
          change: calcChange(ticketMedio, ticketMedioAnt),
          icon: 'credit-card',
        },
        {
          label: 'Pedidos Pendentes',
          value: (pedidosPendentes || []).length,
          icon: 'clock',
        },
      ];

      setMetrics(metricsData);
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, refetch: fetchMetrics };
};