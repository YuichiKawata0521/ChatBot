from src.graph.workflow import app
from src.models.agent_state import AgentState
from langchain_community.callbacks.manager import get_openai_callback

def create_first_draft(user_request: str) -> dict:
    initial_state: AgentState = {
        "user_request": user_request,
        "current_draft": "",
        "feedbacks": [],
        "approvals": {},
        "iteration_count": 0
    }

    with get_openai_callback() as callback:
        final_state = app.invoke(initial_state)

    return {
        "draft": final_state["current_draft"],
        "token_usage": {
            "input_tokens": int(callback.prompt_tokens or 0),
            "output_tokens": int(callback.completion_tokens or 0),
            "total_tokens": int(callback.total_tokens or 0)
        }
    }