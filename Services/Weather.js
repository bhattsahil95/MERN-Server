// Scope: fetches and shapes current weather data without exposing provider credentials.

import axios from "axios";

const WEATHER_API_URL = "https://api.openweathermap.org/data/2.5/weather";

export async function getCurrentWeather(city) {
    const apiKey = process.env.WEATHER_API_KEY;

    if (!apiKey) {
        const error = new Error("Weather service is not configured.");
        error.code = "WEATHER_NOT_CONFIGURED";
        throw error;
    }

    const response = await axios.get(WEATHER_API_URL, {
        params: { q: city, appid: apiKey, units: "metric" },
        timeout: 8_000,
    });

    const data = response.data;
    return {
        id: data.id,
        name: data.name,
        main: {
            temp: data.main?.temp,
            feels_like: data.main?.feels_like,
            humidity: data.main?.humidity,
        },
        weather: Array.isArray(data.weather)
            ? data.weather.slice(0, 1).map(({ description, icon }) => ({ description, icon }))
            : [],
        wind: { speed: data.wind?.speed },
        sys: {
            country: data.sys?.country,
            sunrise: data.sys?.sunrise,
            sunset: data.sys?.sunset,
        },
        timezone: data.timezone,
    };
}
