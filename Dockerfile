# Stage 1 — Build (Node 20, installs deps and compiles the Vite SPA)
FROM node:20-alpine AS builder
WORKDIR /app

# Copy manifests first so this layer is cached unless deps change
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Stage 2 — Serve (nginx:alpine, ~25 MB final image)
FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY deploy/nginx-container.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
