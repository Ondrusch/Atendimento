# Use Node.js 18 LTS oficial
FROM node:18-alpine

# Definir diretório de trabalho
WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache curl

# Copiar arquivos de dependências primeiro (para cache)
COPY package*.json ./

# Instalar dependências de produção
RUN npm ci --only=production && \
    npm cache clean --force

# Copiar código da aplicação
COPY . .

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Mudar para usuário não-root
USER nodejs

# Expor porta da aplicação
EXPOSE 3000

# Healthcheck para verificar se a aplicação está funcionando
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/status || exit 1

# Comando para iniciar a aplicação
CMD ["node", "server.js"] 