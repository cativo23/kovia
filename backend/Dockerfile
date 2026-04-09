FROM node:22

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN MIGRATION_DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npm install

COPY . .

CMD ["npm", "run", "start:dev"]
