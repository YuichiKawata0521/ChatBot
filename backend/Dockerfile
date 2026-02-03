# ---------- base ----------
# chownで/app以下すべて(-R)の所有者をnode, グループをnodeに変更
# --------------------------
FROM node:22-bullseye-slim AS base
WORKDIR /app
RUN chown -R node:node /app
USER node

# ---------- builder ----------
# baseを継承(作業ディレクトリ、権限周りを継承)
# キャッシュ利用のために先にpackage*.jsonをコピー
# --------------------------
FROM base AS builder
COPY --chown=node:node package*.json ./
RUN npm ci
COPY --chown=node:node . .
RUN npm run build

# ---------- dev ----------
# 開発環境用
# package.json内のscripts:devを実行
# --------------------------
FROM base AS dev
ENV NODE_ENV=development
COPY --chown=node:node package*.json ./
RUN npm install
CMD ["npm", "run", "dev"]

# ---------- prod ----------
# 本番環境用
# builderでコピーしたdistとpackage*.jsonをコピー
# 本番に必要なものだけ--omit=devでインストール
# --------------------------
FROM base AS prod
ENV NODE_ENV=production
EXPOSE 3000

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev

CMD ["node", "dist/index.js"]
