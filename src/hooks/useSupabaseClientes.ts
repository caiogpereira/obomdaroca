import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Cliente, ClienteFormData, ProdutoTopCliente, Pedido } from '../types';

export const useSupabaseClientes = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClientes = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('clientes')
        .select('*')
        .order('ultima_compra', { ascending: false, nullsFirst: false });

      if (fetchError) throw fetchError;

      setClientes(data?.map(c => ({
        ...c,
        total_gasto: parseFloat(c.total_gasto) || 0,
        ticket_medio: parseFloat(c.ticket_medio) || 0,
      })) || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, []);

  const getClienteComHistorico = async (clienteId: string) => {
    try {
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single();

      if (clienteError) throw clienteError;

      const { data: pedidosData, error: pedidosError } = await supabase
        .from('pedidos')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });

      if (pedidosError) throw pedidosError;

      const pedidosComItens = await Promise.all(
        (pedidosData || []).map(async (pedido) => {
          const { data: itensData } = await supabase
            .from('itens_pedido')
            .select('*')
            .eq('pedido_id', pedido.id);

          return {
            id: pedido.id,
            numero: pedido.numero_pedido,
            cliente: pedido.cliente,
            telefone: pedido.telefone,
            email: pedido.email || '',
            endereco: pedido.endereco || '',
            items: (itensData || []).map((item) => ({
              id: item.id,
              pedido_id: item.pedido_id,
              produto_id: item.produto_id,
              produto_nome: item.produto_nome,
              quantidade: item.quantidade,
              preco_unitario: parseFloat(item.preco_unitario),
            })),
            total: parseFloat(pedido.valor_total),
            status: pedido.status,
            forma_pagamento: pedido.forma_pagamento || '',
            observacoes: pedido.observacoes || '',
            created_at: pedido.created_at,
            updated_at: pedido.updated_at,
          } as Pedido;
        })
      );

      const { data: produtosTopData, error: produtosError } = await supabase
        .rpc('get_produtos_top_cliente', { p_cliente_id: clienteId, p_limit: 5 });

      if (produtosError) {
        console.warn('Erro ao buscar produtos top:', produtosError);
      }

      return {
        ...clienteData,
        total_gasto: parseFloat(clienteData.total_gasto) || 0,
        ticket_medio: parseFloat(clienteData.ticket_medio) || 0,
        pedidos: pedidosComItens,
        produtos_top: (produtosTopData || []).map((p: any) => ({
          produto_nome: p.produto_nome,
          total_quantidade: parseInt(p.total_quantidade) || 0,
          total_pedidos: parseInt(p.total_pedidos) || 0,
          total_valor: parseFloat(p.total_valor) || 0,
        })) as ProdutoTopCliente[],
      };
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao carregar cliente');
    }
  };

  const buscarPorTelefone = async (telefone: string) => {
    try {
      const telefoneNormalizado = telefone.replace(/\D/g, '');
      
      const { data, error: fetchError } = await supabase
        .from('clientes')
        .select('*')
        .eq('telefone', telefoneNormalizado)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      return data ? {
        ...data,
        total_gasto: parseFloat(data.total_gasto) || 0,
        ticket_medio: parseFloat(data.ticket_medio) || 0,
      } as Cliente : null;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao buscar cliente');
    }
  };

  const buscarClientes = async (termo: string) => {
    try {
      const termoLimpo = termo.trim();
      if (!termoLimpo) {
        await fetchClientes();
        return;
      }

      const apenasNumeros = termoLimpo.replace(/\D/g, '');
      const ehTelefone = apenasNumeros.length >= 8;

      let query = supabase.from('clientes').select('*');

      if (ehTelefone) {
        query = query.ilike('telefone', `%${apenasNumeros}%`);
      } else {
        query = query.or(`nome.ilike.%${termoLimpo}%,nome_empresa.ilike.%${termoLimpo}%,cpf_cnpj.ilike.%${termoLimpo}%`);
      }

      const { data, error: fetchError } = await query.order('ultima_compra', { ascending: false, nullsFirst: false });

      if (fetchError) throw fetchError;

      setClientes(data?.map(c => ({
        ...c,
        total_gasto: parseFloat(c.total_gasto) || 0,
        ticket_medio: parseFloat(c.ticket_medio) || 0,
      })) || []);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao buscar clientes');
    }
  };

  const filtrarPorSegmento = async (segmento: string | null) => {
    try {
      setLoading(true);
      
      let query = supabase.from('clientes').select('*');
      
      if (segmento) {
        query = query.eq('segmento', segmento);
      }
      
      const { data, error: fetchError } = await query.order('ultima_compra', { ascending: false, nullsFirst: false });

      if (fetchError) throw fetchError;

      setClientes(data?.map(c => ({
        ...c,
        total_gasto: parseFloat(c.total_gasto) || 0,
        ticket_medio: parseFloat(c.ticket_medio) || 0,
      })) || []);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao filtrar clientes');
    } finally {
      setLoading(false);
    }
  };

  const addCliente = async (cliente: ClienteFormData) => {
    try {
      const { data, error: insertError } = await supabase
        .from('clientes')
        .insert({
          ...cliente,
          origem: 'manual',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchClientes();
      return data;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao adicionar cliente');
    }
  };

  const updateCliente = async (id: string, cliente: Partial<ClienteFormData>) => {
    try {
      const { error: updateError } = await supabase
        .from('clientes')
        .update({
          ...cliente,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchClientes();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar cliente');
    }
  };

  const deleteCliente = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setClientes((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao excluir cliente');
    }
  };

  const getEstatisticas = () => {
    const total = clientes.length;
    const vip = clientes.filter(c => c.segmento === 'vip').length;
    const frequente = clientes.filter(c => c.segmento === 'frequente').length;
    const ativo = clientes.filter(c => c.segmento === 'ativo').length;
    const inativo = clientes.filter(c => c.segmento === 'inativo').length;
    const novo = clientes.filter(c => c.segmento === 'novo').length;
    
    const totalGasto = clientes.reduce((acc, c) => acc + c.total_gasto, 0);
    const totalPedidos = clientes.reduce((acc, c) => acc + c.total_pedidos, 0);
    
    return {
      total,
      vip,
      frequente,
      ativo,
      inativo,
      novo,
      totalGasto,
      totalPedidos,
      ticketMedioGeral: totalPedidos > 0 ? totalGasto / totalPedidos : 0,
    };
  };

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  return {
    clientes,
    loading,
    error,
    fetchClientes,
    getClienteComHistorico,
    buscarPorTelefone,
    buscarClientes,
    filtrarPorSegmento,
    addCliente,
    updateCliente,
    deleteCliente,
    getEstatisticas,
    refetch: fetchClientes,
  };
};