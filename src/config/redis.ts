import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null
});

redis.on("connect", () => {
    console.log("Connected to Redis");
});

redis.on("error", (error) => {
    console.error("Redis connection failed:", error.message);
});

export default redis;