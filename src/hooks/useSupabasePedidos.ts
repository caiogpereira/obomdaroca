import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Pedido, HistoricoAcao } from '../types';
import { playNotificationSound } from '../utils/notificationSound';

// Função para obter usuário atual do localStorage (novo sistema de auth)
const getUsuarioAtual = () => {
  try {
    const session = localStorage.getItem('obdr_user_session');
    if (session) {
      const user = JSON.parse(session);
      return { id: user.id, nome: user.full_name };
    }
  } catch (e) {
    console.error('Erro ao obter usuário:', e);
  }
  return null;
};

// Helper para obter ID do admin logado (throws se não logado)
const getAdminUserId = (): string => {
  const usuario = getUsuarioAtual();
  if (!usuario?.id) {
    throw new Error('Usuário não autenticado. Faça login novamente.');
  }
  return usuario.id;
};

export const useSupabasePedidos = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPedidos = useCallback(async () => {
    try {
      setLoading(true);
      const { data: pedidosData, error: pedidosError } = await supabase
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: false });

      if (pedidosError) throw pedidosError;

      const pedidosComItens = await Promise.all(
        (pedidosData || []).map(async (pedido) => {
          const [itensResult, historicoResult] = await Promise.all([
            supabase
              .from('itens_pedido')
              .select('*')
              .eq('pedido_id', pedido.id),
            supabase
              .from('historico_pedidos')
              .select('*')
              .eq('pedido_id', pedido.id)
              .order('created_at', { ascending: false })
          ]);

          return {
            id: pedido.id,
            numero_pedido: pedido.numero_pedido,
            cliente: pedido.cliente,
            nome_empresa: pedido.nome_empresa || '',
            cpf_cnpj: pedido.cpf_cnpj || '',
            telefone: pedido.telefone,
            email: pedido.email || '',
            cep: pedido.cep || '',
            endereco: pedido.endereco || '',
            cidade: pedido.cidade || '',
            estado: pedido.estado || '',
            valor_total: parseFloat(pedido.valor_total),
            status: pedido.status as Pedido['status'],
            observacoes: pedido.observacoes || '',
            origem: pedido.origem,
            modalidade_pagamento: pedido.modalidade_pagamento,
            forma_pagamento: pedido.forma_pagamento || '',
            created_at: pedido.created_at,
            updated_at: pedido.updated_at,
            updated_by_user_id: pedido.updated_by_user_id,
            updated_by_user_name: pedido.updated_by_user_name,
            itens: (itensResult.data || []).map((item) => ({
              id: item.id,
              pedido_id: item.pedido_id,
              produto_id: item.produto_id,
              produto_nome: item.produto_nome,
              quantidade: item.quantidade,
              preco_unitario: parseFloat(item.preco_unitario),
              desconto_percentual: item.desconto_percentual ? parseFloat(item.desconto_percentual) : 0,
              preco_original: item.preco_original ? parseFloat(item.preco_original) : parseFloat(item.preco_unitario),
            })),
            historico: (historicoResult.data || []) as HistoricoAcao[],
          } as Pedido;
        })
      );

      setPedidos(pedidosComItens);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  }, []);

  const atualizarStatusPedido = async (pedidoId: string, newStatus: Pedido['status']) => {
    try {
      const adminUserId = getAdminUserId();
      const usuario = getUsuarioAtual();

      // Atualizar via RPC (inclui histórico automaticamente)
      const { error } = await supabase.rpc('admin_update_status_pedido', {
        p_admin_user_id: adminUserId,
        p_pedido_id: pedidoId,
        p_new_status: newStatus
      });

      if (error) throw error;

      // Atualização local imediata (otimista)
      setPedidos((prev) =>
        prev.map((p) =>
          p.id === pedidoId ? { 
            ...p, 
            status: newStatus, 
            updated_at: new Date().toISOString(),
            updated_by_user_id: usuario?.id,
            updated_by_user_name: usuario?.nome
          } : p
        )
      );
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar status');
    }
  };

  const finalizarPedido = async (pedidoId: string) => {
    await atualizarStatusPedido(pedidoId, 'Finalizado');
  };

  const atualizarPedido = async (pedidoAtualizado: Pedido) => {
    try {
      const adminUserId = getAdminUserId();

      // Atualizar via RPC (inclui substituição de itens e histórico)
      const { error } = await supabase.rpc('admin_update_pedido_completo', {
        p_admin_user_id: adminUserId,
        p_pedido_id: pedidoAtualizado.id,
        p_pedido_data: {
          cliente: pedidoAtualizado.cliente,
          telefone: pedidoAtualizado.telefone,
          email: pedidoAtualizado.email,
          endereco: pedidoAtualizado.endereco,
          valor_total: pedidoAtualizado.valor_total,
          status: pedidoAtualizado.status,
          observacoes: pedidoAtualizado.observacoes,
        },
        p_itens: pedidoAtualizado.itens.map(item => ({
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          desconto_percentual: item.desconto_percentual || 0,
          preco_original: item.preco_original || item.preco_unitario,
        }))
      });

      if (error) throw error;
      await fetchPedidos();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar pedido');
    }
  };

  useEffect(() => {
    // Busca inicial
    fetchPedidos();

    // Configurar Realtime para sincronização automática
    const channel = supabase
      .channel('pedidos_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pedidos',
        },
        () => {
          console.log('🔔 Novo pedido recebido via Realtime');
          playNotificationSound('new_order');
          fetchPedidos();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pedidos',
        },
        () => {
          console.log('🔄 Pedido atualizado via Realtime');
          fetchPedidos();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'pedidos',
        },
        () => {
          console.log('🗑️ Pedido removido via Realtime');
          fetchPedidos();
        }
      )
      .subscribe((status) => {
        console.log('📡 Status do canal Realtime pedidos:', status);
      });

    // Cleanup ao desmontar
    return () => {
      console.log('🔌 Desconectando canal Realtime pedidos');
      supabase.removeChannel(channel);
    };
  }, [fetchPedidos]);

  return {
    pedidos,
    loading,
    error,
    finalizarPedido,
    atualizarPedido,
    atualizarStatusPedido,
    refetch: fetchPedidos,
  };
};
