# Photobooth Majlis Apresiasi Kecemerlangan 2026
SK (FELDA) Jengka 24

Aplikasi photobooth untuk tetamu majlis. Tetamu buka pautan, pilih warna dan bingkai, ambil gambar, dan simpan. Setiap gambar juga dihantar terus ke folder Google Drive cikgu.

---

## Isi folder

| Fail | Untuk apa |
|---|---|
| `index.html`, `styles.css`, `app.js` | Aplikasi (jangan ubah) |
| `config.js` | **Satu-satunya fail yang cikgu perlu ubah** (tampal pautan /exec) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Supaya boleh dipasang seperti app dan guna tanpa internet |
| `frames/` | 6 bingkai yang sudah dipotong |
| `apps-script/Code.gs` | Kod untuk Google Apps Script (simpan gambar ke Drive) |

---

## LANGKAH 1 — Sediakan Google Apps Script (simpan ke Drive)

1. Buka **script.google.com** (log masuk akaun Google yang memiliki folder Drive tadi).
2. Tekan **Projek baharu** (New project).
3. Padam semua kod yang ada. Salin semua isi fail `apps-script/Code.gs` dan tampal.
4. Tekan ikon **Simpan** (disket). Namakan projek: `Photobooth Upload`.
5. Di bahagian atas, pilih fungsi **ujiKebenaran**, kemudian tekan **Jalankan** (Run).
6. Akan keluar tetingkap kebenaran: tekan **Semak kebenaran** → pilih akaun cikgu → **Advanced / Lanjutan** → **Go to Photobooth Upload (unsafe)** → **Allow / Benarkan**.
   *(Ini normal — skrip ini milik cikgu sendiri.)*
7. Tekan butang biru **Deploy** → **New deployment**.
8. Tekan ikon gear ⚙️ di sebelah "Select type" → pilih **Web app**.
9. Isi:
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
10. Tekan **Deploy**. Salin **Web app URL** (pautan yang berakhir dengan `/exec`).
11. Semak: tampal pautan itu dalam pelayar. Jika keluar `{"ok":true,...}` — berjaya ✅

---

## LANGKAH 2 — Masukkan pautan dalam `config.js`

1. Buka fail `config.js` dengan Notepad (Windows) atau TextEdit.
2. Cari baris `UPLOAD_URL: ""`
3. Tampal pautan `/exec` di antara tanda petik, contoh:
   `UPLOAD_URL: "https://script.google.com/macros/s/AKfycb.../exec"`
4. Simpan fail.

---

## LANGKAH 3 — Letak di GitHub Pages (percuma)

1. Daftar / log masuk di **github.com**.
2. Tekan **+** (atas kanan) → **New repository**.
3. Nama: `photobooth` → pilih **Public** → tekan **Create repository**.
4. Tekan pautan **uploading an existing file**.
5. Buka folder photobooth di komputer, pilih **SEMUA** fail dan folder di dalamnya, seret (drag) ke halaman GitHub.
   *(Pastikan `index.html` berada terus di dalam repository, bukan di dalam folder lain.)*
6. Tekan **Commit changes**.
7. Pergi ke **Settings** → **Pages** (menu kiri).
8. Di "Branch", pilih **main** dan **/ (root)** → tekan **Save**.
9. Tunggu 1–2 minit. Refresh. Pautan akan keluar, contoh:
   `https://namacikgu.github.io/photobooth/`
10. Itulah pautan untuk tetamu. Boleh jadikan **kod QR** (cari "QR code generator") dan tampal di majlis.

**Nak ubah sesuatu kemudian?** Buka fail dalam GitHub → ikon pensel ✏️ → ubah → **Commit changes**. Tunggu 1–2 minit.

---

## LANGKAH 4 — Pasang di telefon

**Android (Chrome):** buka pautan → tekan butang **Pasang App** di laman utama (atau menu ⋮ → **Pasang aplikasi**).

**iPhone (mesti guna Safari):** buka pautan → tekan butang **Kongsi** (kotak dengan anak panah ke atas) → **Tambah ke Skrin Utama** → **Tambah**.

**Windows (Chrome / Edge):** buka pautan → tekan **Pasang App**, atau ikon pasang di hujung kanan bar alamat.

Selepas dibuka sekali dengan internet, aplikasi boleh dibuka tanpa internet.

---

## Cara tetamu guna

1. **Pilih warna** (Ungu, Biru, Hijau, Merah, Emas) — warna aplikasi berubah. Pilihan diingat.
2. **Pilih bingkai** (Bingkai 1–6) → tekan **Mula Bergambar**.
3. Benarkan kamera. Laraskan **zum** (geser ke kiri untuk nampak seluruh gambar). Tekan butang bulat → kiraan **3, 2, 1** → snap!
4. Boleh juga tekan **Galeri** untuk guna gambar sedia ada.
5. Tekan **Muat Turun** (Android/Windows) atau **Simpan ke Foto** (iPhone → pilih **Simpan Imej**).

Status muat naik ke Drive:
- 🟡 *Sedang menyimpan…*
- 🟢 *Disimpan ke Google Drive ✓*
- 🟠 *Menunggu internet* — gambar disimpan dalam telefon dan dimuat naik sendiri apabila internet kembali (perlu buka aplikasi semula).

Nama fail dalam Drive:
`SKJ24_2026_<warna>_<bingkai>_<tarikh>_<masa>_<kod>.jpg`
contoh: `SKJ24_2026_ungu_bingkai3_20261130_101523_k3f9.jpg`
(4 huruf `kod` di hujung supaya dua gambar yang diambil pada saat yang sama tidak bertindih.)

---

## Jika ada masalah

| Masalah | Penyelesaian |
|---|---|
| Kamera tak keluar | Benarkan kamera dalam tetapan pelayar. iPhone: Tetapan → Safari → Kamera → Benarkan. Pastikan pautan bermula `https://` |
| Buka dari WhatsApp, kamera tak jalan | Tekan ⋮ / ikon kompas → **Buka dalam Chrome / Safari** |
| Gambar tak masuk Drive | Semak `config.js` ada pautan `/exec` yang betul. Dalam Apps Script: **Executions** (menu kiri) untuk lihat ralat |
| Tukar kod Apps Script | Deploy → **Manage deployments** → ✏️ → Version: **New version** → Deploy (pautan kekal sama) |
| Aplikasi masih versi lama | Tutup app sepenuhnya dan buka semula 2 kali |

Hantar tangkapan skrin ralat atau skrin **Executions** jika perlu bantuan.

**Had Google:** akaun Google biasa boleh terima beribu gambar sehari — cukup untuk satu majlis. Pastikan ruang Google Drive mencukupi (setiap gambar ≈ 0.5–1 MB).
