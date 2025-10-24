export interface Metric {
  label: string;
  value: string | number;
  change?: number;
  icon: string;
}

export interface Pedido {
  id: string;
  numero_pedido: string;
  cliente: string;
  telefone: string;
  email: string;
  valor_total: number;
  status: 'Novo' | 'Em Atendimento' | 'Finalizado';
  itens: ItemPedido[];
  observacoes: string;
  created_at: string;
  updated_at: string;
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
  preco: number;
  subcategoria_id?: string;
  subcategoria?: Categoria;
  created_at?: string;
  updated_at?: string;
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
  created_at: string;
  updated_at: string;
  is_read?: boolean;
  archived_at?: string;
}

export type Periodo = 'hoje' | 'ontem' | '7dias' | 'semana' | 'mes' | 'personalizado';

export type ViewMode = 'table' | 'kanban';

export type TabType = 'atendimentos' | 'dashboard' | 'produtos';

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
