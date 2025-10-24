import { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { TabNavigation } from './components/TabNavigation';
import { Toast } from './components/Toast';
import { Atendimentos } from './pages/Atendimentos';
import { Dashboard } from './pages/Dashboard';
import { Produtos } from './pages/Produtos';
import { useSupabasePedidos } from './hooks/useSupabasePedidos';
import { useSupabaseProdutos } from './hooks/useSupabaseProdutos';
import { useSupabaseAtendimentos } from './hooks/useSupabaseAtendimentos';
import { useSupabaseCategorias } from './hooks/useSupabaseCategorias';
import { useNotifications } from './hooks/useNotifications';
import { TabType, Periodo } from './types';
import { generateReport } from './utils/pdfGenerator';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('atendimentos');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { showNotification, requestPermission } = useNotifications();

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
    importProdutos,
    refetch: refetchProdutos,
  } = useSupabaseProdutos();

  const {
    addCategoria,
    updateCategoria,
    deleteCategoria,
  } = useSupabaseCategorias();

  const {
    atendimentos,
    error: atendimentosError,
    unreadCount,
    addAtendimento,
    updateAtendimento,
    updateStatus,
    deleteAtendimento,
    markAsRead,
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

  const handleImportProdutos = async (produtos: any) => {
    try {
      await importProdutos(produtos);
      setToast({ message: `${produtos.length} produtos importados com sucesso!`, type: 'success' });
    } catch (error) {
      setToast({ message: (error as Error).message, type: 'error' });
    }
  };

  const handleAddCategoria = async (nome: string) => {
    try {
      await addCategoria(nome);
      await refetchProdutos();
      setToast({ message: 'Categoria adicionada com sucesso!', type: 'success' });
    } catch (error) {
      setToast({ message: (error as Error).message, type: 'error' });
    }
  };

  const handleUpdateCategoria = async (id: string, nome: string) => {
    try {
      await updateCategoria(id, nome);
      await refetchProdutos();
      setToast({ message: 'Categoria atualizada com sucesso!', type: 'success' });
    } catch (error) {
      setToast({ message: (error as Error).message, type: 'error' });
    }
  };

  const handleDeleteCategoria = async (id: string) => {
    try {
      await deleteCategoria(id);
      await refetchProdutos();
      setToast({ message: 'Categoria excluída com sucesso!', type: 'success' });
    } catch (error) {
      setToast({ message: (error as Error).message, type: 'error' });
    }
  };

  const handleGenerateReport = (periodo: Periodo, metrics: any) => {
    try {
      generateReport({
        periodo,
        metrics,
        pedidos,
      });
      setToast({ message: 'Relatório gerado com sucesso!', type: 'success' });
    } catch (error) {
      setToast({ message: 'Erro ao gerar relatório', type: 'error' });
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
      <Header />
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
            onImportProdutos={handleImportProdutos}
            onAddCategoria={handleAddCategoria}
            onUpdateCategoria={handleUpdateCategoria}
            onDeleteCategoria={handleDeleteCategoria}
          />
        )}
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;
