# API Dockerfile for Fly.io
FROM node:20-alpine AS base
WORKDIR /app

# Install production deps
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* tsconfig.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY src ./src
RUN npm run build

# Runtime
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=base /app/node_modules ./node_modules
COPY package.json ./
COPY --from=build /app/dist ./dist
EXPOSE 8080
CMD ["node","dist/index.js"]
