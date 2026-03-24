import { readFileSync, existsSync } from "fs";
import path from "path";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const file = url.searchParams.get("file");

  if (!file || file.includes("..") || file.includes("/") || file.includes("\\")) {
    return new Response("Invalid file", { status: 400 });
  }

  const filePath = path.join(process.cwd(), "public", "generated", file);

  if (!existsSync(filePath)) {
    return new Response("Not found", { status: 404 });
  }

  const buffer = readFileSync(filePath);
  const ext = path.extname(file).slice(1);
  const mimeType = ext === "wav" ? "audio/wav" : ext === "mp3" ? "audio/mpeg" : "audio/octet-stream";

  return new Response(buffer, {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
