-- =============================================================================
-- MIGRATION: Adicionar status 'Pedido Separado' no Kanban e Histórico de Operador
-- Data: 2026-01-26
-- =============================================================================

-- Verificar e remover constraint antiga de status (se existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'pedidos_status_check'
  ) THEN
    ALTER TABLE pedidos DROP CONSTRAINT pedidos_status_check;
  END IF;
END $$;

-- Criar nova constraint com os 4 status
ALTER TABLE pedidos ADD CONSTRAINT pedidos_status_check 
CHECK (status = ANY (ARRAY['Novo'::text, 'Em Atendimento'::text, 'Pedido Separado'::text, 'Finalizado'::text]));

-- Atualizar a mesma constraint na tabela de arquivados (se necessário)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'pedidos_arquivados_status_check'
  ) THEN
    ALTER TABLE pedidos_arquivados DROP CONSTRAINT pedidos_arquivados_status_check;
  END IF;
END $$;

ALTER TABLE pedidos_arquivados ADD CONSTRAINT pedidos_arquivados_status_check 
CHECK (status = ANY (ARRAY['Novo'::text, 'Em Atendimento'::text, 'Pedido Separado'::text, 'Finalizado'::text]));

-- =============================================================================
-- HISTÓRICO DE OPERADOR
-- =============================================================================

-- Adicionar colunas de operador na tabela pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS updated_by_user_name TEXT;

-- Criar tabela de histórico de ações
CREATE TABLE IF NOT EXISTS historico_pedidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  acao TEXT NOT NULL,
  status_anterior TEXT,
  status_novo TEXT,
  operador_id UUID,
  operador_nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para busca rápida por pedido
CREATE INDEX IF NOT EXISTS idx_historico_pedidos_pedido_id ON historico_pedidos(pedido_id);

-- Habilitar RLS
ALTER TABLE historico_pedidos ENABLE ROW LEVEL SECURITY;

-- Policies para historico_pedidos
CREATE POLICY "Permitir select em historico_pedidos" ON historico_pedidos
  FOR SELECT USING (true);

CREATE POLICY "Permitir insert em historico_pedidos" ON historico_pedidos
  FOR INSERT WITH CHECK (true);

-- Criar índice para busca por operador
CREATE INDEX IF NOT EXISTS idx_historico_pedidos_operador_id ON historico_pedidos(operador_id);
