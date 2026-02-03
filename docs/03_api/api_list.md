# APIエンドポイント一覧

## 1. 認証 (Auth)

ログイン、セッション管理、自分自身の情報取得に関するAPI群です。

| メソッド | エンドポイント | 概要 | 関連画面/機能 |
| --- | --- | --- | --- |
| **POST** | `/api/auth/login` | ログイン (Cookieにセッション発行) | SCR-01 / FN-A01 |
| **POST** | `/api/auth/logout` | ログアウト (セッション破棄) | 共通 |
| **GET** | `/api/auth/me` | ログイン中のユーザー情報・権限を取得 | 共通 (初期化時) |
| **POST** | `/api/auth/register` | ユーザー自身の新規登録 (許可されている場合) | SCR-01 / FN-A02 |

## 2. チャット (Chat)

チャットスレッドとメッセージの送受信を行う、アプリの中核機能です。

| メソッド | エンドポイント | 概要 | 関連画面/機能 |
| --- | --- | --- | --- |
| **GET** | `/api/threads` | 自分のスレッド一覧を取得 (ページネーション) | SCR-02 / FN-B01 |
| **POST** | `/api/threads` | 新規スレッド作成 | SCR-02 / FN-B02 |
| **PATCH** | `/api/threads/{threadId}` | スレッドタイトル等の更新 | SCR-02 / FN-B06 |
| **DELETE** | `/api/threads/{threadId}` | スレッド削除 (論理削除) | SCR-02 / FN-B06 |
| **GET** | `/api/threads/{threadId}/messages` | スレッド内のメッセージ履歴取得 | SCR-02 / FN-B04 |
| **POST** | `/api/threads/{threadId}/messages` | メッセージ送信 (LLM応答生成)<br><br>※Bodyで `useRag: true/false` を指定 | SCR-02 / FN-B03, FN-B05 |
| **POST** | `/api/messages/{messageId}/rating` | 回答へのGood/Bad評価登録 | SCR-02 / FN-B07 |

## 3. ドキュメント管理 (Admin - RAG)

RAGで使用するドキュメントのアップロードや管理を行います。管理者権限が必要です。

| メソッド | エンドポイント | 概要 | 関連画面/機能 |
| --- | --- | --- | --- |
| **GET** | `/api/admin/documents` | ドキュメント一覧取得 (検索・フィルタ) | SCR-03 / FN-C02 |
| **POST** | `/api/admin/documents` | ドキュメント新規登録 (ファイルアップロード)<br><br>`multipart/form-data` | SCR-03 / FN-C01 |
| **GET** | `/api/admin/documents/{docId}` | ドキュメント詳細・メタデータ取得 | SCR-03 / FN-C05, C07 |
| **DELETE** | `/api/admin/documents/{docId}` | ドキュメント削除 | SCR-03 / FN-C06 |
| **PATCH** | `/api/admin/documents/{docId}/status` | 有効/無効ステータスの切り替え | SCR-03 / FN-C03 |
| **POST** | `/api/admin/documents/{docId}/reindex` | Embeddingの再生成実行 (非同期) | SCR-03 / FN-C04 |

## 4. ダッシュボード・分析 (Dashboard)

運用・分析画面に必要な集計データを返却します。
※パラメータ (`?from=...&to=...&dep=...`) でフィルタリングを行います。

| メソッド | エンドポイント | 概要 | 関連画面/機能 |
| --- | --- | --- | --- |
| **GET** | `/api/dashboard/kpi` | KPIサマリー (DAU, RAG利用率, エラー率等) | SCR-04 / FN-D01 |
| **GET** | `/api/dashboard/usage` | 利用推移 (Msg数, User数, スレッド数) | SCR-04, 05 / FN-D02, E07, E08 |
| **GET** | `/api/dashboard/rag` | RAG品質指標 (ヒット率, 参照数) | SCR-04, 05 / FN-D04, E13, E14 |
| **GET** | `/api/dashboard/cost` | コスト推移・集計 (トークン数ベース) | SCR-04, 05 / FN-D06, E15, E17 |
| **GET** | `/api/dashboard/errors` | エラー発生推移・内訳 | SCR-05 / FN-E18, E19 |
| **GET** | `/api/dashboard/ranking/departments` | 部署別利用ランキング | SCR-04, 05 / FN-D05, E16 |
| **GET** | `/api/dashboard/ranking/documents` | ドキュメント参照ランキング | SCR-05 / FN-E12 |

## 5. ユーザー管理 (Admin - Users)

管理者がユーザーを管理するためのAPIです。

| メソッド | エンドポイント | 概要 | 関連画面/機能 |
| --- | --- | --- | --- |
| **GET** | `/api/admin/users` | ユーザー一覧取得 (検索・フィルタ) | SCR-06 / FN-F01, F04 |
| **POST** | `/api/admin/users` | 新規ユーザー作成 | SCR-06 / FN-F12 |
| **GET** | `/api/admin/users/{userId}` | ユーザー詳細取得 | SCR-06 / FN-F06 |
| **PATCH** | `/api/admin/users/{userId}` | ユーザー情報更新 (部署, 権限, 停止フラグ等) | SCR-06 / FN-F07, F09 |
| **DELETE** | `/api/admin/users/{userId}` | ユーザー削除 (論理削除) | SCR-06 / FN-F11 |
| **POST** | `/api/admin/users/{userId}/reset-password` | パスワード強制リセット | SCR-06 / FN-F10 |

## 6. システムログ (Admin - Logs)

システムログを閲覧するためのAPIです。

| メソッド | エンドポイント | 概要 | 関連画面/機能 |
| --- | --- | --- | --- |
| **GET** | `/api/admin/logs` | ログ一覧取得 (検索・フィルタ) | SCR-07 / FN-G01 |
| **GET** | `/api/admin/logs/{logId}` | ログ詳細取得 | SCR-07 / FN-G09 |

## 7. マスターデータ・その他 (Common)

プルダウンなどで使用するマスターデータ取得用です。

| メソッド | エンドポイント | 概要 | 関連画面/機能 |
| --- | --- | --- | --- |
| **GET** | `/api/departments` | 部署階層構造の取得 (入力補完用) | SCR-05, 06 / FN-F02 |
| **GET** | `/api/health` | ヘルスチェック (死活監視用) | - |

---
