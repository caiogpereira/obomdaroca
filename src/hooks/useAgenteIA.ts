import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

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

// Função para obter usuário atual
const getUsuarioAtual = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .eq('id', user.id)
    .maybeSingle();
  
  // Tentar também na tabela users
  if (!profile) {
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('id', user.id)
      .maybeSingle();
    
    return userProfile ? { id: userProfile.id, nome: userProfile.full_name } : { id: user.id, nome: user.email || 'Sistema' };
  }
  
  return { id: profile.id, nome: profile.full_name };
};

export const useAgenteIA = () => {
  const [loading, setLoading] = useState(false);

  // Verificar se o agente está bloqueado para um telefone
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

  // Ativar atendimento humano (desativar agente IA)
  const ativarAtendimentoHumano = useCallback(async (
    telefone: string,
    clienteNome: string,
    motivo: string = 'atendimento_humano',
    duracaoHoras: number = 1
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const usuario = await getUsuarioAtual();
      if (!usuario) {
        console.error('Usuário não autenticado');
        return false;
      }

      const telefoneNormalizado = telefone.replace(/\D/g, '');

      // Desativar bloqueios anteriores
      await supabase
        .from('agente_ia_bloqueio')
        .update({
          ativo: false,
          desativado_por_user_id: usuario.id,
          desativado_por_user_name: usuario.nome,
          desativado_em: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('telefone', telefoneNormalizado)
        .eq('ativo', true);

      // Criar novo bloqueio
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

      return true;
    } catch (err) {
      console.error('Erro ao ativar atendimento humano:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Desativar atendimento humano (reativar agente IA)
  const desativarAtendimentoHumano = useCallback(async (telefone: string): Promise<boolean> => {
    setLoading(true);
    try {
      const usuario = await getUsuarioAtual();
      if (!usuario) {
        console.error('Usuário não autenticado');
        return false;
      }

      const telefoneNormalizado = telefone.replace(/\D/g, '');

      const { error } = await supabase
        .from('agente_ia_bloqueio')
        .update({
          ativo: false,
          desativado_por_user_id: usuario.id,
          desativado_por_user_name: usuario.nome,
          desativado_em: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('telefone', telefoneNormalizado)
        .eq('ativo', true);

      if (error) {
        console.error('Erro ao desativar atendimento humano:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Erro ao desativar atendimento humano:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Toggle do atendimento humano
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

  // Buscar histórico de bloqueios de um telefone
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
