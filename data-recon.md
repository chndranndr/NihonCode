Rekonsiliasi dan audit data materi NihonCode secara menyeluruh.

Sumber kerja:
- data/clean/ adalah hasil akhir dan satu-satunya dataset yang dibaca aplikasi.
- data/generated/ adalah pembanding materi.
- data/jlpt-raw/ adalah pembanding soal, passage, penjelasan, URL gambar, dan audio. Owner menyatakan audio di sini benar dan hak redistribusi aset JLPT sudah ada. Jangan meminta konfirmasi ulang atas dua pernyataan
itu.

Jangan menyalin satu folder mentah-mentah ke clean. Perbaiki clean berdasarkan perbandingan per item dan pemeriksaan isi bahasa Jepang. Pertahankan URL sumber dan URL aset asli sebagai provenance; aplikasi harus memakai
salinan aset lokal.

1. Inventaris sebelum mengedit
Baca AGENTS.md, schema, loader, audit-clean, serta dokumen kualitas dan atribusi. Hitung isi aktual ketiga folder. Buat matriks item yang sama, hanya ada pada salah satu sumber, berbeda nilainya, kehilangan field,
kehilangan passage, kehilangan penjelasan, dan kehilangan aset.

Aturan pencocokan:
- Kana generated tidak punya ID clean: cocokkan tabel + karakter.
- Kanji generated: cocokkan level + karakter.
- Vocabulary generated: cocokkan penulisan, bacaan, dan arti; periksa manual kandidat yang bacaannya berubah.
- Grammar: cocokkan level + identitas pelajaran; jangan menimpa field kurasi clean seperti `graded` dan `defects`.
- Set JLPT raw tidak punya `set_number` clean dan soal raw tidak punya ID clean. Cocokkan set lewat level, kategori, URL halaman sumber dan judul. Cocokkan soal lewat prompt, opsi, jawaban, serta `number` hanya sebagai
petunjuk. Jangan cocokkan dengan posisi array atau `number` saja; catat pasangan ambigu untuk review.
- `generated/practice_core.json` hanya pembanding. Jangan menyalinnya ke clean tanpa memeriksa semua ID soal yang dirujuk.

2. Spawn subagent dalam SATU batch paralel
Tetapkan satu pemilik edit untuk setiap file sebelum spawn. Semua subagent memakai format temuan: sumber, ID/penanda item, file dan field, nilai clean/generated/raw, keputusan, alasan linguistik atau teknis, pemeriksa
kedua, status fixed/verified/blocked.

Bagi pekerjaan menjadi:
- Materi N5–N4 dan materi N3–N1: dua subagent dengan file level terpisah. Audit arti, konteks pemakaian, kanji/kana, bacaan, romaji, typo, kategori, dan jawaban yang diterima.
- Grammar N5–N4 dan N3–N1: dua subagent. Audit makna dan aturan, register, setiap contoh beserta terjemahannya, serta apakah quiz benar-benar menguji grammar. Perbaiki stem template, petunjuk jawaban, dan opsi yang
ambigu.
- JLPT grammar serta JLPT kanji/vocabulary: subagent dengan file kategori/level terpisah. Audit prompt, opsi, kunci 0-based, `answer_text`, distractor, kalimat rusak, dan penjelasan dari raw. Raw mempunyai `explanation`
dan `answered_sentence` untuk kategori-kategori ini; cocokkan dan periksa isinya, jangan menulis ribuan penjelasan baru yang sudah ada.
- JLPT reading/listening: subagent tersendiri. Pulihkan teks passage dan hubungkan soal memakai `questions[].passage_id` dalam set yang sama; verifikasi isinya, jangan menebak dari urutan. Audit penjelasan reading dari
raw. Listening raw belum punya `explanation`: catat kekosongannya, jangan isi dengan template. Petakan tiap soal ke audio raw yang owner nyatakan benar.
- Aset: subagent hanya memiliki file gambar/audio lokal. Ia membuat inventaris URL unik, jumlah dan ukuran unduhan, mengunduh aset yang dipakai, memeriksa file, lalu menyerahkan peta URL→path lokal kepada pemilik JSON.
Jangan mengedit JSON milik subagent lain.
- Integritas: subagent memiliki script pemeriksaan, bukan file konten. Periksa graf set→soal→passage/audio/gambar→practice_core→loader; temukan orphan, referensi putus, aset hilang, serta soal yang tidak dapat dijawab.

Jangan jalankan build, formatter, atau suite project-wide dari subagent saat edit paralel berlangsung. Pemeriksa yang bukan penulisnya harus meninjau perubahan kunci, penjelasan, dan contoh grammar yang ambigu.

