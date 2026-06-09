import { Router } from "express";
import type { IRouter } from "express";
import { verifyPassword } from "../lib/auth";
import { saveExcelBackup } from "./reports";
import { findRow, updateRow, TABS } from "../lib/db";

const router: IRouter = Router();


router.post("/auth/admin/login", async (req, res): Promise<void> => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  const admin = await findRow(TABS.ADMINS, "username", username);
  if (!admin || !verifyPassword(password, admin.password_hash)) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  req.session.userId = parseInt(admin.id);
  req.session.role = "admin";
  req.session.name = admin.name;
  req.session.username = admin.username;

  saveExcelBackup().catch(() => {});
  req.session.save((err) => {
    if (err) { res.status(500).json({ error: "Session save failed" }); return; }
    res.json({ id: parseInt(admin.id), username: admin.username, name: admin.name, role: "admin" });
  });
});

router.post("/auth/technician/login", async (req, res): Promise<void> => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  const tech = await findRow(TABS.STAFF, "username", username);
  if (!tech || !verifyPassword(password, tech.password_hash)) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  if (tech.is_active !== "true") {
    res.status(401).json({ error: "Account is inactive. Contact admin." });
    return;
  }

  req.session.userId = parseInt(tech.id);
  req.session.role = "technician";
  req.session.name = tech.name;
  req.session.username = tech.username;

  req.session.save((err) => {
    if (err) { res.status(500).json({ error: "Session save failed" }); return; }
    res.json({ id: parseInt(tech.id), username: tech.username, name: tech.name, role: "technician" });
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  const admin = await findRow(TABS.ADMINS, "username", username);
  if (admin && verifyPassword(password, admin.password_hash)) {
    req.session.userId = parseInt(admin.id);
    req.session.role = "admin";
    req.session.name = admin.name;
    req.session.username = admin.username;
    saveExcelBackup().catch(() => {});
    req.session.save((err) => {
      if (err) { res.status(500).json({ error: "Session save failed" }); return; }
      res.json({ id: parseInt(admin.id), username: admin.username, name: admin.name, role: "admin" });
    });
    return;
  }

  const tech = await findRow(TABS.STAFF, "username", username);
  if (tech && verifyPassword(password, tech.password_hash)) {
    if (tech.is_active !== "true") {
      res.status(401).json({ error: "Account is inactive. Contact admin." });
      return;
    }
    req.session.userId = parseInt(tech.id);
    req.session.role = "technician";
    req.session.name = tech.name;
    req.session.username = tech.username;
    req.session.save((err) => {
      if (err) { res.status(500).json({ error: "Session save failed" }); return; }
      res.json({ id: parseInt(tech.id), username: tech.username, name: tech.name, role: "technician" });
    });
    return;
  }

  res.status(401).json({ error: "Invalid username or password" });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.json({ message: "Logged out successfully" });
  });
});

router.get("/auth/me", (req, res): void => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({
    id: req.session.userId,
    username: req.session.username,
    name: req.session.name,
    role: req.session.role,
  });
});

router.post("/auth/change-password", async (req, res): Promise<void> => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword required" });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters" });
    return;
  }

  const { hashPassword } = await import("../lib/auth");
  const { userId, role } = req.session;
  const tab = role === "admin" ? TABS.ADMINS : TABS.STAFF;
  const row = await findRow(tab, "id", String(userId));
  if (!row) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  if (!verifyPassword(currentPassword, row.password_hash)) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  await updateRow(tab, userId, { password_hash: hashPassword(newPassword) });
  res.json({ ok: true });
});

export default router;
