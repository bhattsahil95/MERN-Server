// Scope: validates and safely shapes untrusted real-time chat payloads.

import { createHash, randomUUID, timingSafeEqual } from "crypto";

export const CHAT_LIMITS = Object.freeze({
    messageLength: 1000,
    roomNameLength: 40,
    roomPasswordLength: 64,
    userNameLength: 12,
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const USER_NAME_PATTERN = /^(?=.*[a-zA-Z])[a-zA-Z0-9 ]{3,12}$/;

const cleanSingleLine = (value) => String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export function parseChatId(value) {
    const id = cleanSingleLine(value);
    return UUID_PATTERN.test(id) ? id : null;
}

export function parseUserName(value) {
    const userName = cleanSingleLine(value);
    return USER_NAME_PATTERN.test(userName) ? userName : null;
}

export function parseMessage(value) {
    const message = String(value ?? "").replace(/\r\n/g, "\n").trim();
    if (!message || message.length > CHAT_LIMITS.messageLength) return null;
    return message;
}

export function parseRoomInput(input) {
    const id = parseChatId(input?.id);
    const name = cleanSingleLine(input?.name);
    const isPrivate = input?.isPrivate === true;
    const roomKey = String(input?.roomKey ?? "").trim();

    if (!id || name.length < 3 || name.length > CHAT_LIMITS.roomNameLength) return null;
    if (isPrivate && (roomKey.length < 4 || roomKey.length > CHAT_LIMITS.roomPasswordLength)) return null;

    return { id, name, isPrivate, roomKey: isPrivate ? roomKey : null };
}

export function hashRoomPassword(value) {
    return createHash("sha256").update(String(value ?? "")).digest();
}

export function roomPasswordMatches(value, storedHash) {
    if (!storedHash) return false;
    const candidate = hashRoomPassword(value);
    return candidate.length === storedHash.length && timingSafeEqual(candidate, storedHash);
}

export function toPublicRoom(room) {
    return {
        id: room.id,
        name: room.name,
        hostId: room.hostId,
        isPrivate: room.isPrivate,
        createdByChatId: room.createdByChatId,
        createdByName: room.createdByName,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
    };
}

export function allowSocketAction(socket, key, { limit, windowMs }) {
    const now = Date.now();
    const rateLimits = socket.data.rateLimits ?? new Map();
    const current = rateLimits.get(key);

    if (!current || now - current.startedAt >= windowMs) {
        rateLimits.set(key, { count: 1, startedAt: now });
        socket.data.rateLimits = rateLimits;
        return true;
    }

    if (current.count >= limit) return false;
    current.count += 1;
    return true;
}

export function createMessage({ message, receiver = null, roomId = null, sender }) {
    return {
        id: randomUUID(),
        sender,
        receiver,
        roomId,
        message,
        timeStamp: Date.now(),
    };
}
