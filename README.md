# 📊 EduFunnel Decision Support Dashboard
> **Tugas Praktikum Pertemuan 2 - Mata Kuliah Desain Interaksi Pengguna (DIP)**  
> Dosen Pengampu: **Ibu Ama**  
> Pengembang: **[@4ditRama](https://github.com/4ditRama)**

---

## 🎯 Gambaran Proyek
**EduFunnel** adalah aplikasi web *dashboard* pendukung keputusan (*Decision Support System*) berbasis pendekatan **User-Centered Design (UCD - ISO 9241-210)**. 

Aplikasi ini menyajikan visualisasi corong konversi (*Marketing & Sales Funnel*) menggunakan arsitektur naratif 3 lapisan:
1. **Lapisan 1: What?** — Kartu metrik utama (KPI: Total Prospek, Konversi, Conversion Rate, dan Titik Hambatan/Bottleneck).
2. **Lapisan 2: So What?** — Visualisasi grafik corong interaktif (Chart.js) dan komparasi performa saluran untuk mendeteksi *drop-off* atau *attrition*.
3. **Lapisan 3: Now What?** — Rekomendasi strategis berbasis prioritas dan pengujian webhook otomatisasi dengan **n8n**.

---

## 👥 Dua Mode Pengguna (Dual-Persona Support)
Dashboard ini dilengkapi fitur pengalih (*toggle switcher*) antara 2 profil pengguna nyata:
* **🎓 Mode 1: PMB Kampus (Kasus Default pEdufunnel)**  
  Menganalisis corong penerimaan mahasiswa baru (Awareness ➡️ Consideration ➡️ Conversion ➡️ Retention ➡️ Advocacy).
* **📱 Mode 2: Grosir Gadget (Kasus Riil UMKM Pak Ujang & Mas Iqbal)**  
  Menganalisis penawaran stok HP & Laptop B2B ke toko retail mall (seperti Agres dan konter mall) dengan alur penawaran, nego, deal/pengiriman COD, dan repeat order.

---

## 🛠️ Tech Stack
* **Frontend:** HTML5, Tailwind CSS, JavaScript (ES6+), Chart.js
* **Backend:** Node.js, Express.js, CORS
* **Automation:** n8n Workflow (Webhook Trigger ➡️ Set Node ➡️ Telegram/Email Notification)
* **Deployment Ready:** Vercel & Netlify config (`vercel.json`)

---

## 🚀 Cara Menjalankan Proyek Secara Lokal

### 1. Prasyarat
Pastikan komputer telah terinstal:
* [Node.js](https://nodejs.org/) (versi 18+)
* [Git](https://git-scm.com/)

### 2. Instalasi & Menjalankan Server
```bash
# Clone repository
git clone https://github.com/4ditRama/edufunnel-dip.git
cd edufunnel-dip

# Install dependensi
npm install

# Jalankan server lokal
npm start
```

Buka browser dan akses:  
👉 **`http://localhost:3000`**

---

## ⚡ Otomatisasi n8n Webhook
File workflow n8n siap pakai tersedia di folder **`n8n/edufunnel_workflow.json`**.  
Baca panduan instalasi dan pengujian di: [PANDUAN_N8N.md](./n8n/PANDUAN_N8N.md).

---

## 🌐 Deployment Production (Vercel)
Aplikasi ini sudah dilengkapi `vercel.json`. Untuk mendeploy ke production:
1. Hubungkan repository GitHub ini ke akun [Vercel](https://vercel.com).
2. Klik **Deploy**. Web akan langsung aktif online dengan domain HTTPS gratis!