3. Lokalkan media dan integrasikan ke aplikasi
Raw mempunyai gambar pada soal listening serta passage reading. Unduh URL gambar yang diperlukan, deduplikasi URL/file yang sama, cek tipe dan keterbacaan file. Simpan URL asli bersama path lokal; `set.url` adalah URL
halaman sumber, BUKAN URL gambar. Runtime, termasuk build produksi, harus memakai path lokal tanpa request gambar eksternal.

Raw audio menyimpan URL asal dan `audio[].local_path`. Pertahankan keduanya. Inventaris URL audio unik dan ukuran file sebelum menyalin; gunakan hanya file yang diperlukan. Clean sebelumnya hanya menghubungkan audio di
tingkat set, bukan soal. Integrator harus membuat relasi soal→audio yang eksplisit melalui model, Zod gate, dan player UI. Jangan menganggap lima audio dalam set otomatis cocok dengan lima soal berdasarkan indeks tanpa
bukti pemetaan.

Integrator juga meneruskan penjelasan yang dipulihkan melalui JSON clean, model, Zod gate, dan UI setelah pengguna menjawab. Menambah field JSON yang dibuang oleh Zod bukan hasil selesai. Pulihkan reading dan listening
dari sumber baru, lalu uji keduanya di aplikasi; keputusan lama untuk mengunci kategori didasarkan pada data lama yang belum lengkap, bukan larangan permanen. Catat keputusan owner yang baru dalam log keputusan.

Ubah `audit-clean` bersama schema: URL remote boleh disimpan sebagai provenance, tetapi path yang dipakai runtime wajib lokal dan filenya harus ada. Jangan sekadar mematikan pemeriksaan lama yang menolak `image_urls`;
ganti dengan pemeriksaan pasangan URL sumber→aset lokal dan pembuktian penggunaan lokal saat runtime.

4. Lindungi ID dan progres
Integrator adalah SATU-SATUNYA penulis `data/clean/practice_core.json`, peta rekey, migrasi Dexie, serta file integrasi lintas kategori. Subagent mengirim daftar soal yang berubah, hilang, atau perlu dikeluarkan.
Gunakan mekanisme `dropped[]` beserta alasannya untuk soal yang benar-benar tidak dapat dipakai; jangan menghapus diam-diam. Sinkronkan `questionIds` dan `questionCount`.

ID kana/kanji/vocabulary dapat berubah jika penulisan atau bacaannya dikoreksi. Migrasikan referensi dan progres dalam perubahan yang sama. ID soal JLPT tampak berbasis hash isi, tetapi audit-clean saat ini belum
memeriksa kecocokan hash. Sebelum mengubah prompt/opsi/kunci, integrator memilih dan mencatat kebijakan ID: mempertahankan identitas lama secara eksplisit, atau menurunkan ulang ID dan memigrasikan practice_core.
`jlptProgress` dikunci per SET, bukan per ID soal; bila isi/jumlah soal set berubah, tentukan penanganan aman untuk `bestCorrect` dan `total` lama. Jangan menghapus progres pengguna diam-diam.

5. Rapikan kontrak repo dan buktikan hasilnya
Pertahankan clean sebagai satu-satunya import data runtime. Perbarui check-arch agar `src/` juga dilarang mengimpor `data/jlpt-raw/` langsung; aturan lama hanya mengenali generated dan lokasi raw lama. Putuskan serta
dokumentasikan apakah generated/jlpt-raw disimpan sebagai input pembanding yang terlacak Git atau diabaikan. Jangan `git add .` tanpa meninjau ukuran aset/data baru. Selaraskan AGENTS.md, docs/architecture.md,
docs/data-quality.md, docs/quality.md, dan docs/decisions.md dengan keputusan tersebut.

Catat konfirmasi hak untuk sumber/aset JLPT di docs/attribution.md dan sinkronkan statusnya di src/content/sources.ts; jangan mengarang nama lisensi atau menyimpulkan bahwa konfirmasi aset JLPT otomatis mencakup sumber
grammar amgidex.

Setelah semua edit digabung: jalankan `npm run audit:clean`, `npm run check:rekeys`, `npm run check`, `npm test`, `npm run build`, dan `npm run eval`. Smoke aplikasi nyata dalam kondisi offline: gambar reading/listening
tampil dari aset lokal, passage cocok dengan soal, audio yang benar dimainkan per soal, penjelasan yang tersedia muncul setelah menjawab, dan progres tetap masuk akal setelah reload.

Laporan akhir harus memuat cakupan per kategori/level, sumber yang dipilih untuk setiap koreksi, jumlah URL dan file aset unik beserta ukuran total, orphan/referensi rusak sebelum→sesudah, perubahan ID/progres, hasil
verifikasi, serta item yang masih ambigu. Jangan klaim audit 100% jika baru memeriksa sampel.
