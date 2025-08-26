FROM node:20

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --include=dev
RUN npm install -g nodemon

COPY . .

RUN npx prisma generate

EXPOSE 2000 5555

CMD ["node", "src/server.js"]


