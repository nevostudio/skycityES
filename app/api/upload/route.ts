import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { isDemo } from "@/lib/config";
import { DomainError } from "@/lib/engine";
import { checkOrigin, fail, rateLimit } from "@/lib/http";
import { MAX_UPLOAD_BYTES, normalizeImage, type ImageKind } from "@/lib/images";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    rateLimit(`upload:${req.headers.get("x-forwarded-for") || "local"}`, 8);
    if (Number(req.headers.get("content-length")) > MAX_UPLOAD_BYTES + 512000)
      throw new DomainError("Las imágenes deben pesar menos de 2 MB.");
    const form = await req.formData();
    const f = form.get("file");
    const kind: ImageKind = form.get("kind") === "banner" ? "banner" : "logo";
    if (!(f instanceof File) || f.size > MAX_UPLOAD_BYTES)
      throw new DomainError(
        "Elige una imagen PNG, JPEG o WebP de menos de 2 MB.",
      );
    const image = await normalizeImage(
      Buffer.from(await f.arrayBuffer()),
      kind,
      f.type || undefined,
    );
    const name = `${randomUUID()}.${image.ext}`;
    const meta = {
      width: image.width,
      height: image.height,
      transparent: image.hasAlpha,
    };
    if (isDemo()) {
      const dir = path.join(
        process.env.SKYCITY_DATA_DIR || path.join(process.cwd(), ".data"),
        "uploads",
      );
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, name), image.bytes);
      // Same-origin relative path: valid in any environment and CORS-free for WebGL textures.
      return Response.json({ url: `/api/uploads/${name}`, ...meta });
    }
    // Service-role key stays on the server; the browser only receives the public URL.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
    const { error } = await supabase.storage
      .from("advertisements")
      .upload(name, image.bytes, {
        contentType: image.contentType,
        cacheControl: "31536000",
        upsert: false,
      });
    if (error) throw error;
    return Response.json({
      url: supabase.storage.from("advertisements").getPublicUrl(name).data
        .publicUrl,
      ...meta,
    });
  } catch (e) {
    return fail(e);
  }
}
