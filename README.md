# Sistema de Chat Multiatendimento

Sistema completo de chat multiatendimento integrado com Evolution API para WhatsApp.

## 🚀 Funcionalidades

- ✅ Interface web moderna e responsiva
- ✅ Integração com Evolution API (WhatsApp)
- ✅ Sistema de autenticação e autorização
- ✅ Gestão de múltiplos atendentes
- ✅ Transferência de conversas entre atendentes
- ✅ Notas internas por conversa
- ✅ Sistema de tags e prioridades
- ✅ Comunicação em tempo real (Socket.IO)
- ✅ Suporte a múltiplas mídias (imagem, áudio, vídeo, documentos)
- ✅ Dashboard administrativo
- ✅ Relatórios e estatísticas

## 📋 Pré-requisitos

- Node.js 18+
- PostgreSQL 12+
- Evolution API configurada

## 🔧 Instalação

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd chat-multiatendimento
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie o arquivo `.env.example` para `.env` e configure:

```bash
cp .env.example .env
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
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua_api_key

# URL do Webhook
WEBHOOK_URL=http://localhost:3000/webhook
```

### 4. Configure o banco de dados

```bash
npm run init-db
```

### 5. Inicie o servidor

```bash
# Desenvolvimento
npm run dev

# Produção
npm start

# Com PM2 (recomendado para produção)
npm run pm2:start
```

## 🐳 Deploy com Docker

### Build da imagem

```bash
docker build -t chat-multiatendimento .
```

### Executar container

```bash
docker run -d \
  --name chat-multiatendimento \
  -p 3000:3000 \
  --env-file .env \
  chat-multiatendimento
```

## ☁️ Deploy com Nixpacks

O projeto está configurado para deploy automático em plataformas que suportam Nixpacks (Railway, etc.).

O arquivo `nixpacks.toml` já está configurado corretamente.

## 👤 Usuário Padrão

Após a inicialização do banco, será criado um usuário administrador:

- **Email:** admin@sistema.com
- **Senha:** admin123

⚠️ **Importante:** Altere a senha padrão após o primeiro login!

## 📚 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Produção
npm start

# Inicializar banco de dados
npm run init-db

# PM2 (Produção)
npm run pm2:start    # Iniciar
npm run pm2:stop     # Parar
npm run pm2:restart  # Reiniciar
npm run pm2:logs     # Ver logs
```

## 🔗 Endpoints da API

### Autenticação

- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/verify` - Verificar token
- `PUT /api/auth/status` - Atualizar status

### Conversas

- `GET /api/conversations` - Listar conversas
- `GET /api/conversations/:id` - Detalhes da conversa
- `PUT /api/conversations/:id/assign` - Atribuir conversa
- `PUT /api/conversations/:id/transfer` - Transferir conversa
- `POST /api/conversations/:id/notes` - Adicionar nota

### Webhook

- `POST /webhook` - Receber dados da Evolution API

### Admin

- `GET /api/admin/users` - Listar usuários
- `POST /api/admin/users` - Criar usuário
- `PUT /api/admin/users/:id` - Atualizar usuário
- `DELETE /api/admin/users/:id` - Deletar usuário

## 🔧 Configuração da Evolution API

1. Configure sua instância da Evolution API
2. Defina o webhook URL: `http://seu-dominio.com/webhook`
3. Configure a API Key no arquivo `.env`

## 📊 Monitoramento

### Logs

```bash
# Ver logs em tempo real
npm run pm2:logs

# Logs do sistema
tail -f logs/combined.log
```

### Status da API

Acesse: `http://localhost:3000/api/status`

## 🛠️ Desenvolvimento

### Estrutura do Projeto

```
├── config/          # Configurações
├── database/        # Schema do banco
├── middleware/      # Middlewares
├── models/          # Modelos de dados
├── public/          # Frontend
├── routes/          # Rotas da API
├── scripts/         # Scripts utilitários
├── services/        # Serviços
└── server.js        # Servidor principal
```

### Tecnologias Utilizadas

- **Backend:** Node.js, Express.js
- **Banco:** PostgreSQL
- **Real-time:** Socket.IO
- **Frontend:** HTML5, CSS3, JavaScript
- **Autenticação:** JWT
- **Deploy:** Docker, Nixpacks

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🆘 Suporte

Para suporte, abra uma issue no repositório ou entre em contato.

---

Desenvolvido com ❤️ para facilitar o atendimento ao cliente via WhatsApp.
