CREATE TABLE departments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dep1_code VARCHAR(20), -- 本部コード
    dep1_name VARCHAR(100), -- 本部名
    dep2_code VARCHAR(20), -- 部コード
    dep2_name VARCHAR(100), -- 部名
    dep3_code VARCHAR(20), -- 課コード
    dep3_name VARCHAR(100), -- 課名
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- 同じ部署構成が重複して登録されないようにユニーク制約を付与
    UNIQUE (dep1_code, dep2_code, dep3_code)
);

CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_no VARCHAR(20) NOT NULL UNIQUE,
    user_name VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    department_id BIGINT REFERENCES departments(id),
    role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
    master_admin BOOLEAN NOT NULL DEFAULT false, -- 全社閲覧管理者
    registered_flag BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    password_reset_token VARCHAR(255) DEFAULT NULL,
    password_reset_expires TIMESTAMPTZ DEFAULT NULL
);

CREATE TABLE department_admins (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id BIGINT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, department_id)
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
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
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
    department_id BIGINT REFERENCES departments(id),
    title TEXT NOT NULL,
    mode VARCHAR(20) DEFAULT 'normal' CHECK (mode IN ('normal', 'rag', 'agent')),
    model_name VARCHAR(50) DEFAULT 'gpt-4o-mini',
    document_id BIGINT REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    show_history BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE messages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    thread_id BIGINT NOT NULL REFERENCES threads(id),
    sender TEXT CHECK (sender IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    input_token_count INTEGER DEFAULT 0,
    output_token_count INTEGER DEFAULT 0,
    rating VARCHAR(10) CHECK (rating IN ('good', 'bad')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE message_references (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    child_chunk_id BIGINT REFERENCES child_chunks(id),
    relevance_score FLOAT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE system_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    level TEXT NOT NULL,
    event_type TEXT NOT NULL,
    message TEXT NOT NULL,
    context JSONB,
    request_id TEXT,
    user_id BIGINT,
    department_id BIGINT REFERENCES departments(id),
    service TEXT NOT NULL,
    environment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);