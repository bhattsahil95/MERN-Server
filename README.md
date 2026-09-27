# Portfolio MERN Server

Backend services for the personal portfolio demos, including contact submissions, notes,
and ephemeral Socket.IO chat.

## Environment

- `NODE_ENV`: set to `production` in deployed environments.
- `CLIENT_URL`: canonical browser origin allowed to call the API.
- `CLIENT_ORIGINS`: optional comma-separated additional browser origins.
- `PORT`: HTTP port; defaults to `5500` for local development.
- `WEATHER_API_KEY`: server-only OpenWeather API key used by the weather demo proxy.

Local origins and `https://sahil-bhatt.onrender.com` are allowed by default. Add any new
deployed frontend origin through configuration instead of enabling wildcard CORS.

## Chat security boundary

- Chat identity is temporary and scoped to one connected socket.
- User names, room names, message sizes, and action rates are bounded by the server.
- Direct-message senders and room-message senders are derived from socket state, never the
  browser payload.
- Private-room passwords are hashed in memory and are never returned in room-list events.
- A socket must join a room before it can publish to that room.
- Rooms and messages are intentionally ephemeral and reset when the server restarts.
- The unauthenticated Socket.IO admin console is available only outside production.

The public notes demo remains collaborative rather than account-owned. Mutation endpoints
are validated and throttled, but they should not be used for private or durable user data.
Notes are archived by default instead of permanently deleted and can be restored from the UI.
