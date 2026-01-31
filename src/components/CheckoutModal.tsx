import { useState, useEffect } from 'react';
import { X, Send, Search, Loader2 } from 'lucide-react';
import { CarrinhoItem, ModalidadePagamento } from '../types';
import { getPrecoByModalidade } from '../utils/pricingValidation';
import { supabase } from '../lib/supabase';

interface CheckoutModalProps {
  items: CarrinhoItem[];
  modalidade: ModalidadePagamento;
  onClose: () => void;
  onConfirm: (dados: { 
    nome: string; 
    nomeEmpresa: string;
    cpfCnpj: string;
    telefone: string; 
    email: string;
    cep: string;
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

// Função para formatar CPF/CNPJ
const formatarCpfCnpj = (valor: string): string => {
  const numeros = valor.replace(/\D/g, '');
  if (numeros.length <= 11) {
    // CPF: 000.000.000-00
    return numeros
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    // CNPJ: 00.000.000/0000-00
    return numeros
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
};

// Função para formatar CEP
const formatarCep = (valor: string): string => {
  const numeros = valor.replace(/\D/g, '');
  return numeros.replace(/(\d{5})(\d{1,3})/, '$1-$2');
};

// Função para validar CPF
const validarCpf = (cpf: string): boolean => {
  const numeros = cpf.replace(/\D/g, '');
  if (numeros.length !== 11 || /^(\d)\1+$/.test(numeros)) return false;
  
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(numeros[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(numeros[9])) return false;
  
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(numeros[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(numeros[10]);
};

// Função para validar CNPJ
const validarCnpj = (cnpj: string): boolean => {
  const numeros = cnpj.replace(/\D/g, '');
  if (numeros.length !== 14 || /^(\d)\1+$/.test(numeros)) return false;
  
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let soma = 0;
  for (let i = 0; i < 12; i++) soma += parseInt(numeros[i]) * pesos1[i];
  let resto = soma % 11;
  const dig1 = resto < 2 ? 0 : 11 - resto;
  if (dig1 !== parseInt(numeros[12])) return false;
  
  soma = 0;
  for (let i = 0; i < 13; i++) soma += parseInt(numeros[i]) * pesos2[i];
  resto = soma % 11;
  const dig2 = resto < 2 ? 0 : 11 - resto;
  return dig2 === parseInt(numeros[13]);
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
    cpfCnpj: '',
    telefone: '',
    email: '',
    cep: '',
    endereco: '',
    observacoes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [clienteEncontrado, setClienteEncontrado] = useState(false);

  // Buscar cliente por CPF/CNPJ
  const buscarClientePorCpfCnpj = async (cpfCnpj: string) => {
    const numeros = cpfCnpj.replace(/\D/g, '');
    if (numeros.length < 11) return;

    setBuscandoCliente(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('cpf_cnpj', numeros)
        .maybeSingle();

      if (!error && data) {
        setFormData(prev => ({
          ...prev,
          nome: data.nome || prev.nome,
          nomeEmpresa: data.nome_empresa || prev.nomeEmpresa,
          telefone: data.telefone?.replace(/^55/, '') || prev.telefone,
          email: data.email || prev.email,
          cep: data.cep || prev.cep,
          endereco: data.endereco || prev.endereco,
        }));
        setClienteEncontrado(true);
      } else {
        setClienteEncontrado(false);
      }
    } catch (err) {
      console.error('Erro ao buscar cliente:', err);
    } finally {
      setBuscandoCliente(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }
    
    if (!formData.nomeEmpresa.trim()) {
      newErrors.nomeEmpresa = 'Nome da empresa é obrigatório';
    }

    const cpfCnpjNumeros = formData.cpfCnpj.replace(/\D/g, '');
    if (!cpfCnpjNumeros) {
      newErrors.cpfCnpj = 'CPF/CNPJ é obrigatório';
    } else if (cpfCnpjNumeros.length === 11 && !validarCpf(cpfCnpjNumeros)) {
      newErrors.cpfCnpj = 'CPF inválido';
    } else if (cpfCnpjNumeros.length === 14 && !validarCnpj(cpfCnpjNumeros)) {
      newErrors.cpfCnpj = 'CNPJ inválido';
    } else if (cpfCnpjNumeros.length !== 11 && cpfCnpjNumeros.length !== 14) {
      newErrors.cpfCnpj = 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos';
    }

    if (!formData.telefone.trim()) {
      newErrors.telefone = 'Telefone é obrigatório';
    } else if (!/^\d{10,11}$/.test(formData.telefone.replace(/\D/g, ''))) {
      newErrors.telefone = 'Telefone inválido (DDD + número)';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'E-mail inválido';
    }

    const cepNumeros = formData.cep.replace(/\D/g, '');
    if (!cepNumeros) {
      newErrors.cep = 'CEP é obrigatório';
    } else if (cepNumeros.length !== 8) {
      newErrors.cep = 'CEP deve ter 8 dígitos';
    }

    if (!formData.endereco.trim()) {
      newErrors.endereco = 'Endereço é obrigatório';
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
        nomeEmpresa: toTitleCase(formData.nomeEmpresa.trim()),
        cpfCnpj: formData.cpfCnpj.replace(/\D/g, ''),
        telefone: normalizarTelefone(formData.telefone),
        email: formData.email.trim().toLowerCase(),
        cep: formData.cep.replace(/\D/g, ''),
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
            
            {/* CPF/CNPJ com busca automática */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CPF/CNPJ *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.cpfCnpj}
                  onChange={(e) => {
                    const formatted = formatarCpfCnpj(e.target.value);
                    setFormData({ ...formData, cpfCnpj: formatted });
                    setClienteEncontrado(false);
                  }}
                  onBlur={() => buscarClientePorCpfCnpj(formData.cpfCnpj)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 pr-10 ${
                    errors.cpfCnpj ? 'border-red-500' : clienteEncontrado ? 'border-green-500' : 'border-gray-300'
                  }`}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  maxLength={18}
                />
                {buscandoCliente && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
                )}
                {clienteEncontrado && !buscandoCliente && (
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
              {errors.cpfCnpj && <p className="mt-1 text-sm text-red-600">{errors.cpfCnpj}</p>}
              {clienteEncontrado && <p className="mt-1 text-sm text-green-600">Cliente encontrado! Dados preenchidos automaticamente.</p>}
            </div>

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
                Nome da Empresa *
              </label>
              <input
                type="text"
                value={formData.nomeEmpresa}
                onChange={(e) => setFormData({ ...formData, nomeEmpresa: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  errors.nomeEmpresa ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Nome da empresa ou estabelecimento"
              />
              {errors.nomeEmpresa && <p className="mt-1 text-sm text-red-600">{errors.nomeEmpresa}</p>}
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
                  E-mail *
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CEP *
                </label>
                <input
                  type="text"
                  value={formData.cep}
                  onChange={(e) => {
                    const formatted = formatarCep(e.target.value);
                    setFormData({ ...formData, cep: formatted });
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    errors.cep ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="00000-000"
                  maxLength={9}
                />
                {errors.cep && <p className="mt-1 text-sm text-red-600">{errors.cep}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço Completo *
                </label>
                <input
                  type="text"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    errors.endereco ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Rua, número, complemento, bairro, cidade - Estado"
                />
                {errors.endereco && <p className="mt-1 text-sm text-red-600">{errors.endereco}</p>}
              </div>
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