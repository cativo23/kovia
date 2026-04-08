FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npx", "nuxt", "dev", "--host", "0.0.0.0"]
