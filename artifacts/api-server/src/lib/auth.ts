import crypto from "crypto";

export function hashPassword(password: string): string {
  const salt = process.env.PASSWORD_SALT ?? "vekay_salt_2024";
  return crypto.createHash("sha256").update(password + salt).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function generateTicketId(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `VK-${dateStr}-${rand}`;
}
