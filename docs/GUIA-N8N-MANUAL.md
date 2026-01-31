# 🛠️ Guia de Configuração Manual do Workflow N8N

## Visão Geral do Fluxo

```
[Webhook] → [Code: Extrair] → [Spreadsheet File] → [Code: Transformar] → [Loop] → [HTTP Request] → [Respond]
```

---

## Node 1: Webhook

**Tipo:** Webhook

**Configurações:**
- HTTP Method: `POST`
- Path: `importar-produtos-saurus`
- Response Mode: `When Last Node Finishes`

---

## Node 2: Code - Extrair Arquivo

**Tipo:** Code (JavaScript)

**Nome:** `Extrair Arquivo`

**Código:**
```javascript
// Extrair o arquivo binário do webhook
const binaryData = $input.first().binary;

if (!binaryData || !binaryData.file) {
  throw new Error('Nenhum arquivo recebido. Envie um arquivo .xlsx no campo "file"');
}

return [{
  json: { message: 'Arquivo recebido' },
  binary: binaryData
}];
```

---

## Node 3: Spreadsheet File

**Tipo:** Spreadsheet File

**Configurações:**
- Operation: `Read from File`
- Binary Property: `file`
- File Format: `xlsx` ou `Auto-Detect`
- Options:
  - Header Row: ✅ (ativado)

---

## Node 4: Code - Transformar Dados

**Tipo:** Code (JavaScript)

**Nome:** `Transformar Dados`

**Código:**
```javascript
const items = $input.all();
const produtosMap = new Map();

const TABELA_VAREJO = 'A - CARTAO / VAREJO';
const TABELA_PIX = 'B - PIX';
const TABELA_DINHEIRO = 'C - TED / DINHEIRO';

for (const item of items) {
  const data = item.json;
  const codigo = String(data['Código do Produto'] || '').trim();
  
  if (!codigo) continue;
  
  if (!produtosMap.has(codigo)) {
    produtosMap.set(codigo, {
      codigo: codigo,
      nome: String(data['Descrição'] || '').trim(),
      categoria: data['Categoria'] !== 'Sem Categoria' ? data['Categoria'] : null,
      subcategoria: data['Subcategoria'] !== 'Sem Subcategoria' ? data['Subcategoria'] : null,
      marca: data['Marca'] !== 'Se Marca' ? data['Marca'] : null,
      preco_varejo: null,
      preco_cartao: null,
      preco_pix: null,
      preco_dinheiro: null
    });
  }
  
  const produto = produtosMap.get(codigo);
  const tabela = data['Tabela de Preço'];
  const preco = parseFloat(data['Valor Final']) || 0;
  
  if (preco > 0) {
    switch (tabela) {
      case TABELA_VAREJO:
        produto.preco_varejo = preco;
        produto.preco_cartao = preco;
        produto.preco = preco;
        break;
      case TABELA_PIX:
        produto.preco_pix = preco;
        break;
      case TABELA_DINHEIRO:
        produto.preco_dinheiro = preco;
        break;
    }
  }
}

const produtos = Array.from(produtosMap.values())
  .filter(p => p.preco_varejo > 0)
  .map(p => ({
    json: {
      ...p,
      preco_pix: p.preco_pix || p.preco_varejo,
      preco_dinheiro: p.preco_dinheiro || p.preco_varejo,
      preco_cartao: p.preco_cartao || p.preco_varejo,
      preco: p.preco || p.preco_varejo
    }
  }));

return produtos;
```

---

## Node 5: Loop Over Items

**Tipo:** Loop Over Items (ou Split In Batches)

**Configurações:**
- Batch Size: `50`

---

## Node 6: HTTP Request - Upsert Supabase

**Tipo:** HTTP Request

**Nome:** `Upsert Supabase`

**Configurações:**

### Request
- Method: `POST`
- URL: `https://kzyprqivqefeafcuasxp.supabase.co/rest/v1/produtos`
- Query Parameters:
  - `on_conflict`: `codigo`

### Authentication
- Authentication: `Generic Credential Type`
- Generic Auth Type: `Header Auth`
- Ou configure manualmente nos headers

