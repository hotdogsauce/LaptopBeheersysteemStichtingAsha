FROM node:20-slim AS base
WORKDIR /app

# Installeer OpenSSL (nodig voor Prisma)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Kopieer package files en installeer dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Kopieer Prisma schema en genereer client
COPY prisma ./prisma
RUN npx prisma generate

# Kopieer broncode
COPY src ./src

# Non-root gebruiker
USER node

EXPOSE 4000

CMD ["npx", "tsx", "src/index.ts"]
