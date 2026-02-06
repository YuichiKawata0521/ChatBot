# テーブル定義書

## users (ユーザー)

|No.|論理名|物理名|データ型|長さ|NULL許可|デフォルト値|PK|FK|制約|コメント|
|---|------|---------------|-----------|---|------|--------|--|--|-----------------|-------------|
|1|ユーザーID|id|BIGINT|-|不可|IDENTITY|◯|-|-|内部識別子|
|2|社員番号|employee_no|VARCHAR|20|不可|-|-|-|UNIQUE|業務用ユーザー識別子|
|3|ユーザー名|user_name|VARCHAR|20|不可|-|-|-|-|表示名|
|4|メールアドレス|email|VARCHAR|100|不可|-|-|-|UNIQUE|メールアドレス|
|5|パスワード|password|VARCHAR|255|不可|-|-|-|-|ハッシュ＋ソルト＋ペッパー|
|6|本部コード|dep1_code|VARCHAR|20|可|-|-|-|-|所属本部コード|
|7|本部名|dep1_name|VARCHAR|100|可|-|-|-|-|所属本部名|
|8|部コード|dep2_code|VARCHAR|20|可|-|-|-|-|所属部コード|
|9|部名|dep2_name|VARCHAR|100|可|-|-|-|-|所属部名|
|10|課コード|dep3_code|VARCHAR|20|可|-|-|-|-|所属課コード|
|11|課名|dep3_name|VARCHAR|100|可|-|-|-|-|所属課名|
|12|権限|role|TEXT|-|不可|'user'|-|-|CHECK(user/admin)|ユーザー権限|
|13|登録済フラグ|registered_flag|BOOLEAN|-|可|false|-|-|-|初回登録完了判定|
|14|作成日時|created_at|TIMESTAMPTZ|-|不可|now()|-|-|-|作成日時|
|15|更新日時|updated_at|TIMESTAMPTZ|-|不可|now()|-|-|TRIGGER|更新時自動更新|
|16|パスワードリセットトークン|password_reset_token|VARCHAR|255|可|-|-|-|-|パスワードリセット時のトークン(ハッシュ化)|
|17|パスワードリセット期限|password_reset_expires|TIMESTAMPTZ|-|可|-|-|-|-|発行から1時間|

## sessions (セッション管理)
| No. | 論理名     | 物理名    | データ型        | 長さ | NULL許可 | デフォルト値 | PK | FK | 制約          | コメント      |
| --- | ------- | ------ | ----------- | -- | ------ | ------ | -- | -- | ----------- | --------- |
| 1   | セッションID | sid    | TEXT        | -  | 不可     | -      | ◯  | -  | COLLATE "C" | セッションキー   |
| 2   | セッション情報 | sess   | JSONB       | -  | 不可     | -      | -  | -  | -           | セッションデータ  |
| 3   | 有効期限    | expire | TIMESTAMPTZ | 6  | 不可     | -      | -  | -  | -           | セッション失効日時 |

## documents (RAG対象ドキュメント)
| No. | 論理名      | 物理名         | データ型        | 長さ  | NULL許可 | デフォルト値   | PK | FK | 制約                       | コメント     |
| --- | -------- | ----------- | ----------- | --- | ------ | -------- | -- | -- | ------------------------ | -------- |
| 1   | ドキュメントID | id          | BIGINT      | -   | 不可     | IDENTITY | ◯  | -  | -                        | 内部識別子    |
| 2   | 取得元種別    | source      | TEXT        | -   | 不可     | -        | -  | -  | CHECK(pdf/word/markdown) | ドキュメント種別 |
| 3   | タイトル     | title       | VARCHAR     | 100 | 不可     | -        | -  | -  | -                        | 表示用タイトル  |
| 4   | メタデータ    | metadata    | JSONB       | -   | 可      | -        | -  | -  | -                        | ファイル情報等  |
| 5   | アップロード日時 | uploaded_at | TIMESTAMPTZ | -   | 不可     | now()    | -  | -  | -                        | 登録日時     |

## parent_chunks (親チャンク)
| No. | 論理名      | 物理名          | データ型        | 長さ | NULL許可 | デフォルト値   | PK | FK           | 制約                  | コメント     |
| --- | -------- | ------------ | ----------- | -- | ------ | -------- | -- | ------------ | ------------------- | -------- |
| 1   | 親チャンクID  | id           | BIGINT      | -  | 不可     | IDENTITY | ◯  | -            | -                   | 内部識別子    |
| 2   | ドキュメントID | document_id  | BIGINT      | -  | 不可     | -        | -  | documents.id | ON DELETE CASCADE   | 所属ドキュメント |
| 3   | 親チャンク番号  | parent_index | INTEGER     | -  | 不可     | -        | -  | -            | UNIQUE(document_id) | 文書内順序    |
| 4   | 本文       | content      | TEXT        | -  | 不可     | -        | -  | -            | -                   | 親単位テキスト  |
| 5   | 作成日時     | created_at   | TIMESTAMPTZ | -  | 不可     | now()    | -  | -            | -                   | 作成日時     |

