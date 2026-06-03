FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production=false
COPY tsconfig.json ./
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --production
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
RUN npx prisma generate
EXPOSE 4000
CMD npx prisma migrate deploy && node dist/server.js
