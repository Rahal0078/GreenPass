import { Router } from "express";
import type { IRouter } from "express";
import { logger } from "../lib/logger";
import { getRows, updateRow, findRow, TABS } from "../lib/db";

const router: IRouter = Router();

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "BC0q5FFcmmCWrbpnOB5mrLIUpqVSD3fwZ7e1Z5VvsuSj2jEOVydX2ZTOWdsYV9LW4PiJf6xilxSU6kCJtpKMzmw";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "fBJsdw-Bq6KwuNa8-sTSgt251WQMwntnnTyQS5ZMR2s";
const VAPID_EMAIL = `mailto:${process.env.SENDER_EMAIL ?? "info.vekay@gmail.com"}`;

interface PushSub { endpoint: string; p256dh: string; auth: string; }

function parseSubs(raw: string): PushSub[] {
  try { return JSON.parse(raw) as PushSub[]; } catch { return []; }
}

async function getWebPush() {
  const webpush = await import("web-push");
  webpush.default.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return webpush.default;
}

router.get("/push/vapid-key", (_req, res): void => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

router.post("/push/subscribe", async (req, res): Promise<void> => {
  const session = req.session as any;
  if (!session?.userId || session.role !== "technician") {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { endpoint, p256dh, auth } = req.body;
  if (!endpoint || !p256dh || !auth) {
    res.status(400).json({ error: "Missing subscription fields" });
    return;
  }

  try {
    const tech = await findRow(TABS.STAFF, "id", String(session.userId));
    if (!tech) {
      res.status(404).json({ error: "Technician not found" });
      return;
    }

    const subs = parseSubs(tech.push_subscriptions ?? "[]");
    const existing = subs.findIndex(s => s.endpoint === endpoint);
    const newSub: PushSub = { endpoint, p256dh, auth };
    if (existing >= 0) {
      subs[existing] = newSub;
    } else {
      subs.push(newSub);
    }

    await updateRow(TABS.STAFF, session.userId, { push_subscriptions: JSON.stringify(subs) });
    res.json({ message: "Subscribed" });
  } catch (err) {
    logger.warn({ err }, "Push subscribe error");
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

router.post("/push/unsubscribe", async (req, res): Promise<void> => {
  const { endpoint } = req.body;
  if (!endpoint) {
    res.status(400).json({ error: "Missing endpoint" });
    return;
  }

  const session = req.session as any;
  if (!session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const tech = await findRow(TABS.STAFF, "id", String(session.userId));
    if (tech) {
      const subs = parseSubs(tech.push_subscriptions ?? "[]").filter(s => s.endpoint !== endpoint);
      await updateRow(TABS.STAFF, session.userId, { push_subscriptions: JSON.stringify(subs) });
    }
    res.json({ message: "Unsubscribed" });
  } catch (err) {
    logger.warn({ err }, "Push unsubscribe error");
    res.json({ message: "Unsubscribed" });
  }
});

export async function sendPushToTechnicians(
  technicianIds: number[],
  payload: { title: string; body: string; data?: Record<string, unknown> },
): Promise<void> {
  if (!technicianIds.length) return;

  let webpush: Awaited<ReturnType<typeof getWebPush>>;
  try {
    webpush = await getWebPush();
  } catch (err) {
    logger.warn({ err }, "web-push init failed");
    return;
  }

  const staff = await getRows(TABS.STAFF);
  const targets = staff.filter(t => technicianIds.includes(parseInt(t.id)));

  const notification = JSON.stringify({
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    icon: "/greenpass-logo.jpeg",
    badge: "/favicon.svg",
  });

  for (const tech of targets) {
    const subs = parseSubs(tech.push_subscriptions ?? "[]");
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          notification,
        );
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          const remaining = subs.filter(s => s.endpoint !== sub.endpoint);
          await updateRow(TABS.STAFF, tech.id, { push_subscriptions: JSON.stringify(remaining) }).catch(() => {});
        } else {
          logger.warn({ err, technicianId: tech.id }, "Push send failed");
        }
      }
    }
  }
}

export default router;
