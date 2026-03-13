import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { registrarLog } from './useLogsAtendimento';

interface StatusAgente {
  bloqueado: boolean;
  clienteNome?: string;
  motivo?: string;
  ativadoPor?: string;
  ativadoEm?: string;
  expiraEm?: string;
}

interface BloqueioAgente {
  id: string;
  telefone: string;
  cliente_nome: string;
  motivo: string;
  ativado_por_user_name: string;
  ativado_em: string;
  expira_em: string;
  ativo: boolean;
}

// Auth customizada via localStorage
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

export const useAgenteIA = () => {
  const [loading, setLoading] = useState(false);

  const verificarBloqueio = useCallback(async (telefone: string): Promise<StatusAgente> => {
    try {
      const telefoneNormalizado = telefone.replace(/\D/g, '');
      
      const { data, error } = await supabase
        .from('agente_ia_bloqueio')
        .select('*')
        .eq('telefone', telefoneNormalizado)
        .eq('ativo', true)
        .gt('expira_em', new Date().toISOString())
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar bloqueio:', error);
      }

      if (data) {
        return {
          bloqueado: true,
          clienteNome: data.cliente_nome,
          motivo: data.motivo,
          ativadoPor: data.ativado_por_user_name,
          ativadoEm: data.ativado_em,
          expiraEm: data.expira_em,
        };
      }

      return { bloqueado: false };
    } catch (err) {
      console.error('Erro ao verificar bloqueio:', err);
      return { bloqueado: false };
    }
  }, []);

  const ativarAtendimentoHumano = useCallback(async (
    telefone: string,
    clienteNome: string,
    motivo: string = 'atendimento_humano',
    duracaoHoras: number = 1
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const usuario = getUsuarioAtual();

      if (!usuario) {
        console.error('Usuário não autenticado (localStorage vazio)');
        return false;
      }

      const telefoneNormalizado = telefone.replace(/\D/g, '');

      await supabase
        .from('agente_ia_bloqueio')
        .delete()
        .eq('telefone', telefoneNormalizado);

      const expiraEm = new Date();
      expiraEm.setHours(expiraEm.getHours() + duracaoHoras);

      const { error } = await supabase
        .from('agente_ia_bloqueio')
        .insert({
          telefone: telefoneNormalizado,
          cliente_nome: clienteNome,
          motivo,
          ativado_por_user_id: usuario.id,
          ativado_por_user_name: usuario.nome,
          ativado_em: new Date().toISOString(),
          expira_em: expiraEm.toISOString(),
          ativo: true,
        });

      if (error) {
        console.error('Erro ao ativar atendimento humano:', error);
        return false;
      }

      // Log
      registrarLog({
        tipo: 'agente_ia',
        acao: 'ativar_atendimento_humano',
        descricao: `Agente IA desativado para ${clienteNome} (${telefoneNormalizado}) por ${usuario.nome}`,
        entidade_tipo: 'agente_ia_bloqueio',
        usuario_id: usuario.id,
        usuario_nome: usuario.nome,
        detalhes: { telefone: telefoneNormalizado, cliente: clienteNome, duracao_horas: duracaoHoras },
      });

      return true;
    } catch (err) {
      console.error('Erro ao ativar atendimento humano:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const desativarAtendimentoHumano = useCallback(async (telefone: string): Promise<boolean> => {
    setLoading(true);
    try {
      const usuario = getUsuarioAtual();
      const telefoneNormalizado = telefone.replace(/\D/g, '');

      const { error } = await supabase
        .from('agente_ia_bloqueio')
        .delete()
        .eq('telefone', telefoneNormalizado)
        .eq('ativo', true);

      if (error) {
        console.error('Erro ao desativar atendimento humano:', error);
        return false;
      }

      // Log
      registrarLog({
        tipo: 'agente_ia',
        acao: 'desativar_atendimento_humano',
        descricao: `Agente IA reativado para telefone ${telefoneNormalizado} por ${usuario?.nome || 'Sistema'}`,
        entidade_tipo: 'agente_ia_bloqueio',
        usuario_id: usuario?.id,
        usuario_nome: usuario?.nome,
        detalhes: { telefone: telefoneNormalizado },
      });

      return true;
    } catch (err) {
      console.error('Erro ao desativar atendimento humano:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleAtendimentoHumano = useCallback(async (
    telefone: string,
    clienteNome: string,
    ativar: boolean
  ): Promise<boolean> => {
    if (ativar) {
      return ativarAtendimentoHumano(telefone, clienteNome);
    } else {
      return desativarAtendimentoHumano(telefone);
    }
  }, [ativarAtendimentoHumano, desativarAtendimentoHumano]);

  const buscarHistorico = useCallback(async (telefone: string): Promise<BloqueioAgente[]> => {
    try {
      const telefoneNormalizado = telefone.replace(/\D/g, '');

      const { data, error } = await supabase
        .from('agente_ia_bloqueio')
        .select('*')
        .eq('telefone', telefoneNormalizado)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Erro ao buscar histórico:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
      return [];
    }
  }, []);

  return {
    loading,
    verificarBloqueio,
    ativarAtendimentoHumano,
    desativarAtendimentoHumano,
    toggleAtendimentoHumano,
    buscarHistorico,
  };
};
