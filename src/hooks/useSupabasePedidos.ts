import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Pedido, HistoricoAcao } from '../types';

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
      const usuario = getUsuarioAtual();
      const pedidoAtual = pedidos.find(p => p.id === pedidoId);
      const statusAnterior = pedidoAtual?.status;
      
      // Atualizar pedido com info do operador
      const { error } = await supabase
        .from('pedidos')
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString(),
          updated_by_user_id: usuario?.id,
          updated_by_user_name: usuario?.nome
        })
        .eq('id', pedidoId);

      if (error) throw error;

      // Registrar no histórico
      if (usuario) {
        await supabase
          .from('historico_pedidos')
          .insert({
            pedido_id: pedidoId,
            acao: `Status alterado para ${newStatus}`,
            status_anterior: statusAnterior,
            status_novo: newStatus,
            operador_id: usuario.id,
            operador_nome: usuario.nome
          });
      }

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
      const usuario = getUsuarioAtual();
      
      const { error: pedidoError } = await supabase
        .from('pedidos')
        .update({
          cliente: pedidoAtualizado.cliente,
          telefone: pedidoAtualizado.telefone,
          email: pedidoAtualizado.email,
          endereco: pedidoAtualizado.endereco,
          valor_total: pedidoAtualizado.valor_total,
          status: pedidoAtualizado.status,
          observacoes: pedidoAtualizado.observacoes,
          updated_at: new Date().toISOString(),
          updated_by_user_id: usuario?.id,
          updated_by_user_name: usuario?.nome
        })
        .eq('id', pedidoAtualizado.id);

      if (pedidoError) throw pedidoError;

      // Registrar no histórico
      if (usuario) {
        await supabase
          .from('historico_pedidos')
          .insert({
            pedido_id: pedidoAtualizado.id,
            acao: 'Pedido editado',
            operador_id: usuario.id,
            operador_nome: usuario.nome
          });
      }

      await supabase.from('itens_pedido').delete().eq('pedido_id', pedidoAtualizado.id);

      for (const item of pedidoAtualizado.itens) {
        const { error: itemError } = await supabase.from('itens_pedido').insert({
          pedido_id: pedidoAtualizado.id,
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          desconto_percentual: item.desconto_percentual || 0,
          preco_original: item.preco_original || item.preco_unitario,
        });

        if (itemError) throw itemError;
      }

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
          // Novo pedido inserido - recarrega todos
          console.log('🔔 Novo pedido recebido via Realtime');
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
          // Pedido atualizado - recarrega todos
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
          // Pedido deletado - recarrega todos
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
