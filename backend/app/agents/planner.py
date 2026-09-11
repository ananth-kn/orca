from app.agents.optimized_pipeline import process_chat_query
from sqlalchemy.orm import Session

async def handle_query(
    user_text: str,
    fallback_lat=None,
    fallback_lon=None,
    context="",
    lang="en",
    session_id="",
    user_id=None,
    db: Session = None
) -> dict:
    """Canonical conversational pipeline wrapper."""
    # try:
    result = await process_chat_query(
        query=user_text,
        lang=lang,
        session_id=session_id,
        lat=fallback_lat,
        lon=fallback_lon,
        user_id=user_id,
        db=db,
    )
    # except Exception as e:
    #     return {
    #         "error": str(e),
    #         "detected_language": lang,
    #         "type": "error",
    #         "summary": f"Sorry, I encountered a technical issue: {str(e)}. Please try again shortly.",
    #         "data": {},
    #     }

    if "error" in result:
        return {
            "error": result["error"],
            "detected_language": result.get("language", lang or "en"),
            "type": result.get("mode", "data"),
            "summary": result.get("error", "An error occurred."),
            "data": result.get("evidence", {}),
        }

    return {
        "summary": result.get("answer", "No response available."),
        "detected_language": result.get("language", lang or "en"),
        "type": result.get("mode", "data"),
        "data": result.get("evidence", {}),
    }
