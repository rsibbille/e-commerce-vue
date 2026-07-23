FROM node:24-bookworm-slim AS base
WORKDIR /app
COPY package.json package-lock.json ./

FROM base AS dependencies
ENV NODE_ENV=development
RUN npm ci

FROM dependencies AS development
COPY . .
EXPOSE 3002
CMD ["npm", "run", "dev"]

FROM dependencies AS test
COPY . .
ENV NODE_ENV=test APP_ENV=test
CMD ["npm", "test"]

FROM base AS production-dependencies
ENV NODE_ENV=production
RUN npm ci --omit=dev && npm cache clean --force

FROM node:24-bookworm-slim AS runtime
RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
       /usr/local/lib/node_modules/npm \
       /usr/local/lib/node_modules/corepack \
       /opt/yarn* \
       /usr/local/bin/npm /usr/local/bin/npx \
       /usr/local/bin/yarn /usr/local/bin/yarnpkg \
       /usr/local/bin/corepack /usr/local/bin/pnpm /usr/local/bin/pnpx
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3002
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
USER node
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "require('http').get('http://127.0.0.1:3002/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"]
CMD ["node", "src/app.js"]

FROM runtime AS staging
ENV APP_ENV=staging

FROM runtime AS production
ENV APP_ENV=production
