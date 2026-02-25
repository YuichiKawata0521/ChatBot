from fastapi import APIRouter
from services.interview_service import build_user_request
from services.agent_rdd_create_first_draft_service import create_first_draft

router = APIRouter()

@router.post("/agent/rdd")
def execute_rdd_agent(payload: InterviewPayload):
    formatted_request = build_user_request(payload.dict())
    draft = run_agent(formatted_request)
    return {"draft": draft}