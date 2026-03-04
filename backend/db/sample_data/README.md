# Operation KPI Sample Data

運用ダッシュボード（KPIカード）確認用のサンプルデータです。

## 含まれるCSV
- `operation_departments.csv`
- `operation_users.csv`
- `operation_threads.csv`
- `operation_messages.csv`
- `operation_system_logs.csv`

## 反映方法（PowerShell）
ワークスペースルートで実行:

```powershell
./backend/scripts/loadOperationSampleData.ps1
```

## 直接実行する場合

```powershell
docker compose exec db sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /docker-entrypoint-initdb.d/sample_data/load_operation_sample.sql'
```

## 補足
- `threads/messages/system_logs` は一度 `TRUNCATE ... RESTART IDENTITY` してから再投入します。
- `users/departments` はUPSERT（既存更新/新規作成）です。
- マスターユーザー（`.env` の `MASTER_*`）はKPI API側で除外されます。
