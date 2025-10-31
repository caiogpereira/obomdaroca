import { CarrinhoItem, ModalidadePagamento } from '../types';

export interface PricingValidationResult {
  isValid: boolean;
  reason?: string;
  suggestion?: string;
}

export interface PaymentMethodAvailability {
  cartao: PricingValidationResult;
  pix: PricingValidationResult;
  dinheiro: PricingValidationResult;
  oferta: PricingValidationResult;
}

export const validatePricingRules = (
  items: CarrinhoItem[]
): PaymentMethodAvailability => {
  const cartTotal = calculateCartTotal(items);
  const productQuantities = getProductQuantities(items);
  const maxQuantitySameProduct = Math.max(...Object.values(productQuantities), 0);

  const cartaoValidation: PricingValidationResult = {
    isValid: true,
  };

  const pixValidation = validatePixPricing(cartTotal, maxQuantitySameProduct);
  const dinheiroValidation = validateDinheiroPricing(cartTotal, maxQuantitySameProduct);
  const ofertaValidation = validateOfertaPricing(maxQuantitySameProduct);

  return {
    cartao: cartaoValidation,
    pix: pixValidation,
    dinheiro: dinheiroValidation,
    oferta: ofertaValidation,
  };
};

const calculateCartTotal = (items: CarrinhoItem[]): number => {
  return items.reduce((total, item) => {
    const preco = item.produto.preco_cartao || item.produto.preco;
    return total + preco * item.quantidade;
  }, 0);
};

const getProductQuantities = (items: CarrinhoItem[]): Record<string, number> => {
  const quantities: Record<string, number> = {};
  items.forEach((item) => {
    quantities[item.produto.id] = item.quantidade;
  });
  return quantities;
};

const validatePixPricing = (
  cartTotal: number,
  maxQuantitySameProduct: number
): PricingValidationResult => {
  const MIN_VALUE = 300;
  const MIN_QUANTITY = 10;

  const meetsValueRequirement = cartTotal >= MIN_VALUE;
  const meetsQuantityRequirement = maxQuantitySameProduct >= MIN_QUANTITY;

  if (meetsValueRequirement || meetsQuantityRequirement) {
    return { isValid: true };
  }

  const valueNeeded = MIN_VALUE - cartTotal;
  const quantityNeeded = MIN_QUANTITY - maxQuantitySameProduct;

  if (valueNeeded < cartTotal * 0.5) {
    return {
      isValid: false,
      reason: `Necessário compra mínima de R$ ${MIN_VALUE.toFixed(2)}`,
      suggestion: `Adicione R$ ${valueNeeded.toFixed(2)} ao carrinho`,
    };
  }

  return {
    isValid: false,
    reason: `Necessário ${MIN_QUANTITY} unidades do mesmo produto ou R$ ${MIN_VALUE.toFixed(2)}`,
    suggestion: `Adicione ${quantityNeeded} unidades ou R$ ${valueNeeded.toFixed(2)}`,
  };
};

const validateDinheiroPricing = (
  cartTotal: number,
  maxQuantitySameProduct: number
): PricingValidationResult => {
  const MIN_VALUE = 500;
  const MIN_QUANTITY = 15;

  const meetsValueRequirement = cartTotal >= MIN_VALUE;
  const meetsQuantityRequirement = maxQuantitySameProduct >= MIN_QUANTITY;

  if (meetsValueRequirement || meetsQuantityRequirement) {
    return { isValid: true };
  }

  const valueNeeded = MIN_VALUE - cartTotal;
  const quantityNeeded = MIN_QUANTITY - maxQuantitySameProduct;

  if (valueNeeded < cartTotal * 0.5) {
    return {
      isValid: false,
      reason: `Necessário compra mínima de R$ ${MIN_VALUE.toFixed(2)}`,
      suggestion: `Adicione R$ ${valueNeeded.toFixed(2)} ao carrinho`,
    };
  }

  return {
    isValid: false,
    reason: `Necessário ${MIN_QUANTITY} unidades do mesmo produto ou R$ ${MIN_VALUE.toFixed(2)}`,
    suggestion: `Adicione ${quantityNeeded} unidades ou R$ ${valueNeeded.toFixed(2)}`,
  };
};

const validateOfertaPricing = (
  maxQuantitySameProduct: number
): PricingValidationResult => {
  const MIN_QUANTITY = 30;

  if (maxQuantitySameProduct >= MIN_QUANTITY) {
    return { isValid: true };
  }

  const quantityNeeded = MIN_QUANTITY - maxQuantitySameProduct;

  return {
    isValid: false,
    reason: `Necessário ${MIN_QUANTITY} unidades do mesmo produto`,
    suggestion: `Adicione ${quantityNeeded} unidades ao produto com mais quantidade`,
  };
};

export const getBestAvailablePaymentMethod = (
  availability: PaymentMethodAvailability
): ModalidadePagamento => {
  if (availability.oferta.isValid) return 'oferta';
  if (availability.dinheiro.isValid) return 'dinheiro';
  if (availability.pix.isValid) return 'pix';
  return 'cartao';
};

export const getProductWithMostQuantity = (items: CarrinhoItem[]): CarrinhoItem | null => {
  if (items.length === 0) return null;

  return items.reduce((max, item) =>
    item.quantidade > max.quantidade ? item : max
  );
};
