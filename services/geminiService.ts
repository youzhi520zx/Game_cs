import { GoogleGenAI, Type } from "@google/genai";
import { GameStats } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-2.5-flash";

export const generateMissionBriefing = async (): Promise<{ title: string; briefing: string }> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: "生成一个有趣、充满活力的'大逃杀'综艺节目开场白。玩家是一个卡通参赛者，身处不断缩小的竞技场中。他们的'热度'（生命值）在不断流失，必须击败敌人才能留在游戏中！主题：古怪的卡通生存挑战。保持简短有力，40字以内。请使用中文回答。",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            briefing: { type: Type.STRING }
          },
          required: ["title", "briefing"]
        }
      }
    });

    const text = response.text;
    if (!text) return { title: "好戏开场！", briefing: "欢迎来到竞技场！你的能量正在快速流失！击败那些坏蛋来补充能量，成为最后的幸存者！" };
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Briefing Error:", error);
    return { title: "生存时刻！", briefing: "安全区正在缩小！你的能量在泄漏！击败敌人来充电并赢得大奖！" };
  }
};

export const generateAfterActionReport = async (stats: GameStats): Promise<{ rank: string; comment: string }> => {
  try {
    const prompt = `
      分析这场卡通战斗的数据：
      击败数 (Kills): ${stats.kills}
      造成的混乱 (Damage): ${stats.damageDealt}
      准确率: ${(stats.accuracy * 100).toFixed(1)}%
      生存时间: ${stats.survivedTime} 秒。
      
      扮演一个搞怪的综艺节目主持人。根据表现给出一个有趣的头衔（例如："沙发土豆"、"派对动物"、"竞技场冠军"、"卡通传奇"），并用一句话中文点评他们的表现。请使用中文回答。
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rank: { type: Type.STRING },
            comment: { type: Type.STRING }
          },
          required: ["rank", "comment"]
        }
      }
    });

    const text = response.text;
    if (!text) return { rank: "参赛者", comment: "感谢参与，祝你下次好运！" };
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Report Error:", error);
    return { rank: "挑战者", comment: "刚才真是...太惊险了！再试一次吧！" };
  }
};