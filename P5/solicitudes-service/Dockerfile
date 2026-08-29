# ---- build stage: instala TODAS las deps y compila TS -> JS ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install
COPY src ./src
RUN npx tsc

# ---- runtime stage: solo deps de produccion + JS compilado (imagen minima, no-root) ----
FROM node:20-alpine
RUN addgroup -g 10001 -S app && adduser -u 10001 -S app -G app
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 4002
USER app
CMD ["node", "dist/index.js"]
