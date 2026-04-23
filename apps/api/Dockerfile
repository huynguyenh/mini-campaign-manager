FROM node:20-alpine

WORKDIR /app

RUN corepack enable

# Copy workspace manifests for layer caching
COPY package.json yarn.lock .yarnrc.yml* ./
COPY tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN yarn install --immutable

# Copy sources
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

EXPOSE 4000
CMD ["yarn", "workspace", "@mcm/api", "start"]
