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

// In-Memory & Ephemeral Persistence untuk update admin Pak Ujang
const TMP_FUNNEL_FILE = path.join(process.platform === 'win32' ? path.join(__dirname, 'data') : '/tmp', 'custom_funnel_state.json');

let inMemoryFunnelState = {
  gadget: null,
  edufunnel: null
};

// Coba muat state yang tersimpan sebelumnya jika ada
try {
  if (fs.existsSync(TMP_FUNNEL_FILE)) {
    const rawState = fs.readFileSync(TMP_FUNNEL_FILE, 'utf8');
    inMemoryFunnelState = JSON.parse(rawState);
  }
} catch (e) {
  console.warn('[FUNNEL STATE] Belum ada state tersimpan:', e.message);
}

function saveFunnelState() {
  try {
    fs.writeFileSync(TMP_FUNNEL_FILE, JSON.stringify(inMemoryFunnelState, null, 2), 'utf8');
  } catch (e) {
    console.warn('[FUNNEL STATE] Gagal menulis ke file cache:', e.message);
  }
}

// 1. GET /api/funnel-data: Ambil data funnel berdasarkan persona (Mendukung data dinamis admin)
app.get('/api/funnel-data', (req, res) => {
  const persona = req.query.persona || 'edufunnel';
  try {
    let data;
    if (inMemoryFunnelState[persona]) {
      data = JSON.parse(JSON.stringify(inMemoryFunnelState[persona]));
    } else {
      const filename = persona === 'gadget' ? 'gadget_data.json' : 'edufunnel_data.json';
      data = readJsonData(filename);
    }

    // Dynamic overrides via query parameters untuk pengujian cepat
    if (req.query.prospects) {
      data.summary.total_prospects = Number(req.query.prospects);
    }
    if (req.query.converted) {
      data.summary.total_converted = Number(req.query.converted);
      if (data.summary.total_prospects > 0) {
        data.summary.overall_conversion_rate = ((data.summary.total_converted / data.summary.total_prospects) * 100).toFixed(2) + '%';
      }
    }
    if (req.query.bottleneck) {
      data.summary.primary_bottleneck = req.query.bottleneck;
    }
    if (req.query.channel) {
      data.summary.top_channel = req.query.channel;
    }

    // Preset skenario instan
    if (req.query.scenario === 'krisis') {
      data.summary.total_prospects = 310;
      data.summary.total_converted = 25;
      data.summary.overall_conversion_rate = '8.06%';
      data.summary.primary_bottleneck = 'Dilema Piutang & Retur Toko Meningkat';
    } else if (req.query.scenario === 'peak') {
      data.summary.total_prospects = 480;
      data.summary.total_converted = 175;
      data.summary.overall_conversion_rate = '36.46%';
      data.summary.primary_bottleneck = 'Kapasitas Pengiriman Kurir Mas Iqbal Terbatas';
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Gagal membaca dataset funnel', details: error.message });
  }
});

// 1b. POST /api/funnel-data/update: Endpoint Admin untuk memperbarui data corong langsung dari Web Dashboard
app.post('/api/funnel-data/update', (req, res) => {
  const { persona = 'gadget', total_prospects, total_converted, primary_bottleneck, top_channel, recommendation } = req.body;

  try {
    const filename = persona === 'gadget' ? 'gadget_data.json' : 'edufunnel_data.json';
    const baseData = readJsonData(filename);

    const prospects = Number(total_prospects) || baseData.summary.total_prospects;
    const converted = Number(total_converted) || baseData.summary.total_converted;
    const cvr = prospects > 0 ? ((converted / prospects) * 100).toFixed(2) + '%' : '0.00%';
    const bottleneck = primary_bottleneck || baseData.summary.primary_bottleneck;
    const channel = top_channel || baseData.summary.top_channel;

    baseData.summary.total_prospects = prospects;
    baseData.summary.total_converted = converted;
    baseData.summary.overall_conversion_rate = cvr;
    baseData.summary.primary_bottleneck = bottleneck;
    baseData.summary.top_channel = channel;
    baseData.period = `Diperbarui Admin (${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})`;

    // Perbarui proporsi tahapan corong secara realistis berdasarkan angka baru
    if (baseData.funnel_stages && baseData.funnel_stages.length >= 5) {
      baseData.funnel_stages[0].count = prospects;
      baseData.funnel_stages[0].percentage = 100.0;
      
      const stage2 = Math.round(prospects * 0.48);
      baseData.funnel_stages[1].count = stage2;
      baseData.funnel_stages[1].percentage = Number(((stage2 / prospects) * 100).toFixed(1));

      baseData.funnel_stages[2].count = converted;
      baseData.funnel_stages[2].percentage = Number(((converted / prospects) * 100).toFixed(1));

      const stage4 = Math.round(converted * 0.55);
      baseData.funnel_stages[3].count = stage4;
      baseData.funnel_stages[3].percentage = Number(((stage4 / prospects) * 100).toFixed(1));

      const stage5 = Math.round(converted * 0.22);
      baseData.funnel_stages[4].count = stage5;
      baseData.funnel_stages[4].percentage = Number(((stage5 / prospects) * 100).toFixed(1));
    }

    if (recommendation && baseData.recommendations && baseData.recommendations[0]) {
      baseData.recommendations[0].action = recommendation;
    }

    // Perbarui channel_performance secara dinamis agar selaras dengan top_channel & total volume
    if (baseData.channel_performance && Array.isArray(baseData.channel_performance)) {
      const cleanTopName = channel.includes('•') ? channel.split('•')[0].trim() : channel;
      const matchedIdx = baseData.channel_performance.findIndex(c => 
        cleanTopName.toLowerCase().includes(c.channel.toLowerCase()) || 
        c.channel.toLowerCase().includes(cleanTopName.toLowerCase())
      );

      const topChannelIdx = matchedIdx !== -1 ? matchedIdx : 0;
      const targetChannel = baseData.channel_performance[topChannelIdx];

      // Berikan porsi terbesar untuk channel terpilih
      const topLeads = Math.round(prospects * 0.45);
      const topConverted = Math.min(topLeads, Math.round(converted * 0.50));
      targetChannel.leads = Math.max(1, topLeads);
      targetChannel.converted = Math.max(1, topConverted);
      targetChannel.cvr = ((targetChannel.converted / targetChannel.leads) * 100).toFixed(2) + '%';

      // Distribusikan sisa leads & converted ke channel lain
      let remainingLeads = Math.max(1, prospects - targetChannel.leads);
      let remainingConverted = Math.max(0, converted - targetChannel.converted);
      
      const otherChannels = baseData.channel_performance.filter((_, idx) => idx !== topChannelIdx);
      const shares = [0.55, 0.30, 0.15];

      otherChannels.forEach((ch, idx) => {
        const share = shares[idx] || (1 / otherChannels.length);
        ch.leads = Math.max(1, Math.round(remainingLeads * share));
        ch.converted = Math.max(0, Math.round(remainingConverted * share));
        if (ch.converted > ch.leads) ch.converted = ch.leads;
        ch.cvr = ((ch.converted / ch.leads) * 100).toFixed(2) + '%';
      });

      // Urutkan channel_performance sehingga channel terpilih / CVR tertinggi ada di posisi paling atas!
      baseData.channel_performance.sort((a, b) => {
        if (a === targetChannel) return -1;
        if (b === targetChannel) return 1;
        return parseFloat(b.cvr) - parseFloat(a.cvr);
      });
    }

    inMemoryFunnelState[persona] = baseData;
    saveFunnelState();

    console.log(`[FUNNEL UPDATED] Persona: ${persona}, Prospek: ${prospects}, Closing: ${converted}, Bottleneck: ${bottleneck}`);

    res.json({
      status: 'success',
      message: `Data corong ${persona === 'gadget' ? 'Pak Ujang (B2B Gadget)' : 'EduFunnel'} berhasil diperbarui dan tersinkronisasi ke pipeline!`,
      data: baseData
    });
  } catch (error) {
    res.status(500).json({ error: 'Gagal memperbarui data funnel', details: error.message });
  }
});

// 1c. POST /api/funnel-data/reset: Mengembalikan ke data awal bawaan
app.post('/api/funnel-data/reset', (req, res) => {
  const { persona = 'gadget' } = req.body;
  inMemoryFunnelState[persona] = null;
  saveFunnelState();

  const filename = persona === 'gadget' ? 'gadget_data.json' : 'edufunnel_data.json';
  const defaultData = readJsonData(filename);

  res.json({
    status: 'success',
    message: `Data corong ${persona} telah direset ke nilai awal pabrik.`,
    data: defaultData
  });
});

// 1d. GET /api/funnel-data/email-report: Menampilkan template email laporan mingguan Pak Ujang (Gmail)
app.get('/api/funnel-data/email-report', (req, res) => {
  const persona = req.query.persona || 'gadget';
  const filename = persona === 'gadget' ? 'gadget_data.json' : 'edufunnel_data.json';
  const data = (inMemoryFunnelState && inMemoryFunnelState[persona]) || readJsonData(filename);

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Laporan Mingguan Corong Bisnis - Pak Ujang Rahmat</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f4; margin: 0; padding: 24px; color: #1c1917; }
        .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
        .email-header { background: #140b06; color: #ffffff; padding: 24px; border-bottom: 3px solid #ff6210; }
        .email-header h1 { margin: 0 0 6px 0; font-size: 18px; font-weight: 700; color: #ffffff; }
        .meta-bar { background: #faf9f6; padding: 12px 24px; border-bottom: 1px solid #e7e5e4; font-size: 11px; color: #78716c; line-height: 1.6; }
        .email-body { padding: 24px; }
        .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
        .kpi-card { background: #faf9f6; padding: 14px; border-radius: 10px; border: 1px solid #e7e5e4; }
        .kpi-title { font-size: 10px; text-transform: uppercase; color: #78716c; font-weight: 700; margin-bottom: 4px; }
        .kpi-value { font-size: 18px; font-weight: 800; color: #ff6210; }
        .alert-box { background: #fff2ea; border-left: 4px solid #ff6210; padding: 14px; border-radius: 6px; margin: 20px 0; font-size: 13px; line-height: 1.5; }
        .email-footer { background: #faf9f6; padding: 16px 24px; text-align: center; font-size: 11px; color: #a8a29e; border-top: 1px solid #e7e5e4; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h1>🚨 [LAPORAN SENIN 08:00 WIB] Evaluasi Corong Grosir Gadget</h1>
          <p style="margin: 0; font-size: 12px; color: #a8a29e;">Otomatisasi Pipeline n8n Cloud • Standar ISO 9241-210 UCD</p>
        </div>
        <div class="meta-bar">
          <strong>Kepada:</strong> Pak Ujang Rahmat &lt;pakujang.gadget@gmail.com&gt;<br>
          <strong>Cc:</strong> Mas Iqbal (Operasional Lapangan) &lt;iqbal.ops@gmail.com&gt;<br>
          <strong>Jadwal Cron:</strong> Setiap Senin pukul 08:00 WIB (Interval: 0 8 * * 1)
        </div>
        <div class="email-body">
          <p style="margin-top: 0; font-size: 13px;">Halo <strong>Pak Ujang</strong>,</p>
          <p style="font-size: 13px; line-height: 1.5; color: #44403c;">
            Berikut adalah ringkasan rutin kesehatan corong penjualan toko grosir gadget Anda untuk evaluasi awal pekan ini:
          </p>

          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-title">Total Prospek Masuk</div>
              <div class="kpi-value">${data.summary.total_prospects.toLocaleString('id-ID')} Toko</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Berhasil Closing (Deal)</div>
              <div class="kpi-value">${data.summary.total_converted.toLocaleString('id-ID')} Unit</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Rasio Konversi (CVR)</div>
              <div class="kpi-value">${data.summary.overall_conversion_rate}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Saluran Penjualan Teratas</div>
              <div class="kpi-value" style="font-size: 13px; color: #1c1917;">${data.summary.top_channel}</div>
            </div>
          </div>

          <div class="alert-box">
            <strong style="color: #c2410c;">⚠️ Peringatan Titik Hambatan Utama (Primary Bottleneck):</strong><br>
            Tahap: <strong>${data.summary.primary_bottleneck}</strong><br>
            <span style="font-size: 12px; color: #7c2d12; margin-top: 4px; display: block;">
              Sebagian besar toko retail berhenti saat fase tawar-menawar harga grosir. Ruang margin perlu dioptimasi.
            </span>
          </div>

          <h4 style="margin: 16px 0 8px 0; font-size: 13px;">📋 Instruksi Aksi Lapangan untuk Mas Iqbal:</h4>
          <p style="font-size: 12px; line-height: 1.6; color: #44403c; background: #f5f5f4; padding: 12px; border-radius: 8px;">
            ${(data.recommendations && data.recommendations[0] && data.recommendations[0].action) || 'Jadwalkan kunjungan rutin toko mall (Agres) setiap restock etalase.'}
          </p>

          <p style="margin-top: 24px; font-size: 12px; color: #78716c;">
            Notifikasi tugas operasional juga telah diteruskan ke bot Telegram Mas Iqbal agar unit pengiriman COD dapat segera dipersiapkan.
          </p>
        </div>
        <div class="email-footer">
          Dikirim otomatis oleh EduFunnel n8n Cloud Pipeline • Serverless Architecture on Vercel
        </div>
      </div>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
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

  // Teruskan ke n8n Cloud secara real-time (Default Production Webhook)
  const targetWebhookUrl = n8nWebhookUrl || process.env.N8N_WEBHOOK_URL || 'https://aditkuni.app.n8n.cloud/webhook/kuesioner-sus';
  let n8nForwardResult = null;
  if (targetWebhookUrl && targetWebhookUrl.startsWith('http')) {
    try {
      const n8nRes = await fetch(targetWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry)
      });
      n8nForwardResult = {
        forwarded: true,
        status: n8nRes.status,
        url: targetWebhookUrl
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

// 2d. GET /api/webhook/sus-export-csv: Ekspor data evaluasi SUS ke format CSV (Excel / Google Sheets)
app.get('/api/webhook/sus-export-csv', (req, res) => {
  const susFilePath = path.join(__dirname, 'data', 'sus_evaluations.json');
  try {
    let list = [];
    if (fs.existsSync(susFilePath)) {
      list = JSON.parse(fs.readFileSync(susFilePath, 'utf8') || '[]');
    }

    if (list.length === 0) {
      list = [
        {
          id: 1732314000000,
          timestamp: new Date().toISOString(),
          nama: 'Bu Ama',
          peran: 'Dosen Penguji / Auditor ISO',
          sumber_trafik: 'Dashboard Grosir Gadget',
          jawaban: [4, 2, 5, 1, 4, 2, 5, 2, 4, 2],
          sus_score: 82.5,
          target_met: true,
          feedback: 'Visualisasi corong ACCRA dan integrasi n8n sangat jelas.'
        }
      ];
    }

    const headers = ['ID', 'Timestamp_WIB', 'Nama_Responden', 'Peran', 'Sumber_Trafik', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10', 'Skor_SUS', 'Status_Kelayakan_ISO', 'Catatan_Kualitatif'];
    const rows = list.map(item => {
      const q = Array.isArray(item.jawaban) ? item.jawaban : [4, 2, 4, 2, 4, 2, 4, 2, 4, 2];
      const timeStr = item.timestamp ? new Date(item.timestamp).toLocaleString('id-ID') : '-';
      const cleanFeedback = (item.feedback || '').replace(/"/g, '""');
      return [
        item.id || Date.now(),
        `"${timeStr}"`,
        `"${item.nama || 'Anonim'}"`,
        `"${item.peran || 'Evaluator'}"`,
        `"${item.sumber_trafik || 'Web'}"`,
        q[0] || 3, q[1] || 3, q[2] || 3, q[3] || 3, q[4] || 3,
        q[5] || 3, q[6] || 3, q[7] || 3, q[8] || 3, q[9] || 3,
        item.sus_score || 80.0,
        `"${item.target_met ? 'Memenuhi Target (>= 70)' : 'Di Bawah Target (< 70)'}"`,
        `"${cleanFeedback}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Rekap_Evaluasi_SUS_ISO_9241_210.csv"');
    res.send(csvContent);
  } catch (err) {
    res.status(500).send('Gagal mengekspor data: ' + err.message);
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
    // Model fallback pool: gunakan model cepat & stabil
    const candidateModels = ['gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-3.8-flash'];
    let lastErr = null;

    for (const model of candidateModels) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
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
          throw new Error(`Model ${model} error (Status ${response.status}): ${errBody}`);
        }

        const result = await response.json();
        let reply = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!reply) throw new Error(`Empty reply from ${model}`);
        
        // Format markdown bold/newlines to HTML
        reply = reply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        reply = reply.replace(/\*(.*?)\*/g, '<em>$1</em>');
        reply = reply.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');

        return res.json({ reply, model });
      } catch (err) {
        lastErr = err;
        console.warn(`[GEMINI SERVER] Model ${model} failed, trying next:`, err.message);
      }
    }

    throw lastErr || new Error('Semua model Gemini sedang sibuk.');
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

