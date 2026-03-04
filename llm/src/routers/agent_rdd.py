from fastapi import APIRouter
from src.services.interview_service import build_user_request
from src.services.agent_rdd_create_first_draft_service import create_first_draft
from src.models.interview_payload import InterviewPayload

router = APIRouter()

@router.post("/agent/rdd")
def execute_rdd_agent(payload: InterviewPayload):
    formatted_request = build_user_request(payload.dict())
    result = create_first_draft(formatted_request)
    return result