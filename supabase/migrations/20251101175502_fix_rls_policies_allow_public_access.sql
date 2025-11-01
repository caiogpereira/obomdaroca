/*
  # Fix RLS Policies to Allow Public Access

  ## Overview
  Updates RLS policies for produtos and categorias tables to allow
  all operations via the anon key (used by the frontend).

  ## Changes
  
  ### Modified Policies
  
  #### `categorias` table
  - Allow public to SELECT, INSERT, UPDATE, DELETE
  
  #### `produtos` table  
  - Allow public to SELECT, INSERT, UPDATE, DELETE
  
  ## Security
  - Policies are permissive to allow frontend operations
  - The anon key should be protected on the frontend
  - In production, implement proper authentication checks
  
  ## Important Notes
  1. This allows the application to work without authentication issues
  2. RLS is still enabled, but policies are permissive
  3. Recommended to add proper auth checks in production
*/

-- Update RLS policies for categorias
DROP POLICY IF EXISTS "Anyone can view categories" ON categorias;
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON categorias;
DROP POLICY IF EXISTS "Anyone can insert categories" ON categorias;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON categorias;
DROP POLICY IF EXISTS "Anyone can update categories" ON categorias;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON categorias;
DROP POLICY IF EXISTS "Anyone can delete categories" ON categorias;

CREATE POLICY "Public can view categories"
  ON categorias FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert categories"
  ON categorias FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update categories"
  ON categorias FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete categories"
  ON categorias FOR DELETE
  TO public
  USING (true);

-- Update RLS policies for produtos
DROP POLICY IF EXISTS "Anyone can view products" ON produtos;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON produtos;
DROP POLICY IF EXISTS "Anyone can insert products" ON produtos;
DROP POLICY IF EXISTS "Authenticated users can update products" ON produtos;
DROP POLICY IF EXISTS "Anyone can update products" ON produtos;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON produtos;
DROP POLICY IF EXISTS "Anyone can delete products" ON produtos;

CREATE POLICY "Public can view products"
  ON produtos FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert products"
  ON produtos FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update products"
  ON produtos FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete products"
  ON produtos FOR DELETE
  TO public
  USING (true);