# ログ運用ルール（Backend）

## 1. 目的
- 障害調査を短時間で実施できるよう、ログ項目・レベル・通知条件を統一する。
- コントローラ間で記録形式を揃え、検索性（集計しやすさ）を確保する。

## 2. 対象範囲
- Backend（Node.js）の `logger` を使ったアプリケーションログ。
- 対象ファイル例：`src/controllers/*`, `src/middlewares/errorHandler.js`, `src/server.js`。

## 3. ログレベル基準
- `error`: 5xx 相当の異常、処理継続不能、外部連携失敗など運用対応が必要な事象。
- `warn`: 4xx 相当の想定内エラー（認証失敗、入力不正、404 など）。
- `info`: 正常系イベント（作成成功、削除成功、初期化完了）。
- `http`: HTTPアクセスログ（morgan 経由）。

### 3.1 例外ハンドラでの基準
- `statusCode >= 500` は `error`。
- `statusCode < 500` は `warn`。

## 4. 必須フィールド
ログは JSON 形式で以下を保持する。
- `timeStamp`
- `level`
- `source`
- `module_name`
- `message`
- `option`（追加情報）

## 5. option スキーマ標準
`option` のキー名は **snake_case** で統一する。

推奨キー:
- `user_id`
- `employee_no`
- `thread_id`
- `document_id`
- `model_name`
- `email`
- `path`
- `method`
- `ip`
- `statusCode`
- `status`
- `detail`（エラー概要）
- `stack`（原則 5xx のみ）

非推奨（使用しない）:
- `Employee_No`, `Email` などの camel/Pascal 混在キー

## 6. 通知ルール（メール）
- メール通知は `error` レベル時のみ送信する。
- 4xx は `warn` として扱い、通知対象外とする。
- 通知先環境変数は以下の優先順で解決する。
  1. `ERROR_ALERT_EMAIL_TO`
  2. `ERROR_USERNAME`（互換）

関連環境変数:
- `LOG_DIR`: ログ保存ディレクトリ
- `APP_URL`: メール本文に利用（任意）

## 7. 実装ルール
- コントローラ内で `console.error`, `console.warn`, `console.log` を直接使わない。
- 例外は `next(error)` に渡し、レスポンス整形は `globalErrorHandler` に集約する。
- 例外ログは重複記録しない（同一箇所で多重に `error` を出さない）。

## 8. 追加実装時チェックリスト
- [ ] 失敗パスに `logger.error` または `logger.warn` がある。
- [ ] 正常系の主要イベントに `logger.info` がある。
- [ ] `option` キーが snake_case で統一されている。
- [ ] 5xx には `detail` と `stack` を含めている。
- [ ] 4xx は `warn` で記録し、不要な通知を発生させていない。

## 9. 記録例
```json
{
  "timeStamp": "2026-02-25 21:30:10",
  "level": "error",
  "source": "chatController.js:88:15",
  "module_name": "/app/src/controllers/chatController.js",
  "message": "チャットストリーム処理に失敗しました",
  "option": {
    "user_id": 12,
    "thread_id": 345,
    "detail": "ECONNREFUSED",
    "stack": "Error: ..."
  }
}
```