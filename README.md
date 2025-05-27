# Chat Multiatendimento - Evolution API

Sistema completo de chat multiatendimento integrado com a Evolution API para WhatsApp Business.

## 🚀 Características

- **Multiatendimento**: Múltiplos atendentes podem gerenciar conversas simultaneamente
- **Integração Evolution API**: Conecta diretamente com a Evolution API para WhatsApp
- **Tempo Real**: Comunicação em tempo real usando Socket.IO
- **Transferência de Atendimento**: Transfira conversas entre atendentes
- **Suporte a Mídias**: Envio e recebimento de imagens, vídeos, áudios, documentos e stickers
- **Localização**: Suporte para envio e recebimento de localizações
- **Interface Moderna**: Interface responsiva e intuitiva
- **Controle de Status**: Gerenciamento de status dos atendentes (online, ocupado, offline)
- **Histórico Completo**: Armazenamento completo de conversas e mensagens
- **Sistema de Permissões**: Diferentes níveis de acesso (admin, supervisor, atendente)

## 📋 Pré-requisitos

- Node.js 16+
- PostgreSQL 12+
- Evolution API configurada e funcionando

## 🛠️ Instalação

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd chat-multiatendimento
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o banco de dados

Crie um banco PostgreSQL e execute o script de criação:

```bash
psql -U postgres -f database/schema.sql
```

### 4. Configure as variáveis de ambiente

Copie o arquivo de exemplo e configure suas variáveis:

```bash
cp env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Configurações do Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chat_multiatendimento
DB_USER=postgres
DB_PASSWORD=sua_senha

# Configurações do Servidor
PORT=3000
JWT_SECRET=seu_jwt_secret_muito_seguro

# Configurações da Evolution API
EVOLUTION_API_URL=https://apiwa.bxdigitalmkt.com.br
EVOLUTION_API_KEY=088D8D8CF290-4557-9911-1D07E02D1A55

# URL do Webhook (onde a Evolution API enviará os dados)
WEBHOOK_URL=http://localhost:3000/webhook
```

### 5. Inicie o servidor

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## 🔧 Configuração da Evolution API

### 1. Configurar Webhook

Configure o webhook na Evolution API para apontar para seu servidor:

**URL do Webhook:** `http://seu-servidor:3000/webhook`

**Eventos necessários:**

- `messages.upsert`
- `messages.update`
- `connection.update`

### 2. Cadastrar Configuração no Sistema

Acesse o painel administrativo e cadastre:

1. **Configuração da Evolution API**:

   - Nome: Nome identificador
   - URL do Servidor: URL da sua Evolution API
   - API Key: Chave de acesso da Evolution API
   - URL do Webhook: URL onde a Evolution enviará os dados

2. **Instâncias**:
   - Nome: Nome da instância
   - ID da Instância: ID da instância no Evolution
   - Configuração: Selecione a configuração criada anteriormente

## 👥 Usuários e Permissões

### Usuário Padrão

O sistema vem com um usuário administrador padrão:

- **Email:** admin@sistema.com
- **Senha:** admin123

### Níveis de Permissão

- **Admin**: Acesso total ao sistema
- **Supervisor**: Gerencia usuários e visualiza relatórios
- **Atendente**: Atende conversas

## 📱 Como Usar

### 1. Login

Acesse `http://localhost:3000` e faça login com suas credenciais.

### 2. Configuração Inicial (Admin)

1. Acesse as configurações administrativas
2. Cadastre a configuração da Evolution API
3. Cadastre as instâncias do WhatsApp
4. Crie usuários atendentes

### 3. Atendimento

1. As conversas aparecerão automaticamente na lista
2. Clique em uma conversa para iniciar o atendimento
3. Use os botões para assumir, transferir ou finalizar conversas
4. Envie mensagens de texto, mídias ou localizações

### 4. Funcionalidades do Chat

- **Assumir Conversa**: Clique em "Assumir" para pegar uma conversa em espera
- **Transferir**: Transfira para outro atendente online
- **Finalizar**: Encerre o atendimento
- **Enviar Mídia**: Use o botão de anexo para enviar arquivos
- **Status**: Altere seu status (online/ocupado) no menu do usuário

