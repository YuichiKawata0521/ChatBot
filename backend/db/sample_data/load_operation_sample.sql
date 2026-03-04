BEGIN;

CREATE TEMP TABLE stg_departments (
    dep1_code TEXT,
    dep1_name TEXT,
    dep2_code TEXT,
    dep2_name TEXT,
    dep3_code TEXT,
    dep3_name TEXT
);

CREATE TEMP TABLE stg_users (
    employee_no TEXT,
    user_name TEXT,
    email TEXT,
    role TEXT,
    dep1_code TEXT,
    dep1_name TEXT,
    dep2_code TEXT,
    dep2_name TEXT,
    dep3_code TEXT,
    dep3_name TEXT
);

CREATE TEMP TABLE stg_threads (
    thread_key TEXT,
    employee_no TEXT,
    title TEXT,
    mode TEXT,
    model_name TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

CREATE TEMP TABLE stg_messages (
    thread_key TEXT,
    sender TEXT,
    content TEXT,
    input_token_count INTEGER,
    output_token_count INTEGER,
    rating TEXT,
    created_at TIMESTAMPTZ
);

CREATE TEMP TABLE stg_system_logs (
    level TEXT,
    event_type TEXT,
    message TEXT,
    service TEXT,
    environment TEXT,
    created_at TIMESTAMPTZ,
    employee_no TEXT
);

\copy stg_departments FROM '/docker-entrypoint-initdb.d/sample_data/operation_departments.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');
\copy stg_users FROM '/docker-entrypoint-initdb.d/sample_data/operation_users.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');
\copy stg_threads FROM '/docker-entrypoint-initdb.d/sample_data/operation_threads.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');
\copy stg_messages FROM '/docker-entrypoint-initdb.d/sample_data/operation_messages.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');
\copy stg_system_logs FROM '/docker-entrypoint-initdb.d/sample_data/operation_system_logs.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');

INSERT INTO departments (
    dep1_code,
    dep1_name,
    dep2_code,
    dep2_name,
    dep3_code,
    dep3_name
)
SELECT DISTINCT
    NULLIF(TRIM(dep1_code), ''),
    NULLIF(TRIM(dep1_name), ''),
    NULLIF(TRIM(dep2_code), ''),
    NULLIF(TRIM(dep2_name), ''),
    NULLIF(TRIM(dep3_code), ''),
    NULLIF(TRIM(dep3_name), '')
FROM stg_departments
ON CONFLICT (dep1_code, dep2_code, dep3_code) DO NOTHING;

INSERT INTO users (
    employee_no,
    user_name,
    email,
    password,
    department_id,
    role,
    registered_flag,
    deleted_at
)
SELECT
    su.employee_no,
    su.user_name,
    su.email,
    'sample_seed_password',
    d.id,
    CASE WHEN su.role IN ('admin', 'user') THEN su.role ELSE 'user' END,
    true,
    NULL
FROM stg_users su
LEFT JOIN departments d
    ON COALESCE(d.dep1_code, '') = COALESCE(NULLIF(TRIM(su.dep1_code), ''), '')
   AND COALESCE(d.dep1_name, '') = COALESCE(NULLIF(TRIM(su.dep1_name), ''), '')
   AND COALESCE(d.dep2_code, '') = COALESCE(NULLIF(TRIM(su.dep2_code), ''), '')
   AND COALESCE(d.dep2_name, '') = COALESCE(NULLIF(TRIM(su.dep2_name), ''), '')
   AND COALESCE(d.dep3_code, '') = COALESCE(NULLIF(TRIM(su.dep3_code), ''), '')
   AND COALESCE(d.dep3_name, '') = COALESCE(NULLIF(TRIM(su.dep3_name), ''), '')
ON CONFLICT (employee_no)
DO UPDATE SET
    user_name = EXCLUDED.user_name,
    email = EXCLUDED.email,
    department_id = EXCLUDED.department_id,
    role = EXCLUDED.role,
    registered_flag = true,
    deleted_at = NULL,
    updated_at = now();

TRUNCATE TABLE message_references, messages, threads, system_logs RESTART IDENTITY;

INSERT INTO threads (
    user_id,
    department_id,
    title,
    mode,
    model_name,
    document_id,
    created_at,
    updated_at,
    show_history
)
SELECT
    u.id,
    u.department_id,
    st.title,
    CASE WHEN st.mode IN ('normal', 'rag', 'agent') THEN st.mode ELSE 'normal' END,
    COALESCE(NULLIF(TRIM(st.model_name), ''), 'gpt-4o-mini'),
    NULL,
    st.created_at,
    st.updated_at,
    false
FROM stg_threads st
INNER JOIN users u ON u.employee_no = st.employee_no
ORDER BY st.thread_key;

CREATE TEMP TABLE stg_thread_map AS
SELECT
    s.thread_key,
    t.id AS thread_id
FROM (
    SELECT thread_key, ROW_NUMBER() OVER (ORDER BY thread_key) AS rn
    FROM stg_threads
) s
INNER JOIN (
    SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
    FROM threads
) t
ON s.rn = t.rn;

INSERT INTO messages (
    thread_id,
    sender,
    content,
    input_token_count,
    output_token_count,
    rating,
    created_at
)
SELECT
    tm.thread_id,
    CASE WHEN sm.sender IN ('user', 'assistant', 'system') THEN sm.sender ELSE 'user' END,
    sm.content,
    COALESCE(sm.input_token_count, 0),
    COALESCE(sm.output_token_count, 0),
    CASE WHEN sm.rating IN ('good', 'bad') THEN sm.rating ELSE NULL END,
    sm.created_at
FROM stg_messages sm
INNER JOIN stg_thread_map tm ON tm.thread_key = sm.thread_key
ORDER BY sm.created_at;

INSERT INTO system_logs (
    level,
    event_type,
    message,
    context,
    request_id,
    user_id,
    department_id,
    service,
    environment,
    created_at
)
SELECT
    COALESCE(NULLIF(TRIM(sl.level), ''), 'info'),
    COALESCE(NULLIF(TRIM(sl.event_type), ''), 'seed_event'),
    COALESCE(NULLIF(TRIM(sl.message), ''), 'sample log'),
    NULL,
    NULL,
    u.id,
    u.department_id,
    COALESCE(NULLIF(TRIM(sl.service), ''), 'backend'),
    COALESCE(NULLIF(TRIM(sl.environment), ''), 'development'),
    sl.created_at
FROM stg_system_logs sl
LEFT JOIN users u ON u.employee_no = sl.employee_no
ORDER BY sl.created_at;

COMMIT;
