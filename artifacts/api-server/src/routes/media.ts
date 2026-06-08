import { Router } from "express";
import type { IRouter } from "express";
import fs from "fs";
import path from "path";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

router.post("/media/upload", async (req, res): Promise<void> => {
  try {
    const { filename, mimeType, data } = req.body as { filename: string; mimeType: string; data: string };

    if (!filename || !mimeType || !data) {
      res.status(400).json({ error: "filename, mimeType, and data are required" });
      return;
    }

    const ext = filename.split(".").pop() ?? "bin";
    const safeFilename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, safeFilename);

    const buffer = Buffer.from(data, "base64");
    fs.writeFileSync(filePath, buffer);

    const url = `/api/media/files/${safeFilename}`;
    res.json({ url, filename: safeFilename });
  } catch (err) {
    logger.error({ err }, "Failed to upload media");
    res.status(500).json({ error: "Upload failed" });
  }
});

router.get("/media/files/:filename", (req, res): void => {
  const filename = req.params.filename as string;
  if (!filename || filename.includes("..")) {
    res.status(400).json({ error: "Invalid filename" });
    return;
  }
  const filePath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  const isPdf = filename.toLowerCase().endsWith(".pdf");
  if (isPdf) {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  }
  res.sendFile(filePath);
});

export default router;
