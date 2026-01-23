# PRD - Módulo CRM com Histórico de Clientes

## O Bom da Roça - Sistema de Gestão

**Versão:** 1.0  
**Data:** 20/01/2026  
**Autor:** Claude (Assistente IA)

---

## 1. Visão Geral

### 1.1 Objetivo
Implementar um módulo de CRM (Customer Relationship Management) integrado ao sistema O Bom da Roça, permitindo visualização consolidada de clientes, histórico de compras, segmentação e métricas individuais.

### 1.2 Problema Atual
- Dados de clientes estão dispersos nos pedidos (cada pedido tem cliente, telefone, email separados)
- Não há visão unificada do histórico de um cliente
- Impossível identificar clientes VIP, inativos ou frequentes
- Agente de IA no N8N não tem onde consultar/cadastrar clientes de forma centralizada

### 1.3 Solução Proposta
- Criar tabela centralizada `clientes` com dados consolidados
- Vincular todos os pedidos a um cliente único (por telefone como chave natural)
- Criar interface de CRM com busca, ficha do cliente e segmentação
- Expor endpoints para integração com agente de IA

---

## 2. Requisitos Funcionais

### 2.1 Gestão de Clientes

**RF01 - Cadastro de Cliente**
- Campos obrigatórios: nome, telefone
- Campos opcionais: email, CPF/CNPJ, nome_empresa, endereco, observacoes
- Telefone deve ser único (chave de identificação)
- CPF/CNPJ deve ser único quando informado

**RF02 - Busca de Clientes**
- Busca por: telefone, nome, CPF/CNPJ, nome_empresa
- Busca parcial (LIKE) para nome e empresa
- Busca exata para telefone e CPF/CNPJ
- Ordenação por: nome, última compra, total gasto

**RF03 - Ficha do Cliente**
- Dados cadastrais completos
- Métricas consolidadas:
  - Total gasto (lifetime value)
  - Número de pedidos
  - Ticket médio
  - Frequência de compra (pedidos/mês)
  - Data da primeira compra
  - Data da última compra
  - Produtos mais comprados (top 5)
- Timeline de pedidos (histórico completo)
- Status de segmentação (badge visual)

**RF04 - Segmentação Automática**
- **VIP**: Total gasto > R$5.000 OU mais de 10 pedidos
- **Frequente**: 3+ pedidos nos últimos 90 dias
- **Ativo**: Pelo menos 1 pedido nos últimos 90 dias
- **Inativo**: Nenhum pedido nos últimos 90 dias
- **Novo**: Apenas 1 pedido no histórico

### 2.2 Integração com Pedidos

**RF05 - Vinculação Automática**
- Ao criar pedido, sistema busca cliente pelo telefone
- Se existe: vincula o pedido ao cliente existente
- Se não existe: cria novo cliente automaticamente
- Atualiza dados do cliente se informações mais completas forem fornecidas

**RF06 - Migração de Dados Existentes**
- Script para consolidar clientes a partir dos pedidos existentes
- Agrupa por telefone (normalizado)
- Preserva informações mais recentes/completas

### 2.3 Interface do CRM

**RF07 - Listagem de Clientes**
- Tabela com: nome, telefone, segmento, total gasto, última compra
- Filtros por segmento
- Ordenação por colunas
- Paginação (20 por página)
- Busca rápida no topo

**RF08 - Modal/Página de Detalhes**
- Seção superior: dados cadastrais (editáveis)
- Seção de métricas: cards com KPIs
- Seção de histórico: timeline de pedidos
- Seção de produtos: ranking de produtos comprados

### 2.4 Endpoints para Agente IA (N8N)

**RF09 - API de Clientes**
- `GET /api/clientes?telefone=X` - Buscar cliente por telefone
- `POST /api/clientes` - Criar/atualizar cliente
- `GET /api/clientes/:id/historico` - Histórico de pedidos do cliente

---

## 3. Modelo de Dados

### 3.1 Nova Tabela: `clientes`

```sql
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  nome TEXT NOT NULL,
  telefone TEXT UNIQUE NOT NULL,  -- Chave natural
  email TEXT,
  cpf_cnpj TEXT UNIQUE,
  nome_empresa TEXT,
  
  -- Endereço
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  
  -- Metadados
  observacoes TEXT,
  origem TEXT DEFAULT 'manual',  -- 'manual', 'whatsapp', 'catalogo'
  
  -- Segmentação (calculado por trigger)
  segmento TEXT DEFAULT 'novo',  -- 'vip', 'frequente', 'ativo', 'inativo', 'novo'
  total_gasto DECIMAL(12,2) DEFAULT 0,
  total_pedidos INTEGER DEFAULT 0,
  ticket_medio DECIMAL(10,2) DEFAULT 0,
  primeira_compra TIMESTAMPTZ,
  ultima_compra TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 Alteração na Tabela `pedidos`

```sql
ALTER TABLE pedidos 
ADD COLUMN cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL;

