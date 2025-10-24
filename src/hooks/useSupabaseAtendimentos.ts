import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Atendimento } from '../types';

// POST /api/atendimentos - Criar atendimento (Recebe dados do n8n ou do formulário)
// Body: { cliente: string, telefone: string, email?: string, tipo_solicitacao: string, descricao: string, status: 'Aguardando' | 'Em Atendimento' | 'Resolvido', prioridade: 'Alta' | 'Normal' | 'Baixa' }
// Resposta: Atendimento criado

// GET /api/atendimentos - Listar todos os atendimentos
// Query params: status?: string, prioridade?: string
// Resposta: Array de objetos Atendimento

// PUT /api/atendimentos/:id - Atualizar atendimento
// Body: Partial<Atendimento>
// Resposta: Atendimento atualizado

// DELETE /api/atendimentos/:id - Excluir atendimento
// Resposta: Status de sucesso

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
      const { error } = await supabase.from('atendimentos').insert({
        cliente: atendimento.cliente,
        telefone: atendimento.telefone,
        email: atendimento.email || null,
        tipo_solicitacao: atendimento.tipo_solicitacao,
        descricao: atendimento.descricao,
        status: atendimento.status,
        prioridade: atendimento.prioridade,
        is_read: false,
      });

      if (error) throw error;
      await fetchAtendimentos();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao adicionar atendimento');
    }
  };

  const updateAtendimento = async (
    id: string,
    atendimento: Partial<Omit<Atendimento, 'id' | 'created_at' | 'updated_at'>>
  ) => {
    try {
      const { error } = await supabase
        .from('atendimentos')
        .update({
          ...atendimento,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      await fetchAtendimentos();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar atendimento');
    }
  };

  const updateStatus = async (id: string, status: Atendimento['status']) => {
    await updateAtendimento(id, { status });
  };

  const markAsRead = async (id: string) => {
    await updateAtendimento(id, { is_read: true });
  };

  const deleteAtendimento = async (id: string) => {
    try {
      const { error } = await supabase.from('atendimentos').delete().eq('id', id);

      if (error) throw error;
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
          fetchAtendimentos();
        }
      )
      .subscribe();

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
