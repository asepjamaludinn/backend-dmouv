FROM node:20

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --include=dev
RUN npm install -g nodemon

COPY . .

# Generate Prisma client saat build, jangan di CMD
RUN npx prisma generate

EXPOSE 2000 5555

# Jalankan server
CMD ["nodemon", "--legacy-watch", "src/server.js"]

