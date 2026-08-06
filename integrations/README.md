# SeatBook chatbot integration

The main application is the only user-facing application. After SeatBook
authenticates a user, its authenticated layout displays a floating assistant
button. Clicking the button requests a short-lived chatbot token from the main
backend and embeds the chatbot panel.

The chatbot does not ask for another login or a name. Its API validates the
SeatBook token through `/auth/me`, forwards the same identity to SeatBook
booking APIs, and binds every browser chat session to the authenticated tenant
and user.

## Local endpoints

- Main frontend: `http://localhost:3000`
- Main backend: `http://localhost:8000`
- Chatbot frontend: `http://localhost:4200`
- Chatbot backend: `http://localhost:8100`

Direct visits to the chatbot frontend redirect to the main application.

## Start chatbot services

Copy `efacility-chatbot/.env.example` to
`efacility-chatbot/backend/.env`, then run from
`integrations/efacility-chatbot`:

```bash
docker compose up --build
```

Run the main backend and frontend normally. For non-default addresses, set
`NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_CHATBOT_URL` in the main frontend.
