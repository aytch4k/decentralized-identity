FROM node:16

WORKDIR /app
COPY ./package.json ./
RUN npm install
COPY ./server.js ./

EXPOSE 4000
ENTRYPOINT ["node", "server.js"]
