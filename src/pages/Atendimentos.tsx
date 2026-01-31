import { useState } from 'react';
import { Search, LayoutGrid, Table as TableIcon, Filter, Archive } from 'lucide-react';
import { PedidosArquivadosModal } from '../components/PedidosArquivadosModal';
import { Pedido, ViewMode, Atendimento, Produto } from '../types';
import { KanbanBoard } from '../components/KanbanBoard';
import { PedidosTable } from '../components/PedidosTable';
import { AtendimentosQueue } from '../components/AtendimentosQueue';
import { PedidoModal } from '../components/PedidoModal';

// Componente de badge de notificação
const NotificationBadge = ({ count }: { count: number }) => {
  if (count === 0) return null;
  
  return (
    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 animate-pulse">
      {count > 99 ? '99+' : count}
    </span>
  );
};

interface AtendimentosProps {
  pedidos: Pedido[];
  produtos: Produto[];
  atendimentos: Atendimento[];
  onFinalizarPedido: (id: string) => void;
  onAtualizarPedido: (pedido: Pedido) => void;
  onStatusChange: (pedidoId: string, newStatus: Pedido['status']) => void;
  onAddAtendimento: (atendimento: Omit<Atendimento, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateAtendimento: (id: string, atendimento: Partial<Omit<Atendimento, 'id' | 'created_at' | 'updated_at'>>) => void;
  onDeleteAtendimento: (id: string) => void;
  onStatusChangeAtendimento: (id: string, status: Atendimento['status']) => void;
}

export const Atendimentos = ({
  pedidos,
  produtos,
  atendimentos,
  onFinalizarPedido,
  onAtualizarPedido,
  onStatusChange,
  onAddAtendimento,
  onUpdateAtendimento,
  onDeleteAtendimento,
  onStatusChangeAtendimento,
}: AtendimentosProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Pedido['status'] | 'todos'>('todos');
  const [showFilters, setShowFilters] = useState(false);
  const [showSection, setShowSection] = useState<'pedidos' | 'atendimentos'>('pedidos');
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [pedidoModalMode, setPedidoModalMode] = useState<'view' | 'edit'>('view');
  const [showArquivados, setShowArquivados] = useState(false);

  const filteredPedidos = pedidos.filter((pedido) => {
    const matchesSearch =
      pedido.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pedido.numero_pedido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pedido.telefone.includes(searchTerm);

    const matchesStatus = statusFilter === 'todos' || pedido.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusOptions: { value: Pedido['status'] | 'todos'; label: string }[] = [
    { value: 'todos', label: 'Todos os Status' },
    { value: 'Novo', label: 'Novo Pedido' },
    { value: 'Em Atendimento', label: 'Em Atendimento' },
    { value: 'Finalizado', label: 'Finalizado' },
  ];

  const handleViewPedido = (pedido: Pedido) => {
    setSelectedPedido(pedido);
    setPedidoModalMode('view');
  };

  const handleEditPedido = (pedido: Pedido) => {
    setSelectedPedido(pedido);
    setPedidoModalMode('edit');
  };

  const handleClosePedidoModal = () => {
    setSelectedPedido(null);
  };

  const handleSavePedido = (pedido: Pedido) => {
    onAtualizarPedido(pedido);
    setSelectedPedido(null);
  };

  const handleSwitchToEdit = () => {
    setPedidoModalMode('edit');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Atendimentos</h2>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowArquivados(true)}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
            >
              <Archive size={18} />
              Arquivados
            </button>

            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setShowSection('pedidos')}
                className={`px-4 py-2 rounded-md transition-all font-medium ${
                  showSection === 'pedidos'
                    ? 'bg-red-600 text-white shadow'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pedidos
              </button>
              <button
                onClick={() => setShowSection('atendimentos')}
                className={`relative px-4 py-2 rounded-md transition-all font-medium ${
                  showSection === 'atendimentos'
                    ? 'bg-red-600 text-white shadow'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                Aguardando Atendimento
                <NotificationBadge count={atendimentos.filter(a => a.status === 'Aguardando').length} />
              </button>
            </div>
          </div>
        </div>

        {showSection === 'pedidos' && (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="relative flex-1 lg:flex-initial lg:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, pedido ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg border-2 transition-all flex items-center gap-2 ${
                  showFilters
                    ? 'border-red-600 bg-red-50 text-red-600'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filtros
              </button>

              <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 ${
                    viewMode === 'kanban'
                      ? 'bg-red-600 text-white shadow'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  Kanban
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 ${
                    viewMode === 'table'
                      ? 'bg-red-600 text-white shadow'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <TableIcon className="w-4 h-4" />
                  Tabela
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Filtrar por Status</h3>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setStatusFilter(option.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        statusFilter === option.value
                          ? 'bg-red-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="text-sm text-gray-600 mb-4">
              Exibindo {filteredPedidos.length} de {pedidos.length} pedidos
            </div>
          </>
        )}
      </div>

      {showSection === 'pedidos' ? (
        <>
          {viewMode === 'kanban' ? (
            <KanbanBoard
              pedidos={filteredPedidos}
              onViewPedido={handleViewPedido}
              onEditPedido={handleEditPedido}
              onFinalizarPedido={onFinalizarPedido}
              onStatusChange={onStatusChange}
            />
          ) : (
            <PedidosTable
              pedidos={filteredPedidos}
              totalPedidos={pedidos.length}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onFinalizarPedido={onFinalizarPedido}
              onAtualizarPedido={onAtualizarPedido}
            />
          )}
        </>
      ) : (
        <AtendimentosQueue
          atendimentos={atendimentos}
          onAdd={onAddAtendimento}
          onUpdate={onUpdateAtendimento}
          onDelete={onDeleteAtendimento}
          onStatusChange={onStatusChangeAtendimento}
        />
      )}

      {selectedPedido && (
        <PedidoModal
          pedido={selectedPedido}
          produtos={produtos}
          mode={pedidoModalMode}
          onClose={handleClosePedidoModal}
          onSave={handleSavePedido}
          onFinalize={onFinalizarPedido}
          onEdit={handleSwitchToEdit}
        />
      )}

       <PedidosArquivadosModal
        isOpen={showArquivados}
        onClose={() => setShowArquivados(false)}
      />
    </div>
  );
};
