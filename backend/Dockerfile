# Node 22 Alpine
FROM node:22-alpine

# Install tools needed for esbuild to build from source if no binary exists
RUN apk add --no-cache libc6-compat python3 make g++

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install

RUN pnpm add -D tsx esbuild get-tsconfig

COPY prisma ./prisma
COPY . .

RUN npx prisma generate

EXPOSE 3000 3001

CMD ["pnpm", "dev"]
