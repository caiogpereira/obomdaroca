import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface PedidoArquivado {
  id: string;
  pedido_id: string;
  numero_pedido: string;
  cliente: string;
  telefone: string;
  email?: string;
  endereco?: string;
  valor_total: number;
  status: string;
  forma_pagamento?: string;
  observacoes?: string;
  cliente_id?: string;
  itens_json: any[];
  pedido_created_at: string;
  archived_at: string;
}

export const useSupabasePedidosArquivados = () => {
  const [pedidosArquivados, setPedidosArquivados] = useState<PedidoArquivado[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPedidosArquivados = useCallback(async (filtros?: {
    dataInicio?: string;
    dataFim?: string;
    cliente?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('pedidos_arquivados')
        .select('*')
        .order('pedido_created_at', { ascending: false });

      if (filtros?.dataInicio) {
        query = query.gte('pedido_created_at', filtros.dataInicio);
      }

      if (filtros?.dataFim) {
        query = query.lte('pedido_created_at', filtros.dataFim + 'T23:59:59');
      }

      if (filtros?.cliente) {
        query = query.or(`cliente.ilike.%${filtros.cliente}%,telefone.ilike.%${filtros.cliente}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setPedidosArquivados(
        (data || []).map((p) => ({
          ...p,
          valor_total: parseFloat(p.valor_total) || 0,
          itens_json: p.itens_json || [],
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pedidos arquivados');
    } finally {
      setLoading(false);
    }
  }, []);

  const getEstatisticas = useCallback(() => {
    const total = pedidosArquivados.length;
    const valorTotal = pedidosArquivados.reduce((acc, p) => acc + p.valor_total, 0);
    
    return {
      total,
      valorTotal,
      ticketMedio: total > 0 ? valorTotal / total : 0,
    };
  }, [pedidosArquivados]);

  return {
    pedidosArquivados,
    loading,
    error,
    fetchPedidosArquivados,
    getEstatisticas,
  };
};