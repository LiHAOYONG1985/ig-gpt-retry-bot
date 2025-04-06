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

app.post('/test-chat', async (req, res) => {
  const userMessage = req.body.message;

  const now = new Date().toISOString();
  console.log(`📥 [${now}] 收到測試訊息：${userMessage}`);

  try {
    const gptReply = await callGPT(userMessage);
    console.log(`🧠 [${now}] GPT 回覆成功：${gptReply}`);
    res.json({ reply: gptReply });
  } catch (error) {
    console.error(`❌ [${now}] GPT 錯誤：${error.message}`);
    res.status(500).json({ reply: '取得回覆失敗' });
  }
});


async function callGPT(userInput) {
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-3.5-turbo',
      messages: [
  {
    role: 'system',
    content: `
你是「心刻時光」品牌的客服助手，專門回覆客製化禮品、UV印刷與文創產品相關問題。
請用親切、有禮但自然的語氣回應客戶，語句不要太官方。
品牌精神是：客製化的溫度、用禮物傳遞情感。
如果遇到無法解答的問題，可以這樣說：「我們會儘快協助您喔～」。
回覆請控制在 100 字以內，並使用繁體中文。
    `,
  },
  { role: 'user', content: userInput },
],

    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    }
  )
  console.log(`📤 正在送出給 GPT 的內容：${userInput}`);
 
    ;

  return response.data.choices[0].message.content;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

