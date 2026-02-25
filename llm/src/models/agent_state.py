from typing import TypedDict, List, Dict

# エージェント間で共有するStateの定義
class AgentState(TypedDict):
    user_request: str
    current_draft: str
    feedbacks: List[Dict[str, str]]
    approvals: Dict[str, bool]
    iteration_count: int