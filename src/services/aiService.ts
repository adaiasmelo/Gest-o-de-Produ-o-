import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;
function getAI() {
    if (!aiInstance) {
        aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'missing_key' });
    }
    return aiInstance;
}

export async function extractProductionData(base64Image: string) {
    const ai = getAI();
    const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
    const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
            {
                inlineData: {
                    data: base64Data,
                    mimeType: "image/jpeg"
                }
            },
            "Extraia os dados de produção (controle de setup, paradas, empacotamento, reciclagens) desta imagem do boletim de produção. Retorne SOMENTE os valores de acordo com o JSON especificado na resposta."
        ],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    date: { type: Type.STRING },
                    operator: { type: Type.STRING },
                    machine: { type: Type.STRING },
                    shift: { type: Type.STRING },
                    grossWeight: { type: Type.NUMBER },
                    tara: { type: Type.NUMBER },
                    netWeight: { type: Type.NUMBER },
                    volumes: { type: Type.NUMBER },
                    tubetes: { type: Type.NUMBER },
                    ecoA: { type: Type.NUMBER },
                    ecoBP: { type: Type.NUMBER },
                    ecoBM: { type: Type.NUMBER },
                    borraTotal: { type: Type.NUMBER },
                    manutencaoMin: { type: Type.NUMBER },
                    manutencaoMotivo: { type: Type.STRING },
                    processoMin: { type: Type.NUMBER },
                    processoMotivo: { type: Type.STRING },
                    outrosMin: { type: Type.NUMBER },
                    outrosMotivo: { type: Type.STRING },
                }
            }
        }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
}
