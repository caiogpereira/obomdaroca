import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Pedido, ItemPedido, Produto } from '../types';
import { SearchableProductSelect } from './SearchableProductSelect';

interface PedidoModalProps {
  pedido: Pedido;
  produtos: Produto[];
  mode: 'view' | 'edit';
  onClose: () => void;
  onSave: (pedido: Pedido) => void;
  onFinalize: (id: string) => void;
  onEdit: () => void;
}

export const PedidoModal = ({ pedido, produtos, mode, onClose, onSave, onFinalize, onEdit }: PedidoModalProps) => {
  const [editedPedido, setEditedPedido] = useState<Pedido>(pedido);
  const isViewMode = mode === 'view';

  useEffect(() => {
    setEditedPedido(pedido);
  }, [pedido]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const calcularTotal = () => {
    return editedPedido.itens.reduce(
      (total, item) => {
        const desconto = item.desconto_percentual || 0;
        const precoComDesconto = item.preco_unitario * (1 - desconto / 100);
        return total + item.quantidade * precoComDesconto;
      },
      0
    );
  };

  const calcularSubtotal = (item: ItemPedido) => {
    const desconto = item.desconto_percentual || 0;
    const precoComDesconto = item.preco_unitario * (1 - desconto / 100);
    return item.quantidade * precoComDesconto;
  };

  const handleProductSelect = (index: number, produto: Produto) => {
    const novosItens = [...editedPedido.itens];
    novosItens[index] = {
      ...novosItens[index],
      produto_id: produto.id,
      produto_nome: produto.nome,
      preco_unitario: produto.preco,
      preco_original: produto.preco,
    };
    setEditedPedido({ ...editedPedido, itens: novosItens });
  };

  const handleItemChange = (index: number, field: keyof ItemPedido, value: string | number) => {
    const novosItens = [...editedPedido.itens];
    novosItens[index] = { ...novosItens[index], [field]: value };
    setEditedPedido({ ...editedPedido, itens: novosItens });
  };

  const handleRemoveItem = (index: number) => {
    const novosItens = editedPedido.itens.filter((_, i) => i !== index);
    setEditedPedido({ ...editedPedido, itens: novosItens });
  };

  const handleAddItem = () => {
    if (produtos.length === 0) return;

    const primeiroProduto = produtos[0];
    const novoItem: ItemPedido = {
      id: Date.now().toString(),
      produto_id: primeiroProduto.id,
      produto_nome: primeiroProduto.nome,
      quantidade: 1,
      preco_unitario: primeiroProduto.preco,
      desconto_percentual: 0,
      preco_original: primeiroProduto.preco,
    };
    setEditedPedido({ ...editedPedido, itens: [...editedPedido.itens, novoItem] });
  };

  const handleSave = () => {
    const total = calcularTotal();
    onSave({ ...editedPedido, valor_total: total });
    onClose();
  };

  const handleFinalize = () => {
    onFinalize(editedPedido.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slideIn">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            Pedido {pedido.numero_pedido} - {pedido.cliente}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados do Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={editedPedido.cliente}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                <input
                  type="text"
                  value={editedPedido.nome_empresa || '-'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  type="text"
                  value={editedPedido.telefone}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editedPedido.email || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                <input
                  type="text"
                  value={editedPedido.forma_pagamento || '-'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 font-medium"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Itens do Pedido</h3>
              {!isViewMode && (
                <button
                  onClick={handleAddItem}
                  disabled={produtos.length === 0}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Item
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Produto</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Qtd</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Preço Unit.</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Desconto %</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Subtotal</th>
                    {!isViewMode && <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700"></th>}
                  </tr>
                </thead>
                <tbody>
                  {editedPedido.itens.map((item, index) => (
                    <tr key={item.id} className="border-t border-gray-200">
                      <td className="py-3 px-4">
                        {isViewMode ? (
                          <span className="text-sm text-gray-900">{item.produto_nome}</span>
                        ) : (
                          <SearchableProductSelect
                            produtos={produtos}
                            value={item.produto_nome}
                            onChange={(produto) => handleProductSelect(index, produto)}
                            placeholder="Buscar produto..."
                          />
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isViewMode ? (
                          <span className="text-sm text-gray-900">{item.quantidade}</span>
                        ) : (
                          <input
                            type="number"
                            min="1"
                            value={item.quantidade}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val) && val > 0) {
                                handleItemChange(index, 'quantidade', val);
                              }
                            }}
                            className="w-20 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isViewMode ? (
                          <span className="text-sm text-gray-900">R$ {item.preco_unitario.toFixed(2)}</span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.preco_unitario}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val >= 0) {
                                handleItemChange(index, 'preco_unitario', val);
                              }
                            }}
                            className="w-24 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isViewMode ? (
                          <span className="text-sm text-gray-900">{item.desconto_percentual || 0}%</span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={item.desconto_percentual || 0}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val >= 0 && val <= 100) {
                                handleItemChange(index, 'desconto_percentual', val);
                              }
                            }}
                            className="w-20 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-gray-900">
                          R$ {calcularSubtotal(item).toFixed(2)}
                        </div>
                        {item.desconto_percentual && item.desconto_percentual > 0 && (
                          <div className="text-xs text-gray-500 line-through">
                            R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                          </div>
                        )}
                      </td>
                      {!isViewMode && (
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-right font-semibold text-gray-900">
                      TOTAL:
                    </td>
                    <td className="py-3 px-4 text-lg font-bold text-gray-900">
                      R$ {calcularTotal().toFixed(2)}
                    </td>
                    {!isViewMode && <td></td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea
              value={editedPedido.observacoes}
              onChange={(e) => setEditedPedido({ ...editedPedido, observacoes: e.target.value })}
              disabled={isViewMode}
              rows={3}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                isViewMode ? 'bg-gray-50 text-gray-900' : ''
              }`}
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          {isViewMode ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={onEdit}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Editar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Salvar
              </button>
              <button
                onClick={handleFinalize}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Finalizar Pedido
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
