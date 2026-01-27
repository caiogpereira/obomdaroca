-- =============================================================================
-- MIGRATION: Criar tabela de controle de Atendimento Humano Ativo
-- Data: 2026-01-27
-- Descrição: Permite desativar o agente IA quando um atendente humano assume
-- =============================================================================

-- Criar tabela de bloqueio do agente IA
CREATE TABLE IF NOT EXISTS agente_ia_bloqueio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telefone TEXT NOT NULL,
  cliente_nome TEXT,
  motivo TEXT DEFAULT 'atendimento_humano', -- 'atendimento_humano', 'reclamacao', 'vip_especial'
  
  -- Quem ativou o bloqueio
  ativado_por_user_id UUID,
  ativado_por_user_name TEXT,
  ativado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Timeout automático (1 hora por padrão)
  expira_em TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'),
  
  -- Controle
  ativo BOOLEAN DEFAULT TRUE,
  
  -- Histórico de desativação
  desativado_por_user_id UUID,
  desativado_por_user_name TEXT,
  desativado_em TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice único para telefone ativo (apenas um bloqueio ativo por telefone)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bloqueio_telefone_ativo 
ON agente_ia_bloqueio(telefone) 
WHERE ativo = true;

-- Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_bloqueio_telefone ON agente_ia_bloqueio(telefone);
CREATE INDEX IF NOT EXISTS idx_bloqueio_ativo ON agente_ia_bloqueio(ativo);

-- Habilitar RLS
ALTER TABLE agente_ia_bloqueio ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Permitir select em agente_ia_bloqueio" ON agente_ia_bloqueio
  FOR SELECT USING (true);

CREATE POLICY "Permitir insert em agente_ia_bloqueio" ON agente_ia_bloqueio
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir update em agente_ia_bloqueio" ON agente_ia_bloqueio
  FOR UPDATE USING (true);

CREATE POLICY "Permitir delete em agente_ia_bloqueio" ON agente_ia_bloqueio
  FOR DELETE USING (true);

-- =============================================================================
-- FUNÇÃO: Verificar se agente está bloqueado para um telefone
-- Usada pelo N8N para verificar antes de processar mensagem
-- =============================================================================
CREATE OR REPLACE FUNCTION verificar_agente_bloqueado(p_telefone TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_bloqueado BOOLEAN;
BEGIN
  -- Verificar se existe bloqueio ativo e não expirado
  SELECT EXISTS(
    SELECT 1 FROM agente_ia_bloqueio
    WHERE telefone = p_telefone
      AND ativo = true
      AND (expira_em IS NULL OR expira_em > NOW())
  ) INTO v_bloqueado;
  
  RETURN v_bloqueado;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNÇÃO: Ativar atendimento humano (desativar agente IA)
-- =============================================================================
CREATE OR REPLACE FUNCTION ativar_atendimento_humano(
  p_telefone TEXT,
  p_cliente_nome TEXT,
  p_user_id UUID,
  p_user_name TEXT,
  p_motivo TEXT DEFAULT 'atendimento_humano',
  p_duracao_horas INTEGER DEFAULT 1
)
RETURNS UUID AS $$
DECLARE
  v_bloqueio_id UUID;
BEGIN
  -- Desativar bloqueios anteriores para este telefone
  UPDATE agente_ia_bloqueio
  SET ativo = false,
      desativado_por_user_id = p_user_id,
      desativado_por_user_name = p_user_name,
      desativado_em = NOW(),
      updated_at = NOW()
  WHERE telefone = p_telefone AND ativo = true;
  
  -- Criar novo bloqueio
  INSERT INTO agente_ia_bloqueio (
    telefone,
    cliente_nome,
    motivo,
    ativado_por_user_id,
    ativado_por_user_name,
    ativado_em,
    expira_em,
    ativo
  ) VALUES (
    p_telefone,
    p_cliente_nome,
    p_motivo,
    p_user_id,
    p_user_name,
    NOW(),
    NOW() + (p_duracao_horas || ' hours')::INTERVAL,
    true
  )
  RETURNING id INTO v_bloqueio_id;
  
  RETURN v_bloqueio_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNÇÃO: Desativar atendimento humano (reativar agente IA)
-- =============================================================================
CREATE OR REPLACE FUNCTION desativar_atendimento_humano(
  p_telefone TEXT,
  p_user_id UUID,
  p_user_name TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE agente_ia_bloqueio
  SET ativo = false,
      desativado_por_user_id = p_user_id,
      desativado_por_user_name = p_user_name,
      desativado_em = NOW(),
      updated_at = NOW()
  WHERE telefone = p_telefone AND ativo = true;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNÇÃO: Obter status do agente para um telefone
-- =============================================================================
CREATE OR REPLACE FUNCTION get_status_agente(p_telefone TEXT)
RETURNS TABLE (
  bloqueado BOOLEAN,
  cliente_nome TEXT,
  motivo TEXT,
  ativado_por TEXT,
  ativado_em TIMESTAMP WITH TIME ZONE,
  expira_em TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true AS bloqueado,
    a.cliente_nome,
    a.motivo,
    a.ativado_por_user_name AS ativado_por,
    a.ativado_em,
    a.expira_em
  FROM agente_ia_bloqueio a
  WHERE a.telefone = p_telefone
    AND a.ativo = true
    AND (a.expira_em IS NULL OR a.expira_em > NOW())
  LIMIT 1;
  
  -- Se não encontrou, retorna false
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE, NULL::TIMESTAMP WITH TIME ZONE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- CRON JOB: Limpar bloqueios expirados (rodar a cada hora)
-- =============================================================================
-- Nota: Executar manualmente no Supabase Dashboard se pg_cron estiver disponível
-- SELECT cron.schedule('limpar-bloqueios-expirados', '0 * * * *', 
--   $$UPDATE agente_ia_bloqueio SET ativo = false, updated_at = NOW() WHERE ativo = true AND expira_em < NOW()$$
-- );
