# 分析用ダッシュボード定義
本分析ページでは、指標は全体傾向の把握を主目的とし、
部署別の比較・ランキングは Overview ページで行う。
分析ページでは、必要に応じて部署フィルターを適用し、
特定部署に絞った時系列・行動分析を行う。
## 全体像
- フィルターエリア（期間 + 部署3階層）
- セクション1: アクティブユーザー推移
- セクション2: コスト推移
- セクション3: RAGヒット率・回答精度
- セクション4: 部署別利用割合（円グラフ）
- セクション5: 部署別 詳細利用データ（テーブル）
- モーダルA: RAG日別質問/回答一覧
- モーダルB: 部署所属社員一覧

## フィルター仕様

| No. | フィルター名 | UI | デフォルト | 説明 |
| :-: | --- | --- | --- | --- |
| 1 | 期間 | セレクト | `last30` | `last30` / `current` / `previous` / `custom` |
| 2 | カスタム期間 | Date Picker（From/To） | 期間選択に応じて自動設定 | `period=custom` 時に表示 |
| 3 | 部署（本部） | ドロップダウン | 全部署 | `dep1Name` に反映 |
| 4 | 部署（部） | 連動ドロップダウン | 全部署 | `dep2Name` に反映 |
| 5 | 部署（課） | 連動ドロップダウン | 全部署 | `dep3Name` に反映 |
| 6 | 適用 | ボタン | - | 全チャート/テーブルを再取得 |
| 7 | クリア | ボタン | - | 期間・部署条件を初期化 |

補足:
- 分析ページには RAG ON/OFF、文章ID、応答時間レンジ、トークンレンジ、エラー有無フィルターは実装されていない。

## セクション定義

### 1) アクティブユーザー推移
- API: `GET /api/v1/dashboard/analysis/active-user-trend`
- 表示: 折れ線（系列: アクティブユーザー数）
- 返却データ: `labels`, `activeUserCounts`

### 2) コスト推移
- API: `GET /api/v1/dashboard/analysis/cost-trend`
- 表示: 折れ線（系列: コストUSD）
- 返却データ: `labels`, `costAmounts`, `inputTokens`, `outputTokens`
- 算出: `input_tokens/1000 * inputRatePer1kUsd + output_tokens/1000 * outputRatePer1kUsd`

### 3) RAGヒット率・回答精度
- API: `GET /api/v1/dashboard/analysis/rag-quality-trend`
- 表示: 折れ線2系列
	- `RAGヒット率` = `hit_response_count / rag_response_count`
	- `回答精度` = `good_response_count / rated_response_count`
- 返却データ: `labels`, `hitRates`, `accuracyRates`, `ragResponseCounts`, `hitResponseCounts`, `ratedResponseCounts`, `goodResponseCounts`
- 追加動作: 日次ポイントクリックで「RAG日別質問/回答一覧」モーダルを開く

### 4) 部署別利用割合（円グラフ）
- API: `GET /api/v1/dashboard/analysis/department-usage`
- 表示: 円グラフ（上位10部署）
- 返却データ: `items[]`（`departmentName`, `messageCount`, `activeUserCount`, `usageRate`, `estimatedCostUsd` など）
- 補足: 右上の部署フィルター（本部/部/課）は、このセクションの集計単位調整にも利用する

### 5) 部署別 詳細利用データ（テーブル）
- API: `GET /api/v1/dashboard/analysis/department-usage`（同データを再利用）
- 表示列: 部署名 / ユーザー数 / 総メッセージ数 / RAG利用率 / 推定コスト

## モーダル定義

### A) RAG日別質問/回答一覧
- API: `GET /api/v1/dashboard/analysis/rag-quality-details?targetDate=YYYY-MM-DD`
- 起動条件: RAG品質チャートのデータポイントクリック
- 表示項目: 日時、質問、回答、hit、max score、rating

### B) 部署所属社員一覧
- API: `GET /api/v1/dashboard/analysis/department-members`
- 起動条件: 部署円グラフセグメント、または部署詳細テーブル行のクリック
- 表示項目: 社員番号、氏名、メール、期間内メッセージ数、RAG利用数、RAG利用率、最終利用日時

## 非対象（現行未実装）
- エラー率推移の可視化
- 文書別ランキング表示
- DAU/WAU/MAU タブ切替