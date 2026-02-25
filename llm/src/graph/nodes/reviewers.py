from langchain_core.messages import SystemMessage, HumanMessage
from services.llm_provider import get_llm
from prompts.loaders import load_persona
from models.review_result import ReviewResult

PERSONA_LIST = [
    "pragmatist",
    "idealist",
    "skeptic",
    "connector"
]

def reviewer_nodes(state):
    llm = get_llm()
    structured_llm = llm.with_structured_output(ReviewResult)

    new_feedbacks = []
    approvals = {}

    for persona in PERSONA_LIST:
        persona_prompt = load_persona(persona)

        result: ReviewResult = structured_llm.invoke([
            SystemMessage(content=persona_prompt),
            HumanMessage(content=state["current_draft"])
        ])

        new_feedbacks.append({
            "persona": persona,
            "comment": result.comment
        })
        approvals[persona] = result.approval

    return {
        "feedbacks": new_feedbacks,
        "approvals": approvals
    }