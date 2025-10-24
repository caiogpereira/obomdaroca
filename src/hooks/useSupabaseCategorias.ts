import { supabase } from '../lib/supabase';

export const useSupabaseCategorias = () => {
  const addCategoria = async (nome: string) => {
    try {
      const { error } = await supabase.from('categorias').insert({ nome });
      if (error) throw error;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao adicionar categoria');
    }
  };

  const updateCategoria = async (id: string, nome: string) => {
    try {
      const { error } = await supabase
        .from('categorias')
        .update({ nome })
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar categoria');
    }
  };

  const deleteCategoria = async (id: string) => {
    try {
      await supabase
        .from('produtos')
        .update({ subcategoria_id: null })
        .eq('subcategoria_id', id);

      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id);

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
