# Panduan Lengkap Integrasi n8n Cloud Pipeline (Jalur A & Jalur B)

Panduan ini disusun sesuai dengan modul kuliah Bu Ama (**`Materi_Kuliah_UCD_Pipeline_EduFunnel.docx`** dan materi PPT **`1. Materi_UCD_Pemetaan_Trigger_EduFunnel.pptx` & `2. Materi_Trigger_Docker_Compose_EduFunnel.pptx`**).

---

## 1. Persiapan Akun n8n Cloud (Trial 14 Hari)
1. Buka [https://n8n.io/cloud/](https://n8n.io/cloud/) lalu klik **Start free trial**.
2. Daftar menggunakan akun Google Anda (gratis selama 14 hari tanpa perlu kartu kredit atau install Docker Desktop).
3. Setelah login, Anda akan langsung masuk ke kanvas visual n8n.

---

## 2. Mengimpor Jalur A: Webhook Kuesioner SUS (Real-time Event)
Jalur A bertugas menyambut data kuesioner ISO 9241-210 secara seketika saat responden menekan tombol *Kirim* di website.

1. Di kanvas n8n Cloud, klik **+ Add workflow** (atau tombol **+** di menu atas).
2. Klik ikon titik tiga (**...**) di pojok kanan atas kanvas ➡️ pilih **Import from file...**.
3. Pilih berkas:
   `n8n/jalur_a_kuesioner_sus_workflow.json`
4. Alur 3 node otomatis terpasang:
   `Webhook Trigger (Form SUS)` ➡️ `Format & Validasi Skor SUS` ➡️ `Kirim Notifikasi Telegram`.
5. **Ambil URL Webhook:**
   * Klik 2x pada node **Webhook Trigger**.
   * Salin **Test URL** (misal: `https://your-name.app.n8n.cloud/webhook-test/kuesioner-sus`) atau **Production URL**.
   * Buka website Anda di browser ➡️ klik tombol **⚡ n8n Webhook** di toolbar atas ➡️ tempelkan URL tersebut ➡️ klik **Simpan Konfigurasi Webhook**.
6. **(Opsional) Sambungkan Telegram Bot:**
   * Hubungkan Credential Telegram Bot Anda di node Telegram (bisa dibuat gratis via `@BotFather`).
   * Jika belum ingin pakai Telegram, Anda bisa mengganti node Telegram dengan node **Gmail** atau sekadar melihat data masuk di tab **Executions** n8n!

---

## 3. Mengimpor Jalur B: Schedule Cron & Peringatan Bottleneck
Jalur B bertugas berjalan secara otomatis setiap periode waktu tertentu (misal: setiap Senin pukul 08:00 WIB via Cron `0 8 * * 1`) untuk memeriksa apakah ada kebocoran prospek (*drop-off*) di corong bisnis.

1. Di n8n Cloud, buat workflow baru.
2. Klik titik tiga (**...**) ➡️ pilih **Import from file...**.
3. Pilih berkas:
   `n8n/jalur_b_schedule_attrition_workflow.json`
4. Alur 4 node otomatis terpasang:
   `Schedule Trigger (Cron)` ➡️ `Ambil Data Funnel Gadget` ➡️ `Cek Ada Bottleneck?` ➡️ `Kirim Alert`.
5. Klik **Test step** pada node Schedule Trigger untuk menguji simulasi penarikan data secara instan!

---

## 4. Format Payload Kuesioner SUS (Jalur A)
Berikut adalah struktur data JSON yang dikirimkan oleh form website Anda ke Webhook n8n:

```json
{
  "nama": "Pak Ujang Rahmat",
  "peran": "Owner Grosir Gadget",
  "sumber_trafik": "Dashboard Grosir Gadget",
  "jawaban": [5, 2, 4, 1, 5, 2, 4, 2, 5, 2],
  "sus_score": 85.0,
  "feedback": "Dashboard sangat mudah dibaca untuk memantau omset toko retail mall.",
  "timestamp": "2026-11-22T19:20:00.000Z"
}
```

> **Target Kelayakan UCD ISO 9241-210:** Skor SUS $\ge 70$ dinyatakan memenuhi kriteria *Acceptable/Good Usability*.
