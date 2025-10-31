import { ShoppingCart, Package } from 'lucide-react';
import { Produto, ModalidadePagamento } from '../types';

interface ProductCardProps {
  produto: Produto;
  modalidade: ModalidadePagamento;
  onAddToCart: (produto: Produto) => void;
}

export const ProductCard = ({ produto, modalidade, onAddToCart }: ProductCardProps) => {
  const getPreco = (): number => {
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

  const hasPrecoForModalidade = (): boolean => {
    switch (modalidade) {
      case 'cartao':
        return !!produto.preco_cartao;
      case 'pix':
        return !!produto.preco_pix;
      case 'dinheiro':
        return !!produto.preco_dinheiro;
      case 'oferta':
        return !!produto.preco_oferta;
      default:
        return true;
    }
  };

  const isDisponivel = hasPrecoForModalidade();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-square bg-gray-100 relative">
        {produto.image_url ? (
          <img
            src={produto.image_url}
            alt={produto.nome}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-gray-300" />
          </div>
        )}
        {!isDisponivel && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="text-white font-medium text-sm px-3 py-1 bg-gray-900 rounded-full">
              Indisponível nesta modalidade
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs text-gray-500 mb-1">{produto.codigo}</p>
        <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">{produto.nome}</h3>
        {produto.subcategoria && (
          <p className="text-xs text-gray-500 mb-3">{produto.subcategoria.nome}</p>
        )}
        <div className="flex items-center justify-between">
          <div>
            {isDisponivel ? (
              <>
                <p className="text-2xl font-bold text-red-600">
                  R$ {getPreco().toFixed(2)}
                </p>
                {getPreco() !== produto.preco && (
                  <p className="text-xs text-gray-400 line-through">
                    R$ {produto.preco.toFixed(2)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">Sem preço</p>
            )}
          </div>
          <button
            onClick={() => onAddToCart(produto)}
            disabled={!isDisponivel}
            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
