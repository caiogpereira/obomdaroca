import { Store } from 'lucide-react';

export const Catalogo = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
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
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <Store className="w-20 h-20 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Catálogo Virtual
          </h2>
          <p className="text-gray-600">
            O catálogo virtual está sendo preparado e estará disponível em breve!
          </p>
        </div>
      </main>
    </div>
  );
};
