import { useState } from 'react';
import { Plus, Phone, Mail, Clock, AlertCircle, CheckCircle2, User, MessageCircle } from 'lucide-react';
import { Atendimento } from '../types';
import { AtendimentoModal } from './AtendimentoModal';
import { ToggleAgenteIA } from './ToggleAgenteIA';

interface AtendimentosQueueProps {
  atendimentos: Atendimento[];
  onAdd: (atendimento: Omit<Atendimento, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdate: (id: string, atendimento: Partial<Omit<Atendimento, 'id' | 'created_at' | 'updated_at'>>) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Atendimento['status']) => void;
}

export const AtendimentosQueue = ({
  atendimentos,
  onAdd,
  onUpdate,
  onDelete,
  onStatusChange,
}: AtendimentosQueueProps) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedAtendimento, setSelectedAtendimento] = useState<Atendimento | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<Atendimento['status'] | 'todos'>('todos');

  const filteredAtendimentos = atendimentos.filter((atendimento) => {
    if (statusFilter === 'todos') return true;
    return atendimento.status === statusFilter;
  });

  const handleAdd = () => {
    setSelectedAtendimento(undefined);
    setShowModal(true);
  };

  const handleEdit = (atendimento: Atendimento) => {
    setSelectedAtendimento(atendimento);
    setShowModal(true);
  };

  const handleSave = (atendimento: Omit<Atendimento, 'id' | 'created_at' | 'updated_at'>) => {
    if (selectedAtendimento) {
      onUpdate(selectedAtendimento.id, atendimento);
    } else {
      onAdd(atendimento);
    }
    setShowModal(false);
  };

  const getPrioridadeColor = (prioridade: Atendimento['prioridade']) => {
    switch (prioridade) {
      case 'Alta':
        return 'text-red-600 bg-red-100';
      case 'Normal':
        return 'text-yellow-600 bg-yellow-100';
      case 'Baixa':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: Atendimento['status']) => {
    switch (status) {
      case 'Aguardando':
        return <Clock className="w-4 h-4" />;
      case 'Em Atendimento':
        return <AlertCircle className="w-4 h-4" />;
      case 'Resolvido':
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: Atendimento['status']) => {
    switch (status) {
      case 'Aguardando':
        return 'text-blue-600 bg-blue-100';
      case 'Em Atendimento':
        return 'text-orange-600 bg-orange-100';
      case 'Resolvido':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Aguardando Atendimento</h2>
            <p className="text-sm text-gray-600 mt-1">
              Gerencie solicitações de atendimento ao cliente
            </p>
          </div>

          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm hover:shadow"
          >
            <Plus className="w-5 h-5" />
            Nova Solicitação
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {(['todos', 'Aguardando', 'Em Atendimento', 'Resolvido'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                statusFilter === status
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
              }`}
            >
              {status === 'todos' ? 'Todos' : status}
            </button>
          ))}
        </div>

        <div className="text-sm text-gray-600">
          Exibindo {filteredAtendimentos.length} de {atendimentos.length} solicitações
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredAtendimentos.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma solicitação encontrada
            </h4>
            <p className="text-gray-500">
              {statusFilter !== 'todos'
                ? 'Tente ajustar os filtros de status'
                : 'Comece adicionando uma nova solicitação de atendimento'}
            </p>
          </div>
        ) : (
          filteredAtendimentos.map((atendimento) => (
            <div
              key={atendimento.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleEdit(atendimento)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{atendimento.cliente}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getPrioridadeColor(
                        atendimento.prioridade
                      )}`}
                    >
                      {atendimento.prioridade}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    {atendimento.tipo_solicitacao}
                  </p>
                  <p className="text-sm text-gray-600 line-clamp-2">{atendimento.descricao}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusColor(
                    atendimento.status
                  )}`}
                >
                  {getStatusIcon(atendimento.status)}
                  {atendimento.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {atendimento.telefone}
                </div>
                {atendimento.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {atendimento.email}
                  </div>
                )}
                {/* Toggle Agente IA */}
                <div onClick={(e) => e.stopPropagation()}>
                  <ToggleAgenteIA 
                    telefone={atendimento.telefone} 
                    clienteNome={atendimento.cliente}
                    compact={true}
                  />
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <Clock className="w-4 h-4" />
                  {formatDate(atendimento.created_at)}
                </div>
              </div>

              {atendimento.status !== 'Resolvido' && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                  {/* Botão WhatsApp */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const nome = atendimento.cliente.split(' ')[0];
                      const mensagem = `Olá, ${nome}! Recebemos sua solicitação e darei sequência ao seu atendimento. 😊`;
                      const telefone = atendimento.telefone.replace(/\D/g, '');
                      const telefoneFormatado = telefone.startsWith('55') ? telefone : `55${telefone}`;
                      window.open(`https://wa.me/${telefoneFormatado}?text=${encodeURIComponent(mensagem)}`, '_blank');
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </button>
                  
                  {atendimento.status === 'Aguardando' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatusChange(atendimento.id, 'Em Atendimento');
                      }}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                    >
                      Iniciar Atendimento
                    </button>
                  )}
                  {atendimento.status === 'Em Atendimento' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatusChange(atendimento.id, 'Resolvido');
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      Marcar como Resolvido
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Tem certeza que deseja excluir esta solicitação?')) {
                        onDelete(atendimento.id);
                      }
                    }}
                    className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                  >
                    Excluir
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showModal && (
        <AtendimentoModal
          atendimento={selectedAtendimento}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};