CREATE INDEX idx_pedidos_cliente_id ON pedidos(cliente_id);
```

### 3.3 Índices e Performance

```sql
CREATE INDEX idx_clientes_telefone ON clientes(telefone);
CREATE INDEX idx_clientes_cpf_cnpj ON clientes(cpf_cnpj) WHERE cpf_cnpj IS NOT NULL;
CREATE INDEX idx_clientes_segmento ON clientes(segmento);
CREATE INDEX idx_clientes_nome ON clientes USING gin(nome gin_trgm_ops);
```

### 3.4 Triggers para Métricas

```sql
-- Atualiza métricas do cliente após cada pedido
CREATE OR REPLACE FUNCTION atualizar_metricas_cliente()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE clientes SET
    total_gasto = (SELECT COALESCE(SUM(valor_total), 0) FROM pedidos WHERE cliente_id = NEW.cliente_id AND status = 'Finalizado'),
    total_pedidos = (SELECT COUNT(*) FROM pedidos WHERE cliente_id = NEW.cliente_id),
    ticket_medio = (SELECT COALESCE(AVG(valor_total), 0) FROM pedidos WHERE cliente_id = NEW.cliente_id AND status = 'Finalizado'),
    primeira_compra = (SELECT MIN(created_at) FROM pedidos WHERE cliente_id = NEW.cliente_id),
    ultima_compra = (SELECT MAX(created_at) FROM pedidos WHERE cliente_id = NEW.cliente_id),
    segmento = calcular_segmento(NEW.cliente_id),
    updated_at = NOW()
  WHERE id = NEW.cliente_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 4. Interface do Usuário

### 4.1 Nova Aba no Menu

```
[Atendimentos] [Dashboard] [Produtos] [Clientes] ← NOVA
```

### 4.2 Tela Principal - Lista de Clientes

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 [Buscar por nome, telefone, CPF...]          [Filtro ▼]      │
├─────────────────────────────────────────────────────────────────┤
│ Nome           │ Telefone      │ Segmento │ Total    │ Última   │
├────────────────┼───────────────┼──────────┼──────────┼──────────┤
│ João Silva     │ (35)9999-1234 │ 🌟 VIP   │ R$8.500  │ 15/01/26 │
│ Maria Santos   │ (35)9888-5678 │ ✓ Ativo  │ R$1.200  │ 10/01/26 │
│ Pedro Oliveira │ (35)9777-9012 │ ⚠ Inativo│ R$450    │ 01/10/25 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Modal de Detalhes do Cliente

