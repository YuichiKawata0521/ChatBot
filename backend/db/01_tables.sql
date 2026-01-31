CREATE  TABLE users ( -- ユーザーテーブル
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_no VARCHAR(20) UNIQUE NOT NULL, -- 社員番号
    user_name VARCHAR(20) NOT NULL,
    password VARCHAR(255) NOT NULL, -- ハッシュ+ソルト+ペッパーなので255としておく
    dep1_code VARCHAR(20),
    dep1_name VARCHAR(100), -- 本部
    dep2_code VARCHAR(20),
    dep2_name VARCHAR(100), -- 部
    dep3_code VARCHAR(20),
    dep3_name VARCHAR(100), -- 課、グループ
    role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
    registered_flag BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), -- timezoneはdocker-compose.ymlファイルのdbの環境変数としてAsia/Tokyoを定義する
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions ( -- セッション管理用
    sid TEXT NOT NULL COLLATE "C" PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMPTZ(6) NOT NULL
);

CREATE TABLE documents ( -- rag用ドキュメント
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source TEXT NOT NULL CHECK (source IN ('pdf', 'word', 'markdown', 'txt', 'csv')),
    title VARCHAR(100) NOT NULL,
    metadata JSONB,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE parent_chunks (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    parent_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (document_id, parent_index)
);

CREATE TABLE child_chunks (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parent_chunk_id BIGINT NOT NULL
        REFERENCES parent_chunks(id) ON DELETE CASCADE,
    child_index INTEGER NOT  NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536) NOT NULL,
    token_count INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (parent_chunk_id, child_index)
);

CREATE TABLE threads (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    show_history BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE messages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    thread_id BIGINT NOT NULL REFERENCES threads(id),
    sender TEXT CHECK (sender IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE message_references (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    child_chunk_id BIGINT REFERENCES child_chunks(id),
    relevance_score FLOAT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now();
)

CREATE TABLE system_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    level TEXT NOT NULL,
    event_type TEXT NOT NULL,
    message TEXT NOT NULL,
    context JSONB,
    request_id TEXT,
    user_id BIGINT,
    service TEXT NOT NULL,
    environment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);