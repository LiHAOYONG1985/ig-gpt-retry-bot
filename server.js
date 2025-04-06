const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Webhook 驗證用（Meta 要求）
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// 收 IG 訊息用的 webhook
app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object === 'instagram') {
    const entry = body.entry?.[0];
    const messaging = entry.messaging?.[0];

    if (messaging && messaging.message) {
      const senderId = messaging.sender.id;
      const userMessage = messaging.message.text;

      // 呼叫 OpenAI API 取得回覆
      const gptReply = await callGPT(userMessage);

      // 你可以在這裡加上發送訊息回 IG 的邏輯（之後我們補上）
      console.log(`收到訊息：${userMessage}`);
      console.log(`GPT 回覆：${gptReply}`);
    }

    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

async function callGPT(userInput) {
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: userInput }],
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    }
  );

  return response.data.choices[0].message.content;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
