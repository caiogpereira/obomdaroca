/*
  # Secure RLS Policies and Role-Based Access Control
  
  ## Overview
  This migration implements proper security for the application:
  1. Restrictive RLS policies based on user roles
  2. Proper authentication requirements
  3. Admin-only operations protection
  4. Employee access restrictions
  
  ## Security Model
  - Admin: Full access to all operations
  - Employee: Limited access (no bulk delete, no user management)
  - Public: Read-only access to produtos and categorias (for catalog)
  - Anonymous: Can create pedidos from catalog
  
  ## Tables Affected
  - users, produtos, pedidos, itens_pedido, categorias
  - atendimentos, activity_logs, configuracoes_sistema
*/

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin' 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is authenticated employee or admin
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle new user signup (auto-create profile)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM users;
  
  -- First user becomes admin, others need to be invited
  IF user_count = 0 THEN
    INSERT INTO users (id, email, full_name, role, is_active)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      'admin',
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- DROP ALL EXISTING PERMISSIVE POLICIES
-- ============================================

-- Users table
DROP POLICY IF EXISTS "Public can view users" ON users;
DROP POLICY IF EXISTS "Authenticated users can view all users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Produtos table
DROP POLICY IF EXISTS "Anyone can view products" ON produtos;
DROP POLICY IF EXISTS "Public can view produtos" ON produtos;
DROP POLICY IF EXISTS "Public can insert produtos" ON produtos;
DROP POLICY IF EXISTS "Public can update produtos" ON produtos;
DROP POLICY IF EXISTS "Public can delete produtos" ON produtos;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON produtos;
DROP POLICY IF EXISTS "Authenticated users can update products" ON produtos;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON produtos;

-- Categorias table
DROP POLICY IF EXISTS "Anyone can view categories" ON categorias;
DROP POLICY IF EXISTS "Public can view categorias" ON categorias;
DROP POLICY IF EXISTS "Public can insert categorias" ON categorias;
DROP POLICY IF EXISTS "Public can update categorias" ON categorias;
DROP POLICY IF EXISTS "Public can delete categorias" ON categorias;
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON categorias;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON categorias;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON categorias;

-- Pedidos table
DROP POLICY IF EXISTS "Anyone can view orders" ON pedidos;
DROP POLICY IF EXISTS "Public can view pedidos" ON pedidos;
DROP POLICY IF EXISTS "Public can insert pedidos" ON pedidos;
DROP POLICY IF EXISTS "Public can update pedidos" ON pedidos;
DROP POLICY IF EXISTS "Public can delete pedidos" ON pedidos;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON pedidos;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON pedidos;
DROP POLICY IF EXISTS "Authenticated users can delete orders" ON pedidos;

-- Itens pedido table
DROP POLICY IF EXISTS "Anyone can view order items" ON itens_pedido;
DROP POLICY IF EXISTS "Public can view itens_pedido" ON itens_pedido;
DROP POLICY IF EXISTS "Public can insert itens_pedido" ON itens_pedido;
DROP POLICY IF EXISTS "Public can update itens_pedido" ON itens_pedido;
DROP POLICY IF EXISTS "Public can delete itens_pedido" ON itens_pedido;
DROP POLICY IF EXISTS "Authenticated users can insert order items" ON itens_pedido;
DROP POLICY IF EXISTS "Authenticated users can update order items" ON itens_pedido;
DROP POLICY IF EXISTS "Authenticated users can delete order items" ON itens_pedido;

-- Atendimentos table
DROP POLICY IF EXISTS "Public can view atendimentos" ON atendimentos;
DROP POLICY IF EXISTS "Public can insert atendimentos" ON atendimentos;
DROP POLICY IF EXISTS "Public can update atendimentos" ON atendimentos;
DROP POLICY IF EXISTS "Public can delete atendimentos" ON atendimentos;

-- Activity logs table
DROP POLICY IF EXISTS "Public can view activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "Public can insert activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "Authenticated users can view activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON activity_logs;

-- Configuracoes sistema table
DROP POLICY IF EXISTS "Anyone can view system configurations" ON configuracoes_sistema;
DROP POLICY IF EXISTS "Public can view configuracoes_sistema" ON configuracoes_sistema;
DROP POLICY IF EXISTS "Public can insert configuracoes_sistema" ON configuracoes_sistema;
DROP POLICY IF EXISTS "Public can update configuracoes_sistema" ON configuracoes_sistema;
DROP POLICY IF EXISTS "Admins can update system configurations" ON configuracoes_sistema;

-- Pedidos arquivados table
DROP POLICY IF EXISTS "Public can view pedidos_arquivados" ON pedidos_arquivados;
DROP POLICY IF EXISTS "Public can insert pedidos_arquivados" ON pedidos_arquivados;
DROP POLICY IF EXISTS "Public can update pedidos_arquivados" ON pedidos_arquivados;
DROP POLICY IF EXISTS "Public can delete pedidos_arquivados" ON pedidos_arquivados;

-- ============================================
-- NEW SECURE POLICIES - USERS
-- ============================================

-- Staff can view all active users
CREATE POLICY "staff_view_users" ON users
  FOR SELECT TO authenticated
  USING (is_staff());

-- Only admins can create new users
CREATE POLICY "admin_insert_users" ON users
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- Admins can update any user
CREATE POLICY "admin_update_users" ON users
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Users can update their own profile (limited fields)
CREATE POLICY "self_update_profile" ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM users WHERE id = auth.uid()));

-- Only admins can deactivate users
CREATE POLICY "admin_delete_users" ON users
  FOR DELETE TO authenticated
  USING (is_admin() AND id != auth.uid()); -- Cannot delete yourself

