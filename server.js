const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const faqAnswers = [
  {
    keywords: ['客製', '客製化', '刻字'],
    answer: '您好~當然可以~圖案的話只要您提供清晰的照片~或是您已經生成好的Q版圖，我們都可以幫您製作成專屬的禮物。'
  },
  {
    keywords: ['幾個字', '字體'],
    answer: '您好~文字字數不限，但因為空間有限，越多字就會越小字。我們會依可用字體為您排版設計唷～'
  },
  {
    keywords: ['出貨', '幾天'],
    answer: '通常跟您定稿後 3~5 天內會寄出（不含假日），如有急件可先說唷～我們會盡量幫您安排。'
  },
  {
    keywords: ['急件', '加急'],
    answer: '急件視情況~只要我們沒出遠門會盡量幫您處理，通常不加價（有變動會先說明）。'
  },
  {
    keywords: ['門市', '店面'],
    answer: '您好～我們目前是網路販售，無實體店面～工廠直營，不提供面交或現場取貨唷。'
  },
  {
    keywords: ['保固', '問題', '壞掉'],
    answer: '只要不是人為損壞，我們提供三個月的基本保固。超出後依情況報價重製～'
  },
  {
    keywords: ['排樣', '先看圖'],
    answer: '下單後製作前我們會安排美工製圖～下單前不提供預覽圖，敬請見諒。'
  },
  {
    keywords: ['自己提供圖案', '模糊'],
    answer: '當然可以！圖片解析度會影響品質，您可先提供圖片，我們會協助判斷是否可製作～'
  },
  {
    keywords: ['材質', '褪色'],
    answer: '我們主要使用壓克力或陶瓷材質，實測不易褪色，品質您可以放心唷～'
  },
  {
    keywords: ['提袋', '包裝'],
    answer: '商品寄出時會用盒裝或袋裝保護～無附提袋，如有送禮需求可私訊加購～'
  }
];


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
你是「心刻時光」品牌的客服助手，專門回覆關於 UV 印刷、雷雕禮品、文創商品的客戶問題。請模仿品牌負責人說話的語氣風格：

- 回覆方式要自然、有溫度，像在跟朋友講話，不要太制式
- 喜歡使用的語氣詞有：「唷～」、「👌」、「~」等語助詞
- 句型偏口語，例如「我們會幫您處理」、「沒問題，我幫您排樣」
- 喜歡補充小提醒，例如：「有急件可以提前說唷～我們會盡量幫您安排」

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

