import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const produtosData = [
  { nome: 'Cachaça Artesanal 500ml', valor: 850 },
  { nome: 'Queijo Minas Padrão 1kg', valor: 420 },
  { nome: 'Doce de Leite 300g', valor: 380 },
  { nome: 'Linguiça Calabresa 500g', valor: 290 },
  { nome: 'Pão de Açúcar 200g', valor: 180 },
];

const vendasData = [
  { dia: 'Seg', valor: 120 },
  { dia: 'Ter', valor: 150 },
  { dia: 'Qua', valor: 180 },
  { dia: 'Qui', valor: 90 },
  { dia: 'Sex', valor: 200 },
  { dia: 'Sáb', valor: 250 },
  { dia: 'Dom', valor: 180 },
];

export const Charts = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Produtos Mais Vendidos</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={produtosData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="nome" type="category" width={150} fontSize={12} />
            <Tooltip
              formatter={(value: number) => `R$ ${value.toFixed(2)}`}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
            />
            <Bar dataKey="valor" fill="#DC2626" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Evolução de Vendas (7 dias)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={vendasData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dia" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => `R$ ${value.toFixed(2)}`}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
            />
            <Line type="monotone" dataKey="valor" stroke="#DC2626" strokeWidth={2} dot={{ fill: '#DC2626', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
