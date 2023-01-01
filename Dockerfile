FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --registry https://repo.huaweicloud.com/repository/npm/

COPY . .

CMD node src/main.mjs
