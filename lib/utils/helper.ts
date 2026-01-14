import {
  streamText,
  StreamTextResult,
  ContentPart,
  ToolCallPart,
  ToolResultPart,
  ImagePart,
  FilePart,
  ReasoningUIPart,
  ToolContent,
  TextPart,
  GenerateTextResult
} from 'ai';

export function extractMessage(text: string): string {
  try {
    const parsed = JSON.parse(text);

    if (parsed && typeof parsed.message === "string") {
      return parsed.message;
    }

    return text;
  } catch {
    return text;
  }
}

export async function extractTextFromStream(
  resPromise: Promise<GenerateTextResult<any, any>>
): Promise<any> {
  const res = await resPromise;

  const content: ContentPart<any>[] = await res.content;

  const extracted = content.filter(
    (part): part is TextPart | ToolCallPart =>
      part.type === 'text' || part.type === 'tool-call'
  );

  return extracted;
}
