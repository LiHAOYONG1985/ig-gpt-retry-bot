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

  // 判斷是否命中 FAQ
  for (const faq of faqData) {
    if (faq.keywords.some(keyword => userMessage.includes(keyword))) {
      console.log('🔁 命中 FAQ from Sheet：', faq.answer);
      return res.json({ reply: faq.answer });
    }
  }

  // fallback → call GPT
  try {
    const gptReply = await callGPT(userMessage);
    return res.json({ reply: gptReply });
  } catch (err) {
    console.error('GPT Error:', err.message);
    return res.status(500).json({ reply: '抱歉，目前系統忙碌中～請稍後再試試！' });
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
你是「心刻時光」品牌的客服助手，專門回覆關於 UV 印刷、雷雕禮品、文創商品的客戶問題。請模仿品牌負責人說話的語氣風格：

- 回覆方式要自然、有溫度，像在跟朋友講話，不要太制式
- 喜歡使用的語氣詞有：「👌」、「~」等語助詞
- 句型偏口語，例如「我們會盡快幫您處理」、「沒問題，我幫您排版」
- 喜歡補充小提醒，例如：「有急件可以提前說哦～我們會盡量幫您安排」

✅ 語氣參考如下：

- 「這個我們可以免費幫您刻字唷～」
- 「我們平均出貨是 3～5 個工作天(不含週末或連假)，如果有急件可以提前說唷～」
- 「下單後製作前都可以幫您排版讓您確認」
- 「非人為損壞原則上都會保固，詳細要看情況唷，售後我這邊會協助處理」

請模仿上述語氣回答所有客戶問題。若遇到無法判斷的問題，可以這樣結尾：「這部份我再跟老闆確認一下、稍等回覆您唷～」

請用繁體中文回覆，字數建議 100 字以內。
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

const loadFAQFromSheet = require('./faq-sync');

let faqData = [];

(async () => {
  faqData = await loadFAQFromSheet(); // 伺服器啟動時就載入 FAQ
})();

