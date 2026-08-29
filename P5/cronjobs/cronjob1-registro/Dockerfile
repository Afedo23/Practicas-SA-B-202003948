# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

# ---- runtime stage (imagen minima) ----
FROM node:20-alpine
RUN addgroup -g 10001 -S app && adduser -u 10001 -S app -G app
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY package.json index.js ./
USER app
CMD ["node", "index.js"]
