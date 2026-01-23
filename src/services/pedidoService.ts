import { supabase } from '../lib/supabase';
import { CarrinhoItem, ModalidadePagamento } from '../types';
import { getPrecoByModalidade } from '../utils/pricingValidation';

export interface DadosPedidoCatalogo {
  nome: string;
  nomeEmpresa?: string;
  telefone: string;
  email?: string;
  endereco: string;
  modalidade: ModalidadePagamento;
  observacoes?: string;
  items: CarrinhoItem[];
}

export interface ResultadoPedido {
  success: boolean;
  pedidoId?: string;
  numeroPedido?: string;
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

export const criarPedidoCatalogo = async (
  dados: DadosPedidoCatalogo
): Promise<ResultadoPedido> => {
  try {
    const numeroPedido = await gerarNumeroPedido();

    const valorTotal = dados.items.reduce((total, item) => {
      const preco = getPrecoByModalidade(item.produto, dados.modalidade);
      return total + preco * item.quantidade;
    }, 0);

    const { data: pedidoData, error: pedidoError } = await supabase
      .from('pedidos')
      .insert({
        numero_pedido: numeroPedido,
        cliente: dados.nome,
        nome_empresa: dados.nomeEmpresa || null,
        telefone: dados.telefone,
        endereco: dados.endereco,
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
      await supabase.from('pedidos').delete().eq('id', pedidoData.id);
      throw itensError;
    }

    return {
      success: true,
      pedidoId: pedidoData.id,
      numeroPedido: numeroPedido,
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