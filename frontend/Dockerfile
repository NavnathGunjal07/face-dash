# Use Node.js 22 Alpine (Vite requires Node 20.19+ or 22.12+)
FROM node:22-alpine

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

RUN rm -rf node_modules


# Install dependencies
RUN pnpm install --shamefully-hoist

RUN pnpm add -D tsx esbuild get-tsconfig rollup vite


# Copy source code
COPY . .

# Expose port
EXPOSE 5173

# Start development server
CMD ["pnpm", "dev"]
