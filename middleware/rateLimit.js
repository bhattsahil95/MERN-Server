// Scope: provides lightweight per-process request throttling for public demo mutations.

export function createRateLimit({ limit, windowMs }) {
    const clients = new Map();

    return (request, response, next) => {
        const now = Date.now();
        const key = request.ip || request.socket.remoteAddress || "unknown";
        const current = clients.get(key);

        if (!current || now - current.startedAt >= windowMs) {
            clients.set(key, { count: 1, startedAt: now });
            next();
            return;
        }

        if (current.count >= limit) {
            const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - current.startedAt)) / 1000));
            response.setHeader("Retry-After", String(retryAfterSeconds));
            response.status(429).json({
                ok: false,
                message: "Too many requests. Please wait and try again.",
            });
            return;
        }

        current.count += 1;
        next();
    };
}
