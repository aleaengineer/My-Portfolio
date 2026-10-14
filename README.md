# Website Portofolio Dinamis (Portfolio, Blog, Project, Contact & Admin Panel)

Aplikasi web portofolio pribadi modern dan interaktif yang dibangun dengan **Node.js**, **Express**, dan database **SQLite**. Dilengkapi dengan panel manajemen **Admin Dashboard** berautentikasi untuk mengelola seluruh data proyek, artikel blog, kotak masuk formulir kontak, dan profil pengembang secara langsung.

---

## 🌟 Fitur Utama

### 1. Halaman Publik
- **Hero & Profil Pengembang**: Penjelasan identitas, biodata, tagline, foto avatar, status ketersediaan, tautan media sosial (GitHub, LinkedIn, Twitter, Email).
- **Keahlian & Tech Stack**: Tampilan badge keahlian teknologi (JavaScript, Node.js, Express, React, Tailwind, SQLite, dll.).
- **Katalog Portofolio Proyek (`/projects`)**:
  - Filter kategori proyek (Semua, Web App, Dashboard, dll.).
  - Kartu proyek dengan gambar cover, ringkasan, tag teknologi, link demo langsung, dan link kode sumber GitHub.
  - Penanda badge khusus untuk proyek unggulan (*Featured*).
- **Blog & Catatan Teknis (`/blog` & `/blog/:slug`)**:
  - Daftar artikel dengan tanggal rilis, estimasi waktu baca, dan filter tag.
  - Halaman baca artikel dengan dukungan format **Markdown** (Heading, Code block, List, Quote, dll.).
  - Rekomendasi artikel terkait dan kartu profil penulis.
- **Formulir Kontak Dinamis (`/contact`)**:
  - Pengunjung dapat mengirimkan nama, email, subjek, dan pesan secara langsung.
  - Pesan tersimpan otomatis ke dalam database SQLite.

### 2. Panel Admin Terproteksi (`/admin`)
- **Autentikasi Aman**: Login berbasis sesi dan enkripsi kata sandi menggunakan `bcryptjs`.
- **Dashboard Ringkasan**: Statistik total proyek, total artikel, total pesan masuk, dan status pesan belum dibaca.
- **Kelola Proyek (CRUD)**: Tambah, edit, dan hapus proyek portofolio.
- **Kelola Blog (CRUD)**: Tulis artikel baru dengan format Markdown, atur status publik atau draf, edit, dan hapus artikel.
- **Kotak Masuk Pesan (Inbox)**: Lihat pesan dari pengunjung, tandai telah dibaca, balas via email, atau hapus pesan.
- **Pengaturan Profil & Ganti Password**:
  - Perbarui nama, judul website, bio, keahlian, nomor telepon/WA, email publik, lokasi, dan media sosial.
  - Fitur ganti password akun admin.

---

## 🚀 Kredensial Login Admin Default

- **URL Login**: `http://localhost:3000/admin/login`
- **Username**: `admin`
- **Password**: `admin123`

*(Catatan: Anda dapat mengubah password ini kapan saja melalui menu Pengaturan setelah login).*

---

## 🛠️ Teknologi yang Digunakan

- **Runtime & Backend**: Node.js & Express.js
- **Database**: SQLite3 (`portfolio.db`) dengan wrapper Promise async/await
- **Template Engine**: EJS (Embedded JavaScript)
- **Styling**: Tailwind CSS & FontAwesome Icons
- **Markdown Renderer**: Marked.js
- **Keamanan**: BcryptJS (Password hashing) & Express Session

---

## 📂 Struktur Direktori

```
portfolio-website/
├── data/
│   ├── db.js             # Konfigurasi koneksi SQLite & schema otomatis
│   └── portfolio.db       # File database SQLite
├── routes/
│   ├── public.js         # Rute publik (beranda, projects, blog, contact)
│   └── admin.js          # Rute admin dashboard & CRUD
├── views/
│   ├── partials/         # Header, footer, admin-header
│   ├── index.ejs         # Halaman beranda
│   ├── projects.ejs      # Katalog proyek
│   ├── blog-list.ejs     # Daftar artikel blog
│   ├── blog-detail.ejs   # Halaman baca artikel (Markdown)
│   ├── contact.ejs       # Halaman kontak
│   ├── 404.ejs           # Halaman 404
│   └── admin/            # View khusus panel admin (dashboard, forms, dll)
├── package.json
└── server.js             # Entry point aplikasi
```

---

## 💻 Cara Menjalankan Aplikasi

1. Masuk ke direktori proyek:
   ```bash
   cd /root/portfolio-website
   ```

2. Jalankan server:
   ```bash
   npm start
   ```

3. Akses aplikasi melalui browser:
   - Website Publik: `http://localhost:3000`
   - Panel Admin: `http://localhost:3000/admin/login`
