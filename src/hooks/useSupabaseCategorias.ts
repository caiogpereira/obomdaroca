import { supabase } from '../lib/supabase';

// Helper para obter ID do admin logado
const getAdminUserId = (): string => {
  try {
    const session = localStorage.getItem('obdr_user_session');
    if (session) {
      const user = JSON.parse(session);
      return user.id;
    }
  } catch (e) {
    console.error('Erro ao obter usuário:', e);
  }
  throw new Error('Usuário não autenticado. Faça login novamente.');
};

export const useSupabaseCategorias = () => {
  const addCategoria = async (nome: string) => {
    try {
      const adminUserId = getAdminUserId();
      const { error } = await supabase.rpc('admin_create_categoria', {
        p_admin_user_id: adminUserId,
        p_nome: nome
      });
      if (error) throw error;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao adicionar categoria');
    }
  };

  const updateCategoria = async (id: string, nome: string) => {
    try {
      const adminUserId = getAdminUserId();
      const { error } = await supabase.rpc('admin_upsert_categoria', {
        p_admin_user_id: adminUserId,
        p_nome: nome,
        p_id: id
      });
      if (error) throw error;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar categoria');
    }
  };

  const deleteCategoria = async (id: string) => {
    try {
      const adminUserId = getAdminUserId();

      // Desvincular produtos da categoria antes de deletar
      const { error: unlinkError } = await supabase.rpc('admin_unlink_categoria_produtos', {
        p_admin_user_id: adminUserId,
        p_categoria_id: id
      });
      if (unlinkError) throw unlinkError;

      // Deletar a categoria
      const { error } = await supabase.rpc('admin_delete_categoria', {
        p_admin_user_id: adminUserId,
        p_categoria_id: id
      });
      if (error) throw error;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao excluir categoria');
    }
  };

  return {
    addCategoria,
    updateCategoria,
    deleteCategoria,
  };
};
