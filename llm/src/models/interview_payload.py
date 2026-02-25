from pydantic import BaseModel

class InterviewPayload(BaseModel):
    定義書作成者: str
    プロジェクト目的: str
    背景と現状課題: str
    解決すべき根本問題: str
    KPI: str
    KGI: str
    ターゲットユーザー: str
    コア機能: str
    追加機能と優先度: str
    非対象範囲: str
    制約条件: str
    性能要件: str
    主要データ: str
    認証と権限: str
    外部連携: str