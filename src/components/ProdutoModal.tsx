import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { Produto, Categoria } from '../types';

interface ProdutoModalProps {
  produto?: Produto;
  categorias: Categoria[];
  onSave: (produto: Omit<Produto, 'id' | 'created_at' | 'updated_at'>) => void;
  onClose: () => void;
}

export const ProdutoModal = ({ produto, categorias, onSave, onClose }: ProdutoModalProps) => {
  const [formData, setFormData] = useState({
    codigo: produto?.codigo || '',
    nome: produto?.nome || '',
    preco: produto?.preco || 0,
    subcategoria_id: produto?.subcategoria_id || '',
  });
  const [precoDisplay, setPrecoDisplay] = useState(produto?.preco ? produto.preco.toFixed(2) : '');

  const [inputMode, setInputMode] = useState<'select' | 'manual'>(
    produto?.subcategoria_id ? 'select' : 'manual'
  );
  const [manualCategory, setManualCategory] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.codigo.trim()) {
      newErrors.codigo = 'Código é obrigatório';
    }
    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }
    if (formData.preco <= 0) {
      newErrors.preco = 'Preço deve ser maior que zero';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      if (inputMode === 'manual' && manualCategory.trim()) {
        onSave({ ...formData, subcategoria_id: manualCategory.trim() });
      } else {
        onSave(formData);
      }
    }
  };

  const filteredCategories = categorias.filter((cat) =>
    cat.nome.toLowerCase().includes(manualCategory.toLowerCase())
  );

  const handleManualCategoryChange = (value: string) => {
    setManualCategory(value);
    setShowSuggestions(value.length > 0);
  };

  const selectCategory = (categoryName: string) => {
    setManualCategory(categoryName);
    setShowSuggestions(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {produto ? 'Editar Produto' : 'Novo Produto'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código do Produto *
              </label>
              <input
                type="text"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  errors.codigo ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ex: PROD001"
              />
              {errors.codigo && (
                <p className="mt-1 text-sm text-red-600">{errors.codigo}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Produto *
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  errors.nome ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ex: Cachaça Artesanal 500ml"
              />
              {errors.nome && (
                <p className="mt-1 text-sm text-red-600">{errors.nome}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preço (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">R$</span>
                <input
                  type="text"
                  value={precoDisplay}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                    setPrecoDisplay(value);
                    const numValue = parseFloat(value) || 0;
                    setFormData({ ...formData, preco: numValue });
                  }}
                  onFocus={() => {
                    if (precoDisplay === '' || parseFloat(precoDisplay) === 0) {
                      setPrecoDisplay('');
                    }
                  }}
                  onBlur={() => {
                    const numValue = parseFloat(precoDisplay) || 0;
                    setPrecoDisplay(numValue > 0 ? numValue.toFixed(2) : '');
                  }}
                  className={`w-full pl-12 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    errors.preco ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
              </div>
              {errors.preco && (
                <p className="mt-1 text-sm text-red-600">{errors.preco}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subcategoria
              </label>

              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setInputMode('select')}
                  className={`px-3 py-1 text-xs rounded ${
                    inputMode === 'select'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Selecionar
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('manual')}
                  className={`px-3 py-1 text-xs rounded ${
                    inputMode === 'manual'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Criar Categoria
                </button>
              </div>

              {inputMode === 'select' ? (
                <select
                  value={formData.subcategoria_id}
                  onChange={(e) => setFormData({ ...formData, subcategoria_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Selecione uma categoria</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={manualCategory}
                    onChange={(e) => handleManualCategoryChange(e.target.value)}
                    onFocus={() => setShowSuggestions(manualCategory.length > 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Digite o nome da categoria"
                  />
                  {showSuggestions && filteredCategories.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredCategories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => selectCategory(cat.nome)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors text-sm"
                        >
                          {cat.nome}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Se a categoria não existir, será criada automaticamente
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              <Save className="w-5 h-5" />
              {produto ? 'Salvar Alterações' : 'Adicionar Produto'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
