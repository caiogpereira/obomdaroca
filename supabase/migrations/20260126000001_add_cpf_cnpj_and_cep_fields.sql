-- =============================================================================
-- MIGRATION: Adicionar campos CPF/CNPJ e CEP na tabela pedidos
-- Data: 2026-01-26
-- =============================================================================

-- Adicionar coluna cpf_cnpj na tabela pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;

-- Adicionar coluna cep na tabela pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cep TEXT;

-- Adicionar as mesmas colunas na tabela pedidos_arquivados
ALTER TABLE pedidos_arquivados ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;
ALTER TABLE pedidos_arquivados ADD COLUMN IF NOT EXISTS cep TEXT;

-- Atualizar a função de criar/vincular cliente para usar CPF/CNPJ como identificador principal
CREATE OR REPLACE FUNCTION criar_ou_vincular_cliente_pedido()
RETURNS TRIGGER AS $$
DECLARE
  v_cliente_id UUID;
  v_telefone_normalizado TEXT;
  v_cpf_cnpj_normalizado TEXT;
BEGIN
  -- Normalizar telefone (remover caracteres não numéricos)
  v_telefone_normalizado := regexp_replace(NEW.telefone, '[^0-9]', '', 'g');
  
  -- Normalizar CPF/CNPJ
  v_cpf_cnpj_normalizado := regexp_replace(COALESCE(NEW.cpf_cnpj, ''), '[^0-9]', '', 'g');
  
  -- Buscar cliente existente pelo CPF/CNPJ primeiro (se fornecido)
  IF v_cpf_cnpj_normalizado != '' AND LENGTH(v_cpf_cnpj_normalizado) >= 11 THEN
    SELECT id INTO v_cliente_id
    FROM clientes
    WHERE regexp_replace(COALESCE(cpf_cnpj, ''), '[^0-9]', '', 'g') = v_cpf_cnpj_normalizado
    LIMIT 1;
  END IF;
  
  -- Se não encontrou por CPF/CNPJ, buscar por telefone
  IF v_cliente_id IS NULL THEN
    SELECT id INTO v_cliente_id
    FROM clientes
    WHERE regexp_replace(telefone, '[^0-9]', '', 'g') = v_telefone_normalizado
    LIMIT 1;
  END IF;
  
  -- Se cliente não existe, criar novo
  IF v_cliente_id IS NULL THEN
    INSERT INTO clientes (
      nome,
      nome_empresa,
      cpf_cnpj,
      telefone,
      email,
      cep,
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
      NULLIF(v_cpf_cnpj_normalizado, ''),
      v_telefone_normalizado,
      NULLIF(NEW.email, ''),
      NEW.cep,
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
      cpf_cnpj = COALESCE(NULLIF(v_cpf_cnpj_normalizado, ''), cpf_cnpj),
      email = COALESCE(NULLIF(NEW.email, ''), email),
      cep = COALESCE(NULLIF(NEW.cep, ''), cep),
      endereco = COALESCE(NULLIF(NEW.endereco, ''), endereco),
      updated_at = NOW()
    WHERE id = v_cliente_id;
  END IF;
  
  -- Vincular cliente ao pedido
  NEW.cliente_id := v_cliente_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
