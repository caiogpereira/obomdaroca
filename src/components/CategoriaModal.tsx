import { useState, useEffect } from 'react';
import { X, Save, Trash2, Edit2, Plus } from 'lucide-react';
import { Categoria } from '../types';

interface CategoriaModalProps {
  categorias: Categoria[];
  onClose: () => void;
  onUpdateCategoria: (id: string, nome: string) => void;
  onDeleteCategoria: (id: string) => void;
  onAddCategoria: (nome: string) => void;
}

export const CategoriaModal = ({
  categorias,
  onClose,
  onUpdateCategoria,
  onDeleteCategoria,
  onAddCategoria,
}: CategoriaModalProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleStartEdit = (categoria: Categoria) => {
    setEditingId(categoria.id);
    setEditValue(categoria.nome);
  };

  const handleSaveEdit = (id: string) => {
    if (editValue.trim()) {
      onUpdateCategoria(id, editValue.trim());
      setEditingId(null);
      setEditValue('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategoria(newCategoryName.trim());
      setNewCategoryName('');
      setShowAddForm(false);
    }
  };

  const handleDelete = (id: string, nome: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a categoria "${nome}"? Produtos vinculados ficarão sem categoria.`)) {
      onDeleteCategoria(id);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Gerenciar Categorias</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            {showAddForm ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                  placeholder="Nome da nova categoria"
                  autoFocus
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Save className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewCategoryName('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Nova Categoria
              </button>
            )}
          </div>

          <div className="space-y-2">
            {categorias.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhuma categoria cadastrada
              </div>
            ) : (
              categorias.map((categoria) => (
                <div
                  key={categoria.id}
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {editingId === categoria.id ? (
                    <>
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(categoria.id);
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        autoFocus
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <button
                        onClick={() => handleSaveEdit(categoria.id)}
                        className="p-2 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors"
                        title="Salvar"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-2 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-medium text-gray-900">{categoria.nome}</span>
                      <button
                        onClick={() => handleStartEdit(categoria)}
                        className="p-2 bg-yellow-100 text-yellow-600 rounded hover:bg-yellow-200 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(categoria.id, categoria.nome)}
                        className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
