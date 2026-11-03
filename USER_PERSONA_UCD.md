# DOKUMEN DESAIN INTERAKSI PENGGUNA (UCD - ISO 9241-210)
## Proyek: Funnel Decision Support Dashboard (EduFunnel & B2B Gadget Wholesale)

Dokumen ini disusun sebagai pemenuhan **Tahap Plan & Research (User-Centered Design)** pada mata kuliah Desain Interaksi Pengguna (DIP), membandingkan dua persona pengguna potensial: kasus institusi pendidikan (*pEdufunnel*) dan kasus UMKM B2B riil (*Distributor Gadget Pak Ujang*).

---

## 1. PERSONA 1: KOORDINATOR ADMISI & MARKETING KAMPUS (pEdufunnel)

### A. Profil Pengguna
* **Nama:** Rina Kartika, S.I.Kom. (28 tahun)
* **Peran:** Koordinator Digital Marketing & Admisi Penerimaan Mahasiswa Baru (PMB)
* **Karakteristik:** Terbiasa dengan metrik digital marketing (CPA, CTR, Leads), namun kewalahan menyajikan data dalam bentuk narasi strategis untuk rapat pimpinan rektorat.

### B. Pain Points (Permasalahan Nyata)
1. Data pendaftaran calon mahasiswa tersebar di berbagai platform (Google Ads, TikTok Ads, pameran sekolah/expo, dan formulir website).
2. Sulit mengidentifikasi di tahap mana calon mahasiswa mengalami kemunduran terbesar (*bottleneck / drop-off*).
3. Pimpinan universitas sering kesulitan membaca spreadsheet Excel mentah; mereka membutuhkan jawaban instan untuk pertanyaan: *"Apa yang terjadi?" (What), "Mengapa ini penting?" (So What), dan "Apa yang harus kita lakukan minggu depan?" (Now What)*.

### C. Alur Funnel (Model ACCRA)
1. **Awareness:** Calon mahasiswa melihat konten kampanye di media sosial atau pameran pendidikan.
2. **Consideration:** Calon mahasiswa mengunjungi halaman program studi, mengunduh brosur, atau bertanya ke live chat.
3. **Conversion:** Calon mahasiswa membeli formulir pendaftaran dan melengkapi data pribadi.
4. **Retention:** Calon mahasiswa yang lolos seleksi melakukan pembayaran UKT dan registrasi ulang resmi.
5. **Advocacy:** Mahasiswa baru membagikan twibbon dan merekomendasikan kampus ke teman sekolahnya.

---

## 2. PERSONA 2: DISTRIBUTOR ELEKTRONIK & GADGET B2B (Usaha Pak Ujang & Mas Iqbal)

### A. Profil Pengguna
* **Pengguna Utama:** Pak Ujang Rahmat (48 tahun) — *Owner, pengambil keputusan harga, sourcing barang via COD/marketplace*.
* **Pengguna Pendukung:** Mas Iqbal (24 tahun) — *Operasional lapangan, pengiriman barang langsung ke toko, dan customer support*.
* **Model Usaha:** Menyuplai laptop dan HP grosir ke toko-toko retail (seperti toko Agres, gerai mall, konter).

### B. Pain Points (Permasalahan Nyata)
1. Tim hanya berdua; tidak ada waktu untuk mengoperasikan software akuntansi/ERP yang rumit.
2. Penawaran harga dan stok barang sering hanya tercatat di riwayat obrolan WhatsApp atau ingatan.
3. Sering lupa mem-follow up toko-toko langganan yang sudah lebih dari 2 minggu belum melakukan *repeat order*.
4. Butuh ringkasan sederhana di layar smartphone: barang apa yang paling cepat laku (HP vs Laptop) dan toko mana yang paling loyal.

### C. Alur Funnel (B2B Wholesale Funnel)
1. **Awareness (Penawaran Stok):** Broadcast daftar stok dan harga miring ke pemilik gerai/toko mitra via WhatsApp.
2. **Consideration (Nego & Garansi):** Pemilik toko menanyakan kelengkapan unit, fisik, garansi, dan menawar margin harga.
3. **Conversion (Pemesanan & Kirim):** Toko sepakat mengambil unit; Mas Iqbal mengantar langsung (sistem COD/pembayaran tempo pendek).
4. **Retention (Repeat Order):** Toko langganan secara berkala memesan kembali setiap stok etalase mereka menipis.
5. **Advocacy (Rujukan Rekanan):** Pemilik toko merekomendasikan Pak Ujang ke cabang toko lain atau rekanan pemilik konter di mall.

---

## 3. IMPLIKASI DESAIN ANTARMUKA (3-LAYER NARRATIVE ARCHITECTURE)
Berdasarkan kebutuhan kedua persona di atas, antarmuka dashboard dirancang dengan arsitektur 3 lapis:
1. **Lapisan Atas (What?):** KPI Cards menampilkan angka ringkas (Total Prospek/Penawaran, Conversion Rate, Bottleneck Stage, Top Channel).
2. **Lapisan Tengah (So What?):** Grafik Corong Interaktif (Funnel Stage Drop-off) dan Grafik Batang Komparasi Saluran.
3. **Lapisan Bawah (Now What?):** Panel Rekomendasi Strategis Otomatis dan Tombol Aksi Langsung (Integrasi Webhook n8n untuk trigger notifikasi berkala ke Telegram/Email).

