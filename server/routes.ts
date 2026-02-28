import type { Express } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/chat", async (req, res) => {
    const { messages, language, languageName } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array required" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const systemPrompt = `You are a friendly and encouraging language tutor helping a student practice ${languageName || "a foreign language"} (language code: ${language || "unknown"}).

Your role:
- Respond naturally in ${languageName || "the target language"} when the student writes in it
- Correct mistakes gently and explain why, without being condescending
- Handle spelling mistakes, slang, and informal language naturally
- Mix the target language with English explanations when helpful
- Keep conversations engaging, practical, and educational
- Praise good usage and progress
- If the student writes in English, gently encourage them to try in ${languageName || "the target language"}
- Provide vocabulary tips, grammar hints, and cultural context when relevant
- Use short, clear sentences that are easy to understand`;

    const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    try {
      const stream = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: chatMessages,
        stream: true,
        max_completion_tokens: 1024,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err) {
      console.error("Chat error:", err);
      res.write(`data: ${JSON.stringify({ error: "AI unavailable" })}\n\n`);
      res.end();
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
