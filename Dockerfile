FROM node:20-bookworm-slim

WORKDIR /app

COPY source/package.json ./
COPY source/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

COPY source/ ./

EXPOSE 5000

CMD ["npm", "start"]
