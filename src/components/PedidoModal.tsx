import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Phone, Mail, MapPin, Building2, CreditCard, User, FileText } from 'lucide-react';
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

  // Formatar telefone para exibição
  const formatarTelefone = (telefone: string) => {
    const numeros = telefone.replace(/\D/g, '');
    if (numeros.length === 13) {
      return `+${numeros.slice(0, 2)} (${numeros.slice(2, 4)}) ${numeros.slice(4, 9)}-${numeros.slice(9)}`;
    }
    if (numeros.length === 12) {
      return `+${numeros.slice(0, 2)} (${numeros.slice(2, 4)}) ${numeros.slice(4, 8)}-${numeros.slice(8)}`;
    }
    if (numeros.length === 11) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
    }
    if (numeros.length === 10) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
    }
    return telefone;
  };

  // Formatar CPF/CNPJ para exibição
  const formatarCpfCnpj = (valor: string) => {
    if (!valor) return '-';
    const numeros = valor.replace(/\D/g, '');
    if (numeros.length === 11) {
      return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9)}`;
    }
    if (numeros.length === 14) {
      return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5, 8)}/${numeros.slice(8, 12)}-${numeros.slice(12)}`;
    }
    return valor;
  };

  // Formatar CEP para exibição
  const formatarCep = (cep: string) => {
    if (!cep) return '';
    const numeros = cep.replace(/\D/g, '');
    if (numeros.length === 8) {
      return `${numeros.slice(0, 5)}-${numeros.slice(5)}`;
    }
    return cep;
  };

  // Montar endereço completo
  const montarEnderecoCompleto = () => {
    const partes = [];
    if (editedPedido.endereco) partes.push(editedPedido.endereco);
    if ((editedPedido as any).cidade) partes.push((editedPedido as any).cidade);
    if ((editedPedido as any).estado) partes.push((editedPedido as any).estado);
    return partes.join(' - ') || '-';
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
          {/* Dados do Cliente - Formato Texto */}
          {isViewMode ? (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Dados do Cliente
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                {/* Coluna 1 */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs text-gray-500">Cliente:</span>
                      <p className="text-sm font-medium text-gray-900">{editedPedido.cliente}</p>
                    </div>
                  </div>
                  
                  {editedPedido.nome_empresa && (
                    <div className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs text-gray-500">Empresa:</span>
                        <p className="text-sm font-medium text-gray-900">{editedPedido.nome_empresa}</p>
                      </div>
                    </div>
                  )}
                  
                  {editedPedido.cpf_cnpj && (
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs text-gray-500">CPF/CNPJ:</span>
                        <p className="text-sm font-medium text-gray-900">{formatarCpfCnpj(editedPedido.cpf_cnpj)}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs text-gray-500">Telefone:</span>
                      <p className="text-sm font-medium text-gray-900">{formatarTelefone(editedPedido.telefone)}</p>
                    </div>
                  </div>
                  
                  {editedPedido.email && (
                    <div className="flex items-start gap-2">
                      <Mail className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs text-gray-500">Email:</span>
                        <p className="text-sm font-medium text-gray-900">{editedPedido.email}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Coluna 2 */}
                <div className="space-y-2">
                  {editedPedido.cep && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs text-gray-500">CEP:</span>
                        <p className="text-sm font-medium text-gray-900">{formatarCep(editedPedido.cep)}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs text-gray-500">Endereço:</span>
                      <p className="text-sm font-medium text-gray-900">{montarEnderecoCompleto()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <CreditCard className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs text-gray-500">Forma de Pagamento:</span>
                      <p className="text-sm font-medium text-gray-900">{editedPedido.forma_pagamento || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Modo Edição - mantém os inputs */
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados do Cliente</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={editedPedido.cliente}
                    onChange={(e) => setEditedPedido({ ...editedPedido, cliente: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                  <input
                    type="text"
                    value={editedPedido.nome_empresa || ''}
                    onChange={(e) => setEditedPedido({ ...editedPedido, nome_empresa: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={editedPedido.telefone}
                    onChange={(e) => setEditedPedido({ ...editedPedido, telefone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editedPedido.email || ''}
                    onChange={(e) => setEditedPedido({ ...editedPedido, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                  <select
                    value={editedPedido.forma_pagamento || ''}
                    onChange={(e) => setEditedPedido({ ...editedPedido, forma_pagamento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Selecione</option>
                    <option value="Varejo">Varejo</option>
                    <option value="Cartão">Cartão</option>
                    <option value="PIX">PIX</option>
                    <option value="TED/Dinheiro">TED/Dinheiro</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Itens do Pedido */}
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
                <tbody className="divide-y divide-gray-200">
                  {editedPedido.itens.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {isViewMode ? (
                          <span className="text-sm text-gray-900">{item.produto_nome}</span>
                        ) : (
                          <SearchableProductSelect
                            produtos={produtos}
                            value={item.produto_id}
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

          {/* Observações */}
          {(editedPedido.observacoes || !isViewMode) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              {isViewMode ? (
                editedPedido.observacoes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-gray-700">
                    {editedPedido.observacoes}
                  </div>
                )
              ) : (
                <textarea
                  value={editedPedido.observacoes}
                  onChange={(e) => setEditedPedido({ ...editedPedido, observacoes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              )}
            </div>
          )}

          {/* Histórico de Ações */}
          {editedPedido.historico && editedPedido.historico.length > 0 && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Histórico de Ações</h4>
              <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                {editedPedido.historico.map((acao, index) => (
                  <div key={index} className="flex items-center justify-between text-xs border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                    <div className="flex-1">
                      <span className="text-gray-600">{acao.acao}</span>
                      <span className="text-gray-400 mx-2">•</span>
                      <span className="font-medium text-gray-700">{acao.operador_nome}</span>
                    </div>
                    <span className="text-gray-400 ml-2">
                      {new Date(acao.created_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Última atualização */}
          {editedPedido.updated_by_user_name && (
            <div className="mt-3 text-xs text-gray-500 text-right">
              Última atualização por <span className="font-medium">{editedPedido.updated_by_user_name}</span>
              {editedPedido.updated_at && (
                <span> em {new Date(editedPedido.updated_at).toLocaleString('pt-BR')}</span>
              )}
            </div>
          )}
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
