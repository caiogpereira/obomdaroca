import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Cliente, ClienteFormData, ProdutoTopCliente, Pedido } from '../types';
import { registrarLog } from './useLogsAtendimento';

export const useSupabaseClientes = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [todosClientes, setTodosClientes] = useState<Cliente[]>([]);
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

      const clientesFormatados = data?.map(c => ({
        ...c,
        total_gasto: parseFloat(c.total_gasto) || 0,
        ticket_medio: parseFloat(c.ticket_medio) || 0,
      })) || [];

      setClientes(clientesFormatados);
      setTodosClientes(clientesFormatados);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, []);

  const getClienteComHistorico = useCallback(async (clienteId: string) => {
    try {
      const { data: cliente, error: clienteError } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single();

      if (clienteError) throw clienteError;

      // Buscar pedidos do cliente
      const { data: pedidosData } = await supabase
        .from('pedidos')
        .select('*, itens_pedido(*)')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });

      // Buscar pedidos arquivados do cliente
      const { data: arquivadosData } = await supabase
        .from('pedidos_arquivados')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });

      // Calcular produtos top
      const produtosCount = new Map<string, { nome: string; quantidade: number; pedidos: number; valor: number }>();
      
      for (const pedido of (pedidosData || [])) {
        for (const item of (pedido.itens_pedido || [])) {
          const existing = produtosCount.get(item.produto_nome) || { nome: item.produto_nome, quantidade: 0, pedidos: 0, valor: 0 };
          existing.quantidade += item.quantidade;
          existing.pedidos += 1;
          existing.valor += parseFloat(item.preco_unitario) * item.quantidade;
          produtosCount.set(item.produto_nome, existing);
        }
      }

      const produtosTop: ProdutoTopCliente[] = Array.from(produtosCount.values())
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5)
        .map(p => ({
          produto_nome: p.nome,
          total_quantidade: p.quantidade,
          total_pedidos: p.pedidos,
          total_valor: p.valor,
        }));

      return {
        ...cliente,
        total_gasto: parseFloat(cliente.total_gasto) || 0,
        ticket_medio: parseFloat(cliente.ticket_medio) || 0,
        pedidos: pedidosData || [],
        pedidos_arquivados: arquivadosData || [],
        produtos_top: produtosTop,
      };
    } catch (err) {
      console.error('Erro ao buscar cliente com histórico:', err);
      return null;
    }
  }, []);

  const buscarPorTelefone = useCallback(async (telefone: string) => {
    try {
      const telefoneNormalizado = telefone.replace(/\D/g, '');
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('telefone', telefoneNormalizado)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Erro ao buscar por telefone:', err);
      return null;
    }
  }, []);

  const buscarClientes = useCallback(async (termo: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .or(`nome.ilike.%${termo}%,telefone.ilike.%${termo}%,cpf_cnpj.ilike.%${termo}%,nome_empresa.ilike.%${termo}%`)
        .order('ultima_compra', { ascending: false, nullsFirst: false })
        .limit(50);

      if (error) throw error;

      const clientesFormatados = data?.map(c => ({
        ...c,
        total_gasto: parseFloat(c.total_gasto) || 0,
        ticket_medio: parseFloat(c.ticket_medio) || 0,
      })) || [];

      setClientes(clientesFormatados);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar clientes');
    } finally {
      setLoading(false);
    }
  }, []);

  const filtrarPorSegmento = useCallback(async (segmento: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from('clientes')
        .select('*')
        .order('ultima_compra', { ascending: false, nullsFirst: false });

      if (segmento !== 'todos') {
        query = query.eq('segmento', segmento);
      }

      const { data, error } = await query;
      if (error) throw error;

      const clientesFormatados = data?.map(c => ({
        ...c,
        total_gasto: parseFloat(c.total_gasto) || 0,
        ticket_medio: parseFloat(c.ticket_medio) || 0,
      })) || [];

      setClientes(clientesFormatados);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao filtrar clientes');
    } finally {
      setLoading(false);
    }
  }, []);

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

      // Log
      registrarLog({
        tipo: 'cliente',
        acao: 'criar_cliente',
        descricao: `Cliente "${cliente.nome}" cadastrado`,
        entidade_tipo: 'cliente',
        entidade_id: data?.id,
        detalhes: { nome: cliente.nome, telefone: cliente.telefone },
      });

      await fetchClientes();
      return data;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao adicionar cliente');
    }
  };

  const updateCliente = async (id: string, cliente: Partial<ClienteFormData>) => {
    try {
      const clienteAtual = clientes.find(c => c.id === id);

      const { error: updateError } = await supabase
        .from('clientes')
        .update({
          ...cliente,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Log
      registrarLog({
        tipo: 'cliente',
        acao: 'editar_cliente',
        descricao: `Cliente "${clienteAtual?.nome || cliente.nome || 'desconhecido'}" atualizado`,
        entidade_tipo: 'cliente',
        entidade_id: id,
        detalhes: { campos_alterados: Object.keys(cliente) },
      });

      await fetchClientes();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao atualizar cliente');
    }
  };

  const deleteCliente = async (id: string) => {
    try {
      const clienteAtual = clientes.find(c => c.id === id);

      const { error: deleteError } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Log
      registrarLog({
        tipo: 'cliente',
        acao: 'excluir_cliente',
        descricao: `Cliente "${clienteAtual?.nome || 'desconhecido'}" excluído`,
        entidade_tipo: 'cliente',
        entidade_id: id,
        detalhes: { nome: clienteAtual?.nome, telefone: clienteAtual?.telefone },
      });

      setClientes((prev) => prev.filter((c) => c.id !== id));
      setTodosClientes((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao excluir cliente');
    }
  };

  const getEstatisticas = () => {
    const total = todosClientes.length;
    const vip = todosClientes.filter(c => c.segmento === 'vip').length;
    const frequente = todosClientes.filter(c => c.segmento === 'frequente').length;
    const ativo = todosClientes.filter(c => c.segmento === 'ativo').length;
    const inativo = todosClientes.filter(c => c.segmento === 'inativo').length;
    const novo = todosClientes.filter(c => c.segmento === 'novo').length;
    
    const totalGasto = todosClientes.reduce((acc, c) => acc + c.total_gasto, 0);
    const totalPedidos = todosClientes.reduce((acc, c) => acc + c.total_pedidos, 0);
    
    return {
      total, vip, frequente, ativo, inativo, novo,
      totalGasto, totalPedidos,
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
