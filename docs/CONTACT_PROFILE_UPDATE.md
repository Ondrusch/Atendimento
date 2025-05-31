# Atualização Automática de Perfis de Contatos

Esta funcionalidade permite buscar e atualizar automaticamente o `profilePicUrl` e `pushname` dos contatos usando a Evolution API.

## Como Funciona

### 1. Atualização Automática

A atualização de perfil acontece automaticamente em duas situações:

- **Quando uma conversa é acessada**: Ao abrir uma conversa específica via `GET /api/conversations/:id`
- **Quando uma mensagem é recebida**: Durante o processamento de webhooks para mensagens recebidas (não enviadas)

### 2. Endpoint da Evolution API Utilizado

```bash
POST https://sua-base-url/chat/findContacts/nome-da-instancia
Content-Type: application/json
apikey: sua-api-key

{
  "where": {
    "remoteJid": "5511999999999@s.whatsapp.net"
  }
}
```

### 3. Dados Atualizados

- **pushname**: Nome do perfil do WhatsApp
- **profilePicUrl**: URL da foto de perfil
- **last_seen**: Timestamp da última atualização

## Endpoints Disponíveis

### 1. Atualização Manual de Perfil

```http
POST /api/conversations/:id/update-contact-profile
Authorization: Bearer <token>
```

**Resposta de Sucesso:**

```json
{
  "success": true,
  "message": "Perfil atualizado com sucesso",
  "updated": true,
  "data": {
    "phone": "5511999999999",
    "pushname": "João Silva",
    "profilePicUrl": "https://...",
    "contact": { ... }
  }
}
```

### 2. Atualização em Lote (Admin)

```http
POST /api/admin/contacts/update-profiles
Authorization: Bearer <token>
Content-Type: application/json

{
  "contacts": [
    {
      "phone": "5511999999999",
      "instanceName": "minha-instancia"
    },
    {
      "phone": "5511888888888",
      "instanceName": "minha-instancia"
    }
  ]
}
```

**Resposta:**

```json
{
  "success": true,
  "message": "Atualização concluída: 2 perfis atualizados, 0 erros",
  "data": {
    "total": 2,
    "updated": 2,
    "errors": 0,
    "results": [...]
  }
}
```

## Eventos Socket.IO

Quando um perfil é atualizado, um evento é emitido via Socket.IO:

```javascript
// Evento emitido
socket.emit("contact_profile_updated", {
  conversation_id: "uuid-da-conversa", // opcional
  contact_phone: "5511999999999",
  instance_name: "minha-instancia",
  profile_data: {
    phone: "5511999999999",
    pushname: "João Silva",
    profilePicUrl: "https://...",
    contact: { ... }
  }
});
```

## Uso Programático

### ContactProfileService

```javascript
const ContactProfileService = require("./services/ContactProfileService");

// Atualizar um contato
const result = await ContactProfileService.updateContactProfile(
  "5511999999999",
  "minha-instancia"
);

// Atualizar múltiplos contatos
const contacts = [
  { phone: "5511999999999", instanceName: "minha-instancia" },
  { phone: "5511888888888", instanceName: "minha-instancia" },
];

const results = await ContactProfileService.updateMultipleContactProfiles(
  contacts
);
```

### EvolutionService

```javascript
const EvolutionService = require("./services/EvolutionService");

const evolutionService = new EvolutionService(serverUrl, apiKey);

// Buscar perfil do contato
const result = await evolutionService.findContactProfile(
  "minha-instancia",
  "5511999999999@s.whatsapp.net"
);
```

## Configuração

### 1. Banco de Dados

A tabela `contacts` deve ter as colunas:

- `phone` (string) - Número do telefone
- `name` (string) - Nome/pushname do contato
- `avatar_url` (string) - URL da foto de perfil
- `last_seen` (timestamp) - Última atualização

### 2. Instâncias

Certifique-se de que suas instâncias estão configuradas corretamente no banco:

- `name` - Nome da instância
- `server_url` - URL do servidor Evolution API
- `api_key` - Chave da API

## Teste

Execute o script de teste:

```bash
npm run test-contact-profile
```

Ou execute diretamente:

```bash
node scripts/test-contact-profile.js
```

## Logs

A funcionalidade gera logs detalhados:

```
🔍 Buscando perfil do contato 5511999999999 na instância minha-instancia
✅ Dados do perfil encontrados: { phone: '5511999999999', pushname: 'João Silva', hasProfilePic: true }
✅ Perfil atualizado com sucesso para 5511999999999
```

## Tratamento de Erros

- **Instância não encontrada**: Verifica se a instância existe no banco
- **Número inválido**: Valida formato do número de telefone
- **API indisponível**: Trata erros de conexão com a Evolution API
- **Dados não encontrados**: Lida com contatos sem perfil público

## Performance

- Atualização em background para não bloquear a interface
- Delay de 500ms entre atualizações em lote
- Cache automático via `last_seen` timestamp
- Logs detalhados para monitoramento
