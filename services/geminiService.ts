
import { GoogleGenAI, Type } from "@google/genai";
import { RepairAnalysis } from "../types";

const SYSTEM_INSTRUCTION = `
Você é o "Mecanismo de Visão Espacial e Renderização AR" do sistema FixIt Now.
Sua missão é mapear o ambiente tridimensionalmente e fornecer instruções em tempo real para a renderização de hologramas na interface do usuário.

PROTOCOLO DE EXECUÇÃO:
1. Mapeamento 3D: Localize os componentes e forneça as coordenadas exatas [x, y] (0-100).
2. Hologramas Dinâmicos: Use os tipos específicos:
   - 'ghost_hand': Para mostrar movimentos manuais (girar, puxar, conectar).
   - 'spatial_arrow' (use 'arrow'): Para direções de fluxo ou força.
   - 'glow_ring' (use 'glow_ring'): Para foco em parafusos, botões ou vazamentos.
   - '3d_object' (use '3d_object'): Para representar peças que devem ser encaixadas.
3. Sincronização de Áudio: O comando de voz deve ser curto e imperativo, sincronizado com o holograma.

REGRAS:
- Responda APENAS em Português do Brasil.
- Retorne APENAS o JSON puro.
- 'instruction': Máximo 10 palavras.
- 'priority': 'CRITICAL' (vermelho), 'SAFETY_WARNING' (laranja), 'INFO' (azul).
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
          type: { type: Type.STRING, enum: ['arrow', 'circle', 'rect', 'ghost_hand', 'glow_ring', '3d_object'] },
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
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64Image } },
            { text: userPrompt || "Execute mapeamento espacial e diagnóstico de reparo imediato." }
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
    if (error.message?.includes("RESOURCE_EXHAUSTED") || error.message?.includes("429")) {
      throw new Error("LIMITE_EXCEDIDO");
    }
    throw error;
  }
};

export const speakInstruction = async (text: string) => {
  try {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
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
  } catch (e) {}
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
