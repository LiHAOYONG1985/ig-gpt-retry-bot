const axios = require('axios');
require('dotenv').config();

async function testMessage() {
  const message = '嗨，我想問你們產品有現貨嗎？';

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: message }],
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    }
  );

  console.log('🧠 GPT 回覆內容：');
  console.log(response.data.choices[0].message.content);
}

testMessage();
