
import { GoogleGenAI, Type } from "@google/genai";
import { RepairAnalysis } from "../types";

const SYSTEM_INSTRUCTION = `
Você é o "FixIt Now", um assistente de reparos domésticos e automotivos de elite.
Seu objetivo é fornecer instruções IMEDIATAS, ASSERTIVAS e CLARAS baseadas em imagens.

CAPACIDADES:
1. Identificar emergências: vazamentos, painéis elétricos, baterias, etc.
2. Localizar componentes específicos com precisão absoluta.

REGRAS:
- Responda SEMPRE em Português do Brasil.
- Retorne APENAS o JSON puro.
- 'instruction': Comando curto e imperativo (máximo 10 palavras).
- 'priority': 'CRITICAL', 'SAFETY_WARNING' ou 'INFO'.
- 'overlays': Marcadores visuais {type, x, y, color, label}.
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

const getApiKey = (): string => {
  // @ts-ignore
  const viteKey = typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_KEY;
  const processKey = process.env.API_KEY || (process.env as any).VITE_API_KEY;
  const key = viteKey || processKey;

  if (!key || key === "undefined" || key === "") {
    throw new Error("CONFIG_MISSING");
  }
  return key;
};

export const analyzeFrame = async (base64Image: string, userPrompt: string = ""): Promise<RepairAnalysis> => {
  let apiKey: string;
  try {
    apiKey = getApiKey();
  } catch (e) {
    throw new Error("API_KEY_MISSING");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Trocado para Flash para evitar erro de cota
      contents: [
        {
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64Image } },
            { text: userPrompt || "Faça um diagnóstico rápido de reparo para esta imagem." }
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
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr) as RepairAnalysis;
  } catch (error: any) {
    console.error("Erro Gemini:", error);
    if (error.message?.includes("RESOURCE_EXHAUSTED") || error.message?.includes("429")) {
      throw new Error("LIMITE_EXCEDIDO: O Google atingiu o limite de requisições gratuitas. Aguarde um minuto e tente novamente.");
    }
    if (error.message?.includes("API key")) {
      throw new Error("API_KEY_INVALIDA");
    }
    throw error;
  }
};

export const speakInstruction = async (text: string) => {
  let apiKey: string;
  try {
    apiKey = getApiKey();
  } catch (e) {
    return;
  }

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Diga: ${text}` }] }],
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
    console.warn("TTS Off");
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
