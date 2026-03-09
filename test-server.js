// Simple test server for AI chat
const express = require('express');
const OpenAI = require('openai');

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

app.post('/api/chat', async (req, res) => {
  const { messages, language, languageName } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array required" });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const targetLanguage = languageName || 'the target language';
  const systemPrompt = language === 'en'
    ? `You are a friendly, encouraging English language tutor. Your job is to help the student practice and improve their English. Always respond in clear, natural English. Gently correct mistakes. Keep conversations engaging. Ask follow-up questions. Use short, clear sentences.`
    : `You are a friendly language tutor helping a student practice ${targetLanguage}. Respond naturally in the target language. Correct mistakes gently. Keep conversations engaging. Use short, clear sentences.`;

  const chatMessages = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');

  } catch (error) {
    console.error("Error with OpenAI stream:", error);
    res.write(`data: ${JSON.stringify({ error: "Sorry, I'm having trouble connecting to the AI." })}\n\n`);
  } finally {
    res.end();
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Test server listening on port ${PORT}`);
});
