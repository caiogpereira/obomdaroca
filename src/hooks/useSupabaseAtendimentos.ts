import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Atendimento } from '../types';
import { playNotificationSound } from '../utils/notificationSound';
import { registrarLog } from './useLogsAtendimento';

// Função para obter usuário atual do localStorage (auth customizada)
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

export const useSupabaseAtendimentos = (onNewAtendimento?: (atendimento: Atendimento) => void) => {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchAtendimentos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('atendimentos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const atendimentosFormatados = (data || []).map((a: any) => ({
        id: a.id,
        cliente: a.cliente,
        telefone: a.telefone,
        email: a.email || '',
        tipo_solicitacao: a.tipo_solicitacao,
        descricao: a.descricao,
        status: a.status as Atendimento['status'],
        prioridade: a.prioridade as Atendimento['prioridade'],
        created_at: a.created_at,
        updated_at: a.updated_at,
        is_read: a.is_read || false,
        archived_at: a.archived_at,
        resolved_at: a.resolved_at,
        resolved_by_user_id: a.resolved_by_user_id,
        resolved_by_user_name: a.resolved_by_user_name,
        assumed_by_user_id: a.assumed_by_user_id,
        assumed_by_user_name: a.assumed_by_user_name,
      }));

      const unread = atendimentosFormatados.filter((a: Atendimento) => a.status === 'Aguardando' && !a.is_read).length;
      setUnreadCount(unread);

      setAtendimentos(atendimentosFormatados);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar atendimentos');
    } finally {
      setLoading(false);
    }
  };

  const addAtendimento = async (atendimento: Omit<Atendimento, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const usuario = getUsuarioAtual();

      const { data, error } = await supabase.from('atendimentos').insert({
        cliente: atendimento.cliente,
        telefone: atendimento.telefone,
        email: atendimento.email || null,
        tipo_solicitacao: atendimento.tipo_solicitacao,
        descricao: atendimento.descricao,
        status: atendimento.status,
        prioridade: atendimento.prioridade,
        is_read: false,
      }).select().single();

      if (error) throw error;

      // Registrar log (não-bloqueante - não usar await)
      registrarLog({
        tipo: 'atendimento',
        acao: 'criar_atendimento',
        descricao: `Nova solicitação criada para ${atendimento.cliente}`,
        entidade_tipo: 'atendimento',
        entidade_id: data?.id,
        usuario_id: usuario?.id,
        usuario_nome: usuario?.nome,
        detalhes: { cliente: atendimento.cliente, tipo: atendimento.tipo_solicitacao },
      });

      await fetchAtendimentos();
    } catch (err) {
      console.error('Erro ao adicionar atendimento:', err);
      throw new Error(err instanceof Error ? err.message : 'Erro ao adicionar atendimento');
    }
  };

  const updateAtendimento = async (
    id: string,
    atendimento: Partial<Omit<Atendimento, 'id' | 'created_at' | 'updated_at'>>
  ) => {
    try {
      const usuario = getUsuarioAtual();

      const { data: updatedRows, error } = await supabase
        .from('atendimentos')
        .update({
          ...atendimento,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select();

      if (error) {
        console.error('❌ Erro ao atualizar atendimento (possível RLS):', error);
        throw error;
      }

      if (!updatedRows || updatedRows.length === 0) {
        console.error('⚠️ UPDATE retornou 0 rows — bloqueio RLS ativo!');
        throw new Error('Permissão negada para atualizar. Execute a migration de correção de RLS.');
      }

      // Registrar log
      registrarLog({
        tipo: 'atendimento',
        acao: 'editar_atendimento',
        descricao: `Atendimento atualizado`,
        entidade_tipo: 'atendimento',
        entidade_id: id,
        usuario_id: usuario?.id,
        usuario_nome: usuario?.nome,
        detalhes: atendimento,
      });

      await fetchAtendimentos();
    } catch (err) {
      console.error('Erro completo updateAtendimento:', err);
      throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar atendimento');
    }
  };

  // =====================================================
  // updateStatus - Com verificação de resultado + log RLS
  // =====================================================
  const updateStatus = async (id: string, status: Atendimento['status']) => {
    try {
      const usuario = getUsuarioAtual();
      const atendimentoAtual = atendimentos.find(a => a.id === id);
      const statusAnterior = atendimentoAtual?.status;

      const updateData: Record<string, any> = { 
        status, 
        updated_at: new Date().toISOString() 
      };

      // Se está assumindo o atendimento, registrar quem assumiu
      if (status === 'Em Atendimento' && usuario) {
        updateData.assumed_by_user_id = usuario.id;
        updateData.assumed_by_user_name = usuario.nome;
      }

      // Se está resolvendo, registrar quem resolveu + data + arquivar
      if (status === 'Resolvido' && usuario) {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by_user_id = usuario.id;
        updateData.resolved_by_user_name = usuario.nome;
        updateData.archived_at = new Date().toISOString();
      }

      console.log('📝 Atualizando status do atendimento:', { id, status, updateData });

      const { data: updatedRows, error } = await supabase
        .from('atendimentos')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) {
        console.error('❌ Erro Supabase ao atualizar status:', error);
        throw new Error(`Erro ao atualizar status: ${error.message} (code: ${error.code})`);
      }

      // Verificar se o update realmente afetou algo
      if (!updatedRows || updatedRows.length === 0) {
        console.error('⚠️ UPDATE retornou 0 rows — RLS está bloqueando a operação!');
        console.error('⚠️ Execute a migration 20260313000002_fix_rls_policies_anon_key.sql no Supabase');
        throw new Error('Não foi possível atualizar o status. As policies do banco estão bloqueando. Execute a migration de correção.');
      }

      console.log('✅ Status atualizado com sucesso:', updatedRows[0]?.status);

      // Registrar log
      const acaoDescricao = status === 'Em Atendimento' 
        ? `Atendimento assumido por ${usuario?.nome || 'desconhecido'}` 
        : status === 'Resolvido' 
          ? `Atendimento finalizado e arquivado por ${usuario?.nome || 'desconhecido'}`
          : `Status alterado para ${status}`;

      registrarLog({
        tipo: 'atendimento',
        acao: status === 'Em Atendimento' ? 'assumir_atendimento' : status === 'Resolvido' ? 'resolver_atendimento' : 'alterar_status_atendimento',
        descricao: acaoDescricao,
        entidade_tipo: 'atendimento',
        entidade_id: id,
        usuario_id: usuario?.id,
        usuario_nome: usuario?.nome,
        detalhes: { 
          status_anterior: statusAnterior, 
          status_novo: status,
          cliente: atendimentoAtual?.cliente,
        },
      });

      // Refetch para garantir consistência
      await fetchAtendimentos();

    } catch (err) {
      console.error('❌ Erro completo ao atualizar status:', err);
      // Refetch mesmo em caso de erro para garantir estado consistente
      await fetchAtendimentos();
      throw err instanceof Error ? err : new Error('Erro ao atualizar status do atendimento');
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('atendimentos')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Erro ao marcar como lido:', error);
      }
      await fetchAtendimentos();
    } catch (err) {
      console.error('Erro markAsRead:', err);
    }
  };

  const deleteAtendimento = async (id: string) => {
    try {
      const usuario = getUsuarioAtual();
      const atendimentoAtual = atendimentos.find(a => a.id === id);

      const { error } = await supabase.from('atendimentos').delete().eq('id', id);

      if (error) {
        console.error('❌ Erro ao excluir atendimento:', error);
        throw error;
      }

      // Registrar log
      registrarLog({
        tipo: 'atendimento',
        acao: 'excluir_atendimento',
        descricao: `Atendimento de ${atendimentoAtual?.cliente || 'desconhecido'} excluído`,
        entidade_tipo: 'atendimento',
        entidade_id: id,
        usuario_id: usuario?.id,
        usuario_nome: usuario?.nome,
        detalhes: { cliente: atendimentoAtual?.cliente },
      });

      await fetchAtendimentos();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao excluir atendimento');
    }
  };

  useEffect(() => {
    fetchAtendimentos();

    const channel = supabase
      .channel('atendimentos_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'atendimentos',
        },
        async (payload) => {
          const novoAtendimento = payload.new as any;
          const atendimentoFormatado: Atendimento = {
            id: novoAtendimento.id,
            cliente: novoAtendimento.cliente,
            telefone: novoAtendimento.telefone,
            email: novoAtendimento.email || '',
            tipo_solicitacao: novoAtendimento.tipo_solicitacao,
            descricao: novoAtendimento.descricao,
            status: novoAtendimento.status,
            prioridade: novoAtendimento.prioridade,
            created_at: novoAtendimento.created_at,
            updated_at: novoAtendimento.updated_at,
            is_read: false,
          };

          console.log('🔔 Novo atendimento recebido via Realtime');
          playNotificationSound('new_atendimento');

          setAtendimentos(prev => [atendimentoFormatado, ...prev]);
          setUnreadCount(prev => prev + 1);

          if (onNewAtendimento) {
            onNewAtendimento(atendimentoFormatado);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'atendimentos',
        },
        () => {
          console.log('🔄 Atendimento atualizado via Realtime');
          fetchAtendimentos();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'atendimentos',
        },
        () => {
          console.log('🗑️ Atendimento removido via Realtime');
          fetchAtendimentos();
        }
      )
      .subscribe((status) => {
        console.log('📡 Status do canal Realtime atendimentos:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    atendimentos,
    loading,
    error,
    unreadCount,
    addAtendimento,
    updateAtendimento,
    updateStatus,
    deleteAtendimento,
    markAsRead,
    refetch: fetchAtendimentos,
  };
};
