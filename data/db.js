const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'portfolio.db');
const rawDb = new sqlite3.Database(dbPath);

// Promise helpers
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    rawDb.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function queryOne(sql, params = []) {
  return new Promise((resolve, reject) => {
    rawDb.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function queryAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    rawDb.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    rawDb.exec(sql, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function initDb() {
  // 1. Settings Table
  await exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // 2. Projects Table
  await exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      tags TEXT NOT NULL,
      image_url TEXT,
      demo_url TEXT,
      github_url TEXT,
      featured INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Blog Table
  await exec(`
    CREATE TABLE IF NOT EXISTS blogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      excerpt TEXT NOT NULL,
      content TEXT NOT NULL,
      cover_image TEXT,
      tags TEXT NOT NULL,
      read_time TEXT DEFAULT '3 min read',
      published INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Contact Messages Table
  await exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. Users / Admin Table
  await exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await seedData();
}

async function seedData() {
  // Check if admin user exists
  const adminRow = await queryOne('SELECT COUNT(*) as count FROM users');
  if (adminRow && adminRow.count === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('admin123', salt);
    await run('INSERT INTO users (username, password_hash) VALUES (?, ?)', ['admin', hash]);
    console.log('Akun admin default dibuat: Username="admin", Password="admin123"');
  }

  // Seed default settings
  const defaultSettings = [
    ['site_title', 'Portfolio Farhan Ale'],
    ['owner_name', 'Farhan Ale'],
    ['tagline', 'Network Engineer & Security Engineer'],
    ['bio', 'Halo! Saya Farhan Ale, seorang Network Engineer dan Security Engineer yang berfokus pada perancangan infrastruktur jaringan yang tangguh, aman, dan berskala besar, serta perlindungan sistem dan analisis kerentanan keamanan siber.'],
    ['avatar_url', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'],
    ['skills', 'Network Architecture, Cisco, MikroTik, Linux Server, Firewall & IDS/IPS, Wireshark, VPN & WireGuard, Penetration Testing, SIEM & SOC, Docker, Python Automation'],
    ['email', 'farhan.ale@example.com'],
    ['phone', '+62 812-3456-7890'],
    ['location', 'Jakarta, Indonesia'],
    ['github_url', 'https://github.com'],
    ['linkedin_url', 'https://linkedin.com'],
    ['twitter_url', 'https://twitter.com']
  ];

  for (const [key, value] of defaultSettings) {
    await run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  }

  // Seed default projects if empty
  const projectRow = await queryOne('SELECT COUNT(*) as count FROM projects');
  if (projectRow && projectRow.count === 0) {
    const sampleProjects = [
      {
        title: 'Platform Toko Online E-Commerce',
        description: 'Aplikasi belanja online dengan katalog produk interaktif, keranjang belanja, checkout, serta dashboard manajemen stok dan pesanan.',
        category: 'Web App',
        tags: 'Node.js, Express, Tailwind CSS, SQLite',
        image_url: 'https://images.unsplash.com/photo-1557821552-17105176677c?auto=format&fit=crop&w=800&q=80',
        demo_url: 'https://example.com/demo-ecommerce',
        github_url: 'https://github.com/example/ecommerce-app',
        featured: 1
      },
      {
        title: 'Aplikasi Kolaborasi Tugas & Kanban',
        description: 'Sistem manajemen proyek berbasis kartu drag-and-drop dengan fitur pelacakan waktu, prioritas tugas, dan notifikasi deadline tim.',
        category: 'Web App',
        tags: 'JavaScript, REST API, UI/UX, Express',
        image_url: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=800&q=80',
        demo_url: 'https://example.com/demo-task',
        github_url: 'https://github.com/example/task-manager',
        featured: 1
      },
      {
        title: 'Dashboard Analitik & Monitoring Server',
        description: 'Dashboard visualisasi data interaktif untuk memonitor metrik lalu lintas website, latency server, dan uptime secara real-time.',
        category: 'Dashboard',
        tags: 'Chart.js, WebSockets, Node.js, HTML5',
        image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
        demo_url: 'https://example.com/demo-analytics',
        github_url: 'https://github.com/example/server-monitor',
        featured: 0
      }
    ];

    for (const p of sampleProjects) {
      await run(`
        INSERT INTO projects (title, description, category, tags, image_url, demo_url, github_url, featured)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [p.title, p.description, p.category, p.tags, p.image_url, p.demo_url, p.github_url, p.featured]);
    }
    console.log('Contoh proyek berhasil di-seed');
  }

  // Seed default blogs if empty
  const blogRow = await queryOne('SELECT COUNT(*) as count FROM blogs');
  if (blogRow && blogRow.count === 0) {
    const sampleBlogs = [
      {
        title: 'Panduan Membangun RESTful API yang Efisien dengan Node.js dan Express',
        slug: 'panduan-membangun-restful-api-nodejs',
        excerpt: 'Pelajari dasar arsitektur, struktur folder modular, serta penanganan error terpusat untuk membangun API backend yang siap produksi.',
        content: `## Mengapa Memilih Node.js untuk RESTful API?

Node.js adalah salah satu runtime paling populer untuk backend modern karena sifatnya yang **asynchronous** dan **non-blocking I/O**. Hal ini membuatnya sangat efisien untuk menangani banyak koneksi bersamaan.

### Langkah Praktik Terbaik:
1. **Gunakan Struktur Folder Modular**: Pisahkan antara router, controller, middleware, dan modul data/database.
2. **Validasi Input Pengguna**: Jangan pernah mempercayai input tanpa sanitasi untuk mencegah kerentanan keamanan seperti XSS atau SQL Injection.
3. **Konfigurasi Environment**: Simpan secret keys, database credentials, dan port dalam file lingkungan (environment config).
4. **Error Handling Terpusat**: Tangani error secara terpusat agar client selalu menerima respons format yang konsisten dan informatif.

### Kesimpulan
Dengan struktur yang matang, aplikasi Anda akan lebih mudah dirawat (maintainable), mudah diuji, dan siap untuk scale-up seiring bertambahnya pengguna.`,
        cover_image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
        tags: 'Node.js, Backend, API, JavaScript',
        read_time: '4 min read',
        published: 1
      },
      {
        title: 'Prinsip Desain Antarmuka Web (UI/UX) yang Ramah Mobile di Tahun 2026',
        slug: 'prinsip-desain-ui-ramah-mobile',
        excerpt: 'Desain responsif adalah kunci pengalaman pengguna. Berikut tips esensial agar situs web Anda terlihat memukau di semua layar ponsel dan desktop.',
        content: `## Pendekatan Mobile-First

Lebih dari 60% pengguna internet menjelajahi web melalui perangkat seluler. Desain yang hebat mengutamakan kesederhanaan dan kemudahan akses di layar sentuh.

### Tips Desain Penting:
- **Hierarki Tipografi**: Pastikan teks memiliki kontras yang baik dan ukuran font yang nyaman dibaca tanpa harus memperbesar layar.
- **Ukuran Area Sentuh (Touch Target)**: Tombol dan tautan harus memiliki ukuran minimal 44x44 pixel agar mudah ditekan dengan jari.
- **Waktu Muat Cepat**: Optimasi ukuran gambar dan gunakan format modern seperti WebP.

Desain yang baik membuat pengguna merasa nyaman dan betah berinteraksi lebih lama dengan konten Anda.`,
        cover_image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80',
        tags: 'UI/UX, CSS, Responsive, Frontend',
        read_time: '3 min read',
        published: 1
      }
    ];

    for (const b of sampleBlogs) {
      await run(`
        INSERT INTO blogs (title, slug, excerpt, content, cover_image, tags, read_time, published)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [b.title, b.slug, b.excerpt, b.content, b.cover_image, b.tags, b.read_time, b.published]);
    }
    console.log('Contoh artikel blog berhasil di-seed');
  }

  // Seed sample message if empty
  const msgRow = await queryOne('SELECT COUNT(*) as count FROM messages');
  if (msgRow && msgRow.count === 0) {
    await run(`
      INSERT INTO messages (name, email, subject, message)
      VALUES (?, ?, ?, ?)
    `, [
      'Budi Santoso',
      'budi@example.com',
      'Tertarik Kerjasama Pembuatan Website Bisnis',
      'Halo Alex, saya melihat portofolio Anda dan sangat terkesan dengan proyek toko online dan performanya. Apakah Anda menerima proyek baru dalam waktu dekat? Mohon info ketersediaan dan kontak lanjutannya.'
    ]);
  }
}

async function getSettings() {
  const rows = await queryAll('SELECT key, value FROM settings');
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

async function updateSettings(settingsObj) {
  for (const [key, val] of Object.entries(settingsObj)) {
    await run(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `, [key, val]);
  }
}

module.exports = {
  rawDb,
  run,
  queryOne,
  queryAll,
  exec,
  initDb,
  getSettings,
  updateSettings
};
