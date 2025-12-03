import { BoardState, Difficulty } from "../types";

export const getAuraTaunt = async (
  board: BoardState,
  lastMoveIndex: number,
  isAiMove: boolean,
  difficulty: Difficulty
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    // API Key is optional for the app to run, but required for Taunts
    return "";
  }

  try {
    const boardStr = board.map(c => c || '-').join('');
    
    // Direct REST API call to bypass SDK build resolution issues
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Current Tic-Tac-Toe board state: ${boardStr}. The last move was made by ${isAiMove ? 'YOU (The AI)' : 'The Opponent (Player)'} at index ${lastMoveIndex}. Difficulty Setting: ${difficulty}.
      
      Generate a short, snappy, Gen Z slang taunt or comment reacting to this move.
      Examples: "Bro is cooked", "Skill issue", "Bet", "Main character energy", "Standing on business", "Low key genius".
      Keep it under 15 words. Be funny but competitive.`
            }]
          }],
          generationConfig: {
            maxOutputTokens: 60,
          },
          systemInstruction: {
            parts: [{ text: "You are Aura, a Gen Z Tic-Tac-Toe AI master. You speak exclusively in modern internet slang. You are confident, slightly toxic but playful." }]
          }
        }),
      }
    );

    if (!response.ok) {
        return "";
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    return text?.trim() || "";
  } catch (e) {
    console.error("Gemini generation error:", e);
    return "";
  }
};
