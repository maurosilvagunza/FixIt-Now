
import { GoogleGenAI, Type } from "@google/genai";
import { RepairAnalysis } from "../types";

const SYSTEM_INSTRUCTION = `
Você é o "Mecanismo de Visão Espacial e Renderização Multimodal" do sistema FixIt Now.
Sua missão é mapear o ambiente e traduzir necessidades técnicas em instruções cinéticas e holográficas precisas de 10 segundos.

PROTOCOLO DE ANÁLISE E EXECUÇÃO:
1. Diagnóstico de Objeto e Estado: Identifique o objeto e seu estado anômalo (ex: cabo solto, parafuso frouxo).
2. Mapeamento de Vetores: Forneça coordenadas [x, y] (0-100) para ancoragem AR.
3. Biblioteca de Hologramas Dinâmicos (SELEÇÃO CRÍTICA):
   - 'ghost_hands': Use SEMPRE para ações manuais. O 'label' DEVE ser uma destas ações: "EMPURRAR", "GIRAR", "PUXAR", "PRESSIONAR" ou "CONECTAR".
   - 'spatial_arrow': Use para indicar direção de encaixe ou fluxo.
   - 'exploded_view': Use para mostrar o interior de componentes.
   - 'glow_zone': Use para destacar perigo ou foco.

Sincronização: A instrução de áudio deve ser curta e direta ao ponto, disparada junto com a animação.

REGRAS:
- Responda SEMPRE em Português do Brasil.
- Retorne APENAS JSON puro.
- 'instruction': Comando de ação (ex: "Empurre o cabo para conectar").
- 'priority': 'CRITICAL', 'SAFETY_WARNING', 'INFO'.
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
          type: { type: Type.STRING, enum: ['ghost_hands', 'spatial_arrow', 'exploded_view', 'glow_zone', 'circle', 'rect'] },
          x: { type: Type.NUMBER },
          y: { type: Type.NUMBER },
          color: { type: Type.STRING, enum: ['red', 'green', 'blue', 'yellow'] },
          label: { type: Type.STRING, description: "Ação específica: EMPURRAR, GIRAR, PUXAR, PRESSIONAR, CONECTAR" },
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
  if (!key) throw new Error("API_KEY_MISSING");
  return key;
};

export const analyzeFrame = async (base64Image: string, userPrompt: string = ""): Promise<RepairAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: userPrompt || "Execute mapeamento de vetores AR para uma animação de 10 segundos que demonstre a ação física necessária." }
        ]
      }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: REPAIR_SCHEMA,
      }
    });
    return JSON.parse(response.text || "{}") as RepairAnalysis;
  } catch (error: any) {
    if (error.message?.includes("429") || error.message?.includes("RESOURCE_EXHAUSTED")) throw new Error("LIMITE_EXCEDIDO");
    throw error;
  }
};

export const speakInstruction = async (text: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } }
      }
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const decoded = atob(base64Audio);
      const bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
      const int16 = new Int16Array(bytes.buffer);
      const buffer = audioCtx.createBuffer(1, int16.length, 24000);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < int16.length; i++) data[i] = int16[i] / 32768.0;
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start();
    }
  } catch (e) {}
};
