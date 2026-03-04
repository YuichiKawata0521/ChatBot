$ErrorActionPreference = 'Stop'

Write-Host '[1/2] Loading operation sample data CSVs into PostgreSQL...'
docker compose exec db sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /docker-entrypoint-initdb.d/sample_data/load_operation_sample.sql'

Write-Host '[2/2] Done. You can now open /dashboard_operation to verify KPI rendering.'
