import { useState } from 'react';
import { X, Save, Upload, Trash2 } from 'lucide-react';
import { Produto, Categoria } from '../types';
import { uploadProductImage, deleteProductImage, validateImageFile } from '../services/imageService';

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
    preco_varejo: produto?.preco_varejo || produto?.preco || 0,
    preco_cartao: produto?.preco_cartao || undefined,
    preco_pix: produto?.preco_pix || undefined,
    preco_dinheiro: produto?.preco_dinheiro || undefined,
    categoria: produto?.categoria || '',
    subcategoria_id: produto?.subcategoria_id || '',
    marca: produto?.marca || '',
    imagem_url: produto?.imagem_url || '',
    image_storage_path: produto?.image_storage_path || '',
  });

  const [precoVarejoDisplay, setPrecoVarejoDisplay] = useState(
    produto?.preco_varejo ? produto.preco_varejo.toFixed(2) : 
    produto?.preco ? produto.preco.toFixed(2) : ''
  );
  const [precoCartaoDisplay, setPrecoCartaoDisplay] = useState(produto?.preco_cartao ? produto.preco_cartao.toFixed(2) : '');
  const [precoPixDisplay, setPrecoPixDisplay] = useState(produto?.preco_pix ? produto.preco_pix.toFixed(2) : '');
  const [precoDinheiroDisplay, setPrecoDinheiroDisplay] = useState(produto?.preco_dinheiro ? produto.preco_dinheiro.toFixed(2) : '');
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(produto?.imagem_url || '');
  const [uploadingImage, setUploadingImage] = useState(false);

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
    if (formData.preco_varejo <= 0) {
      newErrors.preco_varejo = 'Preço Varejo deve ser maior que zero';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      try {
        setUploadingImage(true);
        let finalFormData = { 
          ...formData,
          preco: formData.preco_varejo // Mantém compatibilidade com campo antigo
        };

        if (imageFile && produto?.id) {
          const { url, path } = await uploadProductImage(imageFile, produto.id);
          finalFormData.imagem_url = url;
          finalFormData.image_storage_path = path;

          if (produto.image_storage_path) {
            await deleteProductImage(produto.image_storage_path);
          }
        }

        if (inputMode === 'manual' && manualCategory.trim()) {
          onSave({ ...finalFormData, subcategoria_id: manualCategory.trim() });
        } else {
          onSave(finalFormData);
        }
      } catch (err) {
        setErrors({ ...errors, image: err instanceof Error ? err.message : 'Erro ao fazer upload da imagem' });
        setUploadingImage(false);
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validationError = validateImageFile(file);
      if (validationError) {
        setErrors({ ...errors, image: validationError });
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setErrors({ ...errors, image: '' });
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData({ ...formData, imagem_url: '', image_storage_path: '' });
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
            {/* Código */}
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

            {/* Nome */}
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

            {/* Marca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marca
              </label>
              <input
                type="text"
                value={formData.marca}
                onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Ex: Fazenda São João"
              />
              <p className="mt-1 text-xs text-gray-500">
                Usada para agrupar produtos no desconto por quantidade
              </p>
            </div>

            {/* Preço Varejo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preço Varejo (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">R$</span>
                <input
                  type="text"
                  value={precoVarejoDisplay}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                    setPrecoVarejoDisplay(value);
                    const numValue = parseFloat(value) || 0;
                    setFormData({ ...formData, preco_varejo: numValue, preco: numValue });
                  }}
                  onFocus={() => {
                    if (precoVarejoDisplay === '' || parseFloat(precoVarejoDisplay) === 0) {
                      setPrecoVarejoDisplay('');
                    }
                  }}
                  onBlur={() => {
                    const numValue = parseFloat(precoVarejoDisplay) || 0;
                    setPrecoVarejoDisplay(numValue > 0 ? numValue.toFixed(2) : '');
                  }}
                  className={`w-full pl-12 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    errors.preco_varejo ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Preço padrão, sem quantidade mínima</p>
              {errors.preco_varejo && (
                <p className="mt-1 text-sm text-red-600">{errors.preco_varejo}</p>
              )}
            </div>

            {/* Preços Atacado */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preço Cartão (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">R$</span>
                  <input
                    type="text"
                    value={precoCartaoDisplay}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                      setPrecoCartaoDisplay(value);
                      const numValue = parseFloat(value) || undefined;
                      setFormData({ ...formData, preco_cartao: numValue });
                    }}
                    onBlur={() => {
                      const numValue = parseFloat(precoCartaoDisplay) || 0;
                      setPrecoCartaoDisplay(numValue > 0 ? numValue.toFixed(2) : '');
                    }}
                    className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="0.00"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Min. R$300 ou 10un</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preço PIX (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">R$</span>
                  <input
                    type="text"
                    value={precoPixDisplay}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                      setPrecoPixDisplay(value);
                      const numValue = parseFloat(value) || undefined;
                      setFormData({ ...formData, preco_pix: numValue });
                    }}
                    onBlur={() => {
                      const numValue = parseFloat(precoPixDisplay) || 0;
                      setPrecoPixDisplay(numValue > 0 ? numValue.toFixed(2) : '');
                    }}
                    className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="0.00"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Min. R$300 ou 15un</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preço TED/Dinheiro (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">R$</span>
                  <input
                    type="text"
                    value={precoDinheiroDisplay}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                      setPrecoDinheiroDisplay(value);
                      const numValue = parseFloat(value) || undefined;
                      setFormData({ ...formData, preco_dinheiro: numValue });
                    }}
                    onBlur={() => {
                      const numValue = parseFloat(precoDinheiroDisplay) || 0;
                      setPrecoDinheiroDisplay(numValue > 0 ? numValue.toFixed(2) : '');
                    }}
                    className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="0.00"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Min. R$300 ou 15un</p>
              </div>
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <input
                type="text"
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Ex: Laticínios"
              />
            </div>

            {/* Subcategoria */}
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
                  Criar Subcategoria
                </button>
              </div>

              {inputMode === 'select' ? (
                <select
                  value={formData.subcategoria_id}
                  onChange={(e) => setFormData({ ...formData, subcategoria_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Selecione uma subcategoria</option>
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
                    placeholder="Digite o nome da subcategoria"
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
                    Se não existir, será criada automaticamente
                  </p>
                </div>
              )}
            </div>

            {/* Imagem */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imagem do Produto
              </label>
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-10 h-10 text-gray-400 mb-3" />
                    <p className="text-sm text-gray-600 font-medium mb-1">Clique para adicionar imagem</p>
                    <p className="text-xs text-gray-500">JPG, PNG ou WEBP (máx. 5MB)</p>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
              {errors.image && (
                <p className="mt-1 text-sm text-red-600">{errors.image}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={uploadingImage}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {uploadingImage ? 'Salvando...' : produto ? 'Salvar Alterações' : 'Adicionar Produto'}
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