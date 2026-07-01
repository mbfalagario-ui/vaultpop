FROM node:24-bookworm-slim

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY backend ./backend
COPY src/monetization ./src/monetization
COPY tsconfig.json ./

EXPOSE 8080
CMD ["pnpm", "backend:start"]
