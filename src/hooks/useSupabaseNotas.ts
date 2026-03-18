import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { registrarLog } from './useLogsAtendimento';

export interface NotaDoDia {
  id: string;
  mensagem: string;
  autor: string;
  expira_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotaDoDiaForm {
  mensagem: string;
  expira_em?: string | null;
}

export const useSupabaseNotas = () => {
  const [notas, setNotas] = useState<NotaDoDia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotas = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('notas_do_dia')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setNotas(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar notas');
    } finally {
      setLoading(false);
    }
  }, []);

  const addNota = async (nota: NotaDoDiaForm, autor: string) => {
    try {
      const { data, error: insertError } = await supabase
        .from('notas_do_dia')
        .insert({
          mensagem: nota.mensagem.trim(),
          autor,
          expira_em: nota.expira_em || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setNotas((prev) => [data, ...prev]);

      // Registrar log
      registrarLog({
        tipo: 'sistema',
        acao: 'alterar_configuracao',
        descricao: `Nota do dia adicionada por ${autor}: "${nota.mensagem.trim().substring(0, 80)}${nota.mensagem.trim().length > 80 ? '...' : ''}"`,
        entidade_tipo: 'notas_do_dia',
        entidade_id: data.id,
        detalhes: {
          mensagem: nota.mensagem.trim(),
          autor,
          expira_em: nota.expira_em || null,
        },
      });

      return data;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao adicionar nota');
    }
  };

  const updateNota = async (id: string, nota: NotaDoDiaForm) => {
    try {
      const notaAnterior = notas.find((n) => n.id === id);

      const { error: updateError } = await supabase
        .from('notas_do_dia')
        .update({
          mensagem: nota.mensagem.trim(),
          expira_em: nota.expira_em || null,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      setNotas((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, mensagem: nota.mensagem.trim(), expira_em: nota.expira_em || null, updated_at: new Date().toISOString() }
            : n
        )
      );

      // Registrar log
      registrarLog({
        tipo: 'sistema',
        acao: 'alterar_configuracao',
        descricao: `Nota do dia editada: "${nota.mensagem.trim().substring(0, 80)}${nota.mensagem.trim().length > 80 ? '...' : ''}"`,
        entidade_tipo: 'notas_do_dia',
        entidade_id: id,
        detalhes: {
          mensagem_anterior: notaAnterior?.mensagem,
          mensagem_nova: nota.mensagem.trim(),
          expira_em: nota.expira_em || null,
        },
      });
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar nota');
    }
  };

  const deleteNota = async (id: string) => {
    try {
      const notaExcluida = notas.find((n) => n.id === id);

      const { error: deleteError } = await supabase
        .from('notas_do_dia')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setNotas((prev) => prev.filter((n) => n.id !== id));

      // Registrar log
      registrarLog({
        tipo: 'sistema',
        acao: 'alterar_configuracao',
        descricao: `Nota do dia excluida: "${notaExcluida?.mensagem?.substring(0, 80) || 'desconhecida'}${(notaExcluida?.mensagem?.length || 0) > 80 ? '...' : ''}"`,
        entidade_tipo: 'notas_do_dia',
        entidade_id: id,
        detalhes: {
          mensagem: notaExcluida?.mensagem,
          autor: notaExcluida?.autor,
        },
      });
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao excluir nota');
    }
  };

  const isExpirada = (nota: NotaDoDia): boolean => {
    if (!nota.expira_em) return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const expiraDate = new Date(nota.expira_em + 'T00:00:00');
    return expiraDate < hoje;
  };

  useEffect(() => {
    fetchNotas();
  }, [fetchNotas]);

  return {
    notas,
    loading,
    error,
    addNota,
    updateNota,
    deleteNota,
    isExpirada,
    refetch: fetchNotas,
  };
};