CREATE INDEX idx_sessions_expire ON sessions(expire); -- セッションインデックス

CREATE INDEX idx_child_embedding ON child_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_child_parent ON child_chunks (parent_chunk_id);

CREATE INDEX idx_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX idx_logs_event ON system_logs(event_type);
CREATE INDEX idx_logs_user ON system_logs(user_id);