### Headers (adicione todos)
| Header | Value |
|--------|-------|
| `apikey` | `sua_anon_key_aqui` |
| `Authorization` | `Bearer sua_service_role_key_aqui` |
| `Content-Type` | `application/json` |
| `Prefer` | `resolution=merge-duplicates` |

### Body
- Body Content Type: `JSON`
- Specify Body: `Using JSON`

**JSON Body:**
```json
{
  "codigo": "{{ $json.codigo }}",
  "nome": "{{ $json.nome }}",
  "categoria": {{ $json.categoria ? '"' + $json.categoria + '"' : 'null' }},
  "subcategoria": {{ $json.subcategoria ? '"' + $json.subcategoria + '"' : 'null' }},
  "marca": {{ $json.marca ? '"' + $json.marca + '"' : 'null' }},
  "preco": {{ $json.preco }},
  "preco_varejo": {{ $json.preco_varejo }},
  "preco_cartao": {{ $json.preco_cartao }},
  "preco_pix": {{ $json.preco_pix }},
  "preco_dinheiro": {{ $json.preco_dinheiro }}
}
```

**Alternativa mais simples para o Body (usando Expression):**

No campo Body, use:
```
={{ JSON.stringify({
  codigo: $json.codigo,
  nome: $json.nome,
  categoria: $json.categoria,
  subcategoria: $json.subcategoria,
  marca: $json.marca,
  preco: $json.preco,
  preco_varejo: $json.preco_varejo,
  preco_cartao: $json.preco_cartao,
  preco_pix: $json.preco_pix,
  preco_dinheiro: $json.preco_dinheiro
}) }}
```

---

## Node 7: Code - Contador (Opcional)

**Tipo:** Code

**Nome:** `Contador`

**Código:**
```javascript
// Contar processados
const items = $input.all();
const total = items.length;

return [{
  json: {
    status: 'sucesso',
    total_processados: total,
    mensagem: `✅ ${total} produtos processados com sucesso!`
  }
}];
```

---

## Node 8: Respond to Webhook

**Tipo:** Respond to Webhook

**Configurações:**
- Respond With: `JSON`
- Response Body: 
```
={{ $json }}
```

Ou defina manualmente:
```json
{
  "status": "sucesso",
  "mensagem": "Importação concluída"
}
```

---

## Conexões

1. **Webhook** → **Extrair Arquivo**
2. **Extrair Arquivo** → **Spreadsheet File**
3. **Spreadsheet File** → **Transformar Dados**
4. **Transformar Dados** → **Loop Over Items**
5. **Loop Over Items** (saída "loop") → **HTTP Request**
6. **HTTP Request** → **Loop Over Items** (volta para o loop)
7. **Loop Over Items** (saída "done") → **Contador** (opcional) → **Respond to Webhook**

---

## Credenciais do Supabase

Você vai precisar das seguintes informações (encontradas no Supabase Dashboard → Settings → API):

- **Project URL:** `https://kzyprqivqefeafcuasxp.supabase.co`
- **anon (public) key:** Começa com `eyJhbGc...`
- **service_role key:** Começa com `eyJhbGc...` (use esta para o Bearer token)

---

## Testando o Workflow

### Via cURL:
```bash
curl -X POST \
  https://meueditor.manager01.exponensialab.com.br/webhook/importar-produtos-saurus \
  -F "file=@relatorio_tabela_de_preco.xlsx"
```

### Via Postman:
1. Método: POST
2. URL: `https://seu-n8n/webhook/importar-produtos-saurus`
3. Body: form-data
4. Key: `file` (tipo File)
5. Value: selecione o arquivo .xlsx

---

## Troubleshooting

### Erro: "Nenhum arquivo recebido"
- Verifique se o campo do form-data é `file`
- Verifique se o arquivo é .xlsx

### Erro: "401 Unauthorized"
- Verifique as credenciais do Supabase
- A service_role key deve ser usada no Bearer token

### Erro: "400 Bad Request"
- Verifique se os campos do JSON correspondem às colunas da tabela
- Verifique se `on_conflict=codigo` está na URL

### Produtos não aparecem
- Verifique se a coluna `codigo` é a chave de conflito
- Execute: `SELECT * FROM produtos ORDER BY updated_at DESC LIMIT 10;`
