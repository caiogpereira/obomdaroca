-- =============================================================================
-- MIGRATION: Corrigir policies da tabela users para permitir alteração de role
-- Data: 2026-01-26
-- =============================================================================

-- Remover policies existentes que possam estar bloqueando
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can update any user" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;

-- Verificar se a tabela users existe, se não criar
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ver todos os usuários
CREATE POLICY "Users can view all users" ON users
  FOR SELECT USING (true);

-- Policy: Usuários podem atualizar seu próprio perfil
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Admins podem atualizar qualquer usuário
CREATE POLICY "Admins can update any user" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins podem inserir novos usuários
CREATE POLICY "Admins can insert users" ON users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
    OR NOT EXISTS (SELECT 1 FROM users) -- Permite criar o primeiro usuário
  );

-- Criar policy mais permissiva para authenticated users (se necessário)
CREATE POLICY "Authenticated users can update users" ON users
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Criar policy para insert
CREATE POLICY "Authenticated users can insert users" ON users
  FOR INSERT TO authenticated
  WITH CHECK (true);
