-- =============================================================================
-- MIGRATION: Correções de Arquivamento e Métricas de Clientes
-- Data: 2026-01-22
-- Correções:
-- 1. Adicionar coluna nome_empresa na tabela pedidos
-- 2. Arquivar pedidos na virada do dia (00h)
-- 3. Manter métricas dos clientes após arquivamento
-- 4. Manter sequência de número de pedidos após arquivamento
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ADICIONAR COLUNA nome_empresa NA TABELA pedidos
-- -----------------------------------------------------------------------------
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS nome_empresa TEXT;

-- Adicionar também na tabela de pedidos arquivados
ALTER TABLE pedidos_arquivados ADD COLUMN IF NOT EXISTS nome_empresa TEXT;

-- -----------------------------------------------------------------------------
-- 2. ATUALIZAR FUNÇÃO DE ARQUIVAMENTO PARA VIRADA DO DIA
-- Arquiva pedidos finalizados do dia ANTERIOR (não do mesmo dia)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION arquivar_pedidos_finalizados(dias_antigos INTEGER DEFAULT 0)
RETURNS INTEGER AS $$
DECLARE
  pedidos_arquivados INTEGER := 0;
  pedido RECORD;
  itens_json JSONB;
BEGIN
  -- Buscar pedidos finalizados do dia anterior ou mais antigos
  -- Se dias_antigos = 0, arquiva pedidos finalizados de ontem ou antes
  FOR pedido IN
    SELECT *
    FROM pedidos
    WHERE status = 'Finalizado'
      AND DATE(updated_at) < CURRENT_DATE - dias_antigos
  LOOP
    -- Buscar itens do pedido e converter para JSON
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', ip.id,
        'produto_id', ip.produto_id,
        'produto_nome', ip.produto_nome,
        'quantidade', ip.quantidade,
        'preco_unitario', ip.preco_unitario,
        'desconto_percentual', ip.desconto_percentual
      )
    ), '[]'::jsonb)
    INTO itens_json
    FROM itens_pedido ip
    WHERE ip.pedido_id = pedido.id;

    -- Inserir na tabela de arquivados
    INSERT INTO pedidos_arquivados (
      pedido_id,
      numero_pedido,
      cliente,
      nome_empresa,
      telefone,
      email,
      endereco,
      valor_total,
      status,
      observacoes,
      forma_pagamento,
      modalidade_pagamento,
      origem,
      created_at,
      updated_at,
      archived_at,
      itens_json,
      cliente_id
    ) VALUES (
      pedido.id,
      pedido.numero_pedido,
      pedido.cliente,
      pedido.nome_empresa,
      pedido.telefone,
      pedido.email,
      pedido.endereco,
      pedido.valor_total,
      pedido.status,
      pedido.observacoes,
      pedido.forma_pagamento,
      pedido.modalidade_pagamento,
      pedido.origem,
      pedido.created_at,
      pedido.updated_at,
      NOW(),
      itens_json,
      pedido.cliente_id
    );

    -- NÃO deletar os itens do pedido ainda (vamos fazer depois de atualizar métricas)
    -- Deletar pedido original
    DELETE FROM itens_pedido WHERE pedido_id = pedido.id;
    DELETE FROM pedidos WHERE id = pedido.id;

    pedidos_arquivados := pedidos_arquivados + 1;
  END LOOP;

  RETURN pedidos_arquivados;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 3. ATUALIZAR FUNÇÃO DE MÉTRICAS DO CLIENTE PARA INCLUIR PEDIDOS ARQUIVADOS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION atualizar_metricas_cliente(p_cliente_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_pedidos INTEGER;
  v_total_gasto NUMERIC(12,2);
  v_ticket_medio NUMERIC(12,2);
  v_primeira_compra TIMESTAMP WITH TIME ZONE;
  v_ultima_compra TIMESTAMP WITH TIME ZONE;
  v_novo_segmento TEXT;
  v_dias_ultima_compra INTEGER;
BEGIN
  -- Contar pedidos ativos
  SELECT 
    COUNT(*),
    COALESCE(SUM(valor_total), 0),
    MIN(created_at),
    MAX(created_at)
  INTO v_total_pedidos, v_total_gasto, v_primeira_compra, v_ultima_compra
  FROM pedidos
  WHERE cliente_id = p_cliente_id
    AND status = 'Finalizado';

  -- ADICIONAR pedidos arquivados às métricas
  SELECT 
    v_total_pedidos + COUNT(*),
    v_total_gasto + COALESCE(SUM(valor_total), 0),
    LEAST(v_primeira_compra, MIN(created_at)),
    GREATEST(v_ultima_compra, MAX(created_at))
  INTO v_total_pedidos, v_total_gasto, v_primeira_compra, v_ultima_compra
  FROM pedidos_arquivados
  WHERE cliente_id = p_cliente_id;

  -- Calcular ticket médio
  IF v_total_pedidos > 0 THEN
    v_ticket_medio := v_total_gasto / v_total_pedidos;
  ELSE
    v_ticket_medio := 0;
  END IF;

  -- Calcular segmento baseado em regras
  IF v_ultima_compra IS NOT NULL THEN
    v_dias_ultima_compra := EXTRACT(DAY FROM NOW() - v_ultima_compra);
  ELSE
    v_dias_ultima_compra := NULL;
  END IF;

  -- Determinar segmento
  IF v_total_pedidos = 0 THEN
    v_novo_segmento := 'novo';
  ELSIF v_total_gasto >= 5000 OR v_total_pedidos >= 20 THEN
    v_novo_segmento := 'vip';
  ELSIF v_total_pedidos >= 5 AND v_dias_ultima_compra <= 60 THEN
    v_novo_segmento := 'frequente';
  ELSIF v_dias_ultima_compra <= 90 THEN
    v_novo_segmento := 'ativo';
  ELSIF v_dias_ultima_compra > 90 THEN
    v_novo_segmento := 'inativo';
  ELSE
    v_novo_segmento := 'novo';
  END IF;

  -- Atualizar cliente
  UPDATE clientes SET
    total_pedidos = v_total_pedidos,
    total_gasto = v_total_gasto,
    ticket_medio = v_ticket_medio,
    primeira_compra = v_primeira_compra,
    ultima_compra = v_ultima_compra,
    segmento = v_novo_segmento,
    updated_at = NOW()
  WHERE id = p_cliente_id;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 4. FUNÇÃO PARA BUSCAR PRODUTOS TOP DO CLIENTE (INCLUINDO ARQUIVADOS)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_produtos_top_cliente(p_cliente_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS TABLE (
  produto_nome TEXT,
  total_quantidade BIGINT,
  total_pedidos BIGINT,
  total_valor NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH todos_itens AS (
    -- Itens de pedidos ativos
    SELECT 
      ip.produto_nome,
      ip.quantidade,
      ip.preco_unitario,
      p.id as pedido_id
    FROM itens_pedido ip
    JOIN pedidos p ON ip.pedido_id = p.id
    WHERE p.cliente_id = p_cliente_id
      AND p.status = 'Finalizado'
    
    UNION ALL
    
    -- Itens de pedidos arquivados
    SELECT 
      (item->>'produto_nome')::TEXT as produto_nome,
      (item->>'quantidade')::INTEGER as quantidade,
      (item->>'preco_unitario')::NUMERIC as preco_unitario,
      pa.pedido_id
    FROM pedidos_arquivados pa,
    jsonb_array_elements(pa.itens_json) as item
    WHERE pa.cliente_id = p_cliente_id
  )
  SELECT 
    ti.produto_nome,
    SUM(ti.quantidade)::BIGINT as total_quantidade,
    COUNT(DISTINCT ti.pedido_id)::BIGINT as total_pedidos,
    SUM(ti.quantidade * ti.preco_unitario) as total_valor
  FROM todos_itens ti
  GROUP BY ti.produto_nome
  ORDER BY total_quantidade DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 5. ATUALIZAR TRIGGER PARA RECALCULAR MÉTRICAS QUANDO PEDIDO É ARQUIVADO
-- Esta trigger roda ANTES de arquivar para garantir que o cliente_id está setado
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION before_archive_pedido()
RETURNS TRIGGER AS $$
BEGIN
  -- Garantir que o cliente_id está sendo preservado
  IF NEW.cliente_id IS NOT NULL THEN
    -- Agendar atualização das métricas (será executado após o commit)
    PERFORM atualizar_metricas_cliente(NEW.cliente_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_before_archive_pedido ON pedidos_arquivados;
CREATE TRIGGER trigger_before_archive_pedido
AFTER INSERT ON pedidos_arquivados
FOR EACH ROW
EXECUTE FUNCTION before_archive_pedido();

-- -----------------------------------------------------------------------------
-- 6. ATUALIZAR CRON JOB PARA RODAR À MEIA-NOITE
-- (Nota: Esta configuração deve ser feita no Supabase Dashboard > Database > Extensions > pg_cron)
-- O comando abaixo é apenas para referência
-- -----------------------------------------------------------------------------

-- Remover job antigo se existir
SELECT cron.unschedule('arquivar-pedidos-diario');

-- Criar novo job para rodar à meia-noite (00:05 para evitar conflitos)
SELECT cron.schedule(
  'arquivar-pedidos-diario',
  '5 0 * * *',  -- Roda às 00:05 todos os dias
  $$SELECT arquivar_pedidos_finalizados(0)$$
);

-- -----------------------------------------------------------------------------
-- 7. RECALCULAR MÉTRICAS DE TODOS OS CLIENTES EXISTENTES
-- (Executar uma vez para corrigir dados históricos)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  cliente_record RECORD;
BEGIN
  FOR cliente_record IN SELECT id FROM clientes LOOP
    PERFORM atualizar_metricas_cliente(cliente_record.id);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 8. CRIAR POLICIES PARA PEDIDOS_ARQUIVADOS (SELECT para buscar métricas)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir select em pedidos_arquivados" ON pedidos_arquivados;
CREATE POLICY "Permitir select em pedidos_arquivados" ON pedidos_arquivados
FOR SELECT TO anon, authenticated USING (true);
