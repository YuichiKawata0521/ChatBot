from langchain_core.messages import SystemMessage, HumanMessage
from src.services.llm_provider import get_llm
from src.prompts.loaders import load_persona
from src.models.review_result import ReviewResult

PERSONA_LIST = [
    "pragmatist",
    "idealist",
    "skeptic",
    "connector"
]

def reviewer_nodes(state):
    llm = get_llm()
    structured_llm = llm.with_structured_output(ReviewResult)

    batch_inputs = [
        [
        SystemMessage(content=load_persona(persona)),
        HumanMessage(content=state["current_draft"])
        ]
        for persona in PERSONA_LIST
    ]

    results = structured_llm.batch(
        batch_inputs,
        config={"max_concurrency": 4},
        return_exceptions=True
    )

    new_feedbacks = []
    approvals = {}

    for persona, result in zip(PERSONA_LIST, results):
        if isinstance(result, Exception):
            new_feedbacks.append({
                "persona": persona,
                "comment": f"※システムエラーによりレビューを取得できませんでした。({str(result)})"
            })
            approvals[persona] = True
        else:
            new_feedbacks.append({
                "persona": persona,
                "comment": result.comment
            })
            approvals[persona] = result.approval

    return {
        "feedbacks": new_feedbacks,
        "approvals": approvals
    }