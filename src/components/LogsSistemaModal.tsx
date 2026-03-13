import { useState, useEffect } from 'react';
import { X, Search, Filter, Clock, User, RefreshCw, ChevronLeft, ChevronRight, 
  ClipboardList, ShoppingCart, Package, Users, Bot, Settings } from 'lucide-react';
import { useLogsSistema, TipoLog, LogSistema, FiltrosLog } from '../hooks/useLogsAtendimento';

const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

const getTipoIcon = (tipo: TipoLog) => {
  switch (tipo) {
    case 'atendimento': return <ClipboardList className="w-4 h-4" />;
    case 'pedido': return <ShoppingCart className="w-4 h-4" />;
    case 'produto': return <Package className="w-4 h-4" />;
    case 'cliente': return <Users className="w-4 h-4" />;
    case 'agente_ia': return <Bot className="w-4 h-4" />;
    case 'sistema': return <Settings className="w-4 h-4" />;
    default: return <Clock className="w-4 h-4" />;
  }
};

const getTipoColor = (tipo: TipoLog) => {
  switch (tipo) {
    case 'atendimento': return 'bg-blue-100 text-blue-700';
    case 'pedido': return 'bg-green-100 text-green-700';
    case 'produto': return 'bg-purple-100 text-purple-700';
    case 'cliente': return 'bg-amber-100 text-amber-700';
    case 'agente_ia': return 'bg-cyan-100 text-cyan-700';
    case 'sistema': return 'bg-gray-100 text-gray-700';
    default: return 'bg-gray-100 text-gray-600';
  }
};

const getTipoLabel = (tipo: TipoLog) => {
  switch (tipo) {
    case 'atendimento': return 'Atendimento';
    case 'pedido': return 'Pedido';
    case 'produto': return 'Produto';
    case 'cliente': return 'Cliente';
    case 'agente_ia': return 'Agente IA';
    case 'sistema': return 'Sistema';
    default: return tipo;
  }
};

interface LogsSistemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogsSistemaModal = ({ isOpen, onClose }: LogsSistemaModalProps) => {
  const { logs, loading, error, totalCount, fetchLogs } = useLogsSistema();
  const [page, setPage] = useState(0);
  const [filtros, setFiltros] = useState<FiltrosLog>({});
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const pageSize = 50;

  useEffect(() => {
    if (isOpen) {
      setPage(0);
      fetchLogs({}, 0, pageSize);
    }
  }, [isOpen, fetchLogs]);

  const handleApplyFilters = () => {
    setPage(0);
    fetchLogs(filtros, 0, pageSize);
  };

  const handleClearFilters = () => {
    setFiltros({});
    setPage(0);
    fetchLogs({}, 0, pageSize);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchLogs(filtros, newPage, pageSize);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <ClipboardList size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Logs do Sistema</h2>
              <p className="text-sm text-gray-500">
                {totalCount} registro{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLogs(filtros, page, pageSize)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Atualizar"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title="Filtros"
            >
              <Filter size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Filtro por tipo */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                <select
                  value={filtros.tipo || ''}
                  onChange={(e) => setFiltros(prev => ({ ...prev, tipo: e.target.value as TipoLog || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Todos</option>
                  <option value="atendimento">Atendimento</option>
                  <option value="pedido">Pedido</option>
                  <option value="produto">Produto</option>
                  <option value="cliente">Cliente</option>
                  <option value="agente_ia">Agente IA</option>
                  <option value="sistema">Sistema</option>
                </select>
              </div>

              {/* Filtro por usuário */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Usuário</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Nome do usuário..."
                    value={filtros.usuario_nome || ''}
                    onChange={(e) => setFiltros(prev => ({ ...prev, usuario_nome: e.target.value || undefined }))}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Filtro data início */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data início</label>
                <input
                  type="date"
                  value={filtros.dataInicio || ''}
                  onChange={(e) => setFiltros(prev => ({ ...prev, dataInicio: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Filtro data fim */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data fim</label>
                <input
                  type="date"
                  value={filtros.dataFim || ''}
                  onChange={(e) => setFiltros(prev => ({ ...prev, dataFim: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Busca texto livre */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar na descrição..."
                value={filtros.busca || ''}
                onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value || undefined }))}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleApplyFilters}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Aplicar Filtros
              </button>
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
              >
                Limpar
              </button>
            </div>
          </div>
        )}

        {/* Lista de Logs */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Carregando logs...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">
              <p>Erro: {error}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">Nenhum log encontrado</p>
              <p className="text-gray-500 mt-1">As ações realizadas no sistema aparecerão aqui</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="px-6 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  <div className="flex items-center gap-3">
                    {/* Ícone do tipo */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getTipoColor(log.tipo)}`}>
                      {getTipoIcon(log.tipo)}
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTipoColor(log.tipo)}`}>
                          {getTipoLabel(log.tipo)}
                        </span>
                        <span className="text-sm text-gray-900 truncate">{log.descricao}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.usuario_nome || 'Sistema'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(log.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Detalhes expandidos */}
                  {expandedLog === log.id && log.detalhes && (
                    <div className="mt-3 ml-11 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs font-medium text-gray-500 mb-1">Detalhes:</p>
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words">
                        {typeof log.detalhes === 'string' 
                          ? log.detalhes 
                          : JSON.stringify(log.detalhes, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Página {page + 1} de {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 0}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
