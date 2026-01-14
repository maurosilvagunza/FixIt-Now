
import { GoogleGenAI, Type } from "@google/genai";
import { RepairAnalysis } from "../types";

const SYSTEM_INSTRUCTION = `
Você é o "FixIt Now", um assistente de reparos domésticos e automotivos de elite.
Seu objetivo é fornecer instruções IMEDIATAS, ASSERTIVAS e CLARAS baseadas em imagens.

CAPACIDADES:
1. Identificar emergências: vazamentos, painéis elétricos, baterias, etc.
2. Localizar componentes específicos.

REGRAS:
- Responda SEMPRE em Português do Brasil.
- Retorne APENAS o JSON puro, sem markdown ou blocos de código.
- 'instruction': Comando curto e imperativo.
- 'priority': 'CRITICAL', 'SAFETY_WARNING' ou 'INFO'.
- 'overlays': Array de objetos com {type, x, y, color, label}.
`;

const REPAIR_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    instruction: { type: Type.STRING },
    detailedSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
    priority: { type: Type.STRING, enum: ['CRITICAL', 'SAFETY_WARNING', 'INFO'] },
    isIssueResolved: { type: Type.BOOLEAN },
    detectedObject: { type: Type.STRING },
    overlays: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ['arrow', 'circle', 'rect'] },
          x: { type: Type.NUMBER },
          y: { type: Type.NUMBER },
          color: { type: Type.STRING, enum: ['red', 'green', 'blue', 'yellow'] },
          label: { type: Type.STRING },
          rotation: { type: Type.NUMBER }
        },
        required: ['type', 'x', 'y', 'color']
      }
    }
  },
  required: ['instruction', 'priority', 'overlays', 'isIssueResolved', 'detectedObject']
};

export const analyzeFrame = async (base64Image: string, userPrompt: string = ""): Promise<RepairAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64Image } },
            { text: userPrompt || "Analise esta imagem para reparos urgentes." }
          ]
        }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: REPAIR_SCHEMA,
      }
    });

    const text = response.text || "{}";
    // Limpeza básica para garantir que o JSON seja parseado mesmo se houver markdown
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr) as RepairAnalysis;
  } catch (error) {
    console.error("Erro na análise:", error);
    throw error;
  }
};

export const speakInstruction = async (text: string) => {
  if (!text) return;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Comando direto: ${text}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Puck" }
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
    }
  } catch (error) {
    console.warn("TTS falhou, mas continuando...", error);
  }
};

function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
