-- =============================================================================
-- MIGRATION: Criar cliente automaticamente ao criar pedido
-- Data: 2026-01-22
-- =============================================================================

-- Função para criar ou vincular cliente ao pedido
CREATE OR REPLACE FUNCTION criar_ou_vincular_cliente_pedido()
RETURNS TRIGGER AS $$
DECLARE
  v_cliente_id UUID;
  v_telefone_normalizado TEXT;
BEGIN
  -- Normalizar telefone (remover caracteres não numéricos)
  v_telefone_normalizado := regexp_replace(NEW.telefone, '[^0-9]', '', 'g');
  
  -- Buscar cliente existente pelo telefone
  SELECT id INTO v_cliente_id
  FROM clientes
  WHERE regexp_replace(telefone, '[^0-9]', '', 'g') = v_telefone_normalizado
  LIMIT 1;
  
  -- Se cliente não existe, criar novo
  IF v_cliente_id IS NULL THEN
    INSERT INTO clientes (
      nome,
      nome_empresa,
      telefone,
      email,
      endereco,
      origem,
      segmento,
      total_pedidos,
      total_gasto,
      ticket_medio,
      primeira_compra,
      ultima_compra
    ) VALUES (
      NEW.cliente,
      NEW.nome_empresa,
      v_telefone_normalizado,
      NULLIF(NEW.email, ''),
      NEW.endereco,
      COALESCE(NEW.origem, 'catalogo'),
      'novo',
      0,
      0,
      0,
      NULL,
      NULL
    )
    RETURNING id INTO v_cliente_id;
  ELSE
    -- Atualizar dados do cliente existente (se houver novos dados)
    UPDATE clientes SET
      nome = COALESCE(NULLIF(NEW.cliente, ''), nome),
      nome_empresa = COALESCE(NULLIF(NEW.nome_empresa, ''), nome_empresa),
      email = COALESCE(NULLIF(NEW.email, ''), email),
      endereco = COALESCE(NULLIF(NEW.endereco, ''), endereco),
      updated_at = NOW()
    WHERE id = v_cliente_id;
  END IF;
  
  -- Vincular cliente ao pedido
  NEW.cliente_id := v_cliente_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger BEFORE INSERT para vincular cliente
DROP TRIGGER IF EXISTS trg_criar_vincular_cliente ON pedidos;
CREATE TRIGGER trg_criar_vincular_cliente
BEFORE INSERT ON pedidos
FOR EACH ROW
EXECUTE FUNCTION criar_ou_vincular_cliente_pedido();

-- Adicionar coluna nome_empresa na tabela clientes se não existir
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nome_empresa TEXT;

-- =============================================================================
-- CORREÇÃO: Vincular pedidos existentes aos clientes
-- =============================================================================
DO $$
DECLARE
  pedido_record RECORD;
  v_cliente_id UUID;
  v_telefone_normalizado TEXT;
BEGIN
  -- Para cada pedido sem cliente_id
  FOR pedido_record IN 
    SELECT id, cliente, nome_empresa, telefone, email, endereco, origem
    FROM pedidos 
    WHERE cliente_id IS NULL
  LOOP
    v_telefone_normalizado := regexp_replace(pedido_record.telefone, '[^0-9]', '', 'g');
    
    -- Buscar cliente existente
    SELECT id INTO v_cliente_id
    FROM clientes
    WHERE regexp_replace(telefone, '[^0-9]', '', 'g') = v_telefone_normalizado
    LIMIT 1;
    
    -- Se não existe, criar
    IF v_cliente_id IS NULL THEN
      INSERT INTO clientes (
        nome,
        nome_empresa,
        telefone,
        email,
        endereco,
        origem,
        segmento,
        total_pedidos,
        total_gasto,
        ticket_medio
      ) VALUES (
        pedido_record.cliente,
        pedido_record.nome_empresa,
        v_telefone_normalizado,
        NULLIF(pedido_record.email, ''),
        pedido_record.endereco,
        COALESCE(pedido_record.origem, 'catalogo'),
        'novo',
        0, 0, 0
      )
      RETURNING id INTO v_cliente_id;
    END IF;
    
    -- Vincular pedido ao cliente
    UPDATE pedidos SET cliente_id = v_cliente_id WHERE id = pedido_record.id;
  END LOOP;
END $$;

-- Recalcular métricas de todos os clientes
DO $$
DECLARE
  cliente_record RECORD;
BEGIN
  FOR cliente_record IN SELECT id FROM clientes LOOP
    PERFORM atualizar_metricas_cliente(cliente_record.id);
  END LOOP;
END $$;
