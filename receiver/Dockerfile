FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3002

ENV RECEIVER_API_PORT=3002
ENV LOGS_DIR=/app/logs

CMD ["node", "src/server.js"]
