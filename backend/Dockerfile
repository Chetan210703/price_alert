FROM mcr.microsoft.com/playwright:v1.57.0-jammy

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV PORT=3001
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

EXPOSE 3001

CMD ["npm", "start"]
