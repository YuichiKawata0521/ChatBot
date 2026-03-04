# APIエンドポイント一覧（現行実装準拠）

本ドキュメントは `backend/src/routes` に実装されているルートを基準とする。

## 1. 共通

| メソッド | エンドポイント | 認証 | 概要 |
| --- | --- | --- | --- |
| **GET** | `/api/health` | 不要 | ヘルスチェック |
| **GET** | `/api/v1/csrf-token` | 不要 | CSRFトークン取得（セッション中は user 情報も返却） |

## 2. 認証 (Auth)

| メソッド | エンドポイント | 認証 | 概要 |
| --- | --- | --- | --- |
| **POST** | `/api/v1/auth/login` | 不要 | ログイン（セッション開始） |
| **POST** | `/api/v1/auth/logout` | 必須 | ログアウト（セッション破棄） |
| **GET** | `/api/v1/auth/me` | 必須 | ログイン中ユーザー情報を取得 |
| **POST** | `/api/v1/auth/register` | 不要 | ユーザー登録 |

## 3. チャット (Chat)

※本セクションは全APIで認証必須。

| メソッド | エンドポイント | 概要 |
| --- | --- | --- |
| **POST** | `/api/v1/chat/` | メッセージ送信（LLM応答生成） |
| **POST** | `/api/v1/chat/agent/rdd` | RDDエージェント実行 |
| **POST** | `/api/v1/chat/threads` | スレッド作成 |
| **GET** | `/api/v1/chat/threads` | スレッド一覧取得 |
| **POST** | `/api/v1/chat/delete-history` | 全スレッド削除 |
| **GET** | `/api/v1/chat/documents` | チャット用ドキュメント一覧取得 |
| **GET** | `/api/v1/chat/{threadId}` | スレッド履歴取得 |

## 4. ドキュメント管理 (Documents)

※本セクションは全APIで「認証必須 + admin権限必須」。

| メソッド | エンドポイント | 概要 |
| --- | --- | --- |
| **GET** | `/api/v1/documents/` | ドキュメント一覧取得 |
| **POST** | `/api/v1/documents/` | ドキュメント登録 |
| **GET** | `/api/v1/documents/{id}` | ドキュメント内容取得 |
| **POST** | `/api/v1/documents/upload` | ドキュメントファイルアップロード（`multipart/form-data`） |
| **POST** | `/api/v1/documents/delete/{id}` | ドキュメント削除 |
| **POST** | `/api/v1/documents/file/{id}` | ドキュメントファイル差し替え（`multipart/form-data`） |
| **POST** | `/api/v1/documents/rename/{id}` | ドキュメント名更新 |

## 5. ユーザー管理 (Users)

※本セクションは全APIで「認証必須 + admin権限必須」。

| メソッド | エンドポイント | 概要 |
| --- | --- | --- |
| **GET** | `/api/v1/users/departments` | 部署一覧取得 |
| **GET** | `/api/v1/users/csv-template` | ユーザーCSVテンプレート取得 |
| **POST** | `/api/v1/users/csv` | ユーザーCSVアップロード（`multipart/form-data`） |
| **GET** | `/api/v1/users/` | ユーザー一覧取得 |
| **POST** | `/api/v1/users/` | ユーザー作成 |
| **PUT** | `/api/v1/users/{id}` | ユーザー更新 |
| **DELETE** | `/api/v1/users/{id}` | ユーザー削除 |

## 6. システムログ (Logs)

※本セクションは全APIで「認証必須 + admin権限必須」。

| メソッド | エンドポイント | 概要 |
| --- | --- | --- |
| **GET** | `/api/v1/logs/` | ログ一覧取得 |

## 7. ダッシュボード (Dashboard)

※本セクションは全APIで「認証必須 + admin権限必須」。

| メソッド | エンドポイント | 概要 |
| --- | --- | --- |
| **GET** | `/api/v1/dashboard/operation/kpi` | 運用ダッシュボードKPIサマリー |
| **GET** | `/api/v1/dashboard/operation/trend` | 運用ダッシュボード利用推移 |
| **GET** | `/api/v1/dashboard/operation/rag-quality` | 運用ダッシュボードRAG品質指標 |
| **GET** | `/api/v1/dashboard/operation/cost` | 運用ダッシュボードコスト推移 |
| **GET** | `/api/v1/dashboard/operation/low-usage-departments` | 低利用部署ランキング |
| **GET** | `/api/v1/dashboard/analysis/active-user-trend` | 分析ダッシュボードアクティブユーザー推移 |
| **GET** | `/api/v1/dashboard/analysis/rag-quality-trend` | 分析ダッシュボードRAG品質推移 |
| **GET** | `/api/v1/dashboard/analysis/rag-quality-details` | 分析ダッシュボードRAG品質日次詳細 |
| **GET** | `/api/v1/dashboard/analysis/department-usage` | 分析ダッシュボード部署別利用状況 |
| **GET** | `/api/v1/dashboard/analysis/department-members` | 分析ダッシュボード部署メンバー詳細 |
| **GET** | `/api/v1/dashboard/analysis/cost-trend` | 分析ダッシュボードコスト推移 |

---
