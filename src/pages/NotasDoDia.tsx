import { useState } from 'react';
import { StickyNote, Plus, Pencil, Trash2, X, Check, Calendar, AlertTriangle, Clock, User } from 'lucide-react';
import { useSupabaseNotas, NotaDoDia } from '../hooks/useSupabaseNotas';
import { useAuth } from '../contexts/AuthContext';

export const NotasDoDia = () => {
  const { notas, loading, addNota, updateNota, deleteNota, isExpirada } = useSupabaseNotas();
  const { profile } = useAuth();

  const [novaMensagem, setNovaMensagem] = useState('');
  const [novaExpiraEm, setNovaExpiraEm] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMensagem, setEditMensagem] = useState('');
  const [editExpiraEm, setEditExpiraEm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAdd = async () => {
    if (!novaMensagem.trim()) return;

    setSaving(true);
    try {
      const autor = profile?.full_name || 'Usuário';
      await addNota(
        { mensagem: novaMensagem, expira_em: novaExpiraEm || null },
        autor
      );
      setNovaMensagem('');
      setNovaExpiraEm('');
      showToast('Nota adicionada com sucesso!', 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (nota: NotaDoDia) => {
    setEditingId(nota.id);
    setEditMensagem(nota.mensagem);
    setEditExpiraEm(nota.expira_em || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditMensagem('');
    setEditExpiraEm('');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editMensagem.trim()) return;

    try {
      await updateNota(editingId, {
        mensagem: editMensagem,
        expira_em: editExpiraEm || null,
      });
      setEditingId(null);
      showToast('Nota atualizada!', 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNota(id);
      setDeleteConfirmId(null);
      showToast('Nota excluída!', 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatExpiraEm = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Contadores
  const notasAtivas = notas.filter((n) => !isExpirada(n));
  const notasExpiradas = notas.filter((n) => isExpirada(n));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <StickyNote className="w-7 h-7 text-red-600" />
            Notas do Dia
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Recados e informações que o agente de IA usará para atender os clientes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
            {notasAtivas.length} ativa{notasAtivas.length !== 1 ? 's' : ''}
          </span>
          {notasExpiradas.length > 0 && (
            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
              {notasExpiradas.length} expirada{notasExpiradas.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Formulário de nova nota */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nova Nota
        </h3>

        <textarea
          value={novaMensagem}
          onChange={(e) => setNovaMensagem(e.target.value)}
          placeholder="Ex: Queijo meia cura do fornecedor Nego chega na terça-feira. Ricota está em falta, sem previsão. Promoção de cocadas: 10% desconto acima de 10 unidades..."
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
        />

        <div className="flex items-end justify-between mt-3 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <label className="text-sm text-gray-600">Expira em:</label>
            <input
              type="date"
              value={novaExpiraEm}
              onChange={(e) => setNovaExpiraEm(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
            {novaExpiraEm && (
              <button
                onClick={() => setNovaExpiraEm('')}
                className="text-gray-400 hover:text-gray-600"
                title="Remover data de expiração"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <span className="text-xs text-gray-400">(opcional)</span>
          </div>

          <button
            onClick={handleAdd}
            disabled={saving || !novaMensagem.trim()}
            className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Salvar Nota
          </button>
        </div>
      </div>

      {/* Dica */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-700">
          <strong>Dica:</strong> Seja específico nas notas. Ao invés de "sem queijo", escreva "Queijo meia cura furadinho está em falta. Previsão de chegada: terça-feira 11/03". 
          Quanto mais detalhes, melhor o agente de IA consegue atender os clientes.
        </div>
      </div>

      {/* Lista de Notas */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
        </div>
      ) : notas.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <StickyNote className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Nenhuma nota cadastrada.</p>
          <p className="text-gray-400 text-xs mt-1">
            Adicione notas para que o agente de IA tenha contexto atualizado.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notas.map((nota) => {
            const expirada = isExpirada(nota);
            const isEditing = editingId === nota.id;
            const isDeleting = deleteConfirmId === nota.id;

            return (
              <div
                key={nota.id}
                className={`bg-white rounded-lg border shadow-sm transition-all ${
                  expirada
                    ? 'border-amber-300 bg-amber-50/50'
                    : 'border-gray-200'
                }`}
              >
                {isEditing ? (
                  /* Modo Edição */
                  <div className="p-4 space-y-3">
                    <textarea
                      value={editMensagem}
                      onChange={(e) => setEditMensagem(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                      autoFocus
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <label className="text-sm text-gray-600">Expira em:</label>
                        <input
                          type="date"
                          value={editExpiraEm}
                          onChange={(e) => setEditExpiraEm(e.target.value)}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                        {editExpiraEm && (
                          <button
                            onClick={() => setEditExpiraEm('')}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          disabled={!editMensagem.trim()}
                          className="px-3 py-1.5 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                        >
                          <Check className="w-4 h-4" />
                          Salvar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Modo Visualização */
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {expirada && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full mb-2">
                            <Clock className="w-3 h-3" />
                            Expirada
                          </span>
                        )}
                        <p className={`text-sm leading-relaxed whitespace-pre-wrap ${expirada ? 'text-gray-400' : 'text-gray-800'}`}>
                          {nota.mensagem}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {nota.autor}
                          </span>
                          <span>{formatDate(nota.created_at)}</span>
                          {nota.expira_em && (
                            <span className={`flex items-center gap-1 ${expirada ? 'text-amber-500' : 'text-gray-400'}`}>
                              <Calendar className="w-3 h-3" />
                              Expira: {formatExpiraEm(nota.expira_em)}
                            </span>
                          )}
                          {nota.updated_at !== nota.created_at && (
                            <span className="italic">(editada)</span>
                          )}
                        </div>
                      </div>

                      {/* Botões de ação */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isDeleting ? (
                          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                            <span className="text-xs text-red-600 font-medium">Excluir?</span>
                            <button
                              onClick={() => handleDelete(nota.id)}
                              className="p-1 text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
                              title="Confirmar exclusão"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="p-1 text-gray-600 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartEdit(nota)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar nota"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(nota.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir nota"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-2">
          <div
            className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
};
