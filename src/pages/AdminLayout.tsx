import { useState, useCallback, useEffect } from 'react';
import { Header } from '../components/Header';
import { TabNavigation } from '../components/TabNavigation';
import { Toast } from '../components/Toast';
import { Atendimentos } from './Atendimentos';
import { Dashboard } from './Dashboard';
import { Produtos } from './Produtos';
import { Clientes } from './Clientes';
import { NotasDoDia } from './NotasDoDia';
import { LogsSistemaModal } from '../components/LogsSistemaModal';
import { useSupabasePedidos } from '../hooks/useSupabasePedidos';
import { useSupabaseProdutos } from '../hooks/useSupabaseProdutos';
import { useSupabaseAtendimentos } from '../hooks/useSupabaseAtendimentos';
import { useSupabaseCategorias } from '../hooks/useSupabaseCategorias';
import { useSupabaseClientes } from '../hooks/useSupabaseClientes';
import { useNotifications } from '../hooks/useNotifications';
import { TabType, Periodo } from '../types';
import { generateReport } from '../utils/pdfGenerator';

// =====================================================
// Bug 5 FIX: Persistir aba ativa no localStorage
// =====================================================
const TAB_KEY = 'obdr_active_tab';
const getSavedTab = (): TabType => {
  try {
    const saved = localStorage.getItem(TAB_KEY);
    if (saved && ['atendimentos', 'dashboard', 'produtos', 'clientes', 'notas'].includes(saved)) {
      return saved as TabType;
    }
  } catch {}
  return 'atendimentos';
};

