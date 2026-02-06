```mermaid
erDiagram
    %% ユーザー管理
    users {
        BIGINT id PK "内部識別子"
        VARCHAR employee_no UK "社員番号"
        VARCHAR user_name "ユーザー名"
        VARCHAR email "メールアドレス"
        VARCHAR password "ハッシュ化PW"
        VARCHAR dep1_code "本部コード"
        VARCHAR dep1_name
        VARCHAR dep2_code "部コード"
        VARCHAR dep2_name
        VARCHAR dep3_code "課コード"
        VARCHAR dep3_name
        TEXT role "権限(user/admin)"
        BOOLEAN registered_flag "登録済フラグ"
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
        TEXT source "種別(pdf/word/markdown)"
        VARCHAR title "タイトル"
        JSONB metadata "メタデータ"
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
        TIMESTAMPTZ created_at
    }

    %% ★新規追加: 参照元管理
    message_references {
        BIGINT id PK
        BIGINT message_id FK
        BIGINT document_id FK
        BIGINT child_chunk_id FK "参照チャンク(任意)"
        FLOAT relevance_score "類似度スコア"
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
        TEXT service
        TEXT environment
        TIMESTAMPTZ created_at
    }

    %% リレーション定義
    users ||--o{ threads : "has"
    threads ||--|{ messages : "contains"
    
    documents ||--|{ parent_chunks : "divided_into"
    parent_chunks ||--|{ child_chunks : "has_embeddings"
    
    messages ||--o{ message_references : "cites"
    documents ||--o{ message_references : "is_cited_in"