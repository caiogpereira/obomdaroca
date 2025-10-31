import { ShoppingCart, Package } from 'lucide-react';
import { Produto } from '../types';

interface ProductCardProps {
  produto: Produto;
  onAddToCart: (produto: Produto) => void;
}

export const ProductCard = ({ produto, onAddToCart }: ProductCardProps) => {
  const hasAnyPreco = !!(
    produto.preco_cartao ||
    produto.preco_pix ||
    produto.preco_dinheiro ||
    produto.preco_oferta
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
      <div className="aspect-square bg-gray-100 relative flex-shrink-0">
        {produto.image_url ? (
          <img
            src={produto.image_url}
            alt={produto.nome}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-gray-300" />
          </div>
        )}
      </div>
      <div className="p-2 flex flex-col flex-grow">
        <p className="text-[10px] text-gray-400 mb-0.5 font-mono">{produto.codigo}</p>
        <h3 className="text-xs font-semibold text-gray-900 mb-2 line-clamp-2 leading-tight">
          {produto.nome}
        </h3>

        <div className="grid grid-cols-2 gap-1 mb-2 text-[10px] flex-grow">
          <div className="text-center">
            <p className="text-gray-500 font-medium">CARTÃO</p>
            <p className="font-bold text-gray-900">
              {produto.preco_cartao ? `R$ ${produto.preco_cartao.toFixed(2)}` : '-'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-500 font-medium">PIX/TED</p>
            <p className="font-bold text-gray-900">
              {produto.preco_pix ? `R$ ${produto.preco_pix.toFixed(2)}` : '-'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-500 font-medium">DINHEIRO</p>
            <p className="font-bold text-gray-900">
              {produto.preco_dinheiro ? `R$ ${produto.preco_dinheiro.toFixed(2)}` : '-'}
            </p>
          </div>
          <div className="text-center bg-yellow-50 rounded">
            <p className="text-yellow-700 font-medium">OFERTA</p>
            <p className="font-bold text-yellow-800">
              {produto.preco_oferta ? `R$ ${produto.preco_oferta.toFixed(2)}` : '-'}
            </p>
          </div>
        </div>

        <button
          onClick={() => onAddToCart(produto)}
          disabled={!hasAnyPreco}
          className="w-full py-1.5 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-1"
        >
          <ShoppingCart className="w-3 h-3" />
          Adicionar
        </button>
      </div>
    </div>
  );
};
