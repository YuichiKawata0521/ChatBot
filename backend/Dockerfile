# ---------- base ----------
# chownで/app以下すべて(-R)の所有者をnode, グループをnodeに変更
# --------------------------
FROM node:25-bullseye-slim AS base
WORKDIR /app
RUN chown -R node:node /app
USER node

# ---------- builder ----------
# baseを継承(作業ディレクトリ、権限周りを継承)
# キャッシュ利用のために先にpackage*.jsonをコピー
# --omit=devで本番に必要な依存関係だけをインストール
# --------------------------
FROM base AS builder
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build

# ---------- dev ----------
# 開発環境用
# package.json内のscripts:devを実行
# --------------------------
FROM base AS dev
ENV NODE_ENV=development
COPY package*.json ./
RUN npm install
CMD ["npm", "run", "dev"]

# ---------- prod ----------
# 本番環境用
# builderでコピーしたdistとnode_modulesをコピー
# package*.jsonをコピーし、dist/index.jsを実行
# --------------------------
FROM base AS prod
ENV NODE_ENV=production
EXPOSE 3000

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

CMD ["node", "dist/index.js"]
