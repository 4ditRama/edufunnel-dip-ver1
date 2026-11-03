# Panduan Integrasi n8n Webhook untuk EduFunnel

Sesuai materi **`TUTOR D-1-1`** dan **`TUTOR D-1-3`**, alur otomatisasi EduFunnel dibangun menggunakan n8n dengan skema:
`Webhook Trigger` ➡️ `Set Node (Manipulasi Data)` ➡️ `Telegram Node / Notifikasi Email`.

---

## 1. Cara Mengimpor Workflow ke n8n
1. Buka antarmuka n8n Anda (bisa lewat **n8n Cloud** atau **Self-Hosted Docker** `http://localhost:5678`).
2. Buat workflow baru (klik tombol **+ New Workflow**).
3. Klik menu titik tiga (**...**) di pojok kanan atas kanvas n8n.
4. Pilih **Import from File...** dan pilih file:
   `n8n/edufunnel_workflow.json`
5. Alur 3 node (Webhook ➡️ Set ➡️ Telegram) akan langsung muncul otomatis di kanvas n8n Anda!

---

## 2. Konfigurasi Telegram Bot (Sesuai TUTOR D-1-3 Misi 3)
1. Buka Telegram dan chat ke `@BotFather`.
2. Ketik `/newbot`, beri nama bot Anda, lalu salin **Bot Token** yang diberikan.
3. Di n8n, klik node **Kirim Notifikasi Telegram**:
   - Di bagian Credential, klik **Create New** ➡️ masukkan Bot Token Anda ➡️ **Save**.
   - Di bagian Chat ID, masukkan Telegram User ID Anda (bisa didapat dari bot `@userinfobot`).
4. Klik **Test step** untuk memastikan pesan percobaan berhasil masuk ke Telegram Anda.

---

## 3. Menghubungkan Webhook ke Web EduFunnel
1. Di n8n, klik node **Webhook Trigger (EduFunnel)**.
2. Salin **Test URL** atau **Production URL** yang disediakan oleh n8n (contoh: `https://your-n8n.cloud/webhook-test/funnel-update`).
3. Jalankan tombol **Listen for test event** di n8n.
4. Buka dashboard web EduFunnel di browser, isi form simulasi di bagian bawah (Layer 3: Now What), lalu klik **Kirim Payload ke n8n**.
5. n8n akan seketika menerima data dan bot Telegram Anda akan langsung berbunyi mengirimkan laporan pendaftar/toko baru!

