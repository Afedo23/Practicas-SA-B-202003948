# ---- build stage: solo dependencias de produccion (no hay paso de compilacion) ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- runtime stage (imagen minima, no-root) ----
FROM node:20-alpine AS prod
RUN addgroup -g 10001 -S app && adduser -u 10001 -S app -G app
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
ENV NODE_ENV=production
USER app
EXPOSE 8080
CMD ["npm", "start"]
