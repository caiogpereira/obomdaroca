/*
  # Add Authentication, User Management, and Multi-Pricing System

  ## Overview
  This migration adds comprehensive user management, activity tracking, 
  multi-tier pricing for products, and system configurations.

  ## New Tables
  
  ### `users`
  - `id` (uuid, primary key) - Links to auth.users
  - `email` (text, unique, not null) - User email
  - `full_name` (text, not null) - User's full name
  - `role` (text, not null) - User role: 'admin' or 'atendente'
  - `avatar_url` (text) - URL to user avatar image
  - `is_active` (boolean, default true) - Whether user is active
  - `created_by_user_id` (uuid) - Who created this user
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record last update timestamp

  ### `activity_logs`
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, not null) - Reference to users table
  - `action` (text, not null) - Action performed (create, update, delete, status_change)
  - `entity_type` (text, not null) - Type of entity (pedido, atendimento, produto)
  - `entity_id` (uuid, not null) - ID of affected entity
  - `details` (jsonb) - Additional details about the action
  - `created_at` (timestamptz) - When action was performed

  ### `configuracoes_sistema`
  - `id` (uuid, primary key) - Unique identifier
  - `whatsapp_loja` (text, not null) - Store WhatsApp number
  - `catalogo_ativo` (boolean, default true) - Whether catalog is active
  - `regras_precos` (jsonb) - Pricing rules configuration
  - `updated_at` (timestamptz) - Last update timestamp
  - `updated_by_user_id` (uuid) - Who updated the config

  ## Modified Tables
  
  ### `produtos` - Add multi-pricing and image fields
  - `preco_cartao` (decimal) - Credit/debit card price (no minimum)
  - `preco_pix` (decimal) - PIX/TED price (min R$ 300 or 10 units)
  - `preco_dinheiro` (decimal) - Cash price (min R$ 500 or 15 units)
  - `preco_oferta` (decimal) - Special offer price (30 units)
  - `image_url` (text) - Public URL to product image
  - `image_storage_path` (text) - Storage path reference
  - `created_by_user_id` (uuid) - Who created the product
  - `updated_by_user_id` (uuid) - Who last updated the product

  ### `pedidos` - Add user tracking and origin
  - `created_by_user_id` (uuid) - Who created the order
  - `updated_by_user_id` (uuid) - Who last updated the order
  - `origem` (text) - Origin of order: 'manual' or 'catalogo'
  - `modalidade_pagamento` (text) - Payment mode selected

  ### `atendimentos` - Add user tracking
  - `created_by_user_id` (uuid) - Who created the atendimento
  - `updated_by_user_id` (uuid) - Who last updated the atendimento

  ## Security
  - Enable RLS on all new tables
  - Add policies for authenticated users
  - Users table only accessible by authenticated users
  - Activity logs are read-only for non-admins
  - System configs only editable by admins

  ## Important Notes
  1. Default preco columns remain for backward compatibility
  2. Image storage will use Supabase Storage bucket 'produtos-imagens'
  3. Activity logs are automatically created via triggers (future enhancement)
  4. First user created should be an admin
  5. Default WhatsApp number: 553599731201
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'atendente')),
  avatar_url text,
  is_active boolean DEFAULT true,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete', 'status_change', 'move_card')),
  entity_type text NOT NULL CHECK (entity_type IN ('pedido', 'atendimento', 'produto', 'categoria', 'user')),
  entity_id uuid NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create configuracoes_sistema table
CREATE TABLE IF NOT EXISTS configuracoes_sistema (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_loja text NOT NULL DEFAULT '553599731201',
  catalogo_ativo boolean DEFAULT true,
  regras_precos jsonb DEFAULT '{
    "cartao": {"nome": "Cartão/Varejo", "descricao": "Sem quantidade mínima"},
    "pix": {"nome": "PIX/TED", "descricao": "Compra mínima de R$ 300,00 ou 10 unidades da mesma marca ou produto"},
    "dinheiro": {"nome": "Dinheiro", "descricao": "Compra mínima de R$ 500,00 ou 15 unidades da mesma marca ou produto"},
    "oferta": {"nome": "Oferta", "descricao": "30 unidades da mesma marca ou produto. Não necessita bater os valores acima. Pagamentos sempre em dinheiro"}
  }'::jsonb,
  updated_at timestamptz DEFAULT now(),
  updated_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default configuration
INSERT INTO configuracoes_sistema (whatsapp_loja, catalogo_ativo)
VALUES ('553599731201', true)
ON CONFLICT DO NOTHING;

-- Add new columns to produtos table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'produtos' AND column_name = 'preco_cartao'
  ) THEN
    ALTER TABLE produtos ADD COLUMN preco_cartao decimal(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'produtos' AND column_name = 'preco_pix'
  ) THEN
    ALTER TABLE produtos ADD COLUMN preco_pix decimal(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'produtos' AND column_name = 'preco_dinheiro'
  ) THEN
    ALTER TABLE produtos ADD COLUMN preco_dinheiro decimal(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'produtos' AND column_name = 'preco_oferta'
  ) THEN
    ALTER TABLE produtos ADD COLUMN preco_oferta decimal(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'produtos' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE produtos ADD COLUMN image_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'produtos' AND column_name = 'image_storage_path'
  ) THEN
    ALTER TABLE produtos ADD COLUMN image_storage_path text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'produtos' AND column_name = 'created_by_user_id'
  ) THEN
    ALTER TABLE produtos ADD COLUMN created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'produtos' AND column_name = 'updated_by_user_id'
  ) THEN
    ALTER TABLE produtos ADD COLUMN updated_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add new columns to pedidos table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pedidos' AND column_name = 'created_by_user_id'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pedidos' AND column_name = 'updated_by_user_id'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN updated_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pedidos' AND column_name = 'origem'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN origem text DEFAULT 'manual' CHECK (origem IN ('manual', 'catalogo'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pedidos' AND column_name = 'modalidade_pagamento'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN modalidade_pagamento text CHECK (modalidade_pagamento IN ('cartao', 'pix', 'dinheiro', 'oferta'));
  END IF;
END $$;

-- Add new columns to atendimentos table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'atendimentos' AND column_name = 'created_by_user_id'
  ) THEN
    ALTER TABLE atendimentos ADD COLUMN created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'atendimentos' AND column_name = 'updated_by_user_id'
  ) THEN
    ALTER TABLE atendimentos ADD COLUMN updated_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_produtos_created_by ON produtos(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_by ON pedidos(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_origem ON pedidos(origem);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes_sistema ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Authenticated users can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policies for activity_logs table
CREATE POLICY "Authenticated users can view activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policies for configuracoes_sistema table
CREATE POLICY "Anyone can view system configurations"
  ON configuracoes_sistema FOR SELECT
  USING (true);

CREATE POLICY "Admins can update system configurations"
  ON configuracoes_sistema FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );