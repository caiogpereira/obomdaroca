import { useState, useEffect } from 'react';
import { X, Send, Lock, Check, AlertCircle } from 'lucide-react';
import { CarrinhoItem, ModalidadePagamento } from '../types';
import { validatePricingRules, getBestAvailablePaymentMethod } from '../utils/pricingValidation';

interface CheckoutModalProps {
  items: CarrinhoItem[];
  onClose: () => void;
  onConfirm: (dados: { nome: string; telefone: string; endereco: string; modalidade: ModalidadePagamento; total: number; observacoes?: string }) => void;
}

export const CheckoutModal = ({
  items,
  onClose,
  onConfirm,
}: CheckoutModalProps) => {
  const availability = validatePricingRules(items);
  const [modalidade, setModalidade] = useState<ModalidadePagamento>(() =>
    getBestAvailablePaymentMethod(availability)
  );
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    endereco: '',
    observacoes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const currentAvailability = validatePricingRules(items);
    if (!currentAvailability[modalidade].isValid) {
      const bestMethod = getBestAvailablePaymentMethod(currentAvailability);
      setModalidade(bestMethod);
    }
  }, [items, modalidade]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }
    if (!formData.telefone.trim()) {
      newErrors.telefone = 'Telefone é obrigatório';
    } else if (!/^\d{10,11}$/.test(formData.telefone.replace(/\D/g, ''))) {
      newErrors.telefone = 'Telefone inválido';
    }
    if (!formData.endereco.trim()) {
      newErrors.endereco = 'Endereço é obrigatório';
    }

    const currentAvailability = validatePricingRules(items);
    if (!currentAvailability[modalidade].isValid) {
      newErrors.modalidade = currentAvailability[modalidade].reason || 'Modalidade de pagamento indisponível';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleModalidadeClick = (value: ModalidadePagamento) => {
    const currentAvailability = validatePricingRules(items);
    if (currentAvailability[value].isValid) {
      setModalidade(value);
      setErrors({ ...errors, modalidade: '' });
    }
  };

  const getPreco = (item: CarrinhoItem): number => {
    const produto = item.produto;
    switch (modalidade) {
      case 'cartao':
        return produto.preco_cartao || produto.preco;
      case 'pix':
        return produto.preco_pix || produto.preco;
      case 'dinheiro':
        return produto.preco_dinheiro || produto.preco;
      case 'oferta':
        return produto.preco_oferta || produto.preco;
      default:
        return produto.preco;
    }
  };

  const calcularTotal = (): number => {
    return items.reduce((total, item) => total + getPreco(item) * item.quantidade, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onConfirm({
        nome: formData.nome,
        telefone: formData.telefone,
        endereco: formData.endereco,
        observacoes: formData.observacoes || undefined,
        modalidade,
        total: calcularTotal(),
      });
    }
  };

  const modalidadeLabel: Record<ModalidadePagamento, string> = {
    cartao: 'Cartão/Varejo',
    pix: 'PIX/TED',
    dinheiro: 'Dinheiro',
    oferta: 'Oferta',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Finalizar Pedido</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3">Selecione a Modalidade de Pagamento</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {[
                { value: 'cartao' as ModalidadePagamento, label: 'Cartão/Varejo', desc: 'Sem quantidade mínima' },
                { value: 'pix' as ModalidadePagamento, label: 'PIX/TED', desc: 'Min. R$ 300 ou 10 unidades do mesmo produto' },
                { value: 'dinheiro' as ModalidadePagamento, label: 'Dinheiro', desc: 'Min. R$ 500 ou 15 unidades do mesmo produto' },
                { value: 'oferta' as ModalidadePagamento, label: 'Oferta', desc: '30 unidades do mesmo produto' },
              ].map((mod) => {
                const currentAvailability = validatePricingRules(items);
                const isAvailable = currentAvailability[mod.value].isValid;
                const validation = currentAvailability[mod.value];
                return (
                  <div key={mod.value}>
                    <button
                      type="button"
                      onClick={() => handleModalidadeClick(mod.value)}
                      disabled={!isAvailable}
                      className={`w-full p-3 border-2 rounded-lg text-left transition-all ${
                        modalidade === mod.value
                          ? 'border-red-600 bg-red-50'
                          : isAvailable
                          ? 'border-gray-200 hover:border-gray-300'
                          : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-gray-900">{mod.label}</div>
                        {isAvailable ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Lock className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{mod.desc}</div>
                    </button>
                    {!isAvailable && validation.reason && (
                      <div className="mt-1 text-xs text-red-600 flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{validation.reason}</span>
                      </div>
                    )}
                    {!isAvailable && validation.suggestion && (
                      <div className="mt-0.5 text-xs text-blue-600">
                        {validation.suggestion}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {errors.modalidade && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{errors.modalidade}</span>
              </div>
            )}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Modalidade selecionada:</span>
                <span className="font-medium text-gray-900">{modalidadeLabel[modalidade]}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total de itens:</span>
                <span className="font-medium text-gray-900">
                  {items.reduce((sum, item) => sum + item.quantidade, 0)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="font-medium text-gray-900">Valor Total:</span>
                <span className="text-xl font-bold text-red-600">R$ {calcularTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  errors.nome ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Seu nome completo"
              />
              {errors.nome && <p className="mt-1 text-sm text-red-600">{errors.nome}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefone/WhatsApp *
              </label>
              <input
                type="tel"
                value={formData.telefone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setFormData({ ...formData, telefone: value });
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  errors.telefone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="(00) 00000-0000"
                maxLength={11}
              />
              {errors.telefone && <p className="mt-1 text-sm text-red-600">{errors.telefone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endereço de Entrega *
              </label>
              <textarea
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  errors.endereco ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Rua, número, complemento, bairro, cidade"
                rows={3}
              />
              {errors.endereco && <p className="mt-1 text-sm text-red-600">{errors.endereco}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações (opcional)
              </label>
              <textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Alguma observação sobre o pedido? Ex: horário preferencial, instruções de entrega..."
                rows={2}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Send className="w-5 h-5" />
              Enviar Pedido via WhatsApp
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
