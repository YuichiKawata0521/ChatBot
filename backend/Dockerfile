# ---------- base ----------
# chownで/app以下すべて(-R)の所有者をnode, グループをnodeに変更
# --------------------------
FROM node:22-bullseye-slim AS base
WORKDIR /app
RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
RUN chown -R node:node /app
USER node

# ---------- builder ----------
# baseを継承(作業ディレクトリ、権限周りを継承)
# キャッシュ利用のために先にpackage*.jsonをコピー
# --------------------------
FROM base AS builder
USER root
COPY --chown=node:node package*.json ./
RUN npm ci
COPY --chown=node:node . .
RUN npm run build
USER node

# ---------- dev ----------
# 開発環境用
# package.json内のscripts:devを実行
# --------------------------
FROM base AS dev
ENV NODE_ENV=development
COPY --chown=node:node package*.json ./
RUN npm ci
COPY --chown=node:node . .
RUN chmod +x scripts/entrypoint.dev.sh
CMD ["sh", "scripts/entrypoint.dev.sh"]

# ---------- prod ----------
# 本番環境用
# builderでコピーしたdistとpackage*.jsonをコピー
# 本番に必要なものだけ--omit=devでインストール
# --------------------------
FROM base AS prod
ENV NODE_ENV=production
EXPOSE 3000
USER root
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --chown=node:node src ./src
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev
USER node

CMD ["node", "dist/index.js"]
