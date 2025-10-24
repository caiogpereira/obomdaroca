/*
  # Add Discount, Notifications, and Archiving Features

  ## Overview
  Adds support for item-level discounts, notification tracking for atendimentos, 
  and archiving system for finalized orders.

  ## Changes to Existing Tables
  
  ### `itens_pedido`
  - Add `desconto_percentual` (decimal) - Discount percentage applied to item (0-100)
  - Add `preco_original` (decimal) - Original price before discount for tracking
  
  ### `atendimentos`
  - Add `is_read` (boolean) - Track if atendimento has been viewed
  - Add `archived_at` (timestamptz) - Timestamp when archived
  
  ## New Tables
  
  ### `pedidos_arquivados`
  - `id` (uuid, primary key) - Unique identifier
  - `pedido_id` (uuid, not null) - Original order ID
  - `numero_pedido` (text, not null) - Order number
  - `cliente` (text, not null) - Customer name
  - `telefone` (text, not null) - Customer phone
  - `email` (text) - Customer email
  - `valor_total` (decimal, not null) - Total order value
  - `status` (text, not null) - Final status at archiving
  - `observacoes` (text) - Order notes
  - `created_at` (timestamptz) - Original order creation date
  - `updated_at` (timestamptz) - Last update before archiving
  - `archived_at` (timestamptz) - When order was archived
  - `itens_json` (jsonb) - Snapshot of order items at archiving
  
  ## Security
  - Enable RLS on new tables
  - Add policies for authenticated users
  - Maintain existing security model
  
  ## Important Notes
  1. Discount is stored as percentage (0-100) for flexibility
  2. Orders are archived automatically at midnight for finalized status
  3. Archived orders retain complete historical data including items
  4. Read status helps manage notification badges
  5. All changes are backward compatible with existing data
*/

-- Add discount columns to itens_pedido
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'itens_pedido' AND column_name = 'desconto_percentual'
  ) THEN
    ALTER TABLE itens_pedido ADD COLUMN desconto_percentual decimal(5,2) DEFAULT 0 CHECK (desconto_percentual >= 0 AND desconto_percentual <= 100);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'itens_pedido' AND column_name = 'preco_original'
  ) THEN
    ALTER TABLE itens_pedido ADD COLUMN preco_original decimal(10,2);
  END IF;
END $$;

-- Add notification tracking to atendimentos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'atendimentos' AND column_name = 'is_read'
  ) THEN
    ALTER TABLE atendimentos ADD COLUMN is_read boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'atendimentos' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE atendimentos ADD COLUMN archived_at timestamptz;
  END IF;
END $$;

-- Create pedidos_arquivados table
CREATE TABLE IF NOT EXISTS pedidos_arquivados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL,
  numero_pedido text NOT NULL,
  cliente text NOT NULL,
  telefone text NOT NULL,
  email text,
  valor_total decimal(10,2) NOT NULL CHECK (valor_total >= 0),
  status text NOT NULL,
  observacoes text DEFAULT '',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  archived_at timestamptz DEFAULT now(),
  itens_json jsonb NOT NULL DEFAULT '[]'::jsonb
);

-- Create indexes for archived orders
CREATE INDEX IF NOT EXISTS idx_pedidos_arquivados_pedido_id ON pedidos_arquivados(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_arquivados_archived_at ON pedidos_arquivados(archived_at);
CREATE INDEX IF NOT EXISTS idx_pedidos_arquivados_created_at ON pedidos_arquivados(created_at);
CREATE INDEX IF NOT EXISTS idx_atendimentos_is_read ON atendimentos(is_read);

-- Enable RLS on pedidos_arquivados
ALTER TABLE pedidos_arquivados ENABLE ROW LEVEL SECURITY;

-- Policies for pedidos_arquivados
CREATE POLICY "Anyone can view archived orders"
  ON pedidos_arquivados FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert archived orders"
  ON pedidos_arquivados FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update archived orders"
  ON pedidos_arquivados FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete archived orders"
  ON pedidos_arquivados FOR DELETE
  TO authenticated
  USING (true);

-- Function to archive finalized orders
CREATE OR REPLACE FUNCTION archive_finalized_orders()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  pedido_record RECORD;
  itens_data jsonb;
BEGIN
  -- Loop through all finalized orders that haven't been archived yet
  FOR pedido_record IN 
    SELECT p.* FROM pedidos p
    WHERE p.status = 'Finalizado'
    AND p.updated_at < CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM pedidos_arquivados pa 
      WHERE pa.pedido_id = p.id
    )
  LOOP
    -- Get order items as JSON
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'produto_id', i.produto_id,
        'produto_nome', i.produto_nome,
        'quantidade', i.quantidade,
        'preco_unitario', i.preco_unitario,
        'desconto_percentual', COALESCE(i.desconto_percentual, 0),
        'preco_original', i.preco_original
      )
    ) INTO itens_data
    FROM itens_pedido i
    WHERE i.pedido_id = pedido_record.id;
    
    -- Insert into archived orders
    INSERT INTO pedidos_arquivados (
      pedido_id,
      numero_pedido,
      cliente,
      telefone,
      email,
      valor_total,
      status,
      observacoes,
      created_at,
      updated_at,
      itens_json
    ) VALUES (
      pedido_record.id,
      pedido_record.numero_pedido,
      pedido_record.cliente,
      pedido_record.telefone,
      pedido_record.email,
      pedido_record.valor_total,
      pedido_record.status,
      pedido_record.observacoes,
      pedido_record.created_at,
      pedido_record.updated_at,
      COALESCE(itens_data, '[]'::jsonb)
    );
    
    -- Delete items first (due to foreign key)
    DELETE FROM itens_pedido WHERE pedido_id = pedido_record.id;
    
    -- Delete the order
    DELETE FROM pedidos WHERE id = pedido_record.id;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION archive_finalized_orders() IS 'Archives finalized orders that were updated before today. Should be run daily at midnight.';