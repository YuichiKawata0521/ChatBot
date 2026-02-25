def should_continue(state):
    approvals = state.get("approvals", {})
    iteration = state.get("iteration_count", 0)

    if len(approvals) == 4 and all(approvals.values()):
        return "end"

    if iteration >= 3:
        return "end"

    return "continue"