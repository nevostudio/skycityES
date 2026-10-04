import { readFile } from "node:fs/promises";
import path from "node:path";
import { isDemo } from "@/lib/config";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  if (!isDemo()) return new Response("Not found", { status: 404 });
  const { file } = await params;
  if (!/^[0-9a-f-]{36}\.(png|jpg|webp)$/.test(file))
    return new Response("Not found", { status: 404 });
  try {
    const bytes = await readFile(
      path.join(
        process.env.SKYCITY_DATA_DIR || path.join(process.cwd(), ".data"),
        "uploads",
        file,
      ),
    );
    return new Response(bytes, {
      headers: {
        "Content-Type": file.endsWith(".jpg")
          ? "image/jpeg"
          : file.endsWith(".png")
            ? "image/png"
            : "image/webp",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
