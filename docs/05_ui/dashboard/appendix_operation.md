# 運用用ダッシュボード（現行実装準拠）

本運用ページは異常検知、改善アクションの発見を目的としており、数値の比較や部署別の数値などの分析については、分析用ダッシュボードで行う。
本ドキュメントは `dashboard_operation.html` / `frontend/js/pages/admin/dashboard_operation/*` の実装を正とする。

## 目的
- 月次運用状況の即時把握（当月/先月）
- 利用低迷部署の発見
- RAG品質とコストのサマリー監視

## 全体構成
- KPIサマリー（4カード）
- 利用トレンド（日次）
- 利用低迷部署ランキング（上位5 + 全件モーダル）
- RAG精度・品質指標
- コスト（今月推定）

## 共通仕様

### 対象月スコープ
- UI: `kpi-month-scope` セレクト
- 値: `current`（当月） / `previous`（先月）
- 各APIの `scope` クエリに同一値を渡して再取得する

### アクティブユーザー定義
- 「対象日にメッセージ送信を1回以上行ったユーザー」

## セクション詳細

### 1) KPIサマリー
- API: `GET /api/v1/dashboard/operation/kpi?scope={current|previous}`
- 表示カード:
	1. `DAU`
	2. `RAG利用率`
	3. `利用継続率 (7日 / 30日)`
	4. `エラー率`
- 補助表示:
	- 対象月ラベル（`monthLabel`）
	- 最終更新時刻（`fetchedAt`）
	- トレンド表示（比較値は前日ベース）

指標の算出（API返却値）:
- `RAG利用率 = ragModeMessagesToday / totalMessagesToday`
- `エラー率 = errorMessagesToday / totalBotMessagesToday`
- `利用継続率` は `firstUseUsers`, `reusedWithin7Days`, `reusedWithin30Days` から表示用に整形

### 2) 利用トレンド（日次）
- API: `GET /api/v1/dashboard/operation/trend?scope={current|previous}`
- 表示:
	- 折れ線: メッセージ数（左軸）
	- 棒: アクティブユーザー数（右軸）
- データ: `labels`, `messageCounts`, `activeUserCounts`

### 3) 利用低迷部署ランキング
- API: `GET /api/v1/dashboard/operation/low-usage-departments?scope={current|previous}`
- 表示:
	- カード内に下位5件（`ranking`）
	- 「View All Departments」で全件モーダル（`allRanking`）
	- モーダル内で部署1/2/3フィルター可能

### 4) RAG精度・品質指標
- API: `GET /api/v1/dashboard/operation/rag-quality?scope={current|previous}`
- 表示指標:
	1. `RAGヒット率`（`hitRate`）
	2. `平均参照親チャンク数`（`avgParentChunkCount`）

定義:
- `RAGヒット率 = hitResponseCount / ragResponseCount`

### 5) コスト
- API: `GET /api/v1/dashboard/operation/cost?scope={current|previous}`
- 表示: `estimatedCostUsd`（USD、小数5桁）

算出:
- `estimatedCostUsd = (totalInputTokens / 1000 * inputRatePer1kUsd) + (totalOutputTokens / 1000 * outputRatePer1kUsd)`

## 非対象（現行未実装）
- アラート通知UI
- カスタム日付レンジ
- 部署別の多系列比較チャート
