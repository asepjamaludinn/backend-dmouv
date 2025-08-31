
FROM node:20-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .

RUN npx prisma generate


FROM node:20-alpine
WORKDIR /usr/src/app

ENV NODE_ENV=production
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/src ./src

EXPOSE 2000
CMD [ "node", "src/server.js" ]