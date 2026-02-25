from pydantic import BaseModel, Field

class ReviewResult(BaseModel):
    approval: bool = Field(
        description="致命的問題が無ければTrue、修正必要ならFalse"
    )
    comment: str = Field(
        description="ドラフトに対する指摘事項（Markdown形式）"
    )