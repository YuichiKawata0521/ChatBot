# 意思決定ログ

## 2026-02-25: Backendログ運用ルールを策定
- 決定内容: Backendのログ運用ルールを `docs/99_appendix/logging_operation_rules.md` に集約した。
- 背景: コントローラごとにログキー命名やエラーレベル基準が揺れており、検索性と通知精度に差があった。
- ルール要点:
	- `option` は snake_case で統一
	- 5xx は `error`、4xx は `warn`
	- メール通知は `error` のみ
	- `console.*` 直接出力は極力廃止し `logger` に統一
