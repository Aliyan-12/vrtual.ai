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
import type { WavConversionOptions } from '@/lib/ai/voiceService';
import { writeFile, mkdirSync, existsSync } from "fs";
import path from "path";

export async function convertTextToSpeech(fullText: string) {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/voice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: fullText })
    });

    if(!response.ok) {
      console.error("Voice conversion unknown error:", response.text());
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error("Voice conversion error:", err);
  }
}

export async function saveBinaryFile(fileName: string, content: Buffer) {
  const folderPath = createDestinationFolder();
  const filePath = path.join(folderPath, fileName);
  writeFile(filePath, content, 'utf8', (err) => {
      if (err) {
          console.error(`Error writing file ${fileName}:`, err);
          return;
      }
      console.log(`File ${fileName} saved to file system.`);
  });

  return filePath;
}

export async function convertToWav(rawData: string, mimeType: string) {
  const options = parseMimeType(mimeType)
  const wavHeader = createWavHeader(rawData.length, options);
  const buffer = Buffer.from(rawData, 'base64');

  return Buffer.concat([wavHeader, buffer]);
}

function parseMimeType(mimeType : string) {
  const [fileType, ...params] = mimeType.split(';').map(s => s.trim());
  const [_, format] = fileType.split('/');

  const options : Partial<WavConversionOptions> = {
    numChannels: 1,
  };

  if (format && format.startsWith('L')) {
    const bits = parseInt(format.slice(1), 10);
    if (!isNaN(bits)) {
      options.bitsPerSample = bits;
    }
  }

  for (const param of params) {
    const [key, value] = param.split('=').map(s => s.trim());
    if (key === 'rate') {
      options.sampleRate = parseInt(value, 10);
    }
  }

  return options as WavConversionOptions;
}

function createWavHeader(dataLength: number, options: WavConversionOptions) {
  const {
    numChannels,
    sampleRate,
    bitsPerSample,
  } = options;

  // http://soundfile.sapp.org/doc/WaveFormat

  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const buffer = Buffer.alloc(44);

  buffer.write('RIFF', 0);                      // ChunkID
  buffer.writeUInt32LE(36 + dataLength, 4);     // ChunkSize
  buffer.write('WAVE', 8);                      // Format
  buffer.write('fmt ', 12);                     // Subchunk1ID
  buffer.writeUInt32LE(16, 16);                 // Subchunk1Size (PCM)
  buffer.writeUInt16LE(1, 20);                  // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);        // NumChannels
  buffer.writeUInt32LE(sampleRate, 24);         // SampleRate
  buffer.writeUInt32LE(byteRate, 28);           // ByteRate
  buffer.writeUInt16LE(blockAlign, 32);         // BlockAlign
  buffer.writeUInt16LE(bitsPerSample, 34);      // BitsPerSample
  buffer.write('data', 36);                     // Subchunk2ID
  buffer.writeUInt32LE(dataLength, 40);         // Subchunk2Size

  return buffer;
}

function createDestinationFolder() {
  const voicesPath = path.join("public", "generated");

  if (!existsSync(voicesPath)) {
    mkdirSync(voicesPath, { recursive: true });
    console.log("Created folder:", voicesPath);
  }

  return voicesPath;
}