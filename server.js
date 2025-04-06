const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const faqData = require('./faq'); // ✅ 載入本地 FAQ 模組

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ✅ Webhook 驗證（Meta 用）
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook 驗證成功');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ✅ IG 訊息入口 Webhook
app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object === 'instagram') {
    const entry = body.entry?.[0];
    const messaging = entry.messaging?.[0];

    if (messaging && messaging.message) {
      const senderId = messaging.sender.id;
      const userMessage = messaging.message.text;

      const gptReply = await callGPT(userMessage);

      console.log(`📥 收到 IG 訊息：${userMessage}`);
      console.log(`🤖 GPT 回覆：${gptReply}`);
    }

    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// ✅ 測試用 POST API（可由 Web UI 呼叫）
app.post('/test-chat', async (req, res) => {
  const userMessage = req.body.message;

  // 嘗試命中本地 FAQ 模組
  for (const faq of faqData) {
    if (faq.keywords.some(keyword => userMessage.includes(keyword))) {
      console.log('🔁 命中 FAQ：', faq.answer);
      return res.json({ reply: faq.answer });
    }
  }

  // fallback → GPT
  try {
    const gptReply = await callGPT(userMessage);
    return res.json({ reply: gptReply });
  } catch (err) {
    console.error('GPT 錯誤：', err.message);
    return res.status(500).json({ reply: '抱歉，目前系統忙碌中～請稍後再試試！' });
  }
});

// ✅ 呼叫 GPT API 回覆
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
  );

  console.log(`📤 送出 GPT 訊息：${userInput}`);
  return response.data.choices[0].message.content;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
