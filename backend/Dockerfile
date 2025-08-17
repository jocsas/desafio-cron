FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3001

ENV SERVER_API_PORT=3001
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379

CMD ["node", "src/server.js"]
