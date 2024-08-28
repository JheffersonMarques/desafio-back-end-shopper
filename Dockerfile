FROM node:22.7.0

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

COPY . .

RUN npm install
RUN npx tsc

EXPOSE 8080

CMD ["node", "build/index.js"]