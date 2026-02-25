from langchain_core.messages import SystemMessage, HumanMessage
from services.llm_provider import get_llm
from prompts.loaders import load_persona, load_template

def moderator_node(state):
    llm = get_llm()
    moderator_prompt = load_persona("moderator")
    template = load_template("requirement_template")

    feedback_str = ""
    for fb in state["feedbacks"]:
        feedback_str += f"\n[{fb['persona']}]\n{fb['comment']}\n"

    prompt = f"""
[ユーザー要望]
{state["user_request"]}

[現在のドラフト]
{state["current_draft"]}

[フィードバック]
{feedback_str}

[テンプレート]
{template}
"""

    response = llm.invoke([
        SystemMessage(content=moderator_prompt),
        HumanMessage(content=prompt)
    ])

    return {
        "current_draft": response.content,
        "iteration_count": state["iteration_count"] + 1,
        "feedbacks": []
    }