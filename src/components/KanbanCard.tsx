import { Pedido } from '../types';
import { Eye, Edit, CheckCircle, Clock, MessageCircle } from 'lucide-react';

interface KanbanCardProps {
  pedido: Pedido;
  onView: (pedido: Pedido) => void;
  onEdit: (pedido: Pedido) => void;
  onFinalize?: (id: string) => void;
}

export const KanbanCard = ({ pedido, onView, onEdit, onFinalize }: KanbanCardProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nome = pedido.cliente.split(' ')[0]; // Primeiro nome
    const mensagem = `Oi, ${nome}! Vou dar sequência no seu pedido ${pedido.numero_pedido}. 😊`;
    const telefone = pedido.telefone.replace(/\D/g, '');
    const telefoneFormatado = telefone.startsWith('55') ? telefone : `55${telefone}`;
    window.open(`https://wa.me/${telefoneFormatado}?text=${encodeURIComponent(mensagem)}`, '_blank');
  };

  const statusColors = {
    'Novo': 'bg-red-50 border-red-200',
    'Em Atendimento': 'bg-orange-50 border-orange-200',
    'Finalizado': 'bg-green-50 border-green-200',
  };

  return (
    <div
      onClick={() => onView(pedido)}
      className={`${statusColors[pedido.status]} border-2 rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">{pedido.numero_pedido}</h4>
          <p className="text-sm text-gray-700 font-medium">{pedido.cliente}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          {formatDateTime(pedido.created_at)}
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <p className="text-sm text-gray-600">{pedido.telefone}</p>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Valor Total:</span>
          <span className="font-bold text-red-600">{formatCurrency(pedido.valor_total)}</span>
        </div>
        <div className="text-xs text-gray-500">
          {pedido.itens.length} {pedido.itens.length === 1 ? 'item' : 'itens'}
        </div>
      </div>

      {pedido.observacoes && (
        <div className="mb-3 p-2 bg-white bg-opacity-50 rounded text-xs text-gray-600 italic">
          {pedido.observacoes}
        </div>
      )}

      <div className="flex gap-2 pt-3 border-t border-gray-200">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView(pedido);
          }}
          className="flex-1 p-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs font-medium flex items-center justify-center gap-1"
          title="Ver"
        >
          <Eye className="w-3 h-3" />
          Ver
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(pedido);
          }}
          className="flex-1 p-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors text-xs font-medium flex items-center justify-center gap-1"
          title="Editar"
        >
          <Edit className="w-3 h-3" />
          Editar
        </button>
        {pedido.status !== 'Finalizado' && onFinalize && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFinalize(pedido.id);
            }}
            className="p-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            title="Finalizar"
          >
            <CheckCircle className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Botão WhatsApp */}
      <button
        onClick={handleWhatsAppClick}
        className="w-full mt-2 p-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs font-medium flex items-center justify-center gap-2"
        title="Enviar WhatsApp"
      >
        <MessageCircle className="w-4 h-4" />
        Enviar WhatsApp
      </button>
    </div>
  );
};
