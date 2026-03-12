import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Produto, Categoria } from '../types';

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
      
      let allProdutos: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('produtos')
          .select(`
            *,
            subcategoria:categorias(id, nome)
          `)
          .order('nome', { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allProdutos = [...allProdutos, ...data];
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      const produtosFormatados = allProdutos.map((p: any) => ({
        id: p.id,
        codigo: p.codigo,
        nome: p.nome,
        preco: parseFloat(p.preco),
        preco_varejo: p.preco_varejo ? parseFloat(p.preco_varejo) : undefined,
        preco_cartao: p.preco_cartao ? parseFloat(p.preco_cartao) : undefined,
        preco_pix: p.preco_pix ? parseFloat(p.preco_pix) : undefined,
        preco_dinheiro: p.preco_dinheiro ? parseFloat(p.preco_dinheiro) : undefined,
        preco_oferta: p.preco_oferta ? parseFloat(p.preco_oferta) : undefined,
        image_url: p.image_url || undefined,
        image_storage_path: p.image_storage_path || undefined,
        marca: p.marca || undefined,
        categoria: p.categoria || undefined,
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
      const adminUserId = getAdminUserId();
      let subcategoria_id = produto.subcategoria_id?.trim() || null;

      if (subcategoria_id) {
        const existingCategory = categorias.find(
          (cat) => cat.id === subcategoria_id || cat.nome.toLowerCase() === (subcategoria_id || '').toLowerCase()
        );

        if (existingCategory) {
          subcategoria_id = existingCategory.id;
        } else {
          // Criar categoria via RPC
          const { data: newCat, error: catError } = await supabase.rpc('admin_create_categoria', {
            p_admin_user_id: adminUserId,
            p_nome: subcategoria_id
          });

          if (catError) throw catError;
          if (newCat) {
            subcategoria_id = newCat.id;
            await fetchCategorias();
          } else {
            subcategoria_id = null;
          }
        }
      }

      // Criar produto via RPC
      const { error } = await supabase.rpc('admin_upsert_produto', {
        p_admin_user_id: adminUserId,
        p_produto: {
          codigo: produto.codigo.trim(),
          nome: produto.nome.trim(),
          preco: produto.preco,
          preco_varejo: produto.preco_varejo || null,
          preco_cartao: produto.preco_cartao || null,
          preco_pix: produto.preco_pix || null,
          preco_dinheiro: produto.preco_dinheiro || null,
          preco_oferta: produto.preco_oferta || null,
          image_url: produto.image_url || null,
          image_storage_path: produto.image_storage_path || null,
          subcategoria_id,
          ativo: true,
        }
      });

      if (error) {
        if (error.message?.includes('23505') || error.message?.includes('duplicate')) {
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

    const { error } = await supabase.rpc('update_produto_completo', {
      p_id: id,
      p_codigo: produto.codigo,
      p_nome: produto.nome,
      p_preco: produto.preco || produto.preco_varejo || 0,
      p_preco_varejo: produto.preco_varejo || null,
      p_preco_cartao: produto.preco_cartao || null,
      p_preco_pix: produto.preco_pix || null,
      p_preco_dinheiro: produto.preco_dinheiro || null,
      p_preco_oferta: produto.preco_oferta || null,
      p_image_url: produto.image_url || null,
      p_image_storage_path: produto.image_storage_path || null,
      p_subcategoria_id: subcategoria_id || null,
      p_marca: produto.marca || null,
      p_categoria: produto.categoria || null,
    });

    if (error) throw error;
    await fetchProdutos();
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar produto');
  }
};

  const deleteProduto = async (id: string) => {
    try {
      const adminUserId = getAdminUserId();
      const { error } = await supabase.rpc('admin_delete_produto', {
        p_admin_user_id: adminUserId,
        p_produto_id: id
      });

      if (error) throw error;
      await fetchProdutos();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao excluir produto');
    }
  };

  const deleteMultipleProdutos = async (ids: string[]) => {
    try {
      const adminUserId = getAdminUserId();
      
      for (const id of ids) {
        const { error } = await supabase.rpc('admin_delete_produto', {
          p_admin_user_id: adminUserId,
          p_produto_id: id
        });
        if (error) throw error;
      }
      
      await fetchProdutos();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao excluir produtos');
    }
  };

  const importProdutos = async (produtos: Omit<Produto, 'id' | 'created_at' | 'updated_at'>[]) => {
    try {
      const adminUserId = getAdminUserId();

      // Collect unique categories
      const uniqueCategories = new Set<string>();
      produtos.forEach((p) => {
        if (p.subcategoria_id?.trim()) {
          uniqueCategories.add(p.subcategoria_id.trim());
        }
      });

      // Create a map of category names to IDs
      const categoriasMap = new Map<string, string>();
      categorias.forEach((cat) => {
        categoriasMap.set(cat.nome.toLowerCase(), cat.id);
      });

      // Create missing categories via RPC
      for (const catName of uniqueCategories) {
        if (!categoriasMap.has(catName.toLowerCase())) {
          const { data: newCat, error: catError } = await supabase.rpc('admin_create_categoria', {
            p_admin_user_id: adminUserId,
            p_nome: catName
          });

          if (catError) {
            console.warn(`Erro ao criar categoria ${catName}:`, catError);
          } else if (newCat) {
            categoriasMap.set(catName.toLowerCase(), newCat.id);
          }
        }
      }

      // Prepare products for insertion
      const produtosParaInserir = produtos.map((p) => {
        let subcategoria_id = null;

        if (p.subcategoria_id) {
          const catName = p.subcategoria_id.toLowerCase();
          subcategoria_id = categoriasMap.get(catName) || null;
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
      });

      // Import in batches via RPC
      const BATCH_SIZE = 100;
      const batches = [];

      for (let i = 0; i < produtosParaInserir.length; i += BATCH_SIZE) {
        batches.push(produtosParaInserir.slice(i, i + BATCH_SIZE));
      }

      console.log(`Importando ${produtosParaInserir.length} produtos em ${batches.length} lote(s)...`);

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < batches.length; i++) {
        console.log(`Processando lote ${i + 1} de ${batches.length} (${batches[i].length} produtos)...`);

        const { data, error } = await supabase.rpc('admin_batch_upsert_produtos', {
          p_admin_user_id: adminUserId,
          p_produtos: batches[i]
        });

        if (error) {
          console.error(`Erro no lote ${i + 1}:`, error);
          errorCount += batches[i].length;
          errors.push(`Lote ${i + 1}: ${error.message}`);
        } else if (data) {
          successCount += data.success_count || 0;
          errorCount += data.error_count || 0;
          if (data.errors && data.errors.length > 0) {
            errors.push(...data.errors);
          }
        }

        // Small delay between batches
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      console.log(`Importação concluída: ${successCount} sucesso, ${errorCount} erros`);
      
      if (errors.length > 0) {
        console.warn('Erros durante importação:', errors);
      }

      await fetchCategorias();
      await fetchProdutos();

      if (errorCount > 0 && successCount === 0) {
        throw new Error(`Falha ao importar produtos: ${errors.join('; ')}`);
      }
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
    deleteMultipleProdutos,
    importProdutos,
    refetch: fetchProdutos,
  };
};
