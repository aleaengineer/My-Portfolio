const express = require('express');
const session = require('express-session');
const path = require('path');
const { initDb } = require('./data/db');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Body Parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static Files
app.use(express.static(path.join(__dirname, 'public')));

// Session Setup
app.use(session({
  secret: 'portfolio-dynamic-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// View Engine Setup (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Mount Routes
app.use('/', publicRoutes);
app.use('/admin', adminRoutes);

// 404 Page Handler
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Halaman Tidak Ditemukan',
    settings: res.locals.settings || {},
    currentPath: req.path,
    isLoggedIn: !!req.session.userId
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).send('Terjadi kesalahan internal pada server.');
});

// Initialize database then start server
initDb()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(`🚀 Website Portofolio Aktif & Berjalan di http://localhost:${PORT}`);
      console.log(`🔑 Login Admin Panel: http://localhost:${PORT}/admin/login`);
      console.log(`   Default Username: admin`);
      console.log(`   Default Password: admin123`);
      console.log(`====================================================`);
    });
  })
  .catch((err) => {
    console.error('Gagal menginisialisasi database:', err);
    process.exit(1);
  });
