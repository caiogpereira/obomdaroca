import { useState, useEffect } from 'react';
import { ShoppingCart as CartIcon, Filter, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Produto, Categoria, CarrinhoItem, ModalidadePagamento } from '../types';
import { ProductCard } from '../components/ProductCard';
import { ShoppingCart } from '../components/ShoppingCart';
import { CheckoutModal } from '../components/CheckoutModal';
import { Toast } from '../components/Toast';
import { criarPedidoCatalogo } from '../services/pedidoService';
import { Link } from 'react-router-dom';
import { getPrecoByModalidade } from '../utils/pricingValidation';

export const Catalogo = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('');
  const [carrinho, setCarrinho] = useState<CarrinhoItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutModalidade, setCheckoutModalidade] = useState<ModalidadePagamento>('varejo');
  const [whatsappLoja, setWhatsappLoja] = useState('5511996250527');
  const [loading, setLoading] = useState(true);
  const [salvandoPedido, setSalvandoPedido] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Define o título da página
  useEffect(() => {
    document.title = 'Catálogo Virtual - O Bom da Roça';
  }, []);

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
        preco: parseFloat(p.preco) || 0,
        preco_varejo: p.preco_varejo ? parseFloat(p.preco_varejo) : undefined,
        preco_cartao: p.preco_cartao ? parseFloat(p.preco_cartao) : undefined,
        preco_pix: p.preco_pix ? parseFloat(p.preco_pix) : undefined,
        preco_dinheiro: p.preco_dinheiro ? parseFloat(p.preco_dinheiro) : undefined,
        categoria: p.categoria || undefined,
        marca: p.marca || undefined,
        imagem_url: p.imagem_url || p.image_url || undefined,
        image_storage_path: p.image_storage_path || undefined,
        subcategoria_id: p.subcategoria_id,
        subcategoria: p.subcategoria?.nome || p.subcategoria,
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

  const handleAddToCart = (produto: Produto, quantity: number = 1) => {
    const existingItem = carrinho.find((item) => item.produto.id === produto.id);
    if (existingItem) {
      setCarrinho(
        carrinho.map((item) =>
          item.produto.id === produto.id
            ? { ...item, quantidade: item.quantidade + quantity }
            : item
        )
      );
    } else {
      setCarrinho([...carrinho, { produto, quantidade: quantity }]);
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

  const handleCheckout = (modalidade: ModalidadePagamento) => {
    setCheckoutModalidade(modalidade);
    setShowCart(false);
    setShowCheckout(true);
  };

  const handleConfirmCheckout = async (dados: { 
    nome: string; 
    nomeEmpresa?: string;
    telefone: string; 
    email?: string;
    endereco: string; 
    modalidade: ModalidadePagamento; 
    total: number; 
    observacoes?: string 
  }) => {
    setSalvandoPedido(true);

    const resultado = await criarPedidoCatalogo({
      nome: dados.nome,
      nomeEmpresa: dados.nomeEmpresa,
      telefone: dados.telefone,
      email: dados.email,
      endereco: dados.endereco,
      modalidade: dados.modalidade,
      observacoes: dados.observacoes,
      items: carrinho,
    });

    setSalvandoPedido(false);

    if (!resultado.success) {
      setToast({
        message: `Erro ao registrar pedido: ${resultado.error}. Você ainda pode enviar via WhatsApp.`,
        type: 'error'
      });
    } else {
      setToast({
        message: 'Pedido Registrado com Sucesso!',
        type: 'success'
      });
    }

    const modalidadeLabel: Record<ModalidadePagamento, string> = {
      varejo: 'Varejo',
      cartao: 'Cartão',
      pix: 'PIX',
      dinheiro: 'TED/Dinheiro',
    };

    const numeroPedidoTexto = resultado.success && resultado.numeroPedido
      ? `*Pedido:* ${resultado.numeroPedido}\n`
      : '';

    const empresaTexto = dados.nomeEmpresa
      ? `*Empresa:* ${dados.nomeEmpresa}\n`
      : '';

    const emailTexto = dados.email
      ? `*Email:* ${dados.email}\n`
      : '';

    const observacoesTexto = dados.observacoes
      ? `\n*Observações:* ${dados.observacoes}\n`
      : '';

    const mensagem = `*Novo Pedido - O Bom da Roça*\n\n${numeroPedidoTexto}*Cliente:* ${dados.nome}\n${empresaTexto}*Telefone:* ${dados.telefone}\n${emailTexto}*Endereço:* ${dados.endereco}${observacoesTexto}\n*Forma de Pagamento:* ${modalidadeLabel[dados.modalidade]}\n\n*Itens:*\n${carrinho
      .map(
        (item) => {
          const precoUnit = getPrecoByModalidade(item.produto, dados.modalidade);
          return `• ${item.produto.nome} (${item.produto.codigo})\n  Quantidade: ${item.quantidade}\n  Preço unitário: R$ ${precoUnit.toFixed(2)}\n  Subtotal: R$ ${(precoUnit * item.quantidade).toFixed(2)}`;
        }
      )
      .join('\n\n')}\n\n*Total: R$ ${dados.total.toFixed(2)}*`;

    const whatsappUrl = `https://wa.me/${whatsappLoja}?text=${encodeURIComponent(mensagem)}`;
    window.open(whatsappUrl, '_blank');

    setCarrinho([]);
    setShowCheckout(false);
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
                <p className="text-sm text-gray-500">Catálogo de Produtos</p>
              </div>
              
              {/* Link para área administrativa */}
              <Link
                to="/login"
                className="ml-4 text-sm text-red-600 hover:text-red-700 font-medium hover:underline"
              >
                Área Administrativa
              </Link>
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

      {showCheckout && !salvandoPedido && (
        <CheckoutModal
          items={carrinho}
          modalidade={checkoutModalidade}
          onClose={() => setShowCheckout(false)}
          onConfirm={handleConfirmCheckout}
        />
      )}

      {salvandoPedido && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              <p className="text-gray-700 font-medium">Registrando pedido...</p>
            </div>
          </div>
        </div>
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