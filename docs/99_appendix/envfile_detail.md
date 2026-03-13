## 環境変数ファイルの使い分け

このリポジトリでは、開発用と本番用で `.env` を分けて運用します。

| ファイル名 | 用途 | Git 管理 |
| --- | --- | --- |
| `.env` | 開発環境で実際に読み込む値 | しない |
| `.env.example` | 開発環境用のサンプル | する |
| `.env.production` | 本番環境で実際に読み込む値 | しない |
| `.env.production.example` | 本番環境用のサンプル | する |

補足:
- `.example` ファイルには秘密情報を入れないでください。
- 本番値は `docker-compose.prod.yml` から `.env.production` を参照します。

## Docker Compose の使い分け

開発環境は `docker-compose.yml`、本番環境は `docker-compose.prod.yml` を使用します。

### 開発環境

```bash
docker compose up -d --build
```

### 本番環境

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

停止する場合:

```bash
docker compose down
docker compose -f docker-compose.prod.yml down
```

## ユーザー管理で使用する追加環境変数

- `INITIAL_USER_PASSWORD`
	- 新規ユーザー登録時の初期パスワード、および管理画面の「パスワードリセット」で再設定するパスワード
	- 必須項目です。未設定の場合、ユーザー登録/リセットAPIはエラーになります