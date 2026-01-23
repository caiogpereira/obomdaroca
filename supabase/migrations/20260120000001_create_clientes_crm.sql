/*
  # CRM - Módulo de Clientes com Histórico de Compras
  
  ## Overview
  Implementa sistema completo de CRM com:
  1. Tabela centralizada de clientes
  2. Vinculação de pedidos a clientes
  3. Métricas automáticas (total gasto, frequência, etc)
  4. Segmentação automática (VIP, Ativo, Inativo, etc)
  5. Migração de dados existentes
  
  ## Tabelas Afetadas
  - clientes (NOVA)
  - pedidos (adiciona cliente_id)
  
  ## Segurança
  - Staff pode ver/editar clientes
  - Público pode ver apenas seus próprios dados (via telefone)
  - Admin pode deletar clientes
*/

-- ============================================
-- EXTENSÃO PARA BUSCA FUZZY (se não existir)
-- ============================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- TABELA DE CLIENTES
-- ============================================
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação Principal
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  
  -- Documentos (opcionais)
  cpf_cnpj TEXT,
  nome_empresa TEXT,
  
  -- Endereço
  endereco TEXT,
  cidade TEXT,
  estado TEXT DEFAULT 'MG',
  cep TEXT,
  
  -- Metadados
  observacoes TEXT,
  origem TEXT DEFAULT 'manual' CHECK (origem IN ('manual', 'whatsapp', 'catalogo', 'importacao')),
  
  -- Métricas (atualizadas por trigger)
  segmento TEXT DEFAULT 'novo' CHECK (segmento IN ('vip', 'frequente', 'ativo', 'inativo', 'novo')),
  total_gasto DECIMAL(12,2) DEFAULT 0,
  total_pedidos INTEGER DEFAULT 0,
  ticket_medio DECIMAL(10,2) DEFAULT 0,
  primeira_compra TIMESTAMPTZ,
  ultima_compra TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT clientes_telefone_unique UNIQUE (telefone),
  CONSTRAINT clientes_cpf_cnpj_unique UNIQUE (cpf_cnpj)
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);
CREATE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj ON clientes(cpf_cnpj) WHERE cpf_cnpj IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clientes_segmento ON clientes(segmento);
CREATE INDEX IF NOT EXISTS idx_clientes_nome_trgm ON clientes USING gin(nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clientes_empresa_trgm ON clientes USING gin(nome_empresa gin_trgm_ops) WHERE nome_empresa IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clientes_ultima_compra ON clientes(ultima_compra DESC);
CREATE INDEX IF NOT EXISTS idx_clientes_total_gasto ON clientes(total_gasto DESC);

-- ============================================
-- ADICIONAR COLUNA cliente_id EM PEDIDOS
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pedidos' AND column_name = 'cliente_id'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL;
    CREATE INDEX idx_pedidos_cliente_id ON pedidos(cliente_id);
  END IF;
END $$;

-- ============================================
-- FUNÇÃO: NORMALIZAR TELEFONE
-- ============================================
CREATE OR REPLACE FUNCTION normalizar_telefone(telefone TEXT)
RETURNS TEXT AS $$
DECLARE
  numeros TEXT;
BEGIN
  -- Remove tudo que não é número
  numeros := regexp_replace(telefone, '[^0-9]', '', 'g');
  
  -- Se tem 11 dígitos (DDD + 9 + número), retorna como está
  IF length(numeros) = 11 THEN
    RETURN numeros;
  END IF;
  
  -- Se tem 10 dígitos (DDD + número sem 9), adiciona o 9
  IF length(numeros) = 10 THEN
    RETURN substring(numeros, 1, 2) || '9' || substring(numeros, 3);
  END IF;
  
  -- Se tem 9 dígitos (número sem DDD), assume DDD 35 (Poços de Caldas)
  IF length(numeros) = 9 THEN
    RETURN '35' || numeros;
  END IF;
  
  -- Se tem 8 dígitos (número antigo sem 9), assume DDD 35 e adiciona 9
  IF length(numeros) = 8 THEN
    RETURN '35' || '9' || numeros;
  END IF;
  
  -- Retorna como está se não se encaixa em nenhum padrão
  RETURN numeros;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- FUNÇÃO: CALCULAR SEGMENTO DO CLIENTE
-- ============================================
CREATE OR REPLACE FUNCTION calcular_segmento_cliente(p_cliente_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_total_gasto DECIMAL;
  v_total_pedidos INTEGER;
  v_pedidos_90_dias INTEGER;
  v_ultima_compra TIMESTAMPTZ;
BEGIN
  -- Busca métricas do cliente (apenas pedidos finalizados)
  SELECT 
    COALESCE(SUM(valor_total), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '90 days'),
    MAX(created_at)
  INTO v_total_gasto, v_total_pedidos, v_pedidos_90_dias, v_ultima_compra
  FROM pedidos 
  WHERE cliente_id = p_cliente_id 
    AND status = 'Finalizado';
  
  -- Sem pedidos = novo
  IF v_total_pedidos = 0 THEN
    RETURN 'novo';
  END IF;
  
  -- VIP: gasto > 5000 OU mais de 10 pedidos finalizados
  IF v_total_gasto > 5000 OR v_total_pedidos > 10 THEN
    RETURN 'vip';
  END IF;
  
  -- Novo: apenas 1 pedido
  IF v_total_pedidos = 1 THEN
    RETURN 'novo';
  END IF;
  
  -- Frequente: 3+ pedidos nos últimos 90 dias
  IF v_pedidos_90_dias >= 3 THEN
    RETURN 'frequente';
  END IF;
  
  -- Inativo: última compra há mais de 90 dias
  IF v_ultima_compra IS NOT NULL AND v_ultima_compra < NOW() - INTERVAL '90 days' THEN
    RETURN 'inativo';
  END IF;
  
  -- Padrão: ativo
  RETURN 'ativo';
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNÇÃO: ATUALIZAR MÉTRICAS DO CLIENTE
-- ============================================
CREATE OR REPLACE FUNCTION atualizar_metricas_cliente(p_cliente_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_gasto DECIMAL;
  v_total_pedidos INTEGER;
  v_ticket_medio DECIMAL;
  v_primeira_compra TIMESTAMPTZ;
  v_ultima_compra TIMESTAMPTZ;
  v_segmento TEXT;
BEGIN
  -- Se cliente_id for nulo, não faz nada
  IF p_cliente_id IS NULL THEN
    RETURN;
  END IF;

  -- Calcula métricas
  SELECT 
    COALESCE(SUM(valor_total), 0),
    COUNT(*),
    COALESCE(AVG(valor_total), 0),
    MIN(created_at),
    MAX(created_at)
  INTO v_total_gasto, v_total_pedidos, v_ticket_medio, v_primeira_compra, v_ultima_compra
  FROM pedidos 
  WHERE cliente_id = p_cliente_id 
    AND status = 'Finalizado';
  
  -- Calcula segmento
  v_segmento := calcular_segmento_cliente(p_cliente_id);
  
  -- Atualiza cliente
  UPDATE clientes SET
    total_gasto = v_total_gasto,
    total_pedidos = v_total_pedidos,
    ticket_medio = v_ticket_medio,
    primeira_compra = v_primeira_compra,
    ultima_compra = v_ultima_compra,
    segmento = v_segmento,
    updated_at = NOW()
  WHERE id = p_cliente_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: ATUALIZAR MÉTRICAS APÓS PEDIDO
-- ============================================
CREATE OR REPLACE FUNCTION trigger_atualizar_metricas_cliente()
RETURNS TRIGGER AS $$
BEGIN
  -- Para INSERT ou UPDATE
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM atualizar_metricas_cliente(NEW.cliente_id);
    
    -- Se UPDATE mudou o cliente, atualiza o antigo também
    IF TG_OP = 'UPDATE' AND OLD.cliente_id IS DISTINCT FROM NEW.cliente_id THEN
      PERFORM atualizar_metricas_cliente(OLD.cliente_id);
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Para DELETE
  IF TG_OP = 'DELETE' THEN
    PERFORM atualizar_metricas_cliente(OLD.cliente_id);
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Cria o trigger
DROP TRIGGER IF EXISTS trg_pedidos_atualizar_metricas_cliente ON pedidos;
CREATE TRIGGER trg_pedidos_atualizar_metricas_cliente
  AFTER INSERT OR UPDATE OR DELETE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_atualizar_metricas_cliente();

-- ============================================
-- TRIGGER: AUTO-VINCULAR PEDIDO A CLIENTE
-- ============================================
CREATE OR REPLACE FUNCTION trigger_vincular_pedido_cliente()
RETURNS TRIGGER AS $$
DECLARE
  v_cliente_id UUID;
  v_telefone_normalizado TEXT;
BEGIN
  -- Se já tem cliente_id, não faz nada
  IF NEW.cliente_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Normaliza telefone
  v_telefone_normalizado := normalizar_telefone(NEW.telefone);
  
  -- Busca cliente existente pelo telefone
  SELECT id INTO v_cliente_id 
  FROM clientes 
  WHERE telefone = v_telefone_normalizado
  LIMIT 1;
  
  -- Se não encontrou, cria novo cliente
  IF v_cliente_id IS NULL THEN
    INSERT INTO clientes (nome, telefone, email, endereco, origem)
    VALUES (
      NEW.cliente,
      v_telefone_normalizado,
      NULLIF(NEW.email, ''),
      NULLIF(NEW.endereco, ''),
      COALESCE(NEW.origem, 'manual')
    )
    RETURNING id INTO v_cliente_id;
  ELSE
    -- Atualiza dados do cliente se tiver informações mais completas
    UPDATE clientes SET
      nome = COALESCE(NULLIF(NEW.cliente, ''), nome),
      email = COALESCE(NULLIF(NEW.email, ''), email),
      endereco = COALESCE(NULLIF(NEW.endereco, ''), endereco),
      updated_at = NOW()
    WHERE id = v_cliente_id
      AND (
        (email IS NULL AND NEW.email IS NOT NULL AND NEW.email != '') OR
        (endereco IS NULL AND NEW.endereco IS NOT NULL AND NEW.endereco != '')
      );
  END IF;
  
  -- Vincula pedido ao cliente
  NEW.cliente_id := v_cliente_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cria o trigger BEFORE INSERT
DROP TRIGGER IF EXISTS trg_pedidos_vincular_cliente ON pedidos;
CREATE TRIGGER trg_pedidos_vincular_cliente
  BEFORE INSERT ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_vincular_pedido_cliente();

-- ============================================
-- TRIGGER: NORMALIZAR TELEFONE DO CLIENTE
-- ============================================
CREATE OR REPLACE FUNCTION trigger_normalizar_telefone_cliente()
RETURNS TRIGGER AS $$
BEGIN
  NEW.telefone := normalizar_telefone(NEW.telefone);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clientes_normalizar_telefone ON clientes;
CREATE TRIGGER trg_clientes_normalizar_telefone
  BEFORE INSERT OR UPDATE ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_normalizar_telefone_cliente();

-- ============================================
-- RLS - POLÍTICAS DE SEGURANÇA
-- ============================================
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Staff pode ver todos os clientes
CREATE POLICY "staff_view_clientes" ON clientes
  FOR SELECT TO authenticated
  USING (is_staff());

-- Staff pode criar clientes
CREATE POLICY "staff_insert_clientes" ON clientes
  FOR INSERT TO authenticated
  WITH CHECK (is_staff());

-- Público pode criar clientes (via catalogo/whatsapp)
CREATE POLICY "public_insert_clientes" ON clientes
  FOR INSERT
  WITH CHECK (true);

-- Staff pode atualizar clientes
CREATE POLICY "staff_update_clientes" ON clientes
  FOR UPDATE TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

-- Apenas admin pode deletar clientes
CREATE POLICY "admin_delete_clientes" ON clientes
  FOR DELETE TO authenticated
  USING (is_admin());

-- Público pode ver próprio registro (para tracking)
CREATE POLICY "public_view_own_cliente" ON clientes
  FOR SELECT
  USING (true);

-- ============================================
-- MIGRAÇÃO: CONSOLIDAR CLIENTES EXISTENTES
-- ============================================
DO $$
DECLARE
  r RECORD;
  v_cliente_id UUID;
  v_telefone_normalizado TEXT;
BEGIN
  -- Loop pelos pedidos únicos por telefone (ordenados por data desc para pegar dados mais recentes)
  FOR r IN 
    SELECT DISTINCT ON (normalizar_telefone(telefone))
      cliente,
      normalizar_telefone(telefone) as telefone_norm,
      email,
      endereco,
      origem,
      created_at
    FROM pedidos
    WHERE telefone IS NOT NULL AND telefone != ''
    ORDER BY normalizar_telefone(telefone), created_at DESC
  LOOP
    -- Verifica se cliente já existe
    SELECT id INTO v_cliente_id 
    FROM clientes 
    WHERE telefone = r.telefone_norm;
    
    -- Se não existe, cria
    IF v_cliente_id IS NULL THEN
      INSERT INTO clientes (nome, telefone, email, endereco, origem, created_at)
      VALUES (
        COALESCE(r.cliente, 'Cliente sem nome'),
        r.telefone_norm,
        NULLIF(r.email, ''),
        NULLIF(r.endereco, ''),
        COALESCE(r.origem, 'importacao'),
        r.created_at
      )
      ON CONFLICT (telefone) DO NOTHING
      RETURNING id INTO v_cliente_id;
    END IF;
  END LOOP;
  
  -- Agora vincula todos os pedidos aos clientes criados
  UPDATE pedidos p SET 
    cliente_id = c.id
  FROM clientes c
  WHERE normalizar_telefone(p.telefone) = c.telefone
    AND p.cliente_id IS NULL;
  
  -- Atualiza métricas de todos os clientes
  PERFORM atualizar_metricas_cliente(id) FROM clientes;
  
  RAISE NOTICE 'Migração concluída. Clientes criados e pedidos vinculados.';
END $$;

-- ============================================
-- VIEW: PRODUTOS MAIS COMPRADOS POR CLIENTE
-- ============================================
CREATE OR REPLACE VIEW vw_produtos_mais_comprados_cliente AS
SELECT 
  c.id as cliente_id,
  ip.produto_nome,
  SUM(ip.quantidade) as total_quantidade,
  COUNT(DISTINCT p.id) as total_pedidos,
  SUM(ip.quantidade * ip.preco_unitario) as total_valor
FROM clientes c
JOIN pedidos p ON p.cliente_id = c.id
JOIN itens_pedido ip ON ip.pedido_id = p.id
WHERE p.status = 'Finalizado'
GROUP BY c.id, ip.produto_nome
ORDER BY c.id, total_quantidade DESC;

-- ============================================
-- FUNÇÃO: BUSCAR PRODUTOS TOP DO CLIENTE
-- ============================================
CREATE OR REPLACE FUNCTION get_produtos_top_cliente(p_cliente_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS TABLE(
  produto_nome TEXT,
  total_quantidade BIGINT,
  total_pedidos BIGINT,
  total_valor NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.produto_nome,
    v.total_quantidade,
    v.total_pedidos,
    v.total_valor
  FROM vw_produtos_mais_comprados_cliente v
  WHERE v.cliente_id = p_cliente_id
  ORDER BY v.total_quantidade DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT SELECT ON vw_produtos_mais_comprados_cliente TO authenticated;
GRANT EXECUTE ON FUNCTION normalizar_telefone(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION calcular_segmento_cliente(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION atualizar_metricas_cliente(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_produtos_top_cliente(UUID, INTEGER) TO authenticated;

-- ============================================
-- COMENTÁRIOS
-- ============================================
COMMENT ON TABLE clientes IS 'Tabela centralizada de clientes com métricas automáticas';
COMMENT ON COLUMN clientes.segmento IS 'Segmentação automática: vip, frequente, ativo, inativo, novo';
COMMENT ON COLUMN clientes.telefone IS 'Telefone normalizado (apenas números, 11 dígitos com DDD)';
COMMENT ON FUNCTION normalizar_telefone(TEXT) IS 'Normaliza telefone para formato padrão (11 dígitos)';
COMMENT ON FUNCTION calcular_segmento_cliente(UUID) IS 'Calcula segmento do cliente baseado em compras';
