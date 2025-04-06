// faq-sync.js
const { google } = require('googleapis');
const fs = require('fs');

const SHEET_ID = process.env.GOOGLE_SHEET_ID; // 你可以放在 .env
const SHEET_RANGE = '工作表1!A2:B'; // 根據你的表單名稱修改，如 Sheet1!A2:B

async function loadFAQFromSheet() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_JSON),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: SHEET_RANGE,
    });

    const rows = res.data.values;
    if (!rows || rows.length === 0) {
      console.log('❌ FAQ Google Sheet is empty.');
      return [];
    }

    const faqs = rows.map(([keywordsStr, answer]) => {
      const keywords = keywordsStr.split(',').map(k => k.trim());
      return { keywords, answer };
    });

    console.log('✅ FAQ 已從 Google Sheet 載入，共', faqs.length, '筆');
    return faqs;
  } catch (err) {
    console.error('❌ FAQ 讀取失敗：', err.message);
    return [];
  }
}

module.exports = loadFAQFromSheet;
