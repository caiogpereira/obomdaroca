import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { Atendimento } from '../types';

interface AtendimentoModalProps {
  atendimento?: Atendimento;
  onSave: (atendimento: Omit<Atendimento, 'id' | 'created_at' | 'updated_at'>) => void;
  onClose: () => void;
}

const tiposSolicitacao = [
  'Dúvida sobre produto',
  'Informação de preço',
  'Disponibilidade de produto',
  'Reclamação',
  'Sugestão',
  'Informação de entrega',
  'Outros',
];

export const AtendimentoModal = ({ atendimento, onSave, onClose }: AtendimentoModalProps) => {
  const [formData, setFormData] = useState({
    cliente: atendimento?.cliente || '',
    telefone: atendimento?.telefone || '',
    email: atendimento?.email || '',
    tipo_solicitacao: atendimento?.tipo_solicitacao || tiposSolicitacao[0],
    descricao: atendimento?.descricao || '',
    status: atendimento?.status || ('Aguardando' as Atendimento['status']),
    prioridade: atendimento?.prioridade || ('Normal' as Atendimento['prioridade']),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.cliente.trim()) {
      newErrors.cliente = 'Nome do cliente é obrigatório';
    }
    if (!formData.telefone.trim()) {
      newErrors.telefone = 'Telefone é obrigatório';
    }
    if (!formData.tipo_solicitacao.trim()) {
      newErrors.tipo_solicitacao = 'Tipo de solicitação é obrigatório';
    }
    if (!formData.descricao.trim()) {
      newErrors.descricao = 'Descrição é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {atendimento ? 'Editar Solicitação' : 'Nova Solicitação de Atendimento'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  value={formData.cliente}
                  onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    errors.cliente ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ex: João Silva"
                />
                {errors.cliente && (
                  <p className="mt-1 text-sm text-red-600">{errors.cliente}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone *
                </label>
                <input
                  type="tel"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    errors.telefone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ex: (11) 98888-7777"
                />
                {errors.telefone && (
                  <p className="mt-1 text-sm text-red-600">{errors.telefone}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mail (opcional)
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Ex: joao@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Solicitação *
              </label>
              <select
                value={formData.tipo_solicitacao}
                onChange={(e) => setFormData({ ...formData, tipo_solicitacao: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  errors.tipo_solicitacao ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {tiposSolicitacao.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
              {errors.tipo_solicitacao && (
                <p className="mt-1 text-sm text-red-600">{errors.tipo_solicitacao}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição *
              </label>
              <textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={4}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  errors.descricao ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Descreva a solicitação do cliente..."
              />
              {errors.descricao && (
                <p className="mt-1 text-sm text-red-600">{errors.descricao}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prioridade
                </label>
                <select
                  value={formData.prioridade}
                  onChange={(e) =>
                    setFormData({ ...formData, prioridade: e.target.value as Atendimento['prioridade'] })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="Baixa">Baixa</option>
                  <option value="Normal">Normal</option>
                  <option value="Alta">Alta</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as Atendimento['status'] })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="Aguardando">Aguardando</option>
                  <option value="Em Atendimento">Em Atendimento</option>
                  <option value="Resolvido">Resolvido</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              <Save className="w-5 h-5" />
              {atendimento ? 'Salvar Alterações' : 'Adicionar Solicitação'}
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
