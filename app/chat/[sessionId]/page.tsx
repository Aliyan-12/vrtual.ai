import Chat from "@/components/chat/Chat";

export default async function SessionChatPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <Chat sessionId={sessionId} />;
}
