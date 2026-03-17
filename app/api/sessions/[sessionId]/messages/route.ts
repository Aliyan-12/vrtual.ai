import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/utils/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const chatSession = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
  });

  if (!chatSession) {
    return new Response("Session not found", { status: 404 });
  }

  const { role, content } = await req.json();

  const message = await prisma.message.create({
    data: {
      sessionId,
      role,
      content,
    },
  });

  if (chatSession.title === "New Chat" && role === "user") {
    const title = content.length > 60 ? content.substring(0, 60) + "..." : content;
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { title },
    });
  }

  return Response.json(message);
}
