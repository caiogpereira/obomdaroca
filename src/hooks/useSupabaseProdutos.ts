import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Produto, Categoria } from '../types';

// GET /api/produtos - Listar todos os produtos
// Resposta: Array de objetos Produto com subcategoria populated

// POST /api/produtos - Criar produto
// Body: { codigo: string, nome: string, preco: number, subcategoria_id?: string }
// Resposta: Produto criado

// PUT /api/produtos/:id - Atualizar produto
// Body: { codigo: string, nome: string, preco: number, subcategoria_id?: string }
// Resposta: Produto atualizado

// DELETE /api/produtos/:id - Excluir produto
// Resposta: Status de sucesso

export const useSupabaseProdutos = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      setCategorias(data || []);
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
    }
  };

  const fetchProdutos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('produtos')
        .select(`
          *,
          subcategoria:categorias(id, nome)
        `)
        .order('nome', { ascending: true });

      if (error) throw error;

      const produtosFormatados = (data || []).map((p: any) => ({
        id: p.id,
        codigo: p.codigo,
        nome: p.nome,
        preco: parseFloat(p.preco),
        preco_cartao: p.preco_cartao ? parseFloat(p.preco_cartao) : undefined,
        preco_pix: p.preco_pix ? parseFloat(p.preco_pix) : undefined,
        preco_dinheiro: p.preco_dinheiro ? parseFloat(p.preco_dinheiro) : undefined,
        preco_oferta: p.preco_oferta ? parseFloat(p.preco_oferta) : undefined,
        image_url: p.image_url || undefined,
        image_storage_path: p.image_storage_path || undefined,
        subcategoria_id: p.subcategoria_id,
        subcategoria: p.subcategoria,
        created_at: p.created_at,
        updated_at: p.updated_at,
      }));

      setProdutos(produtosFormatados);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const addProduto = async (produto: Omit<Produto, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      let subcategoria_id = produto.subcategoria_id?.trim() || null;

      if (subcategoria_id) {
        const existingCategory = categorias.find(
          (cat) => cat.id === subcategoria_id || cat.nome.toLowerCase() === (subcategoria_id || '').toLowerCase()
        );

        if (existingCategory) {
          subcategoria_id = existingCategory.id;
        } else {
          const { data: newCat, error: catError } = await supabase
            .from('categorias')
            .insert({ nome: subcategoria_id })
            .select()
            .maybeSingle();

          if (catError) throw catError;
          if (newCat) {
            subcategoria_id = newCat.id;
            await fetchCategorias();
          } else {
            subcategoria_id = null;
          }
        }
      }

      const { error } = await supabase.from('produtos').insert({
        codigo: produto.codigo.trim(),
        nome: produto.nome.trim(),
        preco: produto.preco,
        preco_cartao: produto.preco_cartao || null,
        preco_pix: produto.preco_pix || null,
        preco_dinheiro: produto.preco_dinheiro || null,
        preco_oferta: produto.preco_oferta || null,
        image_url: produto.image_url || null,
        image_storage_path: produto.image_storage_path || null,
        subcategoria_id,
      });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Já existe um produto com este código');
        }
        throw error;
      }
      await fetchProdutos();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao adicionar produto');
    }
  };

  const updateProduto = async (
    id: string,
    produto: Omit<Produto, 'id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      let subcategoria_id = produto.subcategoria_id || null;

      if (subcategoria_id) {
        const existingCategory = categorias.find(
          (cat) => cat.id === subcategoria_id || cat.nome.toLowerCase() === (subcategoria_id || '').toLowerCase()
        );

        if (existingCategory) {
          subcategoria_id = existingCategory.id;
        } else {
          const { data: newCat, error: catError } = await supabase
            .from('categorias')
            .insert({ nome: subcategoria_id })
            .select()
            .maybeSingle();

          if (catError) throw catError;
          if (newCat) {
            subcategoria_id = newCat.id;
            await fetchCategorias();
          }
        }
      }

      const { error } = await supabase
        .from('produtos')
        .update({
          codigo: produto.codigo,
          nome: produto.nome,
          preco: produto.preco,
          preco_cartao: produto.preco_cartao || null,
          preco_pix: produto.preco_pix || null,
          preco_dinheiro: produto.preco_dinheiro || null,
          preco_oferta: produto.preco_oferta || null,
          image_url: produto.image_url || null,
          image_storage_path: produto.image_storage_path || null,
          subcategoria_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      await fetchProdutos();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar produto');
    }
  };

  const deleteProduto = async (id: string) => {
    try {
      const { error } = await supabase.from('produtos').delete().eq('id', id);

      if (error) throw error;
      await fetchProdutos();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao excluir produto');
    }
  };

  const importProdutos = async (produtos: Omit<Produto, 'id' | 'created_at' | 'updated_at'>[]) => {
    try {
      const categoriasMap = new Map<string, string>();

      for (const cat of categorias) {
        categoriasMap.set(cat.nome.toLowerCase(), cat.id);
      }

      const produtosParaInserir = await Promise.all(
        produtos.map(async (p) => {
          let subcategoria_id = null;

          if (p.subcategoria_id) {
            const catName = p.subcategoria_id.toLowerCase();
            if (categoriasMap.has(catName)) {
              subcategoria_id = categoriasMap.get(catName)!;
            } else {
              const { data: newCat } = await supabase
                .from('categorias')
                .insert({ nome: p.subcategoria_id })
                .select()
                .maybeSingle();

              if (newCat) {
                subcategoria_id = newCat.id;
                categoriasMap.set(catName, newCat.id);
              }
            }
          }

          return {
            codigo: p.codigo.trim(),
            nome: p.nome.trim(),
            preco: p.preco,
            preco_cartao: p.preco_cartao || null,
            preco_pix: p.preco_pix || null,
            preco_dinheiro: p.preco_dinheiro || null,
            preco_oferta: p.preco_oferta || null,
            image_url: p.image_url || null,
            image_storage_path: p.image_storage_path || null,
            subcategoria_id,
          };
        })
      );

      const { error } = await supabase.from('produtos').insert(produtosParaInserir);

      if (error) {
        console.error('Erro detalhado ao importar:', error);
        throw error;
      }
      await fetchCategorias();
      await fetchProdutos();
    } catch (err) {
      console.error('Erro ao importar produtos:', err);
      throw new Error(err instanceof Error ? err.message : 'Erro ao importar produtos');
    }
  };

  useEffect(() => {
    fetchCategorias();
    fetchProdutos();
  }, []);

  return {
    produtos,
    categorias,
    loading,
    error,
    addProduto,
    updateProduto,
    deleteProduto,
    importProdutos,
    refetch: fetchProdutos,
  };
};