## child_chunks (子チャンク / embedding)
| No. | 論理名     | 物理名             | データ型        | 長さ   | NULL許可 | デフォルト値   | PK | FK               | 制約                   | コメント     |
| --- | ------- | --------------- | ----------- | ---- | ------ | -------- | -- | ---------------- | -------------------- | -------- |
| 1   | 子チャンクID | id              | BIGINT      | -    | 不可     | IDENTITY | ◯  | -                | -                    | 内部識別子    |
| 2   | 親チャンクID | parent_chunk_id | BIGINT      | -    | 不可     | -        | -  | parent_chunks.id | ON DELETE CASCADE    | 親チャンク    |
| 3   | 子チャンク番号 | child_index     | INTEGER     | -    | 不可     | -        | -  | -                | UNIQUE(parent_chunk) | 親内順序     |
| 4   | 本文      | content         | TEXT        | -    | 不可     | -        | -  | -                | -                    | 検索単位テキスト |
| 5   | 埋め込み    | embedding       | VECTOR      | 1536 | 不可     | -        | -  | -                | -                    | ベクトル表現   |
| 6   | トークン数   | token_count     | INTEGER     | -    | 可      | -        | -  | -                | -                    | token数   |
| 7   | 作成日時    | created_at      | TIMESTAMPTZ | -    | 不可     | now()    | -  | -                | -                    | 作成日時     |

## threads (スレッド)
| No. | 論理名    | 物理名          | データ型        | 長さ | NULL許可 | デフォルト値   | PK | FK       | 制約                | コメント   |
| --- | ------ | ------------ | ----------- | -- | ------ | -------- | -- | -------- | ----------------- | ------ |
| 1   | スレッドID | id           | BIGINT      | -  | 不可     | IDENTITY | ◯  | -        | -                 | 内部識別子  |
| 2   | ユーザーID | user_id      | BIGINT      | -  | 不可     | -        | -  | users.id | ON DELETE CASCADE | 作成者    |
| 3   | タイトル   | title        | TEXT        | -  | 不可     | -        | -  | -        | -                 | スレッド名  |
| 4   | 作成日時   | created_at   | TIMESTAMPTZ | -  | 不可     | now()    | -  | -        | -                 | 作成日時   |
| 5   | 更新日時   | updated_at   | TIMESTAMPTZ | -  | 不可     | now()    | -  | -        | TRIGGER           | 更新日時   |
| 6   | 履歴表示   | show_history | BOOLEAN     | -  | 不可     | false    | -  | -        | -                 | 履歴表示可否 |

## messages (メッセージ)
| No. | 論理名        | 物理名         | データ型        | 長さ | NULL許可 | デフォルト値   | PK | FK           | 制約                           | コメント    |
| --- | ---------- | ----------- | ----------- | -- | ------ | -------- | -- | ------------ | ---------------------------- | ------- |
| 1   | メッセージID    | id          | BIGINT      | -  | 不可     | IDENTITY | ◯  | -            | -                            | 内部識別子   |
| 2   | スレッドID     | thread_id   | BIGINT      | -  | 不可     | -        | -  | threads.id   | -                            | 所属スレッド  |
| 3   | 送信者        | sender      | TEXT        | -  | 可      | -        | -  | -            | CHECK(user/assistant/system) | 送信元     |
| 4   | 本文         | content     | TEXT        | -  | 不可     | -        | -  | -            | -                            | メッセージ本文 |
| 5   | 参照ドキュメントID | document_id | BIGINT      | -  | 可      | -        | -  | documents.id | -                            | RAG参照元  |
| 6   | 作成日時       | created_at  | TIMESTAMPTZ | -  | 不可     | now()    | -  | -            | -                            | 作成日時    |

## system_logs (システムログ)
| No. | 論理名     | 物理名         | データ型        | 長さ | NULL許可 | デフォルト値   | PK | FK | 制約 | コメント            |
| --- | ------- | ----------- | ----------- | -- | ------ | -------- | -- | -- | -- | --------------- |
| 1   | ログID    | id          | BIGINT      | -  | 不可     | IDENTITY | ◯  | -  | -  | 内部識別子           |
| 2   | ログレベル   | level       | TEXT        | -  | 不可     | -        | -  | -  | -  | error/warn/info |
| 3   | イベント種別  | event_type  | TEXT        | -  | 不可     | -        | -  | -  | -  | イベント分類          |
| 4   | メッセージ   | message     | TEXT        | -  | 不可     | -        | -  | -  | -  | 要約              |
| 5   | コンテキスト  | context     | JSONB       | -  | 可      | -        | -  | -  | -  | 付加情報            |
| 6   | リクエストID | request_id  | TEXT        | -  | 可      | -        | -  | -  | -  | トレース用           |
| 7   | ユーザーID  | user_id     | BIGINT      | -  | 可      | -        | -  | -  | -  | 操作者             |
| 8   | サービス名   | service     | TEXT        | -  | 不可     | -        | -  | -  | -  | api/batch等      |
| 9   | 環境      | environment | TEXT        | -  | 不可     | -        | -  | -  | -  | prod/stg        |
| 10  | 作成日時    | created_at  | TIMESTAMPTZ | -  | 不可     | now()    | -  | -  | -  | 発生日時            |