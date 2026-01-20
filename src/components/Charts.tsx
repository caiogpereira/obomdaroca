import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';

interface ProdutoVendido {
  nome: string;
  valor: number;
}

interface VendaDiaria {
  dia: string;
  valor: number;
}

export const Charts = () => {
  const [produtosData, setProdutosData] = useState<ProdutoVendido[]>([]);
  const [vendasData, setVendasData] = useState<VendaDiaria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChartsData = async () => {
      setLoading(true);
      try {
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - 30);

        // ============================================
        // PRODUTOS MAIS VENDIDOS (pedidos + arquivados)
        // ============================================

        let produtosAgrupados: Record<string, number> = {};

        // 1. Buscar pedidos ATIVOS finalizados
        const { data: pedidosAtivos, error: pedidosError } = await supabase
          .from('pedidos')
          .select('id')
          .gte('created_at', dataInicio.toISOString())
          .eq('status', 'Finalizado');

        if (pedidosError) throw pedidosError;

        // Buscar itens dos pedidos ativos
        const pedidoIds = (pedidosAtivos || []).map(p => p.id);
        
        if (pedidoIds.length > 0) {
          const { data: itensAtivos, error: itensError } = await supabase
            .from('itens_pedido')
            .select('produto_nome, quantidade, preco_unitario')
            .in('pedido_id', pedidoIds);

          if (itensError) throw itensError;

          (itensAtivos || []).forEach((item) => {
            const valorTotal = item.quantidade * parseFloat(item.preco_unitario);
            if (produtosAgrupados[item.produto_nome]) {
              produtosAgrupados[item.produto_nome] += valorTotal;
            } else {
              produtosAgrupados[item.produto_nome] = valorTotal;
            }
          });
        }

        // 2. Buscar pedidos ARQUIVADOS (já têm os itens em JSON)
        const { data: pedidosArquivados, error: arquivadosError } = await supabase
          .from('pedidos_arquivados')
          .select('itens_json')
          .gte('pedido_created_at', dataInicio.toISOString());

        if (arquivadosError) throw arquivadosError;

        (pedidosArquivados || []).forEach((pedido) => {
          const itens = pedido.itens_json || [];
          itens.forEach((item: any) => {
            const valorTotal = item.quantidade * parseFloat(item.preco_unitario);
            if (produtosAgrupados[item.produto_nome]) {
              produtosAgrupados[item.produto_nome] += valorTotal;
            } else {
              produtosAgrupados[item.produto_nome] = valorTotal;
            }
          });
        });

        // Ordenar e pegar top 5
        const produtosOrdenados = Object.entries(produtosAgrupados)
          .map(([nome, valor]) => ({ nome, valor }))
          .sort((a, b) => b.valor - a.valor)
          .slice(0, 5);

        setProdutosData(produtosOrdenados);

        // ============================================
        // EVOLUÇÃO DE VENDAS - 7 DIAS (pedidos + arquivados)
        // ============================================

        const vendasPorDia: Record<string, number> = {};
        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        
        // Inicializar últimos 7 dias
        for (let i = 6; i >= 0; i--) {
          const data = new Date();
          data.setDate(data.getDate() - i);
          const chave = data.toISOString().split('T')[0];
          vendasPorDia[chave] = 0;
        }

        const seteDiasAtras = new Date();
        seteDiasAtras.setDate(seteDiasAtras.getDate() - 6);
        seteDiasAtras.setHours(0, 0, 0, 0);

        // 1. Buscar pedidos ATIVOS dos últimos 7 dias
        const { data: pedidos7diasAtivos, error: pedidos7diasError } = await supabase
          .from('pedidos')
          .select('created_at, valor_total')
          .gte('created_at', seteDiasAtras.toISOString())
          .eq('status', 'Finalizado');

        if (pedidos7diasError) throw pedidos7diasError;

        (pedidos7diasAtivos || []).forEach((pedido) => {
          const data = new Date(pedido.created_at);
          const chave = data.toISOString().split('T')[0];
          if (vendasPorDia[chave] !== undefined) {
            vendasPorDia[chave] += parseFloat(pedido.valor_total);
          }
        });

        // 2. Buscar pedidos ARQUIVADOS dos últimos 7 dias
        const { data: pedidos7diasArquivados, error: pedidos7diasArqError } = await supabase
          .from('pedidos_arquivados')
          .select('pedido_created_at, valor_total')
          .gte('pedido_created_at', seteDiasAtras.toISOString());

        if (pedidos7diasArqError) throw pedidos7diasArqError;

        (pedidos7diasArquivados || []).forEach((pedido) => {
          const data = new Date(pedido.pedido_created_at);
          const chave = data.toISOString().split('T')[0];
          if (vendasPorDia[chave] !== undefined) {
            vendasPorDia[chave] += parseFloat(pedido.valor_total);
          }
        });

        // Converter para array com nome do dia
        const vendasArray = Object.entries(vendasPorDia).map(([data, valor]) => {
          const dataObj = new Date(data + 'T12:00:00');
          return {
            dia: diasSemana[dataObj.getDay()],
            valor,
          };
        });

        setVendasData(vendasArray);
      } catch (error) {
        console.error('Erro ao buscar dados dos gráficos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChartsData();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-100 rounded"></div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Produtos Mais Vendidos</h3>
        {produtosData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={produtosData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(value) => `R$ ${value}`} />
              <YAxis dataKey="nome" type="category" width={150} fontSize={12} />
              <Tooltip
                formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Bar dataKey="valor" fill="#DC2626" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            Nenhum produto vendido no período
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Evolução de Vendas (7 dias)</h3>
        {vendasData.some(v => v.valor > 0) ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={vendasData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" />
              <YAxis tickFormatter={(value) => `R$ ${value}`} />
              <Tooltip
                formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Line type="monotone" dataKey="valor" stroke="#DC2626" strokeWidth={2} dot={{ fill: '#DC2626', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            Nenhuma venda nos últimos 7 dias
          </div>
        )}
      </div>
    </div>
  );
};