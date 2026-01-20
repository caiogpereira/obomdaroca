import { useState, useEffect } from 'react';
import { X, Archive, Search, Calendar, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { useSupabasePedidosArquivados, PedidoArquivado } from '../hooks/useSupabasePedidosArquivados';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('pt-BR');

const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString('pt-BR');

interface PedidosArquivadosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PedidosArquivadosModal = ({ isOpen, onClose }: PedidosArquivadosModalProps) => {
  const { pedidosArquivados, loading, error, fetchPedidosArquivados, getEstatisticas } = useSupabasePedidosArquivados();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [expandedPedidos, setExpandedPedidos] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      fetchPedidosArquivados();
    }
  }, [isOpen, fetchPedidosArquivados]);

  const handleSearch = () => {
    fetchPedidosArquivados({
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
      cliente: searchTerm || undefined,
    });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setDataInicio('');
    setDataFim('');
    fetchPedidosArquivados();
  };

  const togglePedidoExpand = (pedidoId: string) => {
    setExpandedPedidos((prev) => {
      const next = new Set(prev);
      if (next.has(pedidoId)) {
        next.delete(pedidoId);
      } else {
        next.add(pedidoId);
      }
      return next;
    });
  };

  const stats = getEstatisticas();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Archive size={20} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Pedidos Arquivados</h2>
              <p className="text-sm text-gray-500">Histórico de pedidos finalizados</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filtros */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar por cliente ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Data início"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Data fim"
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                Buscar
              </button>
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="px-6 py-3 border-b border-gray-200 flex gap-6">
          <div className="text-sm">
            <span className="text-gray-500">Total de pedidos:</span>{' '}
            <span className="font-semibold text-gray-900">{stats.total}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-500">Valor total:</span>{' '}
            <span className="font-semibold text-green-600">{formatCurrency(stats.valorTotal)}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-500">Ticket médio:</span>{' '}
            <span className="font-semibold text-blue-600">{formatCurrency(stats.ticketMedio)}</span>
          </div>
        </div>

        {/* Lista de Pedidos */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Carregando pedidos arquivados...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              <p>{error}</p>
            </div>
          ) : pedidosArquivados.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Archive size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Nenhum pedido arquivado encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pedidosArquivados.map((pedido) => (
                <div key={pedido.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => togglePedidoExpand(pedido.id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm font-semibold text-amber-600">
                        {pedido.numero_pedido}
                      </span>
                      <span className="font-medium text-gray-900">{pedido.cliente}</span>
                      <span className="text-sm text-gray-500">{pedido.telefone}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">{formatDate(pedido.pedido_created_at)}</span>
                      <span className="font-semibold text-green-600">{formatCurrency(pedido.valor_total)}</span>
                      {expandedPedidos.has(pedido.id) ? (
                        <ChevronUp size={18} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={18} className="text-gray-400" />
                      )}
                    </div>
                  </button>

                  {expandedPedidos.has(pedido.id) && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3 text-sm">
                        {pedido.endereco && (
                          <div>
                            <span className="text-gray-500">Endereço:</span>{' '}
                            <span className="text-gray-900">{pedido.endereco}</span>
                          </div>
                        )}
                        {pedido.forma_pagamento && (
                          <div>
                            <span className="text-gray-500">Pagamento:</span>{' '}
                            <span className="text-gray-900">{pedido.forma_pagamento}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">Data do pedido:</span>{' '}
                          <span className="text-gray-900">{formatDateTime(pedido.pedido_created_at)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Arquivado em:</span>{' '}
                          <span className="text-gray-900">{formatDateTime(pedido.archived_at)}</span>
                        </div>
                      </div>

                      {pedido.observacoes && (
                        <div className="mb-3 text-sm">
                          <span className="text-gray-500">Observações:</span>{' '}
                          <span className="text-gray-900">{pedido.observacoes}</span>
                        </div>
                      )}

                      <div className="border-t border-gray-200 pt-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Package size={16} />
                          Itens do Pedido
                        </h4>
                        <div className="space-y-1">
                          {pedido.itens_json.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-gray-600">
                                {item.quantidade}x {item.produto_nome}
                              </span>
                              <span className="text-gray-900">
                                {formatCurrency(item.quantidade * item.preco_unitario)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};