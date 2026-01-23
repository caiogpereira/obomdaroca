import { useState } from 'react';
import { X, Send } from 'lucide-react';
import { CarrinhoItem, ModalidadePagamento } from '../types';
import { getPrecoByModalidade } from '../utils/pricingValidation';

interface CheckoutModalProps {
  items: CarrinhoItem[];
  modalidade: ModalidadePagamento;
  onClose: () => void;
  onConfirm: (dados: { 
    nome: string; 
    nomeEmpresa?: string;
    telefone: string; 
    email?: string;
    endereco: string; 
    modalidade: ModalidadePagamento; 
    total: number; 
    observacoes?: string 
  }) => void;
}

// Função para formatar texto em Title Case
const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => {
      // Palavras que devem permanecer em minúsculo
      const lowercase = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos'];
      if (lowercase.includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ')
    // Garantir que a primeira letra sempre seja maiúscula
    .replace(/^./, str => str.toUpperCase());
};

// Função para normalizar telefone com DDI 55
const normalizarTelefone = (telefone: string): string => {
  const apenasNumeros = telefone.replace(/\D/g, '');
  // Se já tem 12-13 dígitos e começa com 55, retorna como está
  if (apenasNumeros.length >= 12 && apenasNumeros.startsWith('55')) {
    return apenasNumeros;
  }
  // Se tem 10-11 dígitos (DDD + número), adiciona 55
  if (apenasNumeros.length >= 10 && apenasNumeros.length <= 11) {
    return '55' + apenasNumeros;
  }
  return apenasNumeros;
};

export const CheckoutModal = ({
  items,
  modalidade,
  onClose,
  onConfirm,
}: CheckoutModalProps) => {
  const [formData, setFormData] = useState({
    nome: '',
    nomeEmpresa: '',
    telefone: '',
    email: '',
    endereco: '',
    observacoes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }
    if (!formData.telefone.trim()) {
      newErrors.telefone = 'Telefone é obrigatório';
    } else if (!/^\d{10,11}$/.test(formData.telefone.replace(/\D/g, ''))) {
      newErrors.telefone = 'Telefone inválido (DDD + número)';
    }
    if (!formData.endereco.trim()) {
      newErrors.endereco = 'Endereço é obrigatório';
    }
    // Email é opcional, mas se preenchido deve ser válido
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getPreco = (item: CarrinhoItem): number => {
    return getPrecoByModalidade(item.produto, modalidade);
  };

  const calcularTotal = (): number => {
    return items.reduce((total, item) => total + getPreco(item) * item.quantidade, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onConfirm({
        nome: toTitleCase(formData.nome.trim()),
        nomeEmpresa: formData.nomeEmpresa ? toTitleCase(formData.nomeEmpresa.trim()) : undefined,
        telefone: normalizarTelefone(formData.telefone),
        email: formData.email.trim().toLowerCase() || undefined,
        endereco: toTitleCase(formData.endereco.trim()),
        observacoes: formData.observacoes.trim() || undefined,
        modalidade,
        total: calcularTotal(),
      });
    }
  };

  const modalidadeLabel: Record<ModalidadePagamento, string> = {
    varejo: 'Varejo',
    cartao: 'Cartão',
    pix: 'PIX',
    dinheiro: 'TED/Dinheiro',
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
          {/* Resumo do Pedido */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3">Resumo do Pedido</h3>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              {/* Lista de itens */}
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.produto.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.quantidade}x {item.produto.nome}
                    </span>
                    <span className="font-medium text-gray-900">
                      R$ {(getPreco(item) * item.quantidade).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-gray-200 pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Forma de pagamento:</span>
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
          </div>

          {/* Dados do Cliente */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Dados do Cliente</h3>
            
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
                Nome da Empresa (opcional)
              </label>
              <input
                type="text"
                value={formData.nomeEmpresa}
                onChange={(e) => setFormData({ ...formData, nomeEmpresa: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Nome da empresa ou estabelecimento"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  E-mail (opcional)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="seu@email.com"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endereço Completo *
              </label>
              <textarea
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  errors.endereco ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Rua, número, complemento, bairro, cidade - Estado"
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