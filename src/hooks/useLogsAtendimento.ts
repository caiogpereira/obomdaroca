import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// =====================================================
// TIPOS
// =====================================================
export type TipoLog = 'atendimento' | 'pedido' | 'produto' | 'cliente' | 'sistema' | 'agente_ia';
export type AcaoLog = 
  // Atendimentos
  | 'criar_atendimento' | 'editar_atendimento' | 'excluir_atendimento'
  | 'assumir_atendimento' | 'resolver_atendimento' | 'alterar_status_atendimento'
  // Pedidos
  | 'criar_pedido' | 'editar_pedido' | 'finalizar_pedido' | 'alterar_status_pedido' | 'arquivar_pedido'
  // Produtos
  | 'criar_produto' | 'editar_produto' | 'excluir_produto' | 'importar_produtos'
  // Clientes
  | 'criar_cliente' | 'editar_cliente' | 'excluir_cliente'
  // Agente IA
  | 'ativar_atendimento_humano' | 'desativar_atendimento_humano'
  // Sistema
  | 'login' | 'logout' | 'alterar_configuracao';

export interface LogSistema {
  id: string;
  tipo: TipoLog;
  acao: AcaoLog;
  descricao: string;
  entidade_tipo?: string;
  entidade_id?: string;
  usuario_id?: string;
  usuario_nome?: string;
  detalhes?: any;
  created_at: string;
}

export interface FiltrosLog {
  tipo?: TipoLog;
  acao?: AcaoLog;
  usuario_nome?: string;
  dataInicio?: string;
  dataFim?: string;
  busca?: string;
}

// =====================================================
// FUNÇÃO GLOBAL PARA REGISTRAR LOGS
// Pode ser importada e usada em qualquer hook/componente
// =====================================================
export const registrarLog = async (params: {
  tipo: TipoLog;
  acao: string;
  descricao: string;
  entidade_tipo?: string;
  entidade_id?: string;
  usuario_id?: string;
  usuario_nome?: string;
  detalhes?: any;
}) => {
  try {
    // Se não tem usuário, tenta pegar do localStorage
    let userId = params.usuario_id;
    let userName = params.usuario_nome;
    
    if (!userId) {
      try {
        const session = localStorage.getItem('obdr_user_session');
        if (session) {
          const user = JSON.parse(session);
          userId = user.id;
          userName = user.full_name;
        }
      } catch (e) {
        // Silencioso - pode estar sendo chamado do lado do servidor
      }
    }

    const { error } = await supabase
      .from('logs_sistema')
      .insert({
        tipo: params.tipo,
        acao: params.acao,
        descricao: params.descricao,
        entidade_tipo: params.entidade_tipo || null,
        entidade_id: params.entidade_id || null,
        usuario_id: userId || null,
        usuario_nome: userName || 'Sistema',
        detalhes: params.detalhes ? JSON.stringify(params.detalhes) : null,
      });

    if (error) {
      console.warn('Erro ao registrar log (não-bloqueante):', error);
    }
  } catch (err) {
    // Log de sistema nunca deve bloquear a operação principal
    console.warn('Erro ao registrar log:', err);
  }
};

// =====================================================
// HOOK PARA VISUALIZAR LOGS
// =====================================================
export const useLogsSistema = () => {
  const [logs, setLogs] = useState<LogSistema[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = useCallback(async (filtros?: FiltrosLog, page: number = 0, pageSize: number = 50) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('logs_sistema')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      // Aplicar filtros
      if (filtros?.tipo) {
        query = query.eq('tipo', filtros.tipo);
      }
      if (filtros?.acao) {
        query = query.eq('acao', filtros.acao);
      }
      if (filtros?.usuario_nome) {
        query = query.ilike('usuario_nome', `%${filtros.usuario_nome}%`);
      }
      if (filtros?.dataInicio) {
        query = query.gte('created_at', filtros.dataInicio);
      }
      if (filtros?.dataFim) {
        query = query.lte('created_at', filtros.dataFim + 'T23:59:59.999Z');
      }
      if (filtros?.busca) {
        query = query.ilike('descricao', `%${filtros.busca}%`);
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      const logsFormatados: LogSistema[] = (data || []).map((l: any) => ({
        id: l.id,
        tipo: l.tipo,
        acao: l.acao,
        descricao: l.descricao,
        entidade_tipo: l.entidade_tipo,
        entidade_id: l.entidade_id,
        usuario_id: l.usuario_id,
        usuario_nome: l.usuario_nome,
        detalhes: l.detalhes ? (typeof l.detalhes === 'string' ? JSON.parse(l.detalhes) : l.detalhes) : null,
        created_at: l.created_at,
      }));

      setLogs(logsFormatados);
      setTotalCount(count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    logs,
    loading,
    error,
    totalCount,
    fetchLogs,
  };
};
