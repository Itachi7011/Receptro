import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { requireUser } from "@/lib/auth/requireUser";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { cloudinary, cloudinaryConfigured } from "@/lib/cloudinary";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    await requireUser(req);

    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return fail("No file provided. Attach a file under the 'file' field.", 400);
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return fail("Only JPG, PNG, and PDF files are allowed.", 400);
    }
    if (file.size > MAX_SIZE_BYTES) {
      return fail("File too large. Maximum size is 10MB.", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = `${randomUUID()}${path.extname(file.name) || ""}`;

    if (cloudinaryConfigured) {
      const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;
      const resourceType = file.type === "application/pdf" ? "raw" : "auto";
      const result = await cloudinary.uploader.upload(dataUri, {
        folder: "receptro/attachments",
        resource_type: resourceType,
        public_id: safeName.replace(path.extname(safeName), ""),
      });
      return ok({
        url: result.secure_url,
        publicId: result.public_id,
        provider: "cloudinary",
      });
    }

    // Dev fallback: write to /public/uploads so the app keeps working
    // end-to-end without a Cloudinary account. NOTE: this only works on
    // filesystems that persist between requests (local dev / traditional
    // Node hosting) — not on read-only serverless deployments.
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    await writeFile(path.join(uploadsDir, safeName), buffer);

    return ok({
      url: `/uploads/${safeName}`,
      publicId: safeName,
      provider: "local-disk",
      note: "Cloudinary is not configured, so this file was saved locally for development.",
    });
  } catch (err) {
    return handleApiError(err);
  }
}