export const AdminLayout = () => {
  // Bug 5: Inicializar a partir do localStorage
  const [activeTab, setActiveTab] = useState<TabType>(getSavedTab);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const { showNotification } = useNotifications();

  // Bug 5: Persistir quando muda
  useEffect(() => {
    localStorage.setItem(TAB_KEY, activeTab);
  }, [activeTab]);

  // Define o título da página
  useEffect(() => {
    document.title = 'Dashboard - O Bom da Roça';
  }, []);

  const handleNewAtendimento = useCallback((atendimento: any) => {
    showNotification('Novo Atendimento Recebido!', {
      body: `${atendimento.cliente} - ${atendimento.tipo_solicitacao}`,
      tag: `atendimento-${atendimento.id}`,
      requireInteraction: false,
    });

    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuFzvLaizsIGGS57OihUg8NTKXh8LdmHQU8ltjyu3YpBCl+zPLfkUAHElux6OqnUxELTKXh8LdnHgU8ldf');
      audio.play().catch(() => {});
    } catch (e) {
    }
  }, [showNotification]);

  const {
    pedidos,
    error: pedidosError,
    finalizarPedido,
    atualizarPedido,
    atualizarStatusPedido,
  } = useSupabasePedidos();

  const {
    produtos,
    categorias,
    error: produtosError,
    addProduto,
    updateProduto,
    deleteProduto,
    deleteMultipleProdutos,
    importProdutos,
    refetch: refetchProdutos,
  } = useSupabaseProdutos();

  const {
    addCategoria,
    updateCategoria,
    deleteCategoria,
  } = useSupabaseCategorias();

  const {
    addCliente,
    updateCliente,
    deleteCliente,
  } = useSupabaseClientes();

  const {
    atendimentos,
    error: atendimentosError,
    addAtendimento,
    updateAtendimento,
    updateStatus,
    deleteAtendimento,
  } = useSupabaseAtendimentos(handleNewAtendimento);

  const handleFinalizarPedido = async (id: string) => {
    try {
      await finalizarPedido(id);
      setToast({ message: 'Pedido finalizado com sucesso!', type: 'success' });
    } catch (error) {
      setToast({ message: (error as Error).message, type: 'error' });
    }
  };

  const handleAtualizarPedido = async (pedido: any) => {
    try {
      await atualizarPedido(pedido);
      setToast({ message: 'Pedido atualizado com sucesso!', type: 'success' });
    } catch (error) {
      setToast({ message: (error as Error).message, type: 'error' });
    }
  };

  const handleStatusChange = async (pedidoId: string, newStatus: any) => {
    try {
      await atualizarStatusPedido(pedidoId, newStatus);
      setToast({ message: 'Status atualizado com sucesso!', type: 'success' });
    } catch (error) {
      setToast({ message: (error as Error).message, type: 'error' });
    }
  };

  const handleGenerateReport = async (periodo: Periodo) => {
    try {
      await generateReport(periodo, pedidos);
      setToast({ message: 'Relatório gerado com sucesso!', type: 'success' });
    } catch (error) {
      setToast({ message: (error as Error).message, type: 'error' });
    }
  };

  const handleAddProduto = async (produto: any) => {
    try {
      await addProduto(produto);
      setToast({ message: 'Produto adicionado com sucesso!', type: 'success' });
    } catch (error) {
      setToast({ message: (error as Error).message, type: 'error' });
    }
  };

  const handleUpdateProduto = async (id: string, produto: any) => {
    try {
      await updateProduto(id, produto);
      setToast({ message: 'Produto atualizado com sucesso!', type: 'success' });
    } catch (error) {
      setToast({ message: (error as Error).message, type: 'error' });
    }
  };

  const handleDeleteProduto = async (id: string) => {
    try {
      await deleteProduto(id);
      setToast({ message: 'Produto excluído com sucesso!', type: 'success' });
    } catch (error) {
      setToast({ message: (error as Error).message, type: 'error' });
    }
  };

  const handleDeleteMultipleProdutos = async (ids: string[]) => {
    try {
      await deleteMultipleProdutos(ids);
      setToast({ message: `${ids.length} produtos excluídos com sucesso!`, type: 'success' });
    } catch (error) {
      setToast({ message: (error as Error).message, type: 'error' });
    }
  };

  const handleImportProdutos = async (produtosData: any[]) => {
    try {
      const result = await importProdutos(produtosData);
      setToast({ message: `${produtosData.length} produtos importados com sucesso!`, type: 'success' });
    } catch (error) {
      setToast({ message: (error as Error).message, type: 'error' });
    }
  };

  const handleAddCategoria = async (categoria: any) => {
    try {
      await addCategoria(categoria);
      setToast({ message: 'Categoria adicionada com sucesso!', type: 'success' });
    } catch (error) {
      setToast({ message: (error as Error).message, type: 'error' });
    }
  };

  const handleUpdateCategoria = async (id: string, categoria: any) => {
    try {
      await updateCategoria(id, categoria);
      setToast({ message: 'Categoria atualizada com sucesso!', type: 'success' });
    } catch (error) {
      setToast({ message: (error as Error).message, type: 'error' });
    }
  };

  const handleDeleteCategoria = async (id: string) => {
    try {
      await deleteCategoria(id);
      setToast({ message: 'Categoria excluída com sucesso!', type: 'success' });
    } catch (error) {
      setToast({ message: (error as Error).message, type: 'error' });
    }
  };

  const handleAddAtendimento = async (atendimento: any) => {
    try {
      await addAtendimento(atendimento);
      setToast({ message: 'Solicitação adicionada com sucesso!', type: 'success' });
    } catch (error) {
      setToast({ message: (error as Error).message, type: 'error' });
    }
  };

  const handleUpdateAtendimento = async (id: string, atendimento: any) => {
    try {
      await updateAtendimento(id, atendimento);
      setToast({ message: 'Solicitação atualizada com sucesso!', type: 'success' });
    } catch (error) {
      setToast({ message: (error as Error).message, type: 'error' });
    }
  };

  const handleDeleteAtendimento = async (id: string) => {
    try {
      await deleteAtendimento(id);
      setToast({ message: 'Solicitação excluída com sucesso!', type: 'success' });
    } catch (error) {
      setToast({ message: (error as Error).message, type: 'error' });
    }
  };

  const handleStatusChangeAtendimento = async (id: string, status: any) => {
    try {
      await updateStatus(id, status);
      setToast({ message: 'Status atualizado com sucesso!', type: 'success' });
    } catch (error) {
      setToast({ message: (error as Error).message, type: 'error' });
    }
  };

  const handleAddCliente = async (cliente: any) => {
    try {
      await addCliente(cliente);
      setToast({ message: 'Cliente adicionado com sucesso!', type: 'success' });
    } catch (error) {
      setToast({ message: (error as Error).message, type: 'error' });
    }
  };

  const handleUpdateCliente = async (id: string, cliente: any) => {
    try {
      await updateCliente(id, cliente);
      setToast({ message: 'Cliente atualizado com sucesso!', type: 'success' });
    } catch (error) {
      setToast({ message: (error as Error).message, type: 'error' });
    }
  };

  const handleDeleteCliente = async (id: string) => {
    try {
      await deleteCliente(id);
      setToast({ message: 'Cliente excluído com sucesso!', type: 'success' });
    } catch (error) {
      setToast({ message: (error as Error).message, type: 'error' });
    }
  };

  if (pedidosError || produtosError || atendimentosError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">Erro</h2>
          <p className="text-gray-700">{pedidosError || produtosError || atendimentosError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onShowLogs={() => setShowLogs(true)} />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'atendimentos' && (
          <Atendimentos
            pedidos={pedidos}
            produtos={produtos}
            atendimentos={atendimentos}
            onFinalizarPedido={handleFinalizarPedido}
            onAtualizarPedido={handleAtualizarPedido}
            onStatusChange={handleStatusChange}
            onAddAtendimento={handleAddAtendimento}
            onUpdateAtendimento={handleUpdateAtendimento}
            onDeleteAtendimento={handleDeleteAtendimento}
            onStatusChangeAtendimento={handleStatusChangeAtendimento}
          />
        )}

        {activeTab === 'dashboard' && (
          <Dashboard onGenerateReport={handleGenerateReport} />
        )}

        {activeTab === 'produtos' && (
          <Produtos
            produtos={produtos}
            categorias={categorias}
            onAddProduto={handleAddProduto}
            onUpdateProduto={handleUpdateProduto}
            onDeleteProduto={handleDeleteProduto}
            onDeleteMultipleProdutos={handleDeleteMultipleProdutos}
            onImportProdutos={handleImportProdutos}
            onAddCategoria={handleAddCategoria}
            onUpdateCategoria={handleUpdateCategoria}
            onDeleteCategoria={handleDeleteCategoria}
          />
        )}

        {activeTab === 'clientes' && (
          <Clientes
            onAddCliente={handleAddCliente}
            onUpdateCliente={handleUpdateCliente}
            onDeleteCliente={handleDeleteCliente}
          />
        )}

	{activeTab === 'notas' && (
          <NotasDoDia />
        )}
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Modal de Logs do Sistema */}
      <LogsSistemaModal
        isOpen={showLogs}
        onClose={() => setShowLogs(false)}
      />
    </div>
  );
};
