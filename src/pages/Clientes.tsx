import { useState, useMemo } from 'react';
import { Search, Users, Star, TrendingUp, UserCheck, UserX, UserPlus, Phone, Mail, Building2 } from 'lucide-react';
import { useSupabaseClientes } from '../hooks/useSupabaseClientes';
import { ClienteModal } from '../components/ClienteModal';
import { Cliente, SegmentoCliente } from '../types';

const SEGMENTOS_CONFIG: Record<SegmentoCliente, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  vip: { label: 'VIP', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: Star },
  frequente: { label: 'Frequente', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: TrendingUp },
  ativo: { label: 'Ativo', color: 'text-green-700', bgColor: 'bg-green-100', icon: UserCheck },
  inativo: { label: 'Inativo', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: UserX },
  novo: { label: 'Novo', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: UserPlus },
};

const SegmentoBadge = ({ segmento }: { segmento: SegmentoCliente }) => {
  const config = SEGMENTOS_CONFIG[segmento];
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatPhone = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
};

const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

interface ClientesProps {
  onAddCliente: (cliente: any) => Promise<void>;
  onUpdateCliente: (id: string, cliente: any) => Promise<void>;
  onDeleteCliente: (id: string) => Promise<void>;
}

export const Clientes = ({ onAddCliente, onUpdateCliente, onDeleteCliente }: ClientesProps) => {
  const { clientes, loading, error, buscarClientes, filtrarPorSegmento, getClienteComHistorico, getEstatisticas } = useSupabaseClientes();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSegmento, setSelectedSegmento] = useState<SegmentoCliente | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewCliente, setIsNewCliente] = useState(false);

  const stats = useMemo(() => getEstatisticas(), [clientes]);

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.length >= 2 || term.length === 0) {
      await buscarClientes(term);
    }
  };

  const handleSegmentoFilter = async (segmento: SegmentoCliente | null) => {
    setSelectedSegmento(segmento);
    setSearchTerm('');
    await filtrarPorSegmento(segmento);
  };

  const handleOpenCliente = async (cliente: Cliente) => {
    try {
      const clienteCompleto = await getClienteComHistorico(cliente.id);
      setSelectedCliente(clienteCompleto);
      setIsNewCliente(false);
      setIsModalOpen(true);
    } catch (err) {
      console.error('Erro ao carregar cliente:', err);
    }
  };

  const handleNovoCliente = () => {
    setSelectedCliente(null);
    setIsNewCliente(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCliente(null);
    setIsNewCliente(false);
  };

  const handleSaveCliente = async (clienteData: any) => {
    if (isNewCliente) {
      await onAddCliente(clienteData);
    } else if (selectedCliente) {
      await onUpdateCliente(selectedCliente.id, clienteData);
    }
    handleCloseModal();
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="font-medium">Erro ao carregar clientes</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <button
          onClick={() => handleSegmentoFilter(null)}
          className={`p-4 rounded-lg border transition-all ${
            selectedSegmento === null ? 'border-amber-500 bg-amber-50' : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2 text-gray-600">
            <Users size={18} />
            <span className="text-sm font-medium">Todos</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </button>

        {(Object.entries(SEGMENTOS_CONFIG) as [SegmentoCliente, typeof SEGMENTOS_CONFIG[SegmentoCliente]][]).map(([seg, config]) => {
          const Icon = config.icon;
          const count = stats[seg as keyof typeof stats] as number;
          
          return (
            <button
              key={seg}
              onClick={() => handleSegmentoFilter(seg)}
              className={`p-4 rounded-lg border transition-all ${
                selectedSegmento === seg ? 'border-amber-500 bg-amber-50' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className={`flex items-center gap-2 ${config.color}`}>
                <Icon size={18} />
                <span className="text-sm font-medium">{config.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
            </button>
          );
        })}
      </div>

      {/* Barra de busca e ações */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome, telefone, CPF ou empresa..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
        
        <button
          onClick={handleNovoCliente}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <UserPlus size={20} />
          Novo Cliente
        </button>
      </div>

      {/* Lista de clientes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Carregando clientes...</p>
          </div>
        ) : clientes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users size={48} className="mx-auto mb-4 text-gray-300" />
            <p>Nenhum cliente encontrado</p>
            {searchTerm && (
              <button
                onClick={() => handleSearch('')}
                className="mt-2 text-amber-600 hover:text-amber-700"
              >
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Segmento
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Gasto
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pedidos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Última Compra
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {clientes.map((cliente) => (
                  <tr
                    key={cliente.id}
                    onClick={() => handleOpenCliente(cliente)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{cliente.nome}</p>
                        {cliente.nome_empresa && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Building2 size={14} />
                            {cliente.nome_empresa}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-900 flex items-center gap-1">
                          <Phone size={14} className="text-gray-400" />
                          {formatPhone(cliente.telefone)}
                        </p>
                        {cliente.email && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail size={14} className="text-gray-400" />
                            {cliente.email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <SegmentoBadge segmento={cliente.segmento} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-medium text-gray-900">
                        {formatCurrency(cliente.total_gasto)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-gray-900">{cliente.total_pedidos}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-500">{formatDate(cliente.ultima_compra)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Cliente */}
      {isModalOpen && (
        <ClienteModal
          cliente={selectedCliente}
          isNew={isNewCliente}
          onClose={handleCloseModal}
          onSave={handleSaveCliente}
          onDelete={onDeleteCliente}
        />
      )}
    </div>
  );
};