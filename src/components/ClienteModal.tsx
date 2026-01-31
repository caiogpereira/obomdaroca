import { useState, useEffect } from 'react';
import { 
  X, User, Phone, Mail, Building2, MapPin, FileText, 
  DollarSign, ShoppingBag, TrendingUp, Calendar, Package,
  Star, UserCheck, UserX, UserPlus, Edit2, Save, Trash2,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { ClienteComHistorico, ClienteFormData, SegmentoCliente } from '../types';

const SEGMENTOS_CONFIG: Record<SegmentoCliente, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  vip: { label: 'VIP', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: Star },
  frequente: { label: 'Frequente', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: TrendingUp },
  ativo: { label: 'Ativo', color: 'text-green-700', bgColor: 'bg-green-100', icon: UserCheck },
  inativo: { label: 'Inativo', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: UserX },
  novo: { label: 'Novo', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: UserPlus },
};

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatPhone = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
};

const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

const formatDateTime = (dateStr: string | undefined) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('pt-BR');
};

const STATUS_COLORS: Record<string, string> = {
  'Novo': 'bg-blue-100 text-blue-700',
  'Em Atendimento': 'bg-yellow-100 text-yellow-700',
  'Finalizado': 'bg-green-100 text-green-700',
};

interface ClienteModalProps {
  cliente: ClienteComHistorico | null;
  isNew: boolean;
  onClose: () => void;
  onSave: (data: ClienteFormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const ClienteModal = ({ cliente, isNew, onClose, onSave, onDelete }: ClienteModalProps) => {
  const [isEditing, setIsEditing] = useState(isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedPedidos, setExpandedPedidos] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState<ClienteFormData>({
    nome: cliente?.nome || '',
    telefone: cliente?.telefone || '',
    email: cliente?.email || '',
    cpf_cnpj: cliente?.cpf_cnpj || '',
    nome_empresa: cliente?.nome_empresa || '',
    endereco: cliente?.endereco || '',
    cidade: cliente?.cidade || '',
    estado: cliente?.estado || 'MG',
    cep: cliente?.cep || '',
    observacoes: cliente?.observacoes || '',
  });

  useEffect(() => {
    if (cliente) {
      setFormData({
        nome: cliente.nome || '',
        telefone: cliente.telefone || '',
        email: cliente.email || '',
        cpf_cnpj: cliente.cpf_cnpj || '',
        nome_empresa: cliente.nome_empresa || '',
        endereco: cliente.endereco || '',
        cidade: cliente.cidade || '',
        estado: cliente.estado || 'MG',
        cep: cliente.cep || '',
        observacoes: cliente.observacoes || '',
      });
    }
  }, [cliente]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.nome.trim() || !formData.telefone.trim()) {
      alert('Nome e telefone são obrigatórios');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      setIsEditing(false);
    } catch (err) {
      console.error('Erro ao salvar:', err);
      alert('Erro ao salvar cliente');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!cliente) return;
    
    try {
      await onDelete(cliente.id);
      onClose();
    } catch (err) {
      console.error('Erro ao excluir:', err);
      alert('Erro ao excluir cliente');
    }
  };

  const togglePedidoExpand = (pedidoId: string) => {
    setExpandedPedidos(prev => {
      const next = new Set(prev);
      if (next.has(pedidoId)) {
        next.delete(pedidoId);
      } else {
        next.add(pedidoId);
      }
      return next;
    });
  };

  const segmentoConfig = cliente ? SEGMENTOS_CONFIG[cliente.segmento] : null;
  const SegmentoIcon = segmentoConfig?.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <User size={24} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isNew ? 'Novo Cliente' : (isEditing ? 'Editar Cliente' : cliente?.nome)}
              </h2>
              {!isNew && cliente && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-500">{formatPhone(cliente.telefone)}</span>
                  {segmentoConfig && SegmentoIcon && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${segmentoConfig.bgColor} ${segmentoConfig.color}`}>
                      <SegmentoIcon size={12} />
                      {segmentoConfig.label}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isNew && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              >
                <Edit2 size={20} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6">
          {isEditing ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      name="nome"
                      value={formData.nome}
                      onChange={handleChange}
                      placeholder="Nome do cliente"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="tel"
                      name="telefone"
                      value={formData.telefone}
                      onChange={handleChange}
                      placeholder="(00) 00000-0000"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="email@exemplo.com"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      name="cpf_cnpj"
                      value={formData.cpf_cnpj}
                      onChange={handleChange}
                      placeholder="000.000.000-00"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      name="nome_empresa"
                      value={formData.nome_empresa}
                      onChange={handleChange}
                      placeholder="Nome da empresa (opcional)"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      name="endereco"
                      value={formData.endereco}
                      onChange={handleChange}
                      placeholder="Rua, número, bairro"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleChange}
                    placeholder="Cidade"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    name="estado"
                    value={formData.estado}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="MG">Minas Gerais</option>
                    <option value="SP">São Paulo</option>
                    <option value="RJ">Rio de Janeiro</option>
                    <option value="ES">Espírito Santo</option>
                    <option value="PR">Paraná</option>
                    <option value="SC">Santa Catarina</option>
                    <option value="RS">Rio Grande do Sul</option>
                    <option value="GO">Goiás</option>
                    <option value="DF">Distrito Federal</option>
                    <option value="BA">Bahia</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                  <textarea
                    name="observacoes"
                    value={formData.observacoes}
                    onChange={handleChange}
                    placeholder="Observações sobre o cliente..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          ) : cliente ? (
            <div className="space-y-6">
              {/* Métricas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <DollarSign size={18} />
                    <span className="text-sm font-medium">Total Gasto</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">{formatCurrency(cliente.total_gasto)}</p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <ShoppingBag size={18} />
                    <span className="text-sm font-medium">Pedidos</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">{cliente.total_pedidos}</p>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-purple-600 mb-1">
                    <TrendingUp size={18} />
                    <span className="text-sm font-medium">Ticket Médio</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-700">{formatCurrency(cliente.ticket_medio)}</p>
                </div>

                <div className="bg-amber-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-amber-600 mb-1">
                    <Calendar size={18} />
                    <span className="text-sm font-medium">Cliente Desde</span>
                  </div>
                  <p className="text-lg font-bold text-amber-700">{formatDate(cliente.primeira_compra || cliente.created_at)}</p>
                </div>
              </div>

              {/* Dados do cliente */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Dados do Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {cliente.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-gray-400" />
                      <span>{cliente.email}</span>
                    </div>
                  )}
                  {cliente.cpf_cnpj && (
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-gray-400" />
                      <span>{cliente.cpf_cnpj}</span>
                    </div>
                  )}
                  {cliente.nome_empresa && (
                    <div className="flex items-center gap-2">
                      <Building2 size={16} className="text-gray-400" />
                      <span>{cliente.nome_empresa}</span>
                    </div>
                  )}
                  {cliente.endereco && (
                    <div className="flex items-center gap-2 md:col-span-2">
                      <MapPin size={16} className="text-gray-400" />
                      <span>
                        {cliente.endereco}
                        {cliente.cidade && `, ${cliente.cidade}`}
                        {cliente.estado && ` - ${cliente.estado}`}
                      </span>
                    </div>
                  )}
                </div>
                {cliente.observacoes && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">{cliente.observacoes}</p>
                  </div>
                )}
              </div>

              {/* Produtos mais comprados */}
              {cliente.produtos_top && cliente.produtos_top.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Package size={18} />
                    Produtos Mais Comprados
                  </h3>
                  <div className="space-y-2">
                    {cliente.produtos_top.map((produto, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="font-medium text-gray-900">{produto.produto_nome}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-gray-600">{produto.total_quantidade} un.</span>
                          <span className="text-sm text-gray-400 ml-2">({produto.total_pedidos} pedidos)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Histórico de pedidos */}
              {cliente.pedidos && cliente.pedidos.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <ShoppingBag size={18} />
                    Histórico de Pedidos ({cliente.pedidos.length})
                  </h3>
                  <div className="space-y-2">
                    {cliente.pedidos.map((pedido) => (
                      <div key={pedido.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => togglePedidoExpand(pedido.id)}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <span className="font-mono text-sm text-gray-500">#{pedido.numero || pedido.id.slice(0, 8)}</span>
                            <span className="text-sm text-gray-500">{formatDateTime(pedido.created_at)}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[pedido.status] || 'bg-gray-100 text-gray-700'}`}>
                              {pedido.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-medium text-gray-900">{formatCurrency(pedido.total)}</span>
                            {expandedPedidos.has(pedido.id) ? (
                              <ChevronUp size={18} className="text-gray-400" />
                            ) : (
                              <ChevronDown size={18} className="text-gray-400" />
                            )}
                          </div>
                        </button>
                        
                        {expandedPedidos.has(pedido.id) && pedido.items && (
                          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                            <div className="space-y-1">
                              {pedido.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                  <span className="text-gray-600">{item.quantidade}x {item.produto_nome}</span>
                                  <span className="text-gray-900">{formatCurrency(item.quantidade * item.preco_unitario)}</span>
                                </div>
                              ))}
                            </div>
                            {pedido.observacoes && (
                              <p className="mt-2 pt-2 border-t border-gray-200 text-sm text-gray-500">{pedido.observacoes}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          {!isNew && !isEditing && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={18} />
              Excluir
            </button>
          )}
          
          <div className="flex items-center gap-3 ml-auto">
            {isEditing ? (
              <>
                <button
                  onClick={() => isNew ? onClose() : setIsEditing(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  <Save size={18} />
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </>
            ) : (
              <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                Fechar
              </button>
            )}
          </div>
        </div>

        {/* Modal de confirmação de exclusão */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmar Exclusão</h3>
              <p className="text-gray-600 mb-4">
                Tem certeza que deseja excluir o cliente <strong>{cliente?.nome}</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};