# ---- deps stage: instala TODAS las deps (con lockfile, reproducible) ----
FROM node:24-alpine3.24 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build stage: reusa node_modules de deps y compila TS -> JS ----
FROM node:24-alpine3.24 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
RUN npx tsc && rm -rf dist/__tests__

# ---- runtime stage: solo deps de produccion + JS compilado (imagen minima, no-root) ----
FROM node:24-alpine3.24 AS prod
RUN apk update && apk upgrade --no-cache
RUN addgroup -g 10001 -S app && adduser -u 10001 -S app -G app
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 4002
USER app
CMD ["node", "dist/index.js"]
