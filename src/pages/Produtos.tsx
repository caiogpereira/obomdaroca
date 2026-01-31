import { useState } from 'react';
import { Search, Plus, Upload, Edit, Trash2, Package, FolderKanban, CheckSquare, Square, RefreshCw } from 'lucide-react';
import { Produto, Categoria } from '../types';
import { FileUpload } from '../components/FileUpload';
import { ProdutoModal } from '../components/ProdutoModal';
import { CategoriaModal } from '../components/CategoriaModal';
import { ImportarProdutosSaurus } from '../components/ImportarProdutosSaurus';

// URL do webhook N8N para importação do Saurus
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_SAURUS || 'https://meueditor.manager01.exponensialab.com.br/webhook/importar-produtos-saurus';

interface ProdutosProps {
  produtos: Produto[];
  categorias: Categoria[];
  onAddProduto: (produto: Omit<Produto, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateProduto: (id: string, produto: Omit<Produto, 'id' | 'created_at' | 'updated_at'>) => void;
  onDeleteProduto: (id: string) => void;
  onDeleteMultipleProdutos?: (ids: string[]) => void;
  onImportProdutos: (produtos: Omit<Produto, 'id' | 'created_at' | 'updated_at'>[]) => void;
  onAddCategoria: (nome: string) => void;
  onUpdateCategoria: (id: string, nome: string) => void;
  onDeleteCategoria: (id: string) => void;
}

export const Produtos = ({
  produtos,
  categorias,
  onAddProduto,
  onUpdateProduto,
  onDeleteProduto,
  onDeleteMultipleProdutos,
  onImportProdutos,
  onAddCategoria,
  onUpdateCategoria,
  onDeleteCategoria,
}: ProdutosProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [showSaurusImport, setShowSaurusImport] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCategoriaModal, setShowCategoriaModal] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<string>('todos');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  const filteredProdutos = produtos.filter((produto) => {
    const matchesSearch =
      produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.codigo.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === 'todos' ||
      produto.subcategoria_id === categoryFilter ||
      (!produto.subcategoria_id && categoryFilter === 'sem-categoria');

    return matchesSearch && matchesCategory;
  });

  const handleEdit = (produto: Produto) => {
    setSelectedProduto(produto);
    setShowModal(true);
  };

  const handleAdd = () => {
    setSelectedProduto(undefined);
    setShowModal(true);
  };

  const handleSave = (produto: Omit<Produto, 'id' | 'created_at' | 'updated_at'>) => {
    if (selectedProduto) {
      onUpdateProduto(selectedProduto.id, produto);
    } else {
      onAddProduto(produto);
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      onDeleteProduto(id);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProdutos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProdutos.map(p => p.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    if (window.confirm(`Tem certeza que deseja excluir ${count} produto(s) selecionado(s)?`)) {
      if (onDeleteMultipleProdutos) {
        onDeleteMultipleProdutos(Array.from(selectedIds));
      } else {
        // Fallback: delete one by one
        selectedIds.forEach(id => onDeleteProduto(id));
      }
      setSelectedIds(new Set());
      setSelectionMode(false);
    }
  };

  const cancelSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const getCategoriaName = (id?: string) => {
    if (!id) return 'Sem categoria';
    const categoria = categorias.find((c) => c.id === id);
    return categoria?.nome || 'Sem categoria';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Produtos</h2>
            <p className="text-sm text-gray-600 mt-1">
              Gerencie o catálogo de produtos
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {!selectionMode ? (
              <>
                <button
                  onClick={() => setShowCategoriaModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium border border-gray-300"
                >
                  <FolderKanban className="w-4 h-4" />
                  Categorias
                </button>
                <button
                  onClick={() => setShowSaurusImport(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium border border-green-300"
                  title="Importar produtos do Saurus PDV"
                >
                  <RefreshCw className="w-4 h-4" />
                  Saurus
                </button>
                <button
                  onClick={() => setShowUpload(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium border border-gray-300"
                >
                  <Upload className="w-4 h-4" />
                  Planilha
                </button>
                <button
                  onClick={() => setSelectionMode(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium border border-gray-300"
                >
                  <CheckSquare className="w-4 h-4" />
                  Selecionar
                </button>
                <button
                  onClick={handleAdd}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm hover:shadow"
                >
                  <Plus className="w-4 h-4" />
                  Novo
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium border border-blue-200">
                  <CheckSquare className="w-5 h-5" />
                  {selectedIds.size} selecionado(s)
                </div>
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedIds.size === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-5 h-5" />
                  Excluir Selecionados
                </button>
                <button
                  onClick={cancelSelection}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium border border-gray-300"
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nome ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
          >
            <option value="todos">Todas as Categorias</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nome}
              </option>
            ))}
            <option value="sem-categoria">Sem Categoria</option>
          </select>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Exibindo {filteredProdutos.length} de {produtos.length} produtos
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredProdutos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum produto encontrado
            </h4>
            <p className="text-gray-500">
              {searchTerm || categoryFilter !== 'todos'
                ? 'Tente ajustar os filtros de busca'
                : 'Comece adicionando um novo produto ou importando uma planilha'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {selectionMode && (
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 w-12">
                      <button
                        onClick={toggleSelectAll}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title={selectedIds.size === filteredProdutos.length ? 'Desmarcar todos' : 'Selecionar todos'}
                      >
                        {selectedIds.size === filteredProdutos.length ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </th>
                  )}
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Código
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Nome do Produto
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Preço Varejo
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Marca
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Subcategoria
                  </th>
                  {!selectionMode && (
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredProdutos.map((produto) => (
                  <tr
                    key={produto.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      selectionMode && selectedIds.has(produto.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    {selectionMode && (
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleSelection(produto.id)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          {selectedIds.has(produto.id) ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </td>
                    )}
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {produto.codigo}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">{produto.nome}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      R$ {(produto.preco_varejo || produto.preco || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {produto.marca || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {getCategoriaName(produto.subcategoria_id)}
                    </td>
                    {!selectionMode && (
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(produto)}
                            className="p-1.5 bg-yellow-100 text-yellow-600 rounded hover:bg-yellow-200 transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(produto.id)}
                            className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showUpload && (
        <FileUpload
          onProductsImported={onImportProdutos}
          onClose={() => setShowUpload(false)}
        />
      )}

      {showSaurusImport && (
        <ImportarProdutosSaurus
          webhookUrl={N8N_WEBHOOK_URL}
          onClose={() => setShowSaurusImport(false)}
        />
      )}

      {showModal && (
        <ProdutoModal
          produto={selectedProduto}
          categorias={categorias}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}

      {showCategoriaModal && (
        <CategoriaModal
          categorias={categorias}
          onClose={() => setShowCategoriaModal(false)}
          onAddCategoria={onAddCategoria}
          onUpdateCategoria={onUpdateCategoria}
          onDeleteCategoria={onDeleteCategoria}
        />
      )}
    </div>
  );
};
