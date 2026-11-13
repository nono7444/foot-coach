# 1) Construction de l'appli React
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 2) Image finale : petit serveur Node qui sert l'appli + sauvegarde
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY server ./server
COPY --from=build /app/dist ./dist
VOLUME /app/data
EXPOSE 3000
CMD ["node", "server/server.js"]
