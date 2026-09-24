# Prompt implementasi UI baru NihonCode

Kamu adalah AI coding agent di repository NihonCode (キタ). Implementasikan desain HTML yang sudah disetujui di `mockups/` ke aplikasi React produksi. Kerjakan sampai terintegrasi dan terverifikasi, bukan hanya memberikan rencana atau membuat mockup lain.

## 1. Baca dan periksa sebelum mengubah

- Baca `AGENTS.md`, `PRD.md`, `PRODUCT.md`, `implementation_plan.md`, dan `DEVELOPMENT_PROMPT.md`. Fase lama sudah selesai; jangan menjalankan ulang curation atau pipeline yang telah dipensiunkan. Verifikasi keadaan kode sekarang sebelum mengikuti nomor versi atau catatan historis.
- Baca `docs/architecture.md`, `docs/development.md`, `docs/design-system.md`, `docs/quality.md`, `docs/decisions.md`, `DESIGN.md`, `.impeccable/README.md`, dan `.impeccable/surfaces/*.md`. Dokumen desain sudah disinkronkan pada 2026-09-22; statusnya target yang disetujui, bukan bukti integrasi produksi.
- Baca seluruh `mockups/README.md`, `mockups/index.html`, `mockups/style.css`, `mockups/app.js`, dan `mockups/check.mjs`. Buka sembilan view di browser; jangan menyimpulkan desain hanya dari kode.
- Periksa perubahan lokal dan pertahankan pekerjaan pengguna. Jangan reset, menghapus file yang tidak terkait, commit, push, atau membuat PR tanpa permintaan.
- Telusuri route, komponen, pembentukan pool, grading, completion handler, persistence, dan backup yang digunakan fitur terkait. Cari semua pemanggil sebelum mengubah fungsi bersama.

Otoritas visual untuk perubahan ini adalah **mockup HTML terbaru**, termasuk contribution calendar dan kuadran, bukan hanya `mockup.png` lama. PRD tetap otoritas perilaku/data. Pertahankan aturan terminal-console yang tidak digantikan desain baru. Bila ada konflik material yang tidak terselesaikan oleh permintaan ini, jelaskan konflik dan minta keputusan; lanjutkan bagian yang tidak terblokir.

## 2. Hasil yang diminta

Pindahkan desain ke komponen React + TypeScript aplikasi yang sudah ada. Pertahankan URL produksi, navigasi, state, dan kemampuan yang telah berjalan. Jangan mengganti aplikasi dengan iframe, menyalin hash router mockup, atau memasukkan preview-page selector ke produk.

| Tampilan referensi            | Integrasi produksi dan acceptance                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home (`#home`)                | `DashboardPage`: komposisi dashboard baru, level selector, entry latihan/review/JLPT, statistik nyata, Your momentum berupa kalender 91 hari.           |
| Progress (`#progress`)        | `ProgressPage`: kalender tahunan, pemilih tahun, inspector harian, kuadran aktivitas; pertahankan statistik, achievement, dan kanji map yang sudah ada. |
| Learn (`#learn`)              | `LearnPage`: akses enam drill, grammar, review, dan JLPT dengan pool/level nyata.                                                                       |
| Config (`#config`)            | `ConfigPage`: desain baru dengan preferensi tersimpan, tema/accent, export/import, serta informasi lokal dan attribution tetap dapat diakses.           |
| Practice setup (`#setup`)     | `DrillPage` + `PoolMatrix`: kontrol latihan dan matriks eligible pool yang benar-benar digunakan session builder.                                       |
| Practice (`#practice`)        | `DrillSession` dan alur JLPT: pertanyaan nyata, input yang sesuai, submit/feedback/next, progress, keluar dengan konfirmasi.                            |
| Practice results (`#results`) | Hasil sesi aktual, ringkasan benar/salah, review jawaban, retry dan kembali ke setup; gunakan flow existing, tidak wajib route baru.                    |
| Grammar (`#grammar`)          | `GrammarLessonPage`: penjelasan, contoh, quiz, resume/completion tersimpan; pertahankan konten kurasi.                                                  |
| JLPT (`#jlpt`)                | `JlptPage` + `JlptRunPage`: level/kategori/set nyata, status per-set, pilihan ganda, penilaian, penjelasan yang tersedia, hasil dan retry.              |

Verifikasi nama hash terhadap router mockup saat discovery. Route produksi didefinisikan di `src/app/App.tsx`; review dan `/stats` juga harus tetap berfungsi dan konsisten dengan shell baru meskipun bukan view terpisah dalam mockup.

### Matriks setup

- Kana: karakter dan romaji; pilihan hiragana/katakana sesuai perilaku aplikasi.
- Kanji: karakter, onyomi, kunyomi, dan arti yang tersedia.
- Vocabulary: kata/kanji, reading kata, dan arti. Jangan mengarang onyomi/kunyomi per kata bila data hanya memiliki reading; bedakan vocabulary reading dari bacaan karakter kanji.
- Numbers dan dates: tampilkan kemungkinan item/contoh yang benar dari generator dan batas konfigurasi. Jika preview dibatasi, beri label contoh/subset dan total yang jujur.
- Conjugation: bentuk dasar, kelas/form yang relevan, serta contoh perubahan yang konsisten dengan domain conjugator.
- Filter, pencarian, pagination, jumlah soal, dan perubahan level harus konsisten dengan eligible pool. Jelaskan apakah kontrol hanya menyaring tampilan atau mengubah pool sesi; jangan diam-diam membuat keduanya berbeda.
- Tangani loading, pool kosong, error, dan pilihan tidak valid. Jangan menyalin jumlah item dari mockup.

### JLPT bukan placeholder

Gunakan set Grammar/Kanji/Vocabulary yang tersedia melalui loader dan gate. Pilihan level harus benar-benar memuat konten level tersebut; jangan memakai tiga soal contoh N5 untuk semua level atau menduplikasi set mockup. Pertahankan keyed grading dan per-set progress existing. Listening/Reading tetap terkunci dengan alasan yang jujur sampai keputusan pemilik yang relevan diselesaikan; desain baru tidak mengizinkan membuka gate tersebut.

## 3. Kalender dan kuadran: implementasi data nyata

Ikuti PRD §10.13, bukan fixture di `mockups/app.js`:

- Satu kontribusi = satu sesi selesai: drill, SRS review run, grammar quiz, atau JLPT set. Bukan jawaban individual, kunjungan, XP, bonus, perubahan setup, atau sesi dibatalkan.
- Retry selesai adalah sesi baru. Penyimpanan ulang completion yang sama harus idempotent, termasuk double-click dan React effect replay. Buat identitas sesi stabil saat run dimulai, bukan ID baru setiap percobaan menyimpan completion.
- Simpan completion timestamp, tanggal lokal saat selesai, stable session ID, dan satu kategori eksklusif. Jangan menggeser tanggal historis saat timezone berubah.
- Home: 91 hari hingga hari ini. Progress: tahun terpilih, tujuh baris Minggu–Sabtu, kolom minggu, label bulan/hari, leap day, padding di luar rentang, tanggal masa depan nonaktif.
- Tahun tersedia berasal dari histori ditambah tahun berjalan. Data mencakup semua level; pemilih level belajar tidak menyaring aktivitas. Tahun yang dipilih mengendalikan kalender dan kuadran bersama.
- Bin warna tetap 0, 1, 2, 3, 4+ sesi. Legend dan inspector menampilkan tanggal, jumlah pasti, serta breakdown kategori. Gunakan jam nyata aplikasi, bukan tanggal cutoff atau random/sample history mockup.
- Kuadran: Drills kiri, SRS Review atas, JLPT kanan, Grammar bawah. Masing-masing sumbu 0–100% dengan skala sama. Persentase = jumlah kategori / total sesi tahun terpilih; label satu desimal, disertai count pasti.
- Tanpa aktivitas: count dan persentase nol, pesan empty state, tanpa pembagian nol atau polygon keseimbangan palsu. Grafik menunjukkan distribusi partisipasi, bukan mastery, prediksi JLPT, atau target keseimbangan.
- Hari dapat diakses dengan keyboard, satu tab stop per kalender dan arrow navigation; tanggal/count tersedia saat focus/hover, detail bisa dipilih dengan sentuhan. Kalender panjang scroll di dalam panel, bukan seluruh halaman.

Mulai dari `src/storage/progressRepo.ts`, `db.ts`, `backup.ts`, dan semua pemanggil `recordSession`. Audit juga completion grammar, review, serta JLPT: jangan menganggap semua sudah tercatat lewat jalur yang sama. Reuse penyimpanan sesi bila cukup; tambahkan schema/migration minimum yang diperlukan setelah memeriksa versi aktual.

Jaga existing progress, XP, streak, SRS, achievement, grammar state, dan JLPT best score. Jangan mengklasifikasikan JLPT sebagai drill karena fallback kind lama. Histori lama hanya boleh digunakan bila kategorinya dapat dipastikan; tanggal lokal yang tidak pernah direkam tidak boleh disajikan seolah pasti. Dokumentasikan batas histori/strategi kompatibilitas, tanpa fabrikasi dari weekly XP atau duplikasi event dari beberapa tabel.

Jika storage bertambah, sertakan validasi import, round-trip export/import, kompatibilitas backup lama, dan preservation stable IDs. Jangan biarkan Zod membuang field baru diam-diam atau import menghilangkan identitas deduplikasi. Migrasi harus non-destruktif; jangan menaikkan versi database berdasarkan nomor lama di dokumen tanpa membaca kode.

## 4. Batas implementasi

- Reuse komponen, repositori, pure domain logic, React Router, Dexie, dan dependency existing. Tidak ada backend, akun/cloud sync, chart library atau runtime dependency baru tanpa keputusan pemilik.
- `data/clean/` tetap satu-satunya dataset; importer tetap melalui `src/content/loaders.ts` dan gate. Tidak ada perubahan data kurasi atau rekey konten hanya untuk mencocokkan mockup.
- `src/domain/` tetap murni, tanpa React/DOM. Tidak ada import antar-feature yang melanggar boundary; taruh komponen bersama di lokasi shared yang sudah digunakan proyek.
- Pertahankan lazy routes dan lazy per-level content. Jangan memuat semua level sekaligus untuk rendering setup.
- Ikuti token warna di `:root`, tanpa inline JSX styles, glass, gradient panels, atau rounded shells. Grafik bisa memakai SVG native dengan class/CSS tokens, tanpa library tambahan. Semantic green tetap hijau ketika accent primer diganti.
- Pertahankan dark/light, navigasi keyboard, fokus terlihat, label form, kontras, reduced motion, TTS fallback, dan text-paired status. Jangan mengganti materi Jepang dengan gambar.
- Pertahankan identitas terminal, border tipis/corner detail, tipografi, spacing, hierarki, dan layout responsif mockup. Adaptasikan jumlah data nyata dan state lengkap; jangan menyederhanakan menjadi dashboard kartu generik.
- Jangan memasukkan fixture, tanggal hardcoded, preview controls, angka statistik palsu, atau teks direction-contract ke bundle produksi.

## 5. Urutan kerja

1. Laporkan singkat mapping mockup ke kode, risiko persistence, dan rencana implementasi. Ambil baseline checks serta screenshot produksi dan mockup sebelum mengubah.
2. Integrasikan shell, token, navigasi dan responsive layout; lanjutkan Home/Learn/Config, lalu setup/practice/results/grammar/JLPT. Reuse perilaku existing, jangan membangun engine paralel.
3. Implementasikan kontrak activity completion dan kompatibilitas storage/backup; hubungkan Home dan Progress ke agregasi yang sama, lalu kalender dan kuadran.
4. Uji flow nyata dan visual, perbaiki regresi, lalu perbarui dokumentasi engineering yang relevan (`docs/quality.md`, `docs/design-system.md`, `docs/decisions.md`, `DESIGN.md`/sidecar bila diperlukan). Bedakan implemented, verified, dan pending. Untuk owner-authored PRD/PRODUCT/implementation plan, laporkan delta status yang diperlukan tanpa merestrukturisasi atau mengubah scope tanpa izin.
5. Selesaikan bagian tidak terblokir. Jangan berhenti pada rencana atau meminta konfirmasi ulang untuk implementasi yang sudah berada dalam scope. Keputusan gate yang belum tersedia tetap dilaporkan, bukan ditebak.

## 6. Verifikasi wajib

Gunakan test/eval harness existing, tanpa menambahkan framework baru.

- Jalankan `node mockups/check.mjs` sebagai pemeriksaan referensi, bukan bukti integrasi produksi.
- Jalankan `npm run check`, `npm test`, `npm run build`, `npm run eval`, dan `npm run doctor` pada hasil terintegrasi. Catat kegagalan baseline secara terpisah; jangan melemahkan guardrail untuk meloloskan perubahan.
- Tambahkan tes terfokus untuk kategori dan total activity, bin batas, tahun/leap day, tanggal lokal/pergantian hari, rentang 91 hari, future dates, tahun kosong, persentase nol, deduplikasi completion, abort tidak dihitung, retry dihitung, migrasi dan backup round-trip termasuk format lama.
- Browser flow: setup → jawaban → hasil → reload → progress; SRS completion; grammar completion; JLPT level/kategori/set → jawaban → hasil → per-set state setelah reload. Pastikan masing-masing menambah tepat satu kategori kontribusi yang benar.
- Periksa matriks keenam drill terhadap pool sesungguhnya, filter/jumlah, level switching, preferensi setelah reload, export/import, TTS fallback, dan gate listening/reading.
- Inspeksi screenshot produksi dibanding mockup pada desktop sekitar 1440px, tablet 768px, dan mobile 390px; cek juga overflow pada 320px. Uji dark/light dan pergantian accent, kalender/tahun/inspector dengan keyboard dan touch, focus, error/empty/loading, serta console errors.
- Jika menemukan kegagalan, perbaiki penyebabnya dan tambahkan guardrail terkecil sesuai workflow repo; update `.harness/manifest.json` jika cakupan check berubah. Jangan mengklaim verifikasi browser hanya dari unit test atau build.

## 7. Definition of done dan handoff

Semua sembilan tampilan sudah terintegrasi ke aplikasi utama dengan data nyata; route/fungsi existing tetap bekerja. Kalender dan kuadran memakai completion tersimpan yang benar, bukan demo. Persistence serta backup kompatibel dan terbukti. Tampilan desktop/mobile diperiksa langsung, checks selesai, dan keterbatasan yang tersisa dinyatakan jelas.

Akhiri dengan ringkasan singkat: apa yang diimplementasikan, file/route penting, hasil checks dan bukti visual, keputusan migrasi/histori, serta gate atau verifikasi yang masih pending. Jangan menyatakan selesai bila integrasi data atau verifikasi wajib belum dilakukan. Jangan commit/push tanpa instruksi terpisah.
