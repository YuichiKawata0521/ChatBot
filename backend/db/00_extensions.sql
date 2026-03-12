CREATE EXTENSION IF NOT EXISTS vector; -- pgvector拡張機能の有効化

DO $$
BEGIN
	EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'Asia/Tokyo');
END
$$;
