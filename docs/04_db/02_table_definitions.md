# テーブル定義書

このドキュメントは `backend/db/01_tables.sql` のテーブル構造に合わせた定義書です。

## departments (部署)

|No.|論理名|物理名|データ型|長さ|NULL許可|デフォルト値|PK|FK|制約|コメント|
|---|------|---------------|-----------|---|------|--------|--|--|-----------------|-------------|
|1|部署ID|id|BIGINT|-|不可|IDENTITY|◯|-|-|内部識別子|
|2|本部コード|dep1_code|VARCHAR|20|可|-|-|-|-|本部コード|
|3|本部名|dep1_name|VARCHAR|100|可|-|-|-|-|本部名|
|4|部コード|dep2_code|VARCHAR|20|可|-|-|-|-|部コード|
|5|部名|dep2_name|VARCHAR|100|可|-|-|-|-|部名|
|6|課コード|dep3_code|VARCHAR|20|可|-|-|-|-|課コード|
|7|課名|dep3_name|VARCHAR|100|可|-|-|-|-|課名|
|8|作成日時|created_at|TIMESTAMPTZ|-|不可|now()|-|-|-|作成日時|
|9|更新日時|updated_at|TIMESTAMPTZ|-|不可|now()|-|-|-|更新日時|
|10|ユニーク制約|-|-|-|-|-|-|-|UNIQUE(dep1_code, dep2_code, dep3_code)|同一部署構成の重複防止|

## users (ユーザー)

|No.|論理名|物理名|データ型|長さ|NULL許可|デフォルト値|PK|FK|制約|コメント|
|---|------|---------------|-----------|---|------|--------|--|--|-----------------|-------------|
|1|ユーザーID|id|BIGINT|-|不可|IDENTITY|◯|-|-|内部識別子|
|2|社員番号|employee_no|VARCHAR|20|不可|-|-|-|UNIQUE|業務用ユーザー識別子|
|3|ユーザー名|user_name|VARCHAR|20|不可|-|-|-|-|表示名|
|4|メールアドレス|email|VARCHAR|100|不可|-|-|-|UNIQUE|メールアドレス|
|5|パスワード|password|VARCHAR|255|不可|-|-|-|-|ハッシュ化保存|
|6|所属部署ID|department_id|BIGINT|-|可|-|-|departments.id|REFERENCES departments(id)|部署参照|
|7|権限|role|TEXT|-|不可|'user'|-|-|CHECK (role IN ('user','admin'))|ユーザー権限|
|8|全社管理者フラグ|master_admin|BOOLEAN|-|不可|false|-|-|-|全社閲覧管理者|
|9|登録済フラグ|registered_flag|BOOLEAN|-|可|false|-|-|-|初回登録完了判定|
|10|削除日時|deleted_at|TIMESTAMPTZ|-|可|NULL|-|-|-|論理削除日時|
|11|作成日時|created_at|TIMESTAMPTZ|-|不可|now()|-|-|-|作成日時|
|12|更新日時|updated_at|TIMESTAMPTZ|-|不可|now()|-|-|-|更新日時|
|13|パスワードリセットトークン|password_reset_token|VARCHAR|255|可|NULL|-|-|-|トークン(ハッシュ化)|
|14|パスワードリセット有効期限|password_reset_expires|TIMESTAMPTZ|-|可|NULL|-|-|-|有効期限|

## department_admins (部署管理者)

|No.|論理名|物理名|データ型|長さ|NULL許可|デフォルト値|PK|FK|制約|コメント|
|---|------|---------------|-----------|---|------|--------|--|--|-----------------|-------------|
|1|ID|id|BIGINT|-|不可|IDENTITY|◯|-|-|内部識別子|
|2|ユーザーID|user_id|BIGINT|-|不可|-|-|users.id|REFERENCES users(id) ON DELETE CASCADE|管理者ユーザー|
|3|部署ID|department_id|BIGINT|-|不可|-|-|departments.id|REFERENCES departments(id) ON DELETE CASCADE|管理対象部署|
|4|作成日時|created_at|TIMESTAMPTZ|-|不可|now()|-|-|-|作成日時|
|5|ユニーク制約|-|-|-|-|-|-|-|UNIQUE(user_id, department_id)|重複登録防止|

## sessions (セッション管理)

| No. | 論理名     | 物理名    | データ型        | 長さ | NULL許可 | デフォルト値 | PK | FK | 制約          | コメント      |
| --- | ------- | ------ | ----------- | -- | ------ | ------ | -- | -- | ----------- | --------- |
| 1   | セッションID | sid    | TEXT        | -  | 不可     | -      | ◯  | -  | COLLATE "C" | セッションキー   |
| 2   | セッション情報 | sess   | JSONB       | -  | 不可     | -      | -  | -  | -           | セッションデータ  |
| 3   | 有効期限    | expire | TIMESTAMPTZ | 6  | 不可     | -      | -  | -  | -           | セッション失効日時 |

