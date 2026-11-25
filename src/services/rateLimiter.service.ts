import redis from "../config/redis";

export async function reserveSendingSlot(
    senderId: string,
    campaignId: string,
    senderLimit: number,
    campaignLimit: number
) {

    const script = `
        local time = redis.call("TIME")

        local now = tonumber(time[1]) * 1000
                    + math.floor(tonumber(time[2]) / 1000)

        local hour = math.floor(now / 3600000)

        local nextHour = (hour + 1) * 3600000

        local senderKey = KEYS[1] .. ":" .. hour
        local campaignKey = KEYS[2] .. ":" .. hour

        local senderLimit = tonumber(ARGV[1])
        local campaignLimit = tonumber(ARGV[2])

        local senderCount =
            tonumber(redis.call("GET", senderKey) or "0")

        local campaignCount =
            tonumber(redis.call("GET", campaignKey) or "0")

        if senderCount >= senderLimit then
            return {0, nextHour - now, 1}
        end

        if campaignCount >= campaignLimit then
            return {0, nextHour - now, 2}
        end

        redis.call("INCR", senderKey)
        redis.call("PEXPIREAT", senderKey, nextHour)

        redis.call("INCR", campaignKey)
        redis.call("PEXPIREAT", campaignKey, nextHour)

        return {1, 0, 0}
    `;

    const result = await redis.eval(
        script,
        2,
        `rate-limit:{${senderId}}:sender`,
        `rate-limit:{${senderId}}:campaign:${campaignId}`,
        senderLimit,
        campaignLimit
    ) as number[];

    return {
        allowed: result[0] === 1,
        retryAfterMs: result[1],
        hourlyLimitReached: result[2] !== 0,
        limitType:
            result[2] === 1
                ? "sender"
                : result[2] === 2
                    ? "campaign"
                    : null
    };
}