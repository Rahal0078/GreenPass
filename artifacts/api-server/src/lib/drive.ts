import { google } from "googleapis";
import { Readable } from "stream";
import { logger } from "./logger";

// Service accounts have no Drive storage quota of their own.
// Files must be placed in a folder owned by a real Google account
// that has been shared (Editor) with the service account.
// Set DRIVE_FOLDER_ID to that folder's ID.
function getFolderId(): string {
  const id = process.env.DRIVE_FOLDER_ID?.trim();
  if (!id) throw new Error(
    "DRIVE_FOLDER_ID is not set. " +
    "Create a Google Drive folder, share it (Editor) with the service account email, " +
    "then add its ID as the DRIVE_FOLDER_ID secret."
  );
  return id;
}

function getDriveClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");
  const creds = JSON.parse(raw);
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
}

export async function uploadQuotationPdf(buffer: Buffer, filename: string): Promise<string> {
  const drive = getDriveClient();
  const folderId = getFolderId();

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      mimeType: "application/pdf",
      parents: [folderId],
    },
    media: {
      mimeType: "application/pdf",
      body: Readable.from(buffer),
    },
    fields: "id",
  });

  const fileId = res.data.id;
  if (!fileId) throw new Error("Drive upload returned no file ID");

  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  logger.info({ filename, fileId, folderId }, "Quotation PDF uploaded to Google Drive");
  return fileId;
}

export async function deleteQuotationPdf(fileId: string): Promise<void> {
  if (!fileId || fileId.toLowerCase().endsWith(".pdf")) return; // skip local/legacy refs
  try {
    const drive = getDriveClient();
    await drive.files.delete({ fileId });
    logger.info({ fileId }, "Quotation PDF deleted from Google Drive");
  } catch (err) {
    logger.warn({ err, fileId }, "Failed to delete quotation PDF from Drive (may already be deleted)");
  }
}

export function pdfViewUrl(
  _req: { protocol: string; get: (h: string) => string | undefined },
  fileId: string,
): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}