## documents (RAG用ドキュメント)

| No. | 論理名      | 物理名         | データ型        | 長さ  | NULL許可 | デフォルト値   | PK | FK | 制約                       | コメント     |
| --- | -------- | ----------- | ----------- | --- | ------ | -------- | -- | -- | ------------------------ | -------- |
| 1   | ドキュメントID | id          | BIGINT      | -   | 不可     | IDENTITY | ◯  | -  | -                        | 内部識別子    |
| 2   | 取得元種別    | source      | TEXT        | -   | 不可     | -        | -  | -  | CHECK (source IN ('pdf','word','markdown','txt','csv')) | ドキュメント種別 |
| 3   | タイトル     | title       | VARCHAR     | 100 | 不可     | -        | -  | -  | -                        | 表示用タイトル  |
| 4   | メタデータ    | metadata    | JSONB       | -   | 可      | -        | -  | -  | -                        | ファイル情報等  |
| 5   | ステータス    | status      | VARCHAR     | 20  | 不可     | 'pending' | - | -  | CHECK (status IN ('pending','processing','completed','failed')) | 処理状態 |
| 6   | エラーメッセージ | error_message | TEXT     | -   | 可      | -        | -  | -  | -                        | 処理エラー時メッセージ |
| 7   | アップロード日時 | uploaded_at | TIMESTAMPTZ | -   | 不可     | now()    | -  | -  | -                        | 登録日時     |

## parent_chunks (親チャンク)

| No. | 論理名      | 物理名          | データ型        | 長さ | NULL許可 | デフォルト値   | PK | FK           | 制約                  | コメント     |
| --- | -------- | ------------ | ----------- | -- | ------ | -------- | -- | ------------ | ------------------- | -------- |
| 1   | 親チャンクID  | id           | BIGINT      | -  | 不可     | IDENTITY | ◯  | -            | -                   | 内部識別子    |
| 2   | ドキュメントID | document_id  | BIGINT      | -  | 不可     | -        | -  | documents.id | REFERENCES documents(id) ON DELETE CASCADE | 所属ドキュメント |
| 3   | 親チャンク番号  | parent_index | INTEGER     | -  | 不可     | -        | -  | -            | UNIQUE(document_id, parent_index) | 文書内順序    |
| 4   | 本文       | content      | TEXT        | -  | 不可     | -        | -  | -            | -                   | 親単位テキスト  |
| 5   | 作成日時     | created_at   | TIMESTAMPTZ | -  | 不可     | now()    | -  | -            | -                   | 作成日時     |

## child_chunks (子チャンク / embedding)

| No. | 論理名     | 物理名             | データ型        | 長さ   | NULL許可 | デフォルト値   | PK | FK               | 制約                   | コメント     |
| --- | ------- | --------------- | ----------- | ---- | ------ | -------- | -- | ---------------- | -------------------- | -------- |
| 1   | 子チャンクID | id              | BIGINT      | -    | 不可     | IDENTITY | ◯  | -                | -                    | 内部識別子    |
| 2   | 親チャンクID | parent_chunk_id | BIGINT      | -    | 不可     | -        | -  | parent_chunks.id | REFERENCES parent_chunks(id) ON DELETE CASCADE | 親チャンク    |
| 3   | 子チャンク番号 | child_index     | INTEGER     | -    | 不可     | -        | -  | -                | UNIQUE(parent_chunk_id, child_index) | 親内順序     |
| 4   | 本文      | content         | TEXT        | -    | 不可     | -        | -  | -                | -                    | 検索単位テキスト |
| 5   | 埋め込み    | embedding       | VECTOR      | 1536 | 不可     | -        | -  | -                | -                    | ベクトル表現   |
| 6   | トークン数   | token_count     | INTEGER     | -    | 可      | -        | -  | -                | -                    | token数   |
| 7   | 作成日時    | created_at      | TIMESTAMPTZ | -    | 不可     | now()    | -  | -                | -                    | 作成日時     |

## threads (スレッド)

| No. | 論理名    | 物理名          | データ型        | 長さ | NULL許可 | デフォルト値   | PK | FK       | 制約                | コメント   |
| --- | ------ | ------------ | ----------- | -- | ------ | -------- | -- | -------- | ----------------- | ------ |
| 1   | スレッドID | id           | BIGINT      | -  | 不可     | IDENTITY | ◯  | -        | -                 | 内部識別子  |
| 2   | ユーザーID | user_id      | BIGINT      | -  | 不可     | -        | -  | users.id | REFERENCES users(id) ON DELETE CASCADE | 作成者    |
| 3   | 部署ID    | department_id| BIGINT      | -  | 可      | -        | -  | departments.id | REFERENCES departments(id) | 所属部署（任意） |
| 4   | タイトル   | title        | TEXT        | -  | 不可     | -        | -  | -        | -                 | スレッド名  |
| 5   | 作成日時   | created_at   | TIMESTAMPTZ | -  | 不可     | now()    | -  | -        | -                 | 作成日時   |
| 6   | 更新日時   | updated_at   | TIMESTAMPTZ | -  | 不可     | now()    | -  | -        | -                 | 更新日時   |
| 7   | 履歴表示   | show_history | BOOLEAN     | -  | 不可     | false    | -  | -        | -                 | 履歴表示可否 |

