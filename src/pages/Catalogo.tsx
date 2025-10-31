import { useState, useEffect } from 'react';
import { ShoppingCart as CartIcon, Filter, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Produto, Categoria, CarrinhoItem, ModalidadePagamento } from '../types';
import { ProductCard } from '../components/ProductCard';
import { ShoppingCart } from '../components/ShoppingCart';
import { CheckoutModal } from '../components/CheckoutModal';
import { Toast } from '../components/Toast';

export const Catalogo = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('');
  const [carrinho, setCarrinho] = useState<CarrinhoItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [whatsappLoja, setWhatsappLoja] = useState('553599731201');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchConfiguracoes();
    fetchCategorias();
    fetchProdutos();

    const produtosSubscription = supabase
      .channel('produtos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'produtos'
        },
        () => {
          fetchProdutos();
        }
      )
      .subscribe();

    return () => {
      produtosSubscription.unsubscribe();
    };
  }, []);

  const fetchConfiguracoes = async () => {
    try {
      const { data } = await supabase
        .from('configuracoes_sistema')
        .select('whatsapp_loja, catalogo_ativo')
        .maybeSingle();

      if (data) {
        setWhatsappLoja(data.whatsapp_loja);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      setCategorias(data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const fetchProdutos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('produtos')
        .select(`
          *,
          subcategoria:categorias(id, nome)
        `)
        .order('nome', { ascending: true });

      if (error) throw error;

      const produtosFormatados = (data || []).map((p: any) => ({
        id: p.id,
        codigo: p.codigo,
        nome: p.nome,
        preco: parseFloat(p.preco),
        preco_cartao: p.preco_cartao ? parseFloat(p.preco_cartao) : undefined,
        preco_pix: p.preco_pix ? parseFloat(p.preco_pix) : undefined,
        preco_dinheiro: p.preco_dinheiro ? parseFloat(p.preco_dinheiro) : undefined,
        preco_oferta: p.preco_oferta ? parseFloat(p.preco_oferta) : undefined,
        image_url: p.image_url || undefined,
        image_storage_path: p.image_storage_path || undefined,
        subcategoria_id: p.subcategoria_id,
        subcategoria: p.subcategoria,
      }));

      setProdutos(produtosFormatados);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      setToast({ message: 'Erro ao carregar produtos', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const produtosFiltrados = produtos.filter((produto) => {
    const matchSearch =
      produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategoria = !selectedCategoria || produto.subcategoria_id === selectedCategoria;
    return matchSearch && matchCategoria;
  });

  const handleAddToCart = (produto: Produto) => {
    const existingItem = carrinho.find((item) => item.produto.id === produto.id);
    if (existingItem) {
      setCarrinho(
        carrinho.map((item) =>
          item.produto.id === produto.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        )
      );
    } else {
      setCarrinho([...carrinho, { produto, quantidade: 1 }]);
    }
    setToast({ message: `${produto.nome} adicionado ao carrinho`, type: 'success' });
  };

  const handleUpdateQuantity = (produtoId: string, quantidade: number) => {
    if (quantidade <= 0) {
      handleRemoveItem(produtoId);
    } else {
      setCarrinho(
        carrinho.map((item) =>
          item.produto.id === produtoId ? { ...item, quantidade } : item
        )
      );
    }
  };

  const handleRemoveItem = (produtoId: string) => {
    setCarrinho(carrinho.filter((item) => item.produto.id !== produtoId));
  };


  const handleCheckout = () => {
    setShowCart(false);
    setShowCheckout(true);
  };

  const handleConfirmCheckout = (dados: { nome: string; telefone: string; endereco: string; modalidade: ModalidadePagamento; total: number }) => {
    const modalidadeLabel: Record<ModalidadePagamento, string> = {
      cartao: 'Cartão/Varejo',
      pix: 'PIX/TED',
      dinheiro: 'Dinheiro',
      oferta: 'Oferta',
    };

    const getPrecoItem = (produto: Produto, modalidade: ModalidadePagamento): number => {
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

    const mensagem = `*Novo Pedido - O Bom da Roça*

*Cliente:* ${dados.nome}
*Telefone:* ${dados.telefone}
*Endereço:* ${dados.endereco}

*Modalidade:* ${modalidadeLabel[dados.modalidade]}

*Itens:*
${carrinho
  .map(
    (item) =>
      `• ${item.produto.nome} (${item.produto.codigo})
  Quantidade: ${item.quantidade}
  Preço unitário: R$ ${getPrecoItem(item.produto, dados.modalidade).toFixed(2)}
  Subtotal: R$ ${(getPrecoItem(item.produto, dados.modalidade) * item.quantidade).toFixed(2)}`
  )
  .join('\n\n')}

*Total: R$ ${dados.total.toFixed(2)}*`;

    const whatsappUrl = `https://wa.me/${whatsappLoja}?text=${encodeURIComponent(mensagem)}`;
    window.open(whatsappUrl, '_blank');

    setCarrinho([]);
    setShowCheckout(false);
    setToast({ message: 'Pedido enviado! Você será redirecionado para o WhatsApp', type: 'success' });
  };

  const totalItens = carrinho.reduce((sum, item) => sum + item.quantidade, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img
                src="/obdr.png"
                alt="O Bom da Roça"
                className="w-12 h-12 object-contain"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">O Bom da Roça</h1>
                <p className="text-xs text-gray-500">Catálogo de Produtos</p>
              </div>
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="relative p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <CartIcon className="w-6 h-6" />
              {totalItens > 0 && (
                <span className="absolute -top-2 -right-2 bg-yellow-400 text-gray-900 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {totalItens}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={selectedCategoria}
                  onChange={(e) => setSelectedCategoria(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none bg-white"
                >
                  <option value="">Todas as categorias</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Carregando produtos...</p>
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {produtosFiltrados.map((produto) => (
              <ProductCard
                key={produto.id}
                produto={produto}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
      </main>

      {showCart && (
        <ShoppingCart
          items={carrinho}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onCheckout={handleCheckout}
          onClose={() => setShowCart(false)}
        />
      )}

      {showCheckout && (
        <CheckoutModal
          items={carrinho}
          onClose={() => setShowCheckout(false)}
          onConfirm={handleConfirmCheckout}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
