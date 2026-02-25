from langgraph.graph import StateGraph, END
from src.models.agent_state import AgentState
from src.graph.nodes.moderator import moderator_node
from src.graph.nodes.reviewers import reviewer_nodes
from src.graph.nodes.conditions import should_continue

def build_workflow():
    workflow = StateGraph(AgentState)

    workflow.add_node("moderator", moderator_node)
    workflow.add_node("reviewers", reviewer_nodes)

    workflow.set_entry_point("moderator")
    workflow.add_edge("moderator", "reviewers")

    workflow.add_conditional_edges(
        "reviewers",
        should_continue,
        {
            "continue": "moderator",
            "end": END
        }
    )

    return workflow.compile()

app = build_workflow()