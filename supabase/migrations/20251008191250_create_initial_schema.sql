/*
  # Create Initial Database Schema for O Bom da Roça

  ## Overview
  Creates the complete database structure for managing orders, order items, products, and categories.

  ## New Tables
  
  ### `categorias`
  - `id` (uuid, primary key) - Unique identifier for category
  - `nome` (text, not null) - Category name
  - `created_at` (timestamptz) - Record creation timestamp
  
  ### `produtos`
  - `id` (uuid, primary key) - Unique identifier for product
  - `codigo` (text, unique, not null) - Product code/SKU
  - `nome` (text, not null) - Product name
  - `preco` (decimal, not null) - Product price
  - `subcategoria_id` (uuid, foreign key) - Reference to category
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record last update timestamp
  
  ### `pedidos`
  - `id` (uuid, primary key) - Unique identifier for order
  - `numero_pedido` (text, unique, not null) - Order number (e.g., #001)
  - `cliente` (text, not null) - Customer name
  - `telefone` (text, not null) - Customer phone
  - `email` (text) - Customer email
  - `valor_total` (decimal, not null) - Total order value
  - `status` (text, not null) - Order status: 'Novo', 'Em Atendimento', 'Finalizado'
  - `observacoes` (text) - Order notes
  - `created_at` (timestamptz) - Order creation timestamp
  - `updated_at` (timestamptz) - Order last update timestamp
  
  ### `itens_pedido`
  - `id` (uuid, primary key) - Unique identifier for order item
  - `pedido_id` (uuid, foreign key) - Reference to order
  - `produto_id` (uuid, foreign key) - Reference to product
  - `produto_nome` (text, not null) - Product name snapshot
  - `quantidade` (integer, not null) - Item quantity
  - `preco_unitario` (decimal, not null) - Unit price at time of order
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users to perform CRUD operations
  - Public read access for products and categories (for public catalog)
  
  ## Important Notes
  1. All tables use UUID for primary keys with automatic generation
  2. Timestamps are automatically managed with default values
  3. Foreign key constraints ensure data integrity
  4. Product name is denormalized in itens_pedido to preserve historical data
  5. Prices are stored as decimal(10,2) for accurate monetary calculations
*/

-- Create categorias table
CREATE TABLE IF NOT EXISTS categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create produtos table
CREATE TABLE IF NOT EXISTS produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  nome text NOT NULL,
  preco decimal(10,2) NOT NULL CHECK (preco >= 0),
  subcategoria_id uuid REFERENCES categorias(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create pedidos table
CREATE TABLE IF NOT EXISTS pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido text UNIQUE NOT NULL,
  cliente text NOT NULL,
  telefone text NOT NULL,
  email text,
  valor_total decimal(10,2) NOT NULL CHECK (valor_total >= 0),
  status text NOT NULL CHECK (status IN ('Novo', 'Em Atendimento', 'Finalizado')),
  observacoes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create itens_pedido table
CREATE TABLE IF NOT EXISTS itens_pedido (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES produtos(id) ON DELETE SET NULL,
  produto_nome text NOT NULL,
  quantidade integer NOT NULL CHECK (quantidade > 0),
  preco_unitario decimal(10,2) NOT NULL CHECK (preco_unitario >= 0),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_produtos_subcategoria ON produtos(subcategoria_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON pedidos(created_at);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido_id ON itens_pedido(pedido_id);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_produto_id ON itens_pedido(produto_id);

-- Enable Row Level Security
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_pedido ENABLE ROW LEVEL SECURITY;

-- Policies for categorias - public read, authenticated write
CREATE POLICY "Anyone can view categories"
  ON categorias FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert categories"
  ON categorias FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON categorias FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete categories"
  ON categorias FOR DELETE
  TO authenticated
  USING (true);

-- Policies for produtos - public read, authenticated write
CREATE POLICY "Anyone can view products"
  ON produtos FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON produtos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON produtos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete products"
  ON produtos FOR DELETE
  TO authenticated
  USING (true);

-- Policies for pedidos - public read (for order tracking), authenticated write
CREATE POLICY "Anyone can view orders"
  ON pedidos FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert orders"
  ON pedidos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update orders"
  ON pedidos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete orders"
  ON pedidos FOR DELETE
  TO authenticated
  USING (true);

-- Policies for itens_pedido - public read, authenticated write
CREATE POLICY "Anyone can view order items"
  ON itens_pedido FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert order items"
  ON itens_pedido FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update order items"
  ON itens_pedido FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete order items"
  ON itens_pedido FOR DELETE
  TO authenticated
  USING (true);

-- Insert default categories
INSERT INTO categorias (nome) VALUES
  ('Bebidas'),
  ('Laticínios'),
  ('Doces'),
  ('Embutidos'),
  ('Panificados'),
  ('Grãos e Farinhas'),
  ('Outros')
ON CONFLICT DO NOTHING;