import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { isDemo, appUrl } from "@/lib/config";
import { DomainError } from "@/lib/engine";
import { checkOrigin, fail, rateLimit } from "@/lib/http";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    rateLimit(`upload:${req.headers.get("x-forwarded-for") || "local"}`, 8);
    if (Number(req.headers.get("content-length")) > 3 * 1024 * 1024)
      throw new DomainError("Images must be smaller than 2 MB.");
    const f = (await req.formData()).get("file");
    if (!(f instanceof File) || f.size > 2 * 1024 * 1024)
      throw new DomainError("Choose a PNG, JPEG or WebP image under 2 MB.");
    const bytes = Buffer.from(await f.arrayBuffer());
    const ext = bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? "png"
      : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        ? "jpg"
        : bytes.toString("ascii", 0, 4) === "RIFF" &&
            bytes.toString("ascii", 8, 12) === "WEBP"
          ? "webp"
          : null;
    if (!ext)
      throw new DomainError("Only PNG, JPEG and WebP images are supported.");
    const name = `${randomUUID()}.${ext}`;
    if (isDemo()) {
      const dir = path.join(
        process.env.SKYCITY_DATA_DIR || path.join(process.cwd(), ".data"),
        "uploads",
      );
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, name), bytes);
      return Response.json({ url: `${appUrl()}/api/uploads/${name}` });
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
    const { error } = await supabase.storage
      .from("advertisements")
      .upload(name, bytes, {
        contentType: ext === "jpg" ? "image/jpeg" : `image/${ext}`,
        upsert: false,
      });
    if (error) throw error;
    return Response.json({
      url: supabase.storage.from("advertisements").getPublicUrl(name).data
        .publicUrl,
    });
  } catch (e) {
    return fail(e);
  }
}
