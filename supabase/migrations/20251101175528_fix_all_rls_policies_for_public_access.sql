/*
  # Fix All RLS Policies for Public Access

  ## Overview
  Updates RLS policies for all tables to allow operations via the anon key.
  This ensures the application works properly without authentication barriers.

  ## Changes
  
  ### Modified Tables
  - atendimentos: Allow public access
  - pedidos: Allow public access
  - pedidos_arquivados: Allow public access
  - itens_pedido: Allow public access
  - activity_logs: Allow public access
  - users: Allow public read access
  - configuracoes_sistema: Allow public access
  
  ## Security
  - RLS is maintained but policies are permissive
  - Allows full application functionality
  - Recommended to implement proper auth in production
*/

-- atendimentos
DROP POLICY IF EXISTS "Public can view atendimentos" ON atendimentos;
DROP POLICY IF EXISTS "Public can insert atendimentos" ON atendimentos;
DROP POLICY IF EXISTS "Public can update atendimentos" ON atendimentos;
DROP POLICY IF EXISTS "Public can delete atendimentos" ON atendimentos;

CREATE POLICY "Public can view atendimentos" ON atendimentos FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert atendimentos" ON atendimentos FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update atendimentos" ON atendimentos FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete atendimentos" ON atendimentos FOR DELETE TO public USING (true);

-- pedidos
DROP POLICY IF EXISTS "Public can view pedidos" ON pedidos;
DROP POLICY IF EXISTS "Public can insert pedidos" ON pedidos;
DROP POLICY IF EXISTS "Public can update pedidos" ON pedidos;
DROP POLICY IF EXISTS "Public can delete pedidos" ON pedidos;

CREATE POLICY "Public can view pedidos" ON pedidos FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert pedidos" ON pedidos FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update pedidos" ON pedidos FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete pedidos" ON pedidos FOR DELETE TO public USING (true);

-- pedidos_arquivados
DROP POLICY IF EXISTS "Public can view pedidos_arquivados" ON pedidos_arquivados;
DROP POLICY IF EXISTS "Public can insert pedidos_arquivados" ON pedidos_arquivados;
DROP POLICY IF EXISTS "Public can update pedidos_arquivados" ON pedidos_arquivados;
DROP POLICY IF EXISTS "Public can delete pedidos_arquivados" ON pedidos_arquivados;

CREATE POLICY "Public can view pedidos_arquivados" ON pedidos_arquivados FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert pedidos_arquivados" ON pedidos_arquivados FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update pedidos_arquivados" ON pedidos_arquivados FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete pedidos_arquivados" ON pedidos_arquivados FOR DELETE TO public USING (true);

-- itens_pedido
DROP POLICY IF EXISTS "Public can view itens_pedido" ON itens_pedido;
DROP POLICY IF EXISTS "Public can insert itens_pedido" ON itens_pedido;
DROP POLICY IF EXISTS "Public can update itens_pedido" ON itens_pedido;
DROP POLICY IF EXISTS "Public can delete itens_pedido" ON itens_pedido;

CREATE POLICY "Public can view itens_pedido" ON itens_pedido FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert itens_pedido" ON itens_pedido FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update itens_pedido" ON itens_pedido FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete itens_pedido" ON itens_pedido FOR DELETE TO public USING (true);

-- activity_logs
DROP POLICY IF EXISTS "Public can view activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "Public can insert activity_logs" ON activity_logs;

CREATE POLICY "Public can view activity_logs" ON activity_logs FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert activity_logs" ON activity_logs FOR INSERT TO public WITH CHECK (true);

-- users (read-only for public)
DROP POLICY IF EXISTS "Public can view users" ON users;

CREATE POLICY "Public can view users" ON users FOR SELECT TO public USING (true);

-- configuracoes_sistema
DROP POLICY IF EXISTS "Public can view configuracoes_sistema" ON configuracoes_sistema;
DROP POLICY IF EXISTS "Public can insert configuracoes_sistema" ON configuracoes_sistema;
DROP POLICY IF EXISTS "Public can update configuracoes_sistema" ON configuracoes_sistema;

CREATE POLICY "Public can view configuracoes_sistema" ON configuracoes_sistema FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert configuracoes_sistema" ON configuracoes_sistema FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can update configuracoes_sistema" ON configuracoes_sistema FOR UPDATE TO public USING (true) WITH CHECK (true);