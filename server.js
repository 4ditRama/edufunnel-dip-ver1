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

// 4. POST /api/chat: Integrasi Generative AI dengan Google Gemini API
app.post('/api/chat', async (req, res) => {
  const { message, persona, funnelData, clientApiKey } = req.body;
  const apiKey = process.env.GEMINI_API_KEY || clientApiKey;

  if (!apiKey) {
    return res.status(400).json({
      error: 'GEMINI_API_KEY belum dikonfigurasi',
      fallback: true
    });
  }

  const isEdu = persona === 'edufunnel';
  const systemContext = isEdu
    ? `Anda adalah Asisten Keputusan Strategis EduFunnel untuk pendaftaran mahasiswa baru (PMB Kampus).
Gunakan konteks data corong pendaftaran berikut:
${JSON.stringify(funnelData, null, 2)}
Jawab pertanyaan pengguna dalam Bahasa Indonesia dengan gaya profesional, ramah, analitis, berbasis data di atas, dan gunakan format HTML dasar (strong, em, br, li, ul). Jawaban harus padat, jelas, dan solutif.`
    : `Anda adalah Konsultan Bisnis dan Penjualan B2B untuk usaha grosir gadget Pak Ujang Rahmat dan Mas Iqbal. Usaha ini menyuplai laptop dan HP ke toko-toko retail mall (seperti toko Agres dan konter mall) dengan tim berdua.
Gunakan konteks data corong penjualan berikut:
${JSON.stringify(funnelData, null, 2)}
Jawab pertanyaan dalam Bahasa Indonesia dengan gaya praktis, ramah, solutif, membantu Pak Ujang dan Mas Iqbal mengambil keputusan bisnis cepat (margin, toko langganan, Mas Iqbal lapangan, strategi restock). Gunakan format HTML dasar (strong, em, br, li, ul).`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: `${systemContext}\n\nPertanyaan Pengguna: "${message}"` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 600
        }
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Gemini API Error: ${errBody}`);
    }

    const result = await response.json();
    let reply = result.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, saya tidak dapat memproses jawaban saat ini.";
    
    // Format markdown bold/newlines to HTML if needed
    reply = reply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    reply = reply.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');

    res.json({ reply });
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ error: error.message, fallback: true });
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