## 🔌 API Endpoints

### Autenticação

```bash
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/verify
PUT /api/auth/status
```

### Conversas

```bash
GET /api/conversations
GET /api/conversations/:id
POST /api/conversations/:id/assign
POST /api/conversations/:id/transfer
POST /api/conversations/:id/close
GET /api/conversations/:id/messages
POST /api/conversations/:id/messages
POST /api/conversations/:id/mark-read
```

### Administração

```bash
GET /api/admin/users
POST /api/admin/users
PUT /api/admin/users/:id
DELETE /api/admin/users/:id
GET /api/admin/evolution-configs
POST /api/admin/evolution-configs
PUT /api/admin/evolution-configs/:id
DELETE /api/admin/evolution-configs/:id
GET /api/admin/instances
POST /api/admin/instances
PUT /api/admin/instances/:id
DELETE /api/admin/instances/:id
```

### Webhook

```bash
POST /webhook
```

## 🔄 Webhook da Evolution API

O sistema recebe webhooks da Evolution API no endpoint `/webhook`. Os dados esperados seguem o formato:

```json
[
  {
    "body": {
      "event": "messages.upsert",
      "instance": "NomeInstancia",
      "data": {
        "key": {
          "remoteJid": "556195768696@s.whatsapp.net",
          "fromMe": false,
          "id": "8B5813167C488C7FE08696618F63A5D6"
        },
        "pushName": "Nome do Contato",
        "message": {
          "conversation": "Texto da mensagem"
        },
        "messageType": "conversation",
        "messageTimestamp": 1748371681
      }
    }
  }
]
```

## 📊 Estrutura do Banco de Dados

### Principais Tabelas

- **users**: Usuários do sistema (atendentes)
- **evolution_configs**: Configurações da Evolution API
- **instances**: Instâncias do WhatsApp
- **contacts**: Contatos/clientes
- **conversations**: Conversas
- **messages**: Mensagens
- **conversation_transfers**: Histórico de transferências
- **conversation_notes**: Notas internas

## 🚀 Deploy em Produção

### 1. Variáveis de Ambiente

Configure as variáveis para produção:

```env
NODE_ENV=production
PORT=3000
DB_HOST=seu-host-postgres
DB_PASSWORD=senha-segura
JWT_SECRET=jwt-secret-muito-seguro
WEBHOOK_URL=https://seu-dominio.com/webhook
```

### 2. Proxy Reverso (Nginx)

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Process Manager (PM2)

```bash
npm install -g pm2
pm2 start server.js --name "chat-multiatendimento"
pm2 startup
pm2 save
```

## 🔧 Desenvolvimento

### Estrutura do Projeto

```
├── config/           # Configurações (banco de dados)
├── database/         # Scripts SQL
├── middleware/       # Middlewares (autenticação)
├── models/          # Modelos do banco de dados
├── routes/          # Rotas da API
├── services/        # Serviços (Evolution API)
├── public/          # Frontend (HTML, CSS, JS)
└── server.js        # Servidor principal
```

### Scripts Disponíveis

```bash
npm start      # Inicia em produção
npm run dev    # Inicia em desenvolvimento com nodemon
```

## 🐛 Troubleshooting

### Problemas Comuns

1. **Erro de conexão com banco**

   - Verifique as credenciais no `.env`
   - Certifique-se que o PostgreSQL está rodando

2. **Webhook não recebe dados**

   - Verifique se a URL está acessível externamente
   - Confirme a configuração na Evolution API

3. **Mensagens não aparecem**
   - Verifique os logs do servidor
   - Confirme se a instância está ativa

### Logs

Os logs são exibidos no console. Para produção, considere usar um sistema de logs como Winston.

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

Para suporte, abra uma issue no repositório ou entre em contato através do email.

## 🔄 Atualizações

Para atualizar o sistema:

1. Faça backup do banco de dados
2. Atualize o código
3. Execute migrações se necessário
4. Reinicie o servidor

---

**Desenvolvido com ❤️ para facilitar o atendimento via WhatsApp**
