from graph.workflow import app
from models.agent_state import AgentState

def create_first_draft(user_request: str) -> str:
    initial_state: AgentState = {
        "user_request": user_request,
        "current_draft": "",
        "feedbacks": [],
        "approvals": {},
        "iteration_count": 0
    }

    final_state = app.invoke(initial_state)
    return final_state["current_draft"]