/* Photobooth Majlis Apresiasi Kecemerlangan 2026 — SK (FELDA) Jengka 24 */
'use strict';

const CFG = Object.assign({ UPLOAD_URL: '', AWALAN_FAIL: 'SKJ24_2026' }, window.PHOTOBOOTH_CONFIG || {});

/* ---------- Data bingkai: saiz asal dan kedudukan tetingkap lut sinar [x, y, lebar, tinggi] ---------- */
const BINGKAI = [
  { id: 'bingkai1', nama: 'Bingkai 1', nota: 'Melintang', w: 1199, h: 1312, win: [71, 427, 1057, 664] },
  { id: 'bingkai2', nama: 'Bingkai 2', nota: '',          w: 1086, h: 1448, win: [100, 387, 881, 816] },
  { id: 'bingkai3', nama: 'Bingkai 3', nota: '',          w: 1024, h: 1536, win: [85, 436, 853, 875] },
  { id: 'bingkai4', nama: 'Bingkai 4', nota: '',          w: 1024, h: 1536, win: [75, 470, 874, 780] },
  { id: 'bingkai5', nama: 'Bingkai 5', nota: '',          w: 1024, h: 1536, win: [86, 412, 845, 869] },
  { id: 'bingkai6', nama: 'Bingkai 6', nota: 'Tinggi',    w: 941,  h: 1672, win: [75, 566, 790, 810] }
];
const TEMA = [
  { id: 'ungu',  nama: 'Ungu',  warna: '#7c3aed', meta: '#3b0764' },
  { id: 'biru',  nama: 'Biru',  warna: '#2563eb', meta: '#0c2a6b' },
  { id: 'hijau', nama: 'Hijau', warna: '#059669', meta: '#064e3b' },
  { id: 'merah', nama: 'Merah', warna: '#e11d48', meta: '#6b0f2a' },
  { id: 'emas',  nama: 'Emas',  warna: '#d97706', meta: '#5a3305' }
];
const SKALA_OUTPUT = 1.5;      // gambar disimpan 1.5x saiz asal bingkai
const KUALITI_JPEG = 0.92;

const $ = (id) => document.getElementById(id);
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

function simpanTetapan(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function bacaTetapan(k, asal) { try { return localStorage.getItem(k) || asal; } catch (e) { return asal; } }

const keadaan = {
  tema: bacaTetapan('pb_tema', 'ungu'),
  bingkai: bacaTetapan('pb_bingkai', 'bingkai1'),
  hadapan: 'user',          // 'user' = kamera depan, 'environment' = kamera belakang
  strim: null,
  sumber: null,             // <video> atau gambar dari galeri
  cermin: false,
  zum: 1,
  sedangAmbil: false,
  gelung: 0,
  hasil: null               // { id, nama, blob, url }
};
if (!TEMA.some(t => t.id === keadaan.tema)) keadaan.tema = 'ungu';
if (!BINGKAI.some(b => b.id === keadaan.bingkai)) keadaan.bingkai = 'bingkai1';

/* ---------- Muat imej bingkai ---------- */
const imejBingkai = {};
function muatBingkai(b) {
  if (!imejBingkai[b.id]) {
    imejBingkai[b.id] = new Promise((ok, gagal) => {
      const im = new Image();
      im.onload = () => ok(im);
      im.onerror = gagal;
      im.src = `${b.id}.webp`;
    });
  }
  return imejBingkai[b.id];
}
const bingkaiSemasa = () => BINGKAI.find(b => b.id === keadaan.bingkai);

/* =====================================================================
   LUKISAN — SATU fungsi untuk pratonton DAN gambar yang disimpan,
   supaya hasil simpanan sama tepat dengan pratonton.
   ===================================================================== */
const sokongFilter = (() => {
  try {
    const c = document.createElement('canvas'); c.width = c.height = 9;
    const x = c.getContext('2d');
    if (!('filter' in x)) return false;
    x.filter = 'blur(2px)';
    x.fillStyle = '#fff'; x.fillRect(4, 4, 1, 1);
    return x.getImageData(2, 4, 1, 1).data[3] > 0;
  } catch (e) { return false; }
})();
const kanvasKabur = document.createElement('canvas');

function saizSumber(src) {
  if (!src) return [0, 0];
  if (src instanceof HTMLVideoElement) return [src.videoWidth, src.videoHeight];
  return [src.naturalWidth || src.width, src.naturalHeight || src.height];
}

/** Had zum: nilai 1 = gambar memenuhi tetingkap; nilai minimum = keseluruhan gambar kelihatan. */
function hadZumMin(b, src) {
  const [sw, sh] = saizSumber(src);
  if (!sw) return 0.5;
  const [, , ww, wh] = b.win;
  const cover = Math.max(ww / sw, wh / sh), contain = Math.min(ww / sw, wh / sh);
  return Math.min(1, contain / cover);
}

function lukis(ctx, W, H, b, imBingkai, src, zum, cermin) {
  const k = W / b.w;
  const wx = b.win[0] * k, wy = b.win[1] * k, ww = b.win[2] * k, wh = b.win[3] * k;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#111';
  ctx.fillRect(wx, wy, ww, wh);
  const [sw, sh] = saizSumber(src);
  if (sw && sh) {
    ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip();
    if (cermin) { ctx.translate(2 * wx + ww, 0); ctx.scale(-1, 1); }
    const cover = Math.max(ww / sw, wh / sh);
    const s = cover * zum;
    const dw = sw * s, dh = sh * s;
    const dx = wx + (ww - dw) / 2, dy = wy + (wh - dh) / 2;
    if (dw < ww - 0.5 || dh < wh - 0.5) {
      // Latar kabur memenuhi ruang kosong di tepi
      const cw = sw * cover, ch = sh * cover;
      const cx = wx + (ww - cw) / 2, cy = wy + (wh - ch) / 2;
      if (sokongFilter) {
        ctx.filter = `blur(${Math.round(ww * 0.035)}px)`;
        ctx.drawImage(src, cx - ww * 0.06, cy - wh * 0.06, cw + ww * 0.12, ch + wh * 0.12);
        ctx.filter = 'none';
      } else {
        const kw = 28, kh = Math.max(1, Math.round(28 * sh / sw));
        kanvasKabur.width = kw; kanvasKabur.height = kh;
        const kx = kanvasKabur.getContext('2d');
        kx.imageSmoothingEnabled = true; kx.imageSmoothingQuality = 'high';
        kx.drawImage(src, 0, 0, kw, kh);
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(kanvasKabur, cx, cy, cw, ch);
      }
      ctx.fillStyle = 'rgba(0,0,0,.22)';
      ctx.fillRect(cx, cy, cw, ch);
    }
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, dx, dy, dw, dh);
  }
  ctx.restore();
  if (imBingkai) {
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imBingkai, 0, 0, W, H);
  }
}

/* =====================================================================
   SKRIN & NAVIGASI (butang "Back" Android ikut skrin)
   ===================================================================== */
let skrinAktif = 'utama';
function tunjukSkrin(nama, tolak = true) {
  if (nama === skrinAktif) return;
  if (skrinAktif === 'kamera') tutupKamera();
  document.querySelectorAll('.skrin').forEach(s => s.classList.remove('aktif'));
  $('skrin-' + nama).classList.add('aktif');
  skrinAktif = nama;
  if (tolak) history.pushState({ skrin: nama }, '');
  window.scrollTo(0, 0);
  if (nama === 'kamera') bukaSkrinKamera();
  if (nama === 'utama') kemaskiniStatusGilir();
}
history.replaceState({ skrin: 'utama' }, '');
window.addEventListener('popstate', (e) => {
  const s = (e.state && e.state.skrin) || 'utama';
  tunjukSkrin(s === 'keputusan' ? 'utama' : s, false);
});
function kembaliKeUtama() {
  if (history.state && history.state.skrin !== 'utama') history.back();
  else tunjukSkrin('utama', false);
}

/* =====================================================================
   LAMAN UTAMA
   ===================================================================== */
function tetapkanTema(id) {
  keadaan.tema = id;
  document.body.dataset.tema = id;
  simpanTetapan('pb_tema', id);
  const t = TEMA.find(x => x.id === id);
  document.querySelector('meta[name="theme-color"]').setAttribute('content', t.meta);
  document.querySelectorAll('.cip-warna').forEach(c => c.setAttribute('aria-checked', String(c.dataset.id === id)));
}
function binaLamanUtama() {
  $('nama-majlis').textContent = CFG.NAMA_MAJLIS || 'Majlis Apresiasi Kecemerlangan 2026';
  $('nama-sekolah').textContent = CFG.NAMA_SEKOLAH || 'SK (FELDA) Jengka 24';

  const pw = $('pilihan-warna');
  TEMA.forEach(t => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'cip-warna'; b.dataset.id = t.id;
    b.setAttribute('role', 'radio');
    b.innerHTML = `<span class="titik" style="background:${t.warna}"></span>${t.nama}`;
    b.addEventListener('click', () => tetapkanTema(t.id));
    pw.appendChild(b);
  });
  tetapkanTema(keadaan.tema);

  const gb = $('grid-bingkai');
  BINGKAI.forEach(bk => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'kad-bingkai'; b.dataset.id = bk.id;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(bk.id === keadaan.bingkai));
    b.innerHTML = `<img src="${bk.id}_kecil.webp" alt="" loading="lazy"><span>${bk.nama}</span>${bk.nota ? `<small>${bk.nota}</small>` : ''}`;
    b.addEventListener('click', () => {
      keadaan.bingkai = bk.id; simpanTetapan('pb_bingkai', bk.id);
      gb.querySelectorAll('.kad-bingkai').forEach(x => x.setAttribute('aria-checked', String(x.dataset.id === bk.id)));
    });
    b.addEventListener('dblclick', () => tunjukSkrin('kamera'));
    gb.appendChild(b);
  });

  $('btn-mula').addEventListener('click', () => tunjukSkrin('kamera'));
}

/* ----- Pasang aplikasi ----- */
let promptPasang = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); promptPasang = e;
  if (!isStandalone()) $('kotak-pasang').hidden = false;
});
window.addEventListener('appinstalled', () => { $('kotak-pasang').hidden = true; toast('Aplikasi berjaya dipasang!'); });
function sediaPasang() {
  $('btn-pasang').addEventListener('click', async () => {
    if (!promptPasang) return;
    promptPasang.prompt();
    try { await promptPasang.userChoice; } catch (e) {}
    promptPasang = null; $('kotak-pasang').hidden = true;
  });
  if (isIOS && !isStandalone() && bacaTetapan('pb_tip_ios', '') !== 'tutup') $('tip-ios').hidden = false;
  $('tutup-tip-ios').addEventListener('click', () => { $('tip-ios').hidden = true; simpanTetapan('pb_tip_ios', 'tutup'); });
}

/* =====================================================================
   KAMERA
   ===================================================================== */
const video = document.createElement('video');
video.setAttribute('playsinline', ''); video.setAttribute('muted', ''); video.muted = true; video.autoplay = true;
const kanvas = $('kanvas-pratonton');
const ctxP = kanvas.getContext('2d');
const zum = $('zum');

async function bukaSkrinKamera() {
  const b = bingkaiSemasa();
  $('tajuk-kamera').textContent = b.nama;
  saizKanvas();
  imBingkaiAktif = null;
  muatBingkai(b).then(im => { imBingkaiAktif = im; });
  modGaleri(false);
  mulaGelung();
  await mulaKamera();
}
let imBingkaiAktif = null;

function saizKanvas() {
  const b = bingkaiSemasa();
  const p = $('pentas');
  const aw = p.clientWidth - 16, ah = p.clientHeight - 8;
  if (aw <= 0 || ah <= 0) return;
  const k = Math.min(aw / b.w, ah / b.h);
  const cssW = Math.floor(b.w * k), cssH = Math.floor(b.h * k);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  kanvas.style.width = cssW + 'px'; kanvas.style.height = cssH + 'px';
  kanvas.width = Math.round(cssW * dpr); kanvas.height = Math.round(cssH * dpr);
}
window.addEventListener('resize', () => { if (skrinAktif === 'kamera') saizKanvas(); });

function mesejKamera(teks, denganButang) {
  $('mesej-kamera').hidden = !teks;
  $('teks-mesej-kamera').textContent = teks || '';
  $('butang-mesej-kamera').hidden = !denganButang;
}

async function mulaKamera() {
  hentiStrim();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    mesejKamera('Kamera tidak dapat dibuka dalam pelayar ini. Sila pilih gambar dari Galeri, atau buka pautan ini dalam Chrome / Safari.', true);
    return;
  }
  mesejKamera('Membuka kamera…', false);
  // Minta gambar asli kamera 4:3 (TIDAK dipaksa menjadi bentuk tinggi)
  const pilihan = [
    { audio: false, video: { facingMode: { ideal: keadaan.hadapan }, width: { ideal: 1920 }, height: { ideal: 1440 } } },
    { audio: false, video: { facingMode: { ideal: keadaan.hadapan } } },
    { audio: false, video: true }
  ];
  let strim = null, ralat = null;
  for (const p of pilihan) {
    try { strim = await navigator.mediaDevices.getUserMedia(p); break; } catch (e) {
      ralat = e;
      if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) break;
    }
  }
  if (skrinAktif !== 'kamera') { if (strim) strim.getTracks().forEach(t => t.stop()); return; }
  if (!strim) {
    const n = ralat && ralat.name;
    mesejKamera(n === 'NotAllowedError'
      ? 'Kebenaran kamera ditolak. Benarkan kamera dalam tetapan pelayar, kemudian tekan “Cuba lagi”.'
      : 'Kamera tidak ditemui atau sedang digunakan oleh aplikasi lain.', true);
    return;
  }
  keadaan.strim = strim;
  video.srcObject = strim;
  try { await video.play(); } catch (e) {}
  await new Promise(r => { if (video.videoWidth) r(); else video.onloadedmetadata = () => r(); setTimeout(r, 3000); });
  const tetapan = strim.getVideoTracks()[0].getSettings ? strim.getVideoTracks()[0].getSettings() : {};
  keadaan.cermin = (tetapan.facingMode ? tetapan.facingMode === 'user' : keadaan.hadapan === 'user');
  keadaan.sumber = video;
  setZumAsal();
  mesejKamera('', false);
  semakBilanganKamera();
}

async function semakBilanganKamera() {
  try {
    const peranti = await navigator.mediaDevices.enumerateDevices();
    const n = peranti.filter(d => d.kind === 'videoinput').length;
    keadaan.banyakKamera = n >= 2;
    $('btn-tukar-kamera').style.visibility = keadaan.banyakKamera ? '' : 'hidden';
  } catch (e) {}
}

function hentiStrim() {
  if (keadaan.strim) keadaan.strim.getTracks().forEach(t => t.stop());
  keadaan.strim = null;
  video.srcObject = null;
}
function tutupKamera() {
  hentiStrim();
  cancelAnimationFrame(keadaan.gelung);
  keadaan.gelung = 0;
  $('kiraan').textContent = '';
  keadaan.sedangAmbil = false;
  $('btn-snap').disabled = false;
}

function mulaGelung() {
  cancelAnimationFrame(keadaan.gelung);
  const langkah = () => {
    if (skrinAktif !== 'kamera') return;
    const b = bingkaiSemasa();
    lukis(ctxP, kanvas.width, kanvas.height, b, imBingkaiAktif, keadaan.sumber, keadaan.zum, keadaan.cermin);
    keadaan.gelung = requestAnimationFrame(langkah);
  };
  keadaan.gelung = requestAnimationFrame(langkah);
}

/* ----- Zum ----- */
function setZumAsal() {
  const min = hadZumMin(bingkaiSemasa(), keadaan.sumber);
  zum.min = String(Math.floor(min * 100));
  zum.max = '300';
  setZum(1);
}
function setZum(v) {
  const min = Number(zum.min) / 100;
  keadaan.zum = Math.max(min, Math.min(3, v));
  zum.value = String(Math.round(keadaan.zum * 100));
  const lbl = $('label-zum');
  if (Math.abs(keadaan.zum - 1) < 0.015) lbl.textContent = 'Isi bingkai';
  else if (keadaan.zum <= min + 0.005) lbl.textContent = 'Semua';
  else lbl.textContent = Math.round(keadaan.zum * 100) + '%';
}
zum.addEventListener('input', () => {
  let v = Number(zum.value) / 100;
  if (Math.abs(v - 1) < 0.04) v = 1;   // "lekat" pada isi bingkai
  setZum(v);
});
$('label-zum').addEventListener('click', () => setZum(1));

// Cubit (pinch) untuk zum pada skrin sentuh
(() => {
  const titik = new Map(); let jarakAwal = 0, zumAwal = 1;
  const p = $('pentas');
  const jarak = () => { const [a, b] = [...titik.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  p.addEventListener('pointerdown', e => { titik.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (titik.size === 2) { jarakAwal = jarak(); zumAwal = keadaan.zum; } });
  p.addEventListener('pointermove', e => {
    if (!titik.has(e.pointerId)) return;
    titik.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (titik.size === 2 && jarakAwal > 0) setZum(zumAwal * jarak() / jarakAwal);
  });
  const buang = e => { titik.delete(e.pointerId); if (titik.size < 2) jarakAwal = 0; };
  p.addEventListener('pointerup', buang); p.addEventListener('pointercancel', buang); p.addEventListener('pointerleave', buang);
})();

/* ----- Tukar kamera ----- */
$('btn-tukar-kamera').addEventListener('click', () => {
  if (keadaan.sedangAmbil) return;
  keadaan.hadapan = keadaan.hadapan === 'user' ? 'environment' : 'user';
  modGaleri(false);
  mulaKamera();
});
$('btn-cuba-lagi').addEventListener('click', () => mulaKamera());

/* ----- Galeri ----- */
function modGaleri(on) {
  $('btn-snap').classList.toggle('siap', on);
  $('btn-snap').setAttribute('aria-label', on ? 'Siap, simpan gambar' : 'Ambil gambar');
  $('btn-kamera-semula').hidden = !on;
  $('ruang-kosong').hidden = on;
  $('btn-tukar-kamera').style.visibility = (on || keadaan.banyakKamera === false) ? 'hidden' : '';
  $('petunjuk-kamera').textContent = on
    ? 'Laraskan zum, kemudian tekan butang bulat untuk siap.'
    : 'Tekan butang bulat. Kiraan 3 saat akan bermula.';
}
const bukaGaleri = () => { $('input-galeri').value = ''; $('input-galeri').click(); };
$('btn-galeri').addEventListener('click', bukaGaleri);
$('btn-galeri-alt').addEventListener('click', bukaGaleri);
$('input-galeri').addEventListener('change', async (e) => {
  const fail = e.target.files && e.target.files[0];
  if (!fail) return;
  try {
    const im = await bacaGambar(fail);
    hentiStrim();
    keadaan.sumber = im; keadaan.cermin = false;
    setZumAsal();
    mesejKamera('', false);
    modGaleri(true);
  } catch (err) {
    toast('Gambar tidak dapat dibuka. Cuba gambar lain.');
  }
});
function bacaGambar(fail) {
  return new Promise((ok, gagal) => {
    const url = URL.createObjectURL(fail);
    const im = new Image();
    im.onload = () => ok(im);   // pelayar moden membetulkan orientasi (EXIF) secara automatik
    im.onerror = () => { URL.revokeObjectURL(url); gagal(new Error('gagal')); };
    im.src = url;
  });
}
$('btn-kamera-semula').addEventListener('click', () => { modGaleri(false); keadaan.sumber = null; mulaKamera(); });

/* ----- Ambil gambar ----- */
const tidur = (ms) => new Promise(r => setTimeout(r, ms));
$('btn-snap').addEventListener('click', async () => {
  if (keadaan.sedangAmbil || !keadaan.sumber) return;
  const galeri = !(keadaan.sumber instanceof HTMLVideoElement);
  keadaan.sedangAmbil = true;
  $('btn-snap').disabled = true;
  if (!galeri) {
    for (const n of [3, 2, 1]) {
      const el = $('kiraan');
      el.textContent = n; el.classList.remove('denyut'); void el.offsetWidth; el.classList.add('denyut');
      await tidur(1000);
      if (skrinAktif !== 'kamera') return;
    }
    $('kiraan').textContent = '';
  }
  const d = $('denyar'); d.classList.remove('nyala'); void d.offsetWidth; d.classList.add('nyala');
  try {
    await janaGambar();
  } catch (err) {
    console.error(err);
    toast(err && err.message === 'tiada-bingkai'
      ? 'Fail bingkai tidak ditemui. Sila hubungi penganjur.'
      : 'Maaf, gambar gagal dijana. Cuba lagi.');
    keadaan.sedangAmbil = false; $('btn-snap').disabled = false;
  }
});

async function janaGambar() {
  const b = bingkaiSemasa();
  let im;
  try { im = await muatBingkai(b); } catch (e) { imejBingkai[b.id] = null; throw new Error('tiada-bingkai'); }
  const W = Math.round(b.w * SKALA_OUTPUT), H = Math.round(b.h * SKALA_OUTPUT);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
  lukis(x, W, H, b, im, keadaan.sumber, keadaan.zum, keadaan.cermin);
  const blob = await new Promise((ok, gagal) => c.toBlob(bl => bl ? ok(bl) : gagal(new Error('toBlob')), 'image/jpeg', KUALITI_JPEG));
  const nama = namaFail(b);
  const id = Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  if (keadaan.hasil && keadaan.hasil.url) URL.revokeObjectURL(keadaan.hasil.url);
  keadaan.hasil = { id, nama, blob, url: URL.createObjectURL(blob) };
  tunjukKeputusan();
  await masukGilir({ id, nama, blob, masa: Date.now() });
  prosesGilir();
}

function namaFail(b) {
  const d = new Date(), p = (n, l = 2) => String(n).padStart(l, '0');
  const tarikh = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  const masa = `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  const unik = Math.random().toString(36).slice(2, 6);   // elak nama sama jika dua tetamu snap serentak
  return `${CFG.AWALAN_FAIL}_${keadaan.tema}_${b.id}_${tarikh}_${masa}_${unik}.jpg`;
}

/* =====================================================================
   KEPUTUSAN & SIMPAN
   ===================================================================== */
const bolehKongsiFail = (blob) => {
  try {
    const f = new File([blob], 'x.jpg', { type: 'image/jpeg' });
    return !!(navigator.canShare && navigator.canShare({ files: [f] }));
  } catch (e) { return false; }
};

function tunjukKeputusan() {
  const h = keadaan.hasil;
  $('img-hasil').src = h.url;
  $('label-simpan').textContent = isIOS ? 'Simpan ke Foto' : 'Muat Turun';
  $('tip-simpan-ios').hidden = !isIOS;
  $('btn-kongsi').hidden = isIOS || !bolehKongsiFail(h.blob);
  tunjukStatus(CFG.UPLOAD_URL ? (navigator.onLine ? 'menyimpan' : 'menunggu') : 'tiada');
  // Ganti skrin kamera dalam sejarah supaya "Back" kembali ke laman utama
  tutupKamera();
  document.querySelectorAll('.skrin').forEach(s => s.classList.remove('aktif'));
  $('skrin-keputusan').classList.add('aktif');
  skrinAktif = 'keputusan';
  history.replaceState({ skrin: 'keputusan' }, '');
}

function tunjukStatus(k) {
  const el = $('status-muatnaik');
  const teks = {
    menyimpan: 'Sedang menyimpan ke Google Drive…',
    disimpan: 'Disimpan ke Google Drive ✓',
    menunggu: 'Menunggu internet — gambar disimpan dalam peranti dan akan dimuat naik secara automatik.',
    tiada: 'Gambar sedia untuk disimpan.'
  }[k];
  el.dataset.keadaan = k;
  el.innerHTML = `<span class="titik-status"></span><span></span>`;
  el.lastChild.textContent = teks;
}

$('btn-simpan').addEventListener('click', async () => {
  const h = keadaan.hasil; if (!h) return;
  if (isIOS) {
    const fail = new File([h.blob], h.nama, { type: 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [fail] })) {
      try { await navigator.share({ files: [fail] }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    $('img-tekan-lama').src = h.url;
    $('lapis-tekan-lama').hidden = false;
    return;
  }
  const a = document.createElement('a');
  a.href = h.url; a.download = h.nama;
  document.body.appendChild(a); a.click(); a.remove();
  toast('Gambar dimuat turun.');
});
$('btn-kongsi').addEventListener('click', async () => {
  const h = keadaan.hasil; if (!h) return;
  try { await navigator.share({ files: [new File([h.blob], h.nama, { type: 'image/jpeg' })] }); } catch (e) {}
});
$('btn-tutup-lapis').addEventListener('click', () => { $('lapis-tekan-lama').hidden = true; });
$('btn-ulang').addEventListener('click', () => {
  history.replaceState({ skrin: 'kamera' }, '');
  document.querySelectorAll('.skrin').forEach(s => s.classList.remove('aktif'));
  $('skrin-kamera').classList.add('aktif');
  skrinAktif = 'kamera';
  bukaSkrinKamera();
});
$('btn-kembali-keputusan').addEventListener('click', () => kembaliKeUtama());
$('btn-kembali-kamera').addEventListener('click', () => kembaliKeUtama());

/* =====================================================================
   GILIRAN MUAT NAIK (IndexedDB) — tahan walaupun tiada internet
   ===================================================================== */
let dbJanji = null;
function db() {
  if (!dbJanji) dbJanji = new Promise((ok, gagal) => {
    const r = indexedDB.open('photobooth', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('gilir', { keyPath: 'id' });
    r.onsuccess = () => ok(r.result);
    r.onerror = () => gagal(r.error);
  });
  return dbJanji;
}
async function op(mod, fn) {
  const d = await db();
  return new Promise((ok, gagal) => {
    const t = d.transaction('gilir', mod);
    const s = t.objectStore('gilir');
    const r = fn(s);
    t.oncomplete = () => ok(r && r.result);
    t.onerror = () => gagal(t.error);
  });
}
async function masukGilir(item) {
  if (!CFG.UPLOAD_URL) return;
  try { await op('readwrite', s => s.put(item)); } catch (e) { console.warn('IndexedDB', e); }
}
const senaraiGilir = () => op('readonly', s => s.getAll()).catch(() => []);
const buangGilir = (id) => op('readwrite', s => s.delete(id)).catch(() => {});

function blobKeBase64(blob) {
  return new Promise((ok, gagal) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(',')[1]);
    r.onerror = gagal;
    r.readAsDataURL(blob);
  });
}

let sedangProses = false;
async function prosesGilir() {
  if (!CFG.UPLOAD_URL || sedangProses) return;
  sedangProses = true;
  try {
    const senarai = (await senaraiGilir()).sort((a, b) => a.masa - b.masa);
    for (const item of senarai) {
      if (!navigator.onLine) break;
      const semasa = keadaan.hasil && keadaan.hasil.id === item.id;
      if (semasa) tunjukStatus('menyimpan');
      const berjaya = await muatNaik(item);
      if (berjaya) {
        await buangGilir(item.id);
        if (keadaan.hasil && keadaan.hasil.id === item.id) tunjukStatus('disimpan');
      } else {
        break; // cuba semula kemudian
      }
    }
  } finally {
    sedangProses = false;
    const baki = await senaraiGilir();
    if (keadaan.hasil && baki.some(i => i.id === keadaan.hasil.id)) tunjukStatus('menunggu');
    kemaskiniStatusGilir(baki.length);
  }
}

async function muatNaik(item) {
  const ctl = new AbortController();
  const masa = setTimeout(() => ctl.abort(), 90000);
  try {
    const data = await blobKeBase64(item.blob);
    const r = await fetch(CFG.UPLOAD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },  // elak "preflight" CORS
      body: JSON.stringify({ nama: item.nama, jenis: 'image/jpeg', data }),
      signal: ctl.signal,
      redirect: 'follow'
    });
    const j = await r.json();
    return !!(j && j.ok);
  } catch (e) {
    console.warn('Muat naik gagal:', e);
    return false;
  } finally { clearTimeout(masa); }
}

async function kemaskiniStatusGilir(n) {
  if (!CFG.UPLOAD_URL) return;
  if (typeof n !== 'number') n = (await senaraiGilir()).length;
  const el = $('status-baris-gilir');
  el.hidden = n === 0;
  el.textContent = navigator.onLine
    ? `${n} gambar sedang menunggu untuk dimuat naik…`
    : `Tiada internet: ${n} gambar disimpan dalam peranti dan akan dimuat naik apabila talian pulih.`;
}

window.addEventListener('online', () => { toast('Internet kembali — memuat naik gambar…'); prosesGilir(); });
window.addEventListener('offline', () => {
  if (keadaan.hasil && skrinAktif === 'keputusan' && $('status-muatnaik').dataset.keadaan === 'menyimpan') tunjukStatus('menunggu');
  kemaskiniStatusGilir();
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) prosesGilir(); });
setInterval(() => prosesGilir(), 30000);

/* ---------- Semak fail bingkai ada (untuk bantu kesan masalah muat naik) ---------- */
function amaran(teks) {
  const el = $('amaran-fail');
  el.innerHTML = teks; el.hidden = false;
}
async function semakFail() {
  if (location.protocol === 'file:') {
    amaran('<strong>Aplikasi dibuka terus dari komputer.</strong> Gambar tidak boleh dijana dengan cara ini. Sila buka melalui pautan GitHub Pages (https://…github.io/…).');
    return;
  }
  const hilang = [];
  await Promise.all(BINGKAI.map(b => muatBingkai(b).catch(() => { hilang.push(b.id + '.webp'); imejBingkai[b.id] = null; })));
  if (hilang.length) {
    amaran('<strong>Fail bingkai tidak ditemui:</strong> ' + hilang.sort().join(', ') +
      '. Pastikan SEMUA fail dimuat naik ke GitHub (termasuk fail .webp dan .png).');
  }
}

/* ---------- Toast ---------- */
let masaToast = 0;
function toast(t) {
  const el = $('toast'); el.textContent = t; el.hidden = false;
  clearTimeout(masaToast); masaToast = setTimeout(() => { el.hidden = true; }, 2800);
}

/* ---------- Mula ---------- */
binaLamanUtama();
sediaPasang();
semakFail();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW', e)));
}
prosesGilir();

// Untuk ujian sahaja
window.__photobooth = { keadaan, lukis, BINGKAI, prosesGilir, setZum };
