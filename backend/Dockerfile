FROM node:22

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install deps; postinstall runs `prisma generate` -> writes to /app/src/generated/prisma inside the image.
RUN MIGRATION_DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npm install

COPY . .

# Ensure the generated client directory exists so the anonymous volume in docker-compose
# has something to mount and the bind mount cannot shadow it away.
RUN mkdir -p /app/src/generated/prisma

# Entrypoint: apply migrations + regenerate Prisma client (cheap no-op if already current),
# then hand off to the CMD for hot-reload dev mode.
# Using `sh -c` so the && chain is explicit and failures abort startup.
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma generate && npm run start:dev"]
