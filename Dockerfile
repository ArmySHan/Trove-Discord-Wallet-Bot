FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies first (cached layer)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Application source
COPY tsconfig.json ./
COPY src ./src

USER node

# Run TypeScript directly via tsx so signals reach the process (graceful shutdown)
CMD ["node", "--import", "tsx", "src/index.ts"]
