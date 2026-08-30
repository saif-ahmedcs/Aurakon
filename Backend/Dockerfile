FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

COPY db.js server.js schema.sql ./
COPY events/ ./events/
COPY middleware/ ./middleware/
COPY models/ ./models/
COPY routes/ ./routes/
COPY scripts/ ./scripts/
COPY services/ ./services/
COPY utils/ ./utils/

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
