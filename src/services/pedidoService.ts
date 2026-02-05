import { supabase } from '../lib/supabase';
import { CarrinhoItem, ModalidadePagamento } from '../types';
import { getPrecoByModalidade } from '../utils/pricingValidation';

export interface DadosPedidoCatalogo {
  nome: string;
  nomeEmpresa: string;
  cpfCnpj: string;
  telefone: string;
  email: string;
  cep: string;
  endereco: string;
  cidade: string;
  estado: string;
  modalidade: ModalidadePagamento;
  observacoes?: string;
  items: CarrinhoItem[];
}

export interface ResultadoPedido {
  success: boolean;
  pedidoId?: string;
  numeroPedido?: string;
  clienteId?: string;
  error?: string;
}

const gerarNumeroPedido = async (): Promise<string> => {
  try {
    // Buscar o último número de pedido tanto em pedidos ativos quanto arquivados
    const [pedidosAtivos, pedidosArquivados] = await Promise.all([
      supabase
        .from('pedidos')
        .select('numero_pedido')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('pedidos_arquivados')
        .select('numero_pedido')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    let ultimoNumeroAtivo = 0;
    let ultimoNumeroArquivado = 0;

    if (pedidosAtivos.data?.numero_pedido) {
      ultimoNumeroAtivo = parseInt(pedidosAtivos.data.numero_pedido.replace('#', '')) || 0;
    }

    if (pedidosArquivados.data?.numero_pedido) {
      ultimoNumeroArquivado = parseInt(pedidosArquivados.data.numero_pedido.replace('#', '')) || 0;
    }

    // Usar o maior número encontrado
    const ultimoNumero = Math.max(ultimoNumeroAtivo, ultimoNumeroArquivado);
    const proximoNumero = ultimoNumero + 1;
    
    return `#${proximoNumero.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Erro ao gerar número do pedido:', error);
    const timestamp = Date.now().toString().slice(-3);
    return `#${timestamp}`;
  }
};

const getModalidadeLabel = (modalidade: ModalidadePagamento): string => {
  const labels: Record<ModalidadePagamento, string> = {
    varejo: 'Varejo',
    cartao: 'Cartão',
    pix: 'PIX',
    dinheiro: 'TED/Dinheiro',
  };
  return labels[modalidade] || modalidade;
};

/**
 * Busca ou cria um cliente baseado no CPF/CNPJ ou telefone
 * Retorna o ID do cliente
 */
const buscarOuCriarCliente = async (dados: {
  nome: string;
  nomeEmpresa: string;
  cpfCnpj: string;
  telefone: string;
  email: string;
  cep: string;
  endereco: string;
  cidade: string;
  estado: string;
}): Promise<{ clienteId: string; isNew: boolean }> => {
  
  // Primeiro, tenta buscar por CPF/CNPJ (identificador mais confiável)
  if (dados.cpfCnpj) {
    const { data: clientePorCpf } = await supabase
      .from('clientes')
      .select('id')
      .eq('cpf_cnpj', dados.cpfCnpj)
      .maybeSingle();

    if (clientePorCpf) {
      // Cliente encontrado por CPF/CNPJ - atualiza os dados
      await supabase
        .from('clientes')
        .update({
          nome: dados.nome,
          nome_empresa: dados.nomeEmpresa || null,
          telefone: dados.telefone,
          email: dados.email || null,
          cep: dados.cep || null,
          endereco: dados.endereco || null,
          cidade: dados.cidade || null,
          estado: dados.estado || null,
          updated_at: new Date().toISOString(),
          dados_coletados: true,
        })
        .eq('id', clientePorCpf.id);

      return { clienteId: clientePorCpf.id, isNew: false };
    }
  }

  // Se não encontrou por CPF/CNPJ, tenta por telefone
  if (dados.telefone) {
    const { data: clientePorTelefone } = await supabase
      .from('clientes')
      .select('id')
      .eq('telefone', dados.telefone)
      .maybeSingle();

    if (clientePorTelefone) {
      // Cliente encontrado por telefone - atualiza os dados (incluindo CPF/CNPJ se não tinha)
      await supabase
        .from('clientes')
        .update({
          nome: dados.nome,
          nome_empresa: dados.nomeEmpresa || null,
          cpf_cnpj: dados.cpfCnpj || null,
          email: dados.email || null,
          cep: dados.cep || null,
          endereco: dados.endereco || null,
          cidade: dados.cidade || null,
          estado: dados.estado || null,
          updated_at: new Date().toISOString(),
          dados_coletados: true,
        })
        .eq('id', clientePorTelefone.id);

      return { clienteId: clientePorTelefone.id, isNew: false };
    }
  }

  // Cliente não existe - cria novo
  const { data: novoCliente, error } = await supabase
    .from('clientes')
    .insert({
      nome: dados.nome,
      nome_empresa: dados.nomeEmpresa || null,
      cpf_cnpj: dados.cpfCnpj || null,
      telefone: dados.telefone,
      email: dados.email || null,
      cep: dados.cep || null,
      endereco: dados.endereco || null,
      cidade: dados.cidade || null,
      estado: dados.estado || null,
      origem: 'catalogo',
      dados_coletados: true,
      primeira_compra: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Erro ao criar cliente: ${error.message}`);
  }

  return { clienteId: novoCliente.id, isNew: true };
};

/**
 * Atualiza as estatísticas do cliente após um pedido
 */
const atualizarEstatisticasCliente = async (
  clienteId: string, 
  valorPedido: number
): Promise<void> => {
  try {
    // Busca dados atuais do cliente
    const { data: cliente } = await supabase
      .from('clientes')
      .select('total_gasto, total_pedidos')
      .eq('id', clienteId)
      .single();

    if (cliente) {
      const totalGasto = (cliente.total_gasto || 0) + valorPedido;
      const totalPedidos = (cliente.total_pedidos || 0) + 1;
      const ticketMedio = totalGasto / totalPedidos;

      await supabase
        .from('clientes')
        .update({
          total_gasto: totalGasto,
          total_pedidos: totalPedidos,
          ticket_medio: ticketMedio,
          ultima_compra: new Date().toISOString(),
        })
        .eq('id', clienteId);
    }
  } catch (error) {
    console.error('Erro ao atualizar estatísticas do cliente:', error);
    // Não propaga o erro para não impedir o pedido
  }
};

export const criarPedidoCatalogo = async (
  dados: DadosPedidoCatalogo
): Promise<ResultadoPedido> => {
  try {
    // 1. Gerar número do pedido
    const numeroPedido = await gerarNumeroPedido();

    // 2. Calcular valor total
    const valorTotal = dados.items.reduce((total, item) => {
      const preco = getPrecoByModalidade(item.produto, dados.modalidade);
      return total + preco * item.quantidade;
    }, 0);

    // 3. Buscar ou criar cliente
    const { clienteId } = await buscarOuCriarCliente({
      nome: dados.nome,
      nomeEmpresa: dados.nomeEmpresa,
      cpfCnpj: dados.cpfCnpj,
      telefone: dados.telefone,
      email: dados.email,
      cep: dados.cep,
      endereco: dados.endereco,
      cidade: dados.cidade,
      estado: dados.estado,
    });

    // 4. Criar o pedido (agora com cliente_id)
    const { data: pedidoData, error: pedidoError } = await supabase
      .from('pedidos')
      .insert({
        numero_pedido: numeroPedido,
        cliente_id: clienteId,
        cliente: dados.nome,
        nome_empresa: dados.nomeEmpresa || null,
        cpf_cnpj: dados.cpfCnpj || null,
        telefone: dados.telefone,
        cep: dados.cep || null,
        endereco: dados.endereco,
        cidade: dados.cidade || null,
        estado: dados.estado || null,
        email: dados.email || '',
        valor_total: valorTotal,
        status: 'Novo',
        observacoes: dados.observacoes || '',
        origem: 'catalogo',
        modalidade_pagamento: dados.modalidade,
        forma_pagamento: getModalidadeLabel(dados.modalidade),
      })
      .select()
      .single();

    if (pedidoError) throw pedidoError;

    // 5. Inserir itens do pedido
    const itensParaInserir = dados.items.map((item) => ({
      pedido_id: pedidoData.id,
      produto_id: item.produto.id,
      produto_nome: item.produto.nome,
      quantidade: item.quantidade,
      preco_unitario: getPrecoByModalidade(item.produto, dados.modalidade),
    }));

    const { error: itensError } = await supabase
      .from('itens_pedido')
      .insert(itensParaInserir);

    if (itensError) {
      // Rollback: remove o pedido se os itens falharem
      await supabase.from('pedidos').delete().eq('id', pedidoData.id);
      throw itensError;
    }

    // 6. Atualizar estatísticas do cliente (assíncrono, não bloqueia)
    atualizarEstatisticasCliente(clienteId, valorTotal);

    return {
      success: true,
      pedidoId: pedidoData.id,
      numeroPedido: numeroPedido,
      clienteId: clienteId,
    };
  } catch (error) {
    console.error('Erro ao criar pedido do catálogo:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Erro desconhecido ao criar pedido',
    };
  }
};
