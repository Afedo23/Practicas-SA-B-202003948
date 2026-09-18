# ---- build stage: solo dependencias de produccion (no hay paso de compilacion) ----
FROM node:24-alpine3.24 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- runtime stage (imagen minima, no-root) ----
FROM node:24-alpine3.24 AS prod
RUN apk update && apk upgrade --no-cache
RUN addgroup -g 10001 -S app && adduser -u 10001 -S app -G app
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
ENV NODE_ENV=production
USER app
EXPOSE 8080
CMD ["npm", "start"]