```
┌─────────────────────────────────────────────────────────────────┐
│ João da Silva                                    [🌟 VIP]   [X] │
│ (35) 99999-1234 • joao@email.com                                │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│ │ R$8.500  │ │ 15       │ │ R$566,67 │ │ 2,3/mês  │            │
│ │Total     │ │Pedidos   │ │Ticket    │ │Frequência│            │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
├─────────────────────────────────────────────────────────────────┤
│ HISTÓRICO DE PEDIDOS                                            │
│ ────────────────────────────────────────────────────────────    │
│ 📦 #125 • 15/01/2026 • R$450,00 • Finalizado                    │
│    → Queijo Canastra (2x), Doce de Leite (5x)                   │
│ 📦 #098 • 02/01/2026 • R$320,00 • Finalizado                    │
│    → Cachaça Artesanal (3x), Pão de Queijo (10x)                │
│ ...                                                              │
├─────────────────────────────────────────────────────────────────┤
│ PRODUTOS MAIS COMPRADOS                                         │
│ 1. Queijo Canastra - 25 unidades                                │
│ 2. Doce de Leite - 18 unidades                                  │
│ 3. Cachaça Artesanal - 12 unidades                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Regras de Negócio

### 5.1 Normalização de Telefone

```javascript
function normalizarTelefone(telefone) {
  // Remove tudo que não é número
  const numeros = telefone.replace(/\D/g, '');
  
  // Se tem 11 dígitos (com DDD), retorna
  if (numeros.length === 11) return numeros;
  
  // Se tem 10 dígitos (DDD + 8), adiciona 9
  if (numeros.length === 10) return numeros.slice(0,2) + '9' + numeros.slice(2);
  
  return numeros;
}
```

### 5.2 Cálculo de Segmento

```sql
CREATE OR REPLACE FUNCTION calcular_segmento(p_cliente_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_total_gasto DECIMAL;
  v_total_pedidos INTEGER;
  v_pedidos_90_dias INTEGER;
  v_ultima_compra TIMESTAMPTZ;
BEGIN
  SELECT 
    COALESCE(SUM(valor_total), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '90 days'),
    MAX(created_at)
  INTO v_total_gasto, v_total_pedidos, v_pedidos_90_dias, v_ultima_compra
  FROM pedidos 
  WHERE cliente_id = p_cliente_id AND status = 'Finalizado';
  
  -- VIP: gasto > 5000 OU mais de 10 pedidos
  IF v_total_gasto > 5000 OR v_total_pedidos > 10 THEN
    RETURN 'vip';
  END IF;
  
  -- Novo: apenas 1 pedido
  IF v_total_pedidos = 1 THEN
    RETURN 'novo';
  END IF;
  
  -- Frequente: 3+ pedidos nos últimos 90 dias
  IF v_pedidos_90_dias >= 3 THEN
    RETURN 'frequente';
  END IF;
  
  -- Inativo: nenhum pedido nos últimos 90 dias
  IF v_ultima_compra < NOW() - INTERVAL '90 days' THEN
    RETURN 'inativo';
  END IF;
  
  -- Ativo: padrão
  RETURN 'ativo';
END;
$$ LANGUAGE plpgsql;
```

---

## 6. Integração com N8N

### 6.1 Fluxo do Agente de IA

```
Cliente envia mensagem WhatsApp
        ↓
Agente extrai telefone
        ↓
Consulta Supabase: GET clientes?telefone=X
        ↓
    ┌───────┴───────┐
    ↓               ↓
Existe          Não existe
    ↓               ↓
Usa dados       Pergunta nome
do cliente      e cria registro
    ↓               ↓
    └───────┬───────┘
            ↓
    Faz atendimento
            ↓
    Cria pedido com cliente_id
```

### 6.2 Endpoints Supabase

O agente no N8N usará a API REST do Supabase:

```bash
# Buscar cliente por telefone
GET https://[PROJECT].supabase.co/rest/v1/clientes?telefone=eq.35999991234

# Criar cliente
POST https://[PROJECT].supabase.co/rest/v1/clientes
{
  "nome": "João Silva",
  "telefone": "35999991234",
  "origem": "whatsapp"
}

# Buscar histórico
GET https://[PROJECT].supabase.co/rest/v1/pedidos?cliente_id=eq.[UUID]&order=created_at.desc
```

---

## 7. Plano de Implementação

### Fase 1 - Banco de Dados (Migration)
1. Criar tabela `clientes`
2. Adicionar coluna `cliente_id` em `pedidos`
3. Criar triggers de atualização de métricas
4. Criar função de cálculo de segmento
5. Migrar dados existentes (consolidar por telefone)

### Fase 2 - Frontend
1. Criar tipo `Cliente` em `types/index.ts`
2. Criar hook `useSupabaseClientes.ts`
3. Criar página `Clientes.tsx`
4. Criar componente `ClienteModal.tsx`
5. Criar componente `ClienteCard.tsx`
6. Adicionar aba no `TabNavigation`
7. Integrar no `AdminLayout`

### Fase 3 - Integração N8N
1. Configurar credenciais Supabase no N8N
2. Atualizar workflow do agente para consultar clientes
3. Atualizar workflow de criação de pedidos
4. Testar fluxo completo

---

## 8. Arquivos a Criar/Modificar

### Novos Arquivos
```
supabase/migrations/20260120000001_create_clientes_table.sql
src/types/cliente.ts (ou adicionar em index.ts)
src/hooks/useSupabaseClientes.ts
src/pages/Clientes.tsx
src/components/ClienteModal.tsx
src/components/ClienteCard.tsx
src/components/ClienteTimeline.tsx
src/components/ClienteMetrics.tsx
```

### Arquivos a Modificar
```
src/types/index.ts        → Adicionar interface Cliente
src/components/TabNavigation.tsx → Adicionar aba Clientes
src/pages/AdminLayout.tsx → Importar e renderizar Clientes
```

---

## 9. Critérios de Aceite

- [ ] Cliente pode ser criado com nome e telefone
- [ ] Busca funciona por telefone, nome, CPF e empresa
- [ ] Ficha do cliente mostra métricas corretas
- [ ] Timeline de pedidos está ordenada corretamente
- [ ] Segmentação é calculada automaticamente
- [ ] Pedidos novos são vinculados ao cliente correto
- [ ] Dados existentes foram migrados corretamente
- [ ] Agente N8N consegue consultar e criar clientes
- [ ] Performance adequada com 1000+ clientes
