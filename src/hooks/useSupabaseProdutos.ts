import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Produto, Categoria } from '../types';
import { registrarLog } from './useLogsAtendimento';

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
        categoria: p.subcategoria?.nome || '',
        subcategoria_id: p.subcategoria_id,
        subcategoria: p.subcategoria?.nome || '',
        marca: p.marca || '',
        imagem_url: p.image_url || '',
        image_url: p.image_url || '',
        image_storage_path: p.image_storage_path || '',
        ativo: p.ativo !== false,
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

      const { data, error } = await supabase
        .from('produtos')
        .insert({
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
        })
        .select()
        .single();

      if (error) throw error;

      // Log
      registrarLog({
        tipo: 'produto',
        acao: 'criar_produto',
        descricao: `Produto "${produto.nome}" (${produto.codigo}) criado`,
        entidade_tipo: 'produto',
        entidade_id: data?.id,
        detalhes: { codigo: produto.codigo, nome: produto.nome, preco: produto.preco },
      });

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

      // Log
      registrarLog({
        tipo: 'produto',
        acao: 'editar_produto',
        descricao: `Produto "${produto.nome}" (${produto.codigo}) editado`,
        entidade_tipo: 'produto',
        entidade_id: id,
        detalhes: { codigo: produto.codigo, nome: produto.nome, preco: produto.preco },
      });

      await fetchProdutos();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar produto');
    }
  };

  const deleteProduto = async (id: string) => {
    try {
      const produtoAtual = produtos.find(p => p.id === id);
      
      const { error } = await supabase.from('produtos').delete().eq('id', id);
      if (error) throw error;

      // Log
      registrarLog({
        tipo: 'produto',
        acao: 'excluir_produto',
        descricao: `Produto "${produtoAtual?.nome || 'desconhecido'}" (${produtoAtual?.codigo || ''}) excluído`,
        entidade_tipo: 'produto',
        entidade_id: id,
        detalhes: { codigo: produtoAtual?.codigo, nome: produtoAtual?.nome },
      });

      await fetchProdutos();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao excluir produto');
    }
  };

  const deleteMultipleProdutos = async (ids: string[]) => {
    try {
      const { error } = await supabase.from('produtos').delete().in('id', ids);
      if (error) throw error;

      // Log
      registrarLog({
        tipo: 'produto',
        acao: 'excluir_produto',
        descricao: `${ids.length} produtos excluídos em massa`,
        entidade_tipo: 'produto',
        detalhes: { quantidade: ids.length, ids },
      });

      await fetchProdutos();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao excluir produtos');
    }
  };

  const importProdutos = async (produtosImport: Omit<Produto, 'id' | 'created_at' | 'updated_at'>[]) => {
    try {
      const categoriasMap = new Map<string, string>();

      for (const cat of categorias) {
        categoriasMap.set(cat.nome.toLowerCase(), cat.id);
      }

      const uniqueCategories = new Set<string>();
      for (const p of produtosImport) {
        if (p.subcategoria_id) {
          const catName = p.subcategoria_id.toLowerCase();
          if (!categoriasMap.has(catName)) {
            uniqueCategories.add(p.subcategoria_id);
          }
        }
      }

      for (const catName of uniqueCategories) {
        const { data: existingCat } = await supabase
          .from('categorias')
          .select('id, nome')
          .ilike('nome', catName)
          .maybeSingle();

        if (existingCat) {
          categoriasMap.set(catName.toLowerCase(), existingCat.id);
        } else {
          const { data: newCat } = await supabase
            .from('categorias')
            .insert({ nome: catName })
            .select()
            .maybeSingle();

          if (newCat) {
            categoriasMap.set(catName.toLowerCase(), newCat.id);
          }
        }
      }

      const BATCH_SIZE = 200;
      let successCount = 0;
      
      for (let i = 0; i < produtosImport.length; i += BATCH_SIZE) {
        const batch = produtosImport.slice(i, i + BATCH_SIZE);
        
        const produtosParaInserir = batch.map((p) => ({
          codigo: p.codigo,
          nome: p.nome,
          preco: p.preco,
          preco_varejo: p.preco_varejo || p.preco,
          preco_cartao: p.preco_cartao || null,
          preco_pix: p.preco_pix || null,
          preco_dinheiro: p.preco_dinheiro || null,
          marca: p.marca || null,
          subcategoria_id: p.subcategoria_id
            ? categoriasMap.get(p.subcategoria_id.toLowerCase()) || null
            : null,
        }));

        const { error } = await supabase
          .from('produtos')
          .upsert(produtosParaInserir, { onConflict: 'codigo' });

        if (error) throw error;
        successCount += batch.length;
      }

      // Log
      registrarLog({
        tipo: 'produto',
        acao: 'importar_produtos',
        descricao: `${successCount} produtos importados via planilha`,
        entidade_tipo: 'produto',
        detalhes: { quantidade: successCount, categorias_novas: uniqueCategories.size },
      });

      await fetchCategorias();
      await fetchProdutos();
    } catch (err) {
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
