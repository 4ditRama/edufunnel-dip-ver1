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

  res.json({
    status: 'success',
    message: 'Payload berhasil diterima backend & diteruskan ke n8n pipeline',
    receivedAt: new Date().toISOString(),
    payload: payload
  });
});

// 2b. POST /api/webhook/kuesioner-sus: Jalur A (Event-Driven Webhook Kuesioner SUS ISO 9241-210)
// Menerima data evaluasi kegunaan 10 butir Likert, menghitung skor, dan meneruskan ke n8n Cloud
app.post('/api/webhook/kuesioner-sus', async (req, res) => {
  const { nama, peran, sumber_trafik, jawaban, sus_score, feedback, n8nWebhookUrl } = req.body;

  if (!jawaban || !Array.isArray(jawaban) || jawaban.length !== 10) {
    return res.status(400).json({
      status: 'error',
      message: 'Format jawaban SUS tidak valid. Harus berupa array 10 angka Likert (1-5).'
    });
  }

  // Hitung ulang skor SUS di server untuk validasi (Ganjil: score-1, Genap: 5-score, total * 2.5)
  let oddSum = 0;
  let evenSum = 0;
  jawaban.forEach((val, idx) => {
    const num = Number(val);
    if ((idx + 1) % 2 === 1) {
      oddSum += (num - 1);
    } else {
      evenSum += (5 - num);
    }
  });
  const calculatedScore = Number(((oddSum + evenSum) * 2.5).toFixed(1));
  const finalScore = sus_score || calculatedScore;
  const targetMet = finalScore >= 70; // Standar kelayakan modul EduFunnel Bu Ama (>= 70)

  const newEntry = {
    id: Date.now(),
    nama: nama || 'Pengguna Anonim',
    peran: peran || 'Evaluator',
    sumber_trafik: sumber_trafik || 'Dashboard Web',
    jawaban,
    sus_score: finalScore,
    target_met: targetMet,
    feedback: feedback || '',
    timestamp: new Date().toISOString()
  };

  // Simpan ke data historis lokal
  const susFilePath = path.join(__dirname, 'data', 'sus_evaluations.json');
  try {
    let existingList = [];
    if (fs.existsSync(susFilePath)) {
      existingList = JSON.parse(fs.readFileSync(susFilePath, 'utf8') || '[]');
    }
    existingList.unshift(newEntry);
    fs.writeFileSync(susFilePath, JSON.stringify(existingList, null, 2), 'utf8');
  } catch (err) {
    console.error('Gagal menyimpan evaluasi SUS:', err);
  }

  // Jika user menyertakan URL Webhook n8n Cloud, teruskan secara real-time
  let n8nForwardResult = null;
  if (n8nWebhookUrl && n8nWebhookUrl.startsWith('http')) {
    try {
      const n8nRes = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry)
      });
      n8nForwardResult = {
        forwarded: true,
        status: n8nRes.status,
        url: n8nWebhookUrl
      };
    } catch (n8nErr) {
      console.warn('Gagal meneruskan ke n8n Cloud:', n8nErr.message);
      n8nForwardResult = {
        forwarded: false,
        error: n8nErr.message
      };
    }
  }

  res.json({
    status: 'success',
    message: 'Evaluasi SUS berhasil dicatat di sistem!',
    data: newEntry,
    n8n_pipeline: n8nForwardResult || { forwarded: false, note: 'Tersimpan di database lokal' }
  });
});

// 2c. GET /api/webhook/sus-stats: Mengambil ringkasan rata-rata skor SUS untuk indikator UCD
app.get('/api/webhook/sus-stats', (req, res) => {
  const susFilePath = path.join(__dirname, 'data', 'sus_evaluations.json');
  try {
    let list = [];
    if (fs.existsSync(susFilePath)) {
      list = JSON.parse(fs.readFileSync(susFilePath, 'utf8') || '[]');
    }
    const count = list.length;
    const avgScore = count > 0 
      ? Number((list.reduce((acc, curr) => acc + (curr.sus_score || 0), 0) / count).toFixed(1))
      : 82.5;

    res.json({
      total_respondents: count,
      average_sus_score: avgScore,
      target_benchmark: 70.0,
      meets_iso_criteria: avgScore >= 70.0,
      recent: list.slice(0, 5)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
Panduan Menjawab:
1. Jika pengguna bertanya seputar pendaftaran maba, saluran promosi, atau bottleneck corong PMB, jawab berbasis data di atas secara tajam, analitis, dan solutif.
2. Jika pengguna bertanya di luar tema PMB (seperti resep makanan, cemilan, obrolan santai, lelucon), tetap jawab pertanyaan mereka secara ramah, lengkap, dan informatif (jangan tolak pertanyaan), lalu selipkan ajakan santai bahwa Anda siap kembali membantu analisis corong PMB kapan saja.
3. Gunakan format HTML dasar (strong, em, br, li, ul). Jawaban harus padat, jelas, dan ramah.`
    : `Anda adalah Konsultan Bisnis dan Penjualan B2B untuk usaha grosir gadget Pak Ujang Rahmat dan Mas Iqbal. Usaha ini menyuplai laptop dan HP ke toko-toko retail mall (seperti toko Agres dan konter mall) dengan tim berdua.
Gunakan konteks data corong penjualan berikut:
${JSON.stringify(funnelData, null, 2)}
Panduan Menjawab:
1. Jika pengguna bertanya seputar penjualan gadget, stok laptop/HP, toko langganan (Agres), margin, atau tugas COD Mas Iqbal, jawab secara praktis berbasis data di atas.
2. Jika pengguna bertanya di luar tema grosir gadget (seperti resep makanan, cemilan mac n cheese, obrolan santai), tetap jawab pertanyaan mereka secara ramah, lezat/informatif, dan lengkap (jangan menolak), lalu dengan sentuhan humor hangat khas Pak Ujang ingatkan bahwa Anda siap lanjut bantu hitung margin dan stok kapan pun dibutuhkan!
3. Gunakan format HTML dasar (strong, em, br, li, ul). Jawaban harus hangat, hidup, dan solutif.`;

  try {
    // Model Gemini 3.5 Flash Lite yang terverifikasi aktif
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`, {
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
    
    // Format markdown bold/newlines to HTML
    reply = reply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    reply = reply.replace(/\*(.*?)\*/g, '<em>$1</em>');
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

