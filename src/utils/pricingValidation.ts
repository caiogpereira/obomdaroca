import { CarrinhoItem, ModalidadePagamento } from '../types';

interface ValidationResult {
  isValid: boolean;
  reason?: string;
  suggestion?: string;
}

interface PricingAvailability {
  varejo: ValidationResult;
  cartao: ValidationResult;
  pix: ValidationResult;
  dinheiro: ValidationResult;
}

// Constantes das regras de negócio
const VALOR_MINIMO_ATACADO = 300; // R$ 300,00
const QTD_MINIMA_CARTAO = 10;     // 10 unidades
const QTD_MINIMA_PIX = 15;        // 15 unidades
const QTD_MINIMA_DINHEIRO = 15;   // 15 unidades

/**
 * Agrupa itens por marca (se houver) ou por produto individual
 * Retorna a maior quantidade agrupada
 */
const getMaiorQuantidadePorMarca = (items: CarrinhoItem[]): number => {
  const grupoPorMarca: { [key: string]: number } = {};
  const grupoSemMarca: { [key: string]: number } = {};

  items.forEach(item => {
    const marca = item.produto.marca?.trim();
    
    if (marca) {
      // Se tem marca, agrupa por marca
      grupoPorMarca[marca] = (grupoPorMarca[marca] || 0) + item.quantidade;
    } else {
      // Se não tem marca, agrupa por produto individual
      grupoSemMarca[item.produto.id] = (grupoSemMarca[item.produto.id] || 0) + item.quantidade;
    }
  });

  // Pega a maior quantidade entre todos os grupos
  const maxMarca = Object.values(grupoPorMarca).length > 0 
    ? Math.max(...Object.values(grupoPorMarca)) 
    : 0;
  const maxProduto = Object.values(grupoSemMarca).length > 0 
    ? Math.max(...Object.values(grupoSemMarca)) 
    : 0;

  return Math.max(maxMarca, maxProduto);
};

/**
 * Calcula o total do carrinho usando preço de varejo
 */
const calcularTotalVarejo = (items: CarrinhoItem[]): number => {
  return items.reduce((total, item) => {
    const preco = item.produto.preco_varejo || item.produto.preco || 0;
    return total + (preco * item.quantidade);
  }, 0);
};

/**
 * Valida as regras de precificação para cada modalidade
 */
export const validatePricingRules = (items: CarrinhoItem[]): PricingAvailability => {
  if (items.length === 0) {
    return {
      varejo: { isValid: true },
      cartao: { isValid: false, reason: 'Carrinho vazio' },
      pix: { isValid: false, reason: 'Carrinho vazio' },
      dinheiro: { isValid: false, reason: 'Carrinho vazio' },
    };
  }

  const totalVarejo = calcularTotalVarejo(items);
  const maiorQtdAgrupada = getMaiorQuantidadePorMarca(items);

  // VAREJO: Sempre disponível
  const varejo: ValidationResult = { isValid: true };

  // CARTÃO: >= R$300 OU >= 10 unidades (mesmo produto ou marca)
  const cartaoValorOk = totalVarejo >= VALOR_MINIMO_ATACADO;
  const cartaoQtdOk = maiorQtdAgrupada >= QTD_MINIMA_CARTAO;
  const cartao: ValidationResult = {
    isValid: cartaoValorOk || cartaoQtdOk,
    reason: !cartaoValorOk && !cartaoQtdOk 
      ? `Necessário ${QTD_MINIMA_CARTAO} unidades do mesmo produto/marca ou R$ ${VALOR_MINIMO_ATACADO.toFixed(2)}`
      : undefined,
    suggestion: !cartaoValorOk && !cartaoQtdOk
      ? `Adicione ${QTD_MINIMA_CARTAO - maiorQtdAgrupada} unidades ou R$ ${(VALOR_MINIMO_ATACADO - totalVarejo).toFixed(2)}`
      : undefined,
  };

  // PIX: >= R$300 OU >= 15 unidades (mesmo produto ou marca)
  const pixValorOk = totalVarejo >= VALOR_MINIMO_ATACADO;
  const pixQtdOk = maiorQtdAgrupada >= QTD_MINIMA_PIX;
  const pix: ValidationResult = {
    isValid: pixValorOk || pixQtdOk,
    reason: !pixValorOk && !pixQtdOk
      ? `Necessário ${QTD_MINIMA_PIX} unidades do mesmo produto/marca ou R$ ${VALOR_MINIMO_ATACADO.toFixed(2)}`
      : undefined,
    suggestion: !pixValorOk && !pixQtdOk
      ? `Adicione ${QTD_MINIMA_PIX - maiorQtdAgrupada} unidades ou R$ ${(VALOR_MINIMO_ATACADO - totalVarejo).toFixed(2)}`
      : undefined,
  };

  // TED/DINHEIRO: >= R$300 OU >= 15 unidades (mesmo produto ou marca)
  const dinheiroValorOk = totalVarejo >= VALOR_MINIMO_ATACADO;
  const dinheiroQtdOk = maiorQtdAgrupada >= QTD_MINIMA_DINHEIRO;
  const dinheiro: ValidationResult = {
    isValid: dinheiroValorOk || dinheiroQtdOk,
    reason: !dinheiroValorOk && !dinheiroQtdOk
      ? `Necessário ${QTD_MINIMA_DINHEIRO} unidades do mesmo produto/marca ou R$ ${VALOR_MINIMO_ATACADO.toFixed(2)}`
      : undefined,
    suggestion: !dinheiroValorOk && !dinheiroQtdOk
      ? `Adicione ${QTD_MINIMA_DINHEIRO - maiorQtdAgrupada} unidades ou R$ ${(VALOR_MINIMO_ATACADO - totalVarejo).toFixed(2)}`
      : undefined,
  };

  return { varejo, cartao, pix, dinheiro };
};

/**
 * Retorna a melhor modalidade disponível (menor preço)
 */
export const getBestAvailablePaymentMethod = (availability: PricingAvailability): ModalidadePagamento => {
  // Prioridade: dinheiro > pix > cartao > varejo (do mais barato ao mais caro)
  if (availability.dinheiro.isValid) return 'dinheiro';
  if (availability.pix.isValid) return 'pix';
  if (availability.cartao.isValid) return 'cartao';
  return 'varejo';
};

/**
 * Obtém o preço do produto para a modalidade selecionada
 */
export const getPrecoByModalidade = (produto: any, modalidade: ModalidadePagamento): number => {
  const precoVarejo = produto.preco_varejo || produto.preco || 0;
  
  switch (modalidade) {
    case 'varejo':
      return precoVarejo;
    case 'cartao':
      return produto.preco_cartao || precoVarejo;
    case 'pix':
      return produto.preco_pix || precoVarejo;
    case 'dinheiro':
      return produto.preco_dinheiro || precoVarejo;
    default:
      return precoVarejo;
  }
};