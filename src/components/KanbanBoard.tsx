import { Pedido } from '../types';
import { KanbanCard } from './KanbanCard';
import { Package } from 'lucide-react';

interface KanbanBoardProps {
  pedidos: Pedido[];
  onViewPedido: (pedido: Pedido) => void;
  onEditPedido: (pedido: Pedido) => void;
  onFinalizarPedido: (id: string) => void;
  onStatusChange: (pedidoId: string, newStatus: Pedido['status']) => void;
}

export const KanbanBoard = ({
  pedidos,
  onViewPedido,
  onEditPedido,
  onFinalizarPedido,
  onStatusChange,
}: KanbanBoardProps) => {
  const columns: { status: Pedido['status']; label: string; color: string }[] = [
    { status: 'Novo', label: 'Novo Pedido', color: 'bg-red-100 border-red-300' },
    { status: 'Em Atendimento', label: 'Em Atendimento', color: 'bg-orange-100 border-orange-300' },
    { status: 'Finalizado', label: 'Finalizado', color: 'bg-green-100 border-green-300' },
  ];

  const getPedidosByStatus = (status: Pedido['status']) => {
    return pedidos.filter((p) => p.status === status);
  };

  const handleDragStart = (e: React.DragEvent, pedidoId: string) => {
    e.dataTransfer.setData('pedidoId', pedidoId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: Pedido['status']) => {
    e.preventDefault();
    const pedidoId = e.dataTransfer.getData('pedidoId');
    if (pedidoId) {
      onStatusChange(pedidoId, newStatus);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {columns.map((column) => {
        const columnPedidos = getPedidosByStatus(column.status);
        return (
          <div key={column.status} className="flex flex-col">
            <div className={`${column.color} border-2 rounded-t-lg p-3 flex items-center justify-between`}>
              <h3 className="font-semibold text-gray-800">{column.label}</h3>
              <span className="bg-white px-2 py-1 rounded-full text-xs font-bold text-gray-700">
                {columnPedidos.length}
              </span>
            </div>
            <div
              className="bg-gray-50 border-2 border-t-0 border-gray-200 rounded-b-lg p-4 min-h-[500px] space-y-4"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.status)}
            >
              {columnPedidos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="w-12 h-12 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">Nenhum pedido</p>
                </div>
              ) : (
                columnPedidos.map((pedido) => (
                  <div
                    key={pedido.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, pedido.id)}
                  >
                    <KanbanCard
                      pedido={pedido}
                      onView={onViewPedido}
                      onEdit={onEditPedido}
                      onFinalize={column.status !== 'Finalizado' ? onFinalizarPedido : undefined}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
