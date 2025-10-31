import { useState } from 'react';
import { Search, Eye, Edit, CheckCircle, Package } from 'lucide-react';
import { Pedido } from '../types';
import { PedidoModal } from './PedidoModal';

interface PedidosTableProps {
  pedidos: Pedido[];
  produtos?: any[];
  totalPedidos: number;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onFinalizarPedido: (id: string) => void;
  onAtualizarPedido: (pedido: Pedido) => void;
  onViewPedido?: (pedido: Pedido) => void;
}

export const PedidosTable = ({
  pedidos,
  produtos = [],
  totalPedidos,
  searchTerm,
  onSearchChange,
  onFinalizarPedido,
  onAtualizarPedido,
  onViewPedido,
}: PedidosTableProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');

  const handleVerPedido = (pedido: Pedido) => {
    setSelectedPedido(pedido);
    setModalMode('view');
    setModalOpen(true);
  };

  const handleEditarPedido = (pedido: Pedido) => {
    setSelectedPedido(pedido);
    setModalMode('edit');
    setModalOpen(true);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Pedidos Pendentes ({totalPedidos})
        </h3>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por cliente ou ID..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {pedidos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">Nenhum pedido encontrado</h4>
          <p className="text-gray-500">
            {searchTerm ? 'Tente buscar com outros termos' : 'Todos os pedidos foram finalizados'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">ID</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Cliente</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Data/Hora</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Valor</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((pedido) => (
                <tr
                  key={pedido.id}
                  onClick={() => onViewPedido ? onViewPedido(pedido) : handleVerPedido(pedido)}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{pedido.numero_pedido}</td>
                  <td className="py-3 px-4 text-sm text-gray-900">{pedido.cliente}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {new Date(pedido.created_at).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">
                    R$ {pedido.valor_total.toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        pedido.status === 'Novo'
                          ? 'bg-red-100 text-red-800'
                          : pedido.status === 'Em Atendimento'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {pedido.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVerPedido(pedido)}
                        className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                        title="Ver"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditarPedido(pedido)}
                        className="p-1.5 bg-yellow-100 text-yellow-600 rounded hover:bg-yellow-200 transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onFinalizarPedido(pedido.id)}
                        className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors"
                        title="Finalizar"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && selectedPedido && (
        <PedidoModal
          pedido={selectedPedido}
          produtos={produtos}
          mode={modalMode}
          onClose={() => setModalOpen(false)}
          onSave={onAtualizarPedido}
          onFinalize={onFinalizarPedido}
          onEdit={() => setModalMode('edit')}
        />
      )}
    </div>
  );
};
