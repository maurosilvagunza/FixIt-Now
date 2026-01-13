
import { GoogleGenAI, Type } from "@google/genai";
import { RepairAnalysis } from "../types";

const SYSTEM_INSTRUCTION = `
Você é o "FixIt Now", um assistente de reparos domésticos e automotivos de elite.
Seu objetivo é fornecer instruções IMEDIATAS, ASSERTIVAS e CLARAS baseadas em imagens ou quadros de vídeo.

CAPACIDADES DE DIAGNÓSTICO:
1. Identificar emergências: vazamentos de água, problemas em painéis elétricos, baterias de carro, fumaça, etc.
2. Localizar componentes específicos (válvulas, disjuntores, terminais).

REGRAS DE SAÍDA:
- Responda SEMPRE em Português do Brasil.
- 'instruction': Comando curto e imperativo (ex: "FECHE O REGISTRO AGORA!").
- 'priority': 'CRITICAL' para perigo imediato, 'SAFETY_WARNING' para riscos elétricos/gás, 'INFO' para orientações gerais.
- 'overlays': Marcadores visuais para a tela. Coordenadas x e y normalizadas (0-100).
- SEMPRE priorize a segurança. Se houver fios expostos ou perigo real, use 'SAFETY_WARNING' e instrua a não tocar e chamar um profissional.

Forneça a resposta apenas em formato JSON.
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
  const apiKey = (import.meta as any).env.MY_API_KEY || process.env.MY_API_KEY;
  if (!apiKey || apiKey === 'undefined' || apiKey.includes('YOUR_GEMINI_API_KEY')) {
    throw new Error("Chave de API Gemini não configurada. Configure MY_API_KEY no .env.local");
  }
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64Image } },
            { text: userPrompt || "Identifique qualquer problema de reparo urgente nesta imagem e dê instruções." }
          ]
        }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: REPAIR_SCHEMA,
      }
    });

    return JSON.parse(response.text || "{}") as RepairAnalysis;
  } catch (error) {
    console.error("Erro na análise Gemini:", error);
    throw error;
  }
};

export const speakInstruction = async (text: string) => {
  const apiKey = (import.meta as any).env.MY_API_KEY || process.env.MY_API_KEY;
  if (!apiKey || apiKey === 'undefined' || apiKey.includes('YOUR_GEMINI_API_KEY')) {
    console.warn("Chave de API não configurada para TTS");
    return;
  }
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Diga de forma assertiva: ${text}` }] }],
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
    console.error("Erro no TTS:", error);
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