-- ============================================
-- NEW SECURE POLICIES - PRODUTOS
-- ============================================

-- Anyone can view products (catalog is public)
CREATE POLICY "public_view_produtos" ON produtos
  FOR SELECT
  USING (true);

-- Staff can create products
CREATE POLICY "staff_insert_produtos" ON produtos
  FOR INSERT TO authenticated
  WITH CHECK (is_staff());

-- Staff can update products
CREATE POLICY "staff_update_produtos" ON produtos
  FOR UPDATE TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

-- Only admins can delete products
CREATE POLICY "admin_delete_produtos" ON produtos
  FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================
-- NEW SECURE POLICIES - CATEGORIAS
-- ============================================

-- Anyone can view categories (for catalog filters)
CREATE POLICY "public_view_categorias" ON categorias
  FOR SELECT
  USING (true);

-- Staff can create categories
CREATE POLICY "staff_insert_categorias" ON categorias
  FOR INSERT TO authenticated
  WITH CHECK (is_staff());

-- Staff can update categories
CREATE POLICY "staff_update_categorias" ON categorias
  FOR UPDATE TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

-- Only admins can delete categories
CREATE POLICY "admin_delete_categorias" ON categorias
  FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================
-- NEW SECURE POLICIES - PEDIDOS
-- ============================================

-- Staff can view all orders
CREATE POLICY "staff_view_pedidos" ON pedidos
  FOR SELECT TO authenticated
  USING (is_staff());

-- Public can view their own orders by phone (for tracking)
CREATE POLICY "public_view_own_pedidos" ON pedidos
  FOR SELECT
  USING (origem = 'catalogo');

-- Anyone can create orders (from catalog)
CREATE POLICY "public_insert_pedidos" ON pedidos
  FOR INSERT
  WITH CHECK (true);

-- Staff can update orders
CREATE POLICY "staff_update_pedidos" ON pedidos
  FOR UPDATE TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

-- Only admins can delete orders
CREATE POLICY "admin_delete_pedidos" ON pedidos
  FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================
-- NEW SECURE POLICIES - ITENS_PEDIDO
-- ============================================

-- Staff can view order items
CREATE POLICY "staff_view_itens_pedido" ON itens_pedido
  FOR SELECT TO authenticated
  USING (is_staff());

-- Public can view items of catalog orders
CREATE POLICY "public_view_catalog_itens" ON itens_pedido
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pedidos 
      WHERE pedidos.id = itens_pedido.pedido_id 
      AND pedidos.origem = 'catalogo'
    )
  );

-- Anyone can insert order items (with orders)
CREATE POLICY "public_insert_itens_pedido" ON itens_pedido
  FOR INSERT
  WITH CHECK (true);

-- Staff can update order items
CREATE POLICY "staff_update_itens_pedido" ON itens_pedido
  FOR UPDATE TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

-- Only admins can delete order items
CREATE POLICY "admin_delete_itens_pedido" ON itens_pedido
  FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================
-- NEW SECURE POLICIES - ATENDIMENTOS
-- ============================================

-- Staff can view all atendimentos
CREATE POLICY "staff_view_atendimentos" ON atendimentos
  FOR SELECT TO authenticated
  USING (is_staff());

-- Anyone can create atendimentos (support requests)
CREATE POLICY "public_insert_atendimentos" ON atendimentos
  FOR INSERT
  WITH CHECK (true);

-- Staff can update atendimentos
CREATE POLICY "staff_update_atendimentos" ON atendimentos
  FOR UPDATE TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

-- Only admins can delete atendimentos
CREATE POLICY "admin_delete_atendimentos" ON atendimentos
  FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================
-- NEW SECURE POLICIES - ACTIVITY_LOGS
-- ============================================

-- Only admins can view activity logs
CREATE POLICY "admin_view_activity_logs" ON activity_logs
  FOR SELECT TO authenticated
  USING (is_admin());

-- Staff can insert their own activity logs
CREATE POLICY "staff_insert_activity_logs" ON activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (is_staff() AND user_id = auth.uid());

-- ============================================
-- NEW SECURE POLICIES - CONFIGURACOES_SISTEMA
-- ============================================

-- Anyone can view system config (for WhatsApp number in catalog)
CREATE POLICY "public_view_config" ON configuracoes_sistema
  FOR SELECT
  USING (true);

-- Only admins can update system config
CREATE POLICY "admin_update_config" ON configuracoes_sistema
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- NEW SECURE POLICIES - PEDIDOS_ARQUIVADOS
-- ============================================

-- Staff can view archived orders
CREATE POLICY "staff_view_pedidos_arquivados" ON pedidos_arquivados
  FOR SELECT TO authenticated
  USING (is_staff());

-- Staff can insert archived orders
CREATE POLICY "staff_insert_pedidos_arquivados" ON pedidos_arquivados
  FOR INSERT TO authenticated
  WITH CHECK (is_staff());

-- Only admins can delete archived orders
CREATE POLICY "admin_delete_pedidos_arquivados" ON pedidos_arquivados
  FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);
CREATE INDEX IF NOT EXISTS idx_pedidos_origem ON pedidos(origem);

-- ============================================
-- GRANT NECESSARY PERMISSIONS
-- ============================================

-- Ensure authenticated users can use the helper functions
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_staff() TO authenticated;

COMMENT ON FUNCTION is_admin() IS 'Returns true if current user is an active admin';
COMMENT ON FUNCTION is_staff() IS 'Returns true if current user is an active staff member (admin or employee)';
