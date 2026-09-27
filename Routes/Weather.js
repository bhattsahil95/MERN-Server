// Scope: exposes a throttled current-weather proxy for the public portfolio demo.

import axios from "axios";
import express from "express";
import { createRateLimit } from "../middleware/rateLimit.js";
import { getCurrentWeather } from "../Services/Weather.js";

const router = express.Router();
const weatherRateLimit = createRateLimit({ limit: 20, windowMs: 60_000 });
const CITY_PATTERN = /^[\p{L}\p{M} .,'-]{1,80}$/u;

router.get("/current", weatherRateLimit, async (request, response) => {
    const city = String(request.query.city || "").trim();

    if (!CITY_PATTERN.test(city)) {
        response.status(400).json({ ok: false, message: "Enter a valid city name." });
        return;
    }

    try {
        response.json(await getCurrentWeather(city));
    } catch (error) {
        if (error.code === "WEATHER_NOT_CONFIGURED") {
            response.status(503).json({ ok: false, message: error.message });
            return;
        }

        if (axios.isAxiosError(error) && error.response?.status === 404) {
            response.status(404).json({ ok: false, message: "City not found." });
            return;
        }

        console.error("Weather lookup failed:", error.message);
        response.status(502).json({ ok: false, message: "Weather service is temporarily unavailable." });
    }
});

export { router as weatherRouter };
