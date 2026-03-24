import { VideoService } from "@/lib/ai/videoService";

export async function POST(req: Request) {
  const { query, userContext } = await req.json();

  const enriched = await VideoService.searchAndEnrich(query, userContext, "[voice/tool]");

  return Response.json(enriched);
}
