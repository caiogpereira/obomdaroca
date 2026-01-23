export interface Metric {
  label: string;
  value: string | number;
  change?: number;
  icon: string;
}

export interface Pedido {
  id: string;
  numero?: number;
  cliente: string;
  nome_empresa?: string;
  telefone: string;
  email?: string;
  endereco?: string;
  items: ItemPedido[];
  total: number;
  status: string;
  forma_pagamento?: string; // ADICIONE ESTA LINHA
  observacoes?: string;
  created_at: string;
  updated_at?: string;
}

export interface ItemPedido {
  id: string;
  pedido_id?: string;
  produto_id?: string;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  desconto_percentual?: number;
  preco_original?: number;
}

export interface Produto {
  id: string;
  codigo: string;
  nome: string;
  preco: number; // Mantém para compatibilidade
  preco_varejo?: number;
  preco_cartao?: number;
  preco_pix?: number;
  preco_dinheiro?: number;
  categoria?: string;
  subcategoria_id?: string;
  subcategoria?: string;
  marca?: string;
  imagem_url?: string;
  ativo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type ModalidadePagamento = 'varejo' | 'cartao' | 'pix' | 'dinheiro';

export interface RegraPreco {
  nome: string;
  descricao: string;
  minimoValor?: number;
  minimoQuantidade?: number;
}

export interface Categoria {
  id: string;
  nome: string;
  created_at?: string;
}

export interface Atendimento {
  id: string;
  cliente: string;
  telefone: string;
  email: string;
  tipo_solicitacao: string;
  descricao: string;
  status: 'Aguardando' | 'Em Atendimento' | 'Resolvido';
  prioridade: 'Alta' | 'Normal' | 'Baixa';
  created_by_user_id?: string;
  updated_by_user_id?: string;
  created_at: string;
  updated_at: string;
  is_read?: boolean;
  archived_at?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'employee';
  avatar_url?: string;
  is_active: boolean;
  created_by_user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ConfiguracoesSystem {
  id: string;
  whatsapp_loja: string;
  catalogo_ativo: boolean;
  regras_precos: {
    cartao: RegraPreco;
    pix: RegraPreco;
    dinheiro: RegraPreco;
    oferta: RegraPreco;
  };
  updated_at: string;
  updated_by_user_id?: string;
}

export interface CarrinhoItem {
  produto: Produto;
  quantidade: number;
}

export type Periodo = 'hoje' | 'ontem' | '7dias' | 'semana' | 'mes' | 'personalizado';

export type ViewMode = 'table' | 'kanban';

export type TabType = 'atendimentos' | 'dashboard' | 'produtos' | 'clientes';

// ============================================
// CRM - TIPOS DE CLIENTE
// ============================================

export type SegmentoCliente = 'vip' | 'frequente' | 'ativo' | 'inativo' | 'novo';

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  cpf_cnpj?: string;
  nome_empresa?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  observacoes?: string;
  origem: 'manual' | 'whatsapp' | 'catalogo' | 'importacao';
  
  // Métricas (calculadas automaticamente)
  segmento: SegmentoCliente;
  total_gasto: number;
  total_pedidos: number;
  ticket_medio: number;
  primeira_compra?: string;
  ultima_compra?: string;
  
  created_at: string;
  updated_at: string;
}

export interface ClienteFormData {
  nome: string;
  telefone: string;
  email?: string;
  cpf_cnpj?: string;
  nome_empresa?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  observacoes?: string;
}

export interface ProdutoTopCliente {
  produto_nome: string;
  total_quantidade: number;
  total_pedidos: number;
  total_valor: number;
}

export interface ClienteComHistorico extends Cliente {
  pedidos: Pedido[];
  produtos_top: ProdutoTopCliente[];
}

export interface PedidoArquivado {
  id: string;
  pedido_id: string;
  numero_pedido: string;
  cliente: string;
  telefone: string;
  email: string;
  valor_total: number;
  status: string;
  observacoes: string;
  created_at: string;
  updated_at: string;
  archived_at: string;
  itens_json: ItemPedido[];
}