## messages (メッセージ)

| No. | 論理名        | 物理名         | データ型        | 長さ | NULL許可 | デフォルト値   | PK | FK           | 制約                           | コメント    |
| --- | ---------- | ----------- | ----------- | -- | ------ | -------- | -- | ------------ | ---------------------------- | ------- |
| 1   | メッセージID    | id          | BIGINT      | -  | 不可     | IDENTITY | ◯  | -            | -                            | 内部識別子   |
| 2   | スレッドID     | thread_id   | BIGINT      | -  | 不可     | -        | -  | threads.id   | REFERENCES threads(id)        | 所属スレッド  |
| 3   | 送信者        | sender      | TEXT        | -  | 可      | -        | -  | -            | CHECK (sender IN ('user','assistant','system')) | 送信元     |
| 4   | 本文         | content     | TEXT        | -  | 不可     | -        | -  | -            | -                            | メッセージ本文 |
| 5   | 入力トークン数 | input_token_count | INTEGER | -  | 可      | 0        | -  | -            | -                            | 入力トークン数|
| 6   | 出力トークン数 | output_token_count | INTEGER| -  | 可      | 0        | -  | -            | -                            | 出力トークン数|
| 7   | 評価         | rating      | VARCHAR     | 10  | 可      | -        | -  | -            | CHECK (rating IN ('good','bad')) | ユーザー評価|
| 8   | 作成日時       | created_at  | TIMESTAMPTZ | -  | 不可     | now()    | -  | -            | -                            | 作成日時    |

## message_references (メッセージ参照ドキュメント)

| No. | 論理名        | 物理名         | データ型        | 長さ | NULL許可 | デフォルト値 | PK | FK                        | 制約 | コメント |
| --- | ---------- | ----------- | ----------- | -- | ------ | -------- | -- | ------------------------- | ---- | ------- |
| 1   | ID           | id          | BIGINT      | -  | 不可     | IDENTITY | ◯  | -                         | -    | 内部識別子 |
| 2   | メッセージID  | message_id  | BIGINT      | -  | 不可     | -        | -  | messages.id               | REFERENCES messages(id) ON DELETE CASCADE | 対象メッセージ |
| 3   | ドキュメントID | document_id | BIGINT      | -  | 不可     | -        | -  | documents.id              | REFERENCES documents(id) ON DELETE CASCADE | 参照ドキュメント |
| 4   | 子チャンクID  | child_chunk_id | BIGINT   | -  | 可      | -        | -  | child_chunks.id           | REFERENCES child_chunks(id) | 該当チャンク |
| 5   | 関連度スコア   | relevance_score | FLOAT   | -  | 可      | -        | -  | -                         | -    | スコア |
| 6   | 作成日時       | created_at  | TIMESTAMPTZ | -  | 不可     | now()    | -  | -                         | -    | 作成日時 |

## system_logs (システムログ)

| No. | 論理名     | 物理名         | データ型        | 長さ | NULL許可 | デフォルト値   | PK | FK | 制約 | コメント            |
| --- | ------- | ----------- | ----------- | -- | ------ | -------- | -- | -- | -- | --------------- |
| 1   | ログID    | id          | BIGINT      | -  | 不可     | IDENTITY | ◯  | -  | -  | 内部識別子           |
| 2   | ログレベル   | level       | TEXT        | -  | 不可     | -        | -  | -  | -  | error/warn/info |
| 3   | イベント種別  | event_type  | TEXT        | -  | 不可     | -        | -  | -  | -  | イベント分類          |
| 4   | メッセージ   | message     | TEXT        | -  | 不可     | -        | -  | -  | -  | 要約              |
| 5   | コンテキスト  | context     | JSONB       | -  | 可      | -        | -  | -  | -  | 付加情報            |
| 6   | リクエストID | request_id  | TEXT        | -  | 可      | -        | -  | -  | -  | トレース用           |
| 7   | ユーザーID  | user_id     | BIGINT      | -  | 可      | -        | -  | users.id | -  | 操作者             |
| 8   | 部署ID      | department_id | BIGINT    | -  | 可      | -        | -  | departments.id | REFERENCES departments(id) | 関連部署 |
| 9   | サービス名   | service     | TEXT        | -  | 不可     | -        | -  | -  | -  | api/batch等      |
| 10  | 環境      | environment | TEXT        | -  | 不可     | -        | -  | -  | -  | prod/stg        |
| 11  | 作成日時    | created_at  | TIMESTAMPTZ | -  | 不可     | now()    | -  | -  | -  | 発生日時            |
