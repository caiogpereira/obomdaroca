import { useState, useEffect, useCallback } from 'react';
import { X, Archive, Search, Calendar, Clock, User, Phone, CheckCircle2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AtendimentoArquivado {
  id: string;
  cliente: string;
  telefone: string;
  email: string;
  tipo_solicitacao: string;
  descricao: string;
  status: string;
  prioridade: string;
  created_at: string;
  resolved_at: string;
  resolved_by_user_name: string;
  assumed_by_user_name: string;
  archived_at: string;
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('pt-BR');

const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

interface AtendimentosArquivadosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AtendimentosArquivadosModal = ({ isOpen, onClose }: AtendimentosArquivadosModalProps) => {
  const [atendimentos, setAtendimentos] = useState<AtendimentoArquivado[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const fetchArquivados = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('atendimentos')
        .select('*')
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`cliente.ilike.%${searchTerm}%,telefone.ilike.%${searchTerm}%`);
      }
      if (dataInicio) {
        query = query.gte('archived_at', dataInicio);
      }
      if (dataFim) {
        query = query.lte('archived_at', dataFim + 'T23:59:59.999Z');
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      setAtendimentos(data || []);
    } catch (err) {
      console.error('Erro ao buscar atendimentos arquivados:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, dataInicio, dataFim]);

  useEffect(() => {
    if (isOpen) {
      fetchArquivados();
    }
  }, [isOpen, fetchArquivados]);

  const handleSearch = () => {
    fetchArquivados();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setDataInicio('');
    setDataFim('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Atendimentos Finalizados</h2>
              <p className="text-sm text-gray-500">
                {atendimentos.length} atendimento{atendimentos.length !== 1 ? 's' : ''} arquivado{atendimentos.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchArquivados}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Atualizar"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
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
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por cliente ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <span className="text-gray-400">até</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
            >
              Buscar
            </button>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
            >
              Limpar
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Carregando...</p>
            </div>
          ) : atendimentos.length === 0 ? (
            <div className="p-12 text-center">
              <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">Nenhum atendimento arquivado</p>
              <p className="text-gray-500 mt-1">Atendimentos finalizados aparecerão aqui</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {atendimentos.map((at) => (
                <div key={at.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{at.cliente}</h4>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          Resolvido
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          at.prioridade === 'Alta' ? 'bg-red-100 text-red-700' :
                          at.prioridade === 'Normal' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {at.prioridade}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">{at.tipo_solicitacao}</p>
                      <p className="text-sm text-gray-500 line-clamp-2">{at.descricao}</p>
                      
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {at.telefone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Criado: {formatDateTime(at.created_at)}
                        </span>
                        {at.resolved_at && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                            Resolvido: {formatDateTime(at.resolved_at)}
                          </span>
                        )}
                        {at.resolved_by_user_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Por: {at.resolved_by_user_name}
                          </span>
                        )}
                        {at.assumed_by_user_name && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <User className="w-3 h-3" />
                            Assumido por: {at.assumed_by_user_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
