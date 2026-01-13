
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { RepairAnalysis } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are "FixIt Now", a world-class home and automotive repair emergency assistant.
Your goal is to provide IMMEDIATE, ASSERTIVE, and CLEAR instructions based on images/video frames.

DIAGNOSTIC CAPABILITIES:
1. Identify common emergencies: water leaks, electrical panel issues, car battery problems, smoke, gas smells (visual cues), etc.
2. Locate specific components (valves, breakers, terminals).

OUTPUT RULES:
- Provide a JSON response only.
- 'instruction': Short, imperative command (e.g., "CLOSE THE VALVE NOW!").
- 'priority': 'CRITICAL' for immediate danger, 'SAFETY_WARNING' for electrical/gas risks, 'INFO' for general guidance.
- 'overlays': Array of markers to draw on the screen. x and y are normalized coordinates (0-100).
- 'overlays[i].type': 'arrow', 'circle', or 'rect'.
- 'overlays[i].color': 'red' for danger/alerts, 'green' for correct actions, 'blue' for components.
- Always prioritize safety. If you see exposed wires and it's dangerous, 'priority' must be 'SAFETY_WARNING' and 'instruction' must be "DO NOT TOUCH! CALL AN ELECTRICIAN."

If the issue seems resolved, set 'isIssueResolved' to true.
`;

const REPAIR_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    instruction: { type: Type.STRING },
    detailedSteps: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING } 
    },
    priority: { 
      type: Type.STRING,
      enum: ['CRITICAL', 'SAFETY_WARNING', 'INFO']
    },
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
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64Image } },
            { text: userPrompt || "Analyze this scene for any emergency repair issues and provide guidance." }
          ]
        }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: REPAIR_SCHEMA,
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result as RepairAnalysis;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const speakInstruction = async (text: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Assertive command: ${text}` }] }],
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
    console.error("TTS Error:", error);
  }
};

// Audio Helpers
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
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
