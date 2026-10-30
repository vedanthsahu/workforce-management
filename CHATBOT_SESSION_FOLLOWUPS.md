# Chatbot session follow-ups (to revisit later)

Found while changing the chatbot Close button to clear the conversation. The
frontend change does not depend on any of these.

## What the backend does today
- A session lives for a fixed 30 minutes from creation (`SESSION_TTL_MINUTES = 30`,
  `backend/chatbot/config.py`; set in `SessionService.create`).
- An expired session is refused on use: `SessionService.get` marks it `EXPIRED`
  and returns nothing (`backend/chatbot/services/session_service.py`).
- Nothing deletes old rows from `chatbot_sessions` / `chatbot_messages`. (Only
  login refresh tokens/sessions are purged, in `main.py`.)
- There is no "end session" endpoint. Routes are create, send message, get session
  (`backend/api/routes/chatbot.py`).

## Questions for the chatbot backend owner
1. Should expired chat sessions (and their messages) be cleaned up by a job? Or
   are the messages kept on purpose as a conversation log / for audit? Every
   Close and Refresh now leaves an abandoned session row behind.
2. Should the 30 minutes slide forward on each message (idle timeout) instead of
   counting from creation? Today a chat left open for more than 30 minutes fails on
   the next message.
3. Optional: add an end-session endpoint that Close and Refresh call, so sessions
   are ended immediately rather than left to expire.

## Frontend items
- Check how the chat panel handles the "session expired" response (question 2
  above) and whether it should offer to start a new chat.
- Optional: confirm dialog on Close when the conversation has messages ("End this
  chat?").
- The greeting shows a hard-coded "10:30 AM" (`ChatbotPanel.tsx`, `message-time`).
