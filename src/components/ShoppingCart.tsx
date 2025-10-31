import { ShoppingCart as CartIcon, X, Plus, Minus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { CarrinhoItem, ModalidadePagamento } from '../types';

interface ShoppingCartProps {
  items: CarrinhoItem[];
  onUpdateQuantity: (produtoId: string, quantidade: number) => void;
  onRemoveItem: (produtoId: string) => void;
  onCheckout: () => void;
  onClose: () => void;
}

export const ShoppingCart = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onClose,
}: ShoppingCartProps) => {
  const [modalidade, setModalidade] = useState<ModalidadePagamento>('cartao');

  const getPreco = (item: CarrinhoItem): number => {
    const produto = item.produto;
    switch (modalidade) {
      case 'cartao':
        return produto.preco_cartao || produto.preco;
      case 'pix':
        return produto.preco_pix || produto.preco;
      case 'dinheiro':
        return produto.preco_dinheiro || produto.preco;
      case 'oferta':
        return produto.preco_oferta || produto.preco;
      default:
        return produto.preco;
    }
  };

  const calcularTotal = (): number => {
    return items.reduce((total, item) => total + getPreco(item) * item.quantidade, 0);
  };

  const modalidades: { value: ModalidadePagamento; label: string; descricao: string }[] = [
    { value: 'cartao', label: 'Cartão/Varejo', descricao: 'Sem quantidade mínima' },
    { value: 'pix', label: 'PIX/TED', descricao: 'Min. R$ 300 ou 10 unidades' },
    { value: 'dinheiro', label: 'Dinheiro', descricao: 'Min. R$ 500 ou 15 unidades' },
    { value: 'oferta', label: 'Oferta', descricao: '30 unidades (pagamento em dinheiro)' },
  ];

  const totalItens = items.reduce((sum, item) => sum + item.quantidade, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-lg shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <CartIcon className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-gray-900">
              Carrinho ({totalItens} {totalItens === 1 ? 'item' : 'itens'})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <CartIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Seu carrinho está vazio</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Modalidade de Pagamento
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {modalidades.map((mod) => (
                    <button
                      key={mod.value}
                      onClick={() => setModalidade(mod.value)}
                      className={`p-3 border-2 rounded-lg text-left transition-all ${
                        modalidade === mod.value
                          ? 'border-red-600 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{mod.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{mod.descricao}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.produto.id}
                    className="flex gap-4 p-4 border border-gray-200 rounded-lg"
                  >
                    {item.produto.image_url && (
                      <img
                        src={item.produto.image_url}
                        alt={item.produto.nome}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.produto.nome}</h3>
                      <p className="text-sm text-gray-500">{item.produto.codigo}</p>
                      <p className="text-lg font-bold text-red-600 mt-1">
                        R$ {getPreco(item).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => onRemoveItem(item.produto.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-2 border border-gray-300 rounded-lg">
                        <button
                          onClick={() => onUpdateQuantity(item.produto.id, item.quantidade - 1)}
                          className="p-2 hover:bg-gray-100 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-12 text-center font-medium">{item.quantidade}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.produto.id, item.quantidade + 1)}
                          className="p-2 hover:bg-gray-100 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-medium text-gray-900">Total</span>
              <span className="text-2xl font-bold text-red-600">
                R$ {calcularTotal().toFixed(2)}
              </span>
            </div>
            <button
              onClick={onCheckout}
              className="w-full py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              Finalizar Pedido
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
