// Scope: centralizes trusted browser origins and production environment checks.

import "dotenv/config";

const defaultOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://sahil-bhatt.onrender.com",
];

const configuredOrigins = [process.env.CLIENT_URL, process.env.CLIENT_ORIGINS]
    .filter(Boolean)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

export const allowedOrigins = [...new Set([...defaultOrigins, ...configuredOrigins])];
export const isProduction = process.env.NODE_ENV === "production";

export function isAllowedOrigin(origin) {
    return !origin || allowedOrigins.includes(origin);
}

export const corsOptions = {
    credentials: true,
    origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error("Origin is not allowed."));
    },
};
