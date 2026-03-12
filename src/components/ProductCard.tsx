import { useState } from 'react';
import { ShoppingCart, Plus, Minus } from 'lucide-react';
import { Produto } from '../types';

interface ProductCardProps {
  produto: Produto;
  onAddToCart: (produto: Produto, quantity: number) => void;
}

export const ProductCard = ({ produto, onAddToCart }: ProductCardProps) => {
  const [quantity, setQuantity] = useState(1);
  const [imageError, setImageError] = useState(false);

  const handleQuantityChange = (value: string) => {
    const num = parseInt(value);
    if (!isNaN(num) && num >= 1 && num <= 999) {
      setQuantity(num);
    } else if (value === '') {
      setQuantity(1);
    }
  };

  const incrementQuantity = () => {
    if (quantity < 999) {
      setQuantity(prev => prev + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleAddToCart = () => {
    const precoVarejo = produto.preco_varejo || produto.preco || 0;
    const temPrecoValido = precoVarejo > 0 ||
      (produto.preco_cartao && produto.preco_cartao > 0) ||
      (produto.preco_pix && produto.preco_pix > 0) ||
      (produto.preco_dinheiro && produto.preco_dinheiro > 0);

    if (!temPrecoValido) {
      alert('Este produto não possui preço cadastrado.');
      return;
    }

    onAddToCart(produto, quantity);
    setQuantity(1);
  };

  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined || price === 0) return '-';
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
  };

  const precoVarejo = produto.preco_varejo || produto.preco || 0;

  const temPrecoValido = precoVarejo > 0 ||
    (produto.preco_cartao && produto.preco_cartao > 0) ||
    (produto.preco_pix && produto.preco_pix > 0) ||
    (produto.preco_dinheiro && produto.preco_dinheiro > 0);

  // URL da imagem — usa image_url (campo correto do banco)
  const imagemUrl = produto.image_url;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col">
      {/* Imagem */}
      <div className="relative h-48 bg-gray-100 flex items-center justify-center">
        {imagemUrl && !imageError ? (
          <img
            src={imagemUrl}
            alt={produto.nome}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="text-gray-400 flex flex-col items-center">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-4 flex flex-col flex-grow">
        {/* Código */}
        <span className="text-xs text-gray-400 mb-1">{produto.codigo}</span>

        {/* Nome */}
        <h3 className="font-semibold text-gray-800 text-sm mb-2 line-clamp-2 min-h-[2.5rem]">
          {produto.nome}
        </h3>

        {/* Marca */}
        {produto.marca && (
          <span className="text-xs text-gray-500 mb-2">Marca: {produto.marca}</span>
        )}

        {/* Preços */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-4">
          <div className="text-center">
            <span className="block text-gray-500">VAREJO</span>
            <span className="font-semibold text-gray-700">{formatPrice(precoVarejo)}</span>
          </div>
          <div className="text-center">
            <span className="block text-gray-500">CARTÃO</span>
            <span className="font-semibold text-gray-700">{formatPrice(produto.preco_cartao)}</span>
          </div>
          <div className="text-center">
            <span className="block text-gray-500">PIX</span>
            <span className="font-semibold text-gray-700">{formatPrice(produto.preco_pix)}</span>
          </div>
          <div className="text-center">
            <span className="block text-gray-500">TED/DINH.</span>
            <span className="font-semibold text-gray-700">{formatPrice(produto.preco_dinheiro)}</span>
          </div>
        </div>

        {/* Controle de Quantidade */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <button
            onClick={decrementQuantity}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <Minus className="w-4 h-4 text-gray-600" />
          </button>
          <input
            type="number"
            value={quantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            className="w-16 text-center border border-gray-300 rounded-lg py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            min="1"
            max="999"
          />
          <button
            onClick={incrementQuantity}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Botão Adicionar */}
        <button
          onClick={handleAddToCart}
          disabled={!temPrecoValido}
          className="mt-auto w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ShoppingCart className="w-4 h-4" />
          Adicionar
        </button>
      </div>
    </div>
  );
};
