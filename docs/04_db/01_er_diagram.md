```mermaid
erDiagram
    %% 部署
    departments {
        BIGINT id PK "内部識別子"
        VARCHAR dep1_code "本部コード"
        VARCHAR dep1_name "本部名"
        VARCHAR dep2_code "部コード"
        VARCHAR dep2_name "部名"
        VARCHAR dep3_code "課コード"
        VARCHAR dep3_name "課名"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    department_admins {
        BIGINT id PK
        BIGINT user_id FK
        BIGINT department_id FK
        TIMESTAMPTZ created_at
    }

    %% ユーザー管理
    users {
        BIGINT id PK "内部識別子"
        VARCHAR employee_no UK "社員番号"
        VARCHAR user_name "ユーザー名"
        VARCHAR email "メールアドレス"
        VARCHAR password "ハッシュ化PW"
        BIGINT department_id FK
        TEXT role "権限(user/admin)"
        BOOLEAN master_admin "全社管理者フラグ"
        BOOLEAN registered_flag "登録済フラグ"
        TIMESTAMPTZ deleted_at
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
        VARCHAR password_reset_token
        TIMESTAMPTZ password_reset_expires
    }

    %% セッション管理
    sessions {
        TEXT sid PK "セッションID (Collate C)"
        JSONB sess "セッションデータ"
        TIMESTAMPTZ expire "有効期限"
    }

    %% RAGドキュメント管理
    documents {
        BIGINT id PK "ドキュメントID"
        TEXT source "種別(pdf/word/markdown/txt/csv)"
        VARCHAR title "タイトル"
        JSONB metadata "メタデータ"
        VARCHAR status "処理状態"
        TEXT error_message
        TIMESTAMPTZ uploaded_at
    }

    %% RAGチャンク (Small-to-Big)
    parent_chunks {
        BIGINT id PK "親チャンクID"
        BIGINT document_id FK
        INTEGER parent_index "順序"
        TEXT content "親テキスト"
        TIMESTAMPTZ created_at
    }

    child_chunks {
        BIGINT id PK "子チャンクID"
        BIGINT parent_chunk_id FK
        INTEGER child_index "順序"
        TEXT content "検索用テキスト"
        VECTOR embedding "ベクトル(1536次元)"
        INTEGER token_count
        TIMESTAMPTZ created_at
    }

    %% チャット機能
    threads {
        BIGINT id PK "スレッドID"
        BIGINT user_id FK
        BIGINT department_id FK "所属部署(任意)"
        TEXT title "スレッド名"
        BOOLEAN show_history "履歴表示フラグ"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    messages {
        BIGINT id PK "メッセージID"
        BIGINT thread_id FK
        TEXT sender "送信者(user/assistant/system)"
        TEXT content "本文"
        INTEGER input_token_count
        INTEGER output_token_count
        VARCHAR rating "評価(good/bad)"
        TIMESTAMPTZ created_at
    }

    %% 参照元管理
    message_references {
        BIGINT id PK
        BIGINT message_id FK
        BIGINT document_id FK
        BIGINT child_chunk_id FK "参照チャンク(任意)"
        FLOAT relevance_score "類似度スコア"
        TIMESTAMPTZ created_at
    }

    %% ログ管理
    system_logs {
        BIGINT id PK
        TEXT level "ログレベル"
        TEXT event_type
        TEXT message
        JSONB context
        TEXT request_id
        BIGINT user_id "操作ユーザー(任意)"
        BIGINT department_id "関連部署(任意)"
        TEXT service
        TEXT environment
        TIMESTAMPTZ created_at
    }

    %% リレーション定義
    departments ||--o{ users : "has"
    users ||--o{ department_admins : "manages"
    departments ||--o{ department_admins : "has_admins"

    users ||--o{ threads : "has"
    threads ||--|{ messages : "contains"

    documents ||--|{ parent_chunks : "divided_into"
    parent_chunks ||--|{ child_chunks : "has_embeddings"

    messages ||--o{ message_references : "cites"
    documents ||--o{ message_references : "is_cited_in"
    child_chunks ||--o{ message_references : "may_be_referenced"

    users ||--o{ system_logs : "creates"
    departments ||--o{ system_logs : "related_to"

