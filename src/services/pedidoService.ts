import { supabase } from '../lib/supabase';
import { CarrinhoItem, ModalidadePagamento } from '../types';
import { getPrecoByModalidade } from '../utils/pricingValidation';

export interface DadosPedidoCatalogo {
  nome: string;
  telefone: string;
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
    const { data, error } = await supabase
      .from('pedidos')
      .select('numero_pedido')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data || !data.numero_pedido) {
      return '#001';
    }

    const ultimoNumero = parseInt(data.numero_pedido.replace('#', ''));
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
        telefone: dados.telefone,
        endereco: dados.endereco,
        email: '',
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