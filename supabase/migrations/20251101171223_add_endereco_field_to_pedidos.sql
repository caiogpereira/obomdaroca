/*
  # Add Endereco Field to Pedidos Table

  ## Overview
  Adds a delivery address field to the pedidos table to support catalog orders
  that need to capture customer delivery information.

  ## Changes
  
  ### Modified Tables
  
  #### `pedidos`
  - `endereco` (text) - Customer delivery address
    - Nullable to maintain compatibility with existing orders
    - Will be populated for orders from the catalog

  ## Security
  - Update RLS policies to allow public insert for catalog orders
  - Maintain existing policies for authenticated operations
  
  ## Important Notes
  1. Field is nullable for backward compatibility
  2. Will be required for new catalog orders
  3. Public insert policy allows unauthenticated users to create orders from catalog
*/

-- Add endereco column to pedidos table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pedidos' AND column_name = 'endereco'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN endereco text;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_pedidos_endereco ON pedidos(endereco);

-- Drop existing insert policy for pedidos to recreate it with public access
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON pedidos;

-- Create new policy allowing public inserts (for catalog orders)
CREATE POLICY "Anyone can insert orders"
  ON pedidos FOR INSERT
  WITH CHECK (true);

-- Drop existing insert policy for itens_pedido to recreate it with public access
DROP POLICY IF EXISTS "Authenticated users can insert order items" ON itens_pedido;

-- Create new policy allowing public inserts (for catalog order items)
CREATE POLICY "Anyone can insert order items"
  ON itens_pedido FOR INSERT
  WITH CHECK (true);