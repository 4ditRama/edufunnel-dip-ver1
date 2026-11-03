const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/data', express.static(path.join(__dirname, 'data')));

// Helper to read data safely
function readJsonData(filename) {
  const filePath = path.join(__dirname, 'data', filename);
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

// 1. GET /api/funnel-data: Ambil data funnel berdasarkan persona
app.get('/api/funnel-data', (req, res) => {
  const persona = req.query.persona || 'edufunnel';
  try {
    const filename = persona === 'gadget' ? 'gadget_data.json' : 'edufunnel_data.json';
    const data = readJsonData(filename);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Gagal membaca dataset funnel', details: error.message });
  }
});

// 2. POST /api/webhook/simulate: Menerima payload lead dari UI dan meneruskan ke n8n
app.post('/api/webhook/simulate', (req, res) => {
  const payload = req.body;
  console.log('[WEBHOOK RECEIVED FROM UI]:', JSON.stringify(payload, null, 2));

  // Di sini kamu bisa meneruskan payload ke URL Webhook n8n asli Anda jika sudah online:
  // axios.post(process.env.N8N_WEBHOOK_URL, payload)

  res.json({
    status: 'success',
    message: 'Payload berhasil diterima backend & diteruskan ke n8n pipeline',
    receivedAt: new Date().toISOString(),
    payload: payload
  });
});

// 3. POST /api/webhook/update-data: Endpoint yang dipanggil oleh n8n untuk memperbarui data dashboard
// Sesuai dengan spesifikasi TUTOR D-1-1 (Skenario Webhook Trigger untuk update JSON)
app.post('/api/webhook/update-data', (req, res) => {
  const { persona, newData } = req.body;
  console.log(`[n8n UPDATE TRIGGER]: Updating data for persona ${persona}`);

  try {
    const targetFile = persona === 'gadget' ? 'gadget_data.json' : 'edufunnel_data.json';
    const targetPath = path.join(__dirname, 'data', targetFile);

    if (newData) {
      fs.writeFileSync(targetPath, JSON.stringify(newData, null, 2), 'utf8');
    }

    res.json({
      status: 'success',
      message: `File ${targetFile} berhasil diperbarui dari n8n!`,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Fallback routing untuk Single Page Application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Export untuk serverless Vercel & jalankan jika standalone
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`EduFunnel Server berjalan di: http://localhost:${PORT}`);
    console.log(`Mode Persona 1: PMB Kampus`);
    console.log(`Mode Persona 2: B2B Gadget Pak Ujang & Mas Iqbal`);
    console.log(`====================================================`);
  });
}

module.exports = app;

