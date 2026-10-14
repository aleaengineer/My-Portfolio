const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { queryAll, queryOne, run, getSettings, updateSettings } = require('../data/db');

// Konfigurasi Multer untuk upload foto hero/avatar
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E6);
    cb(null, 'avatar-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Maksimal 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif|svg/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext || mime) {
      return cb(null, true);
    }
    cb(new Error('Hanya file gambar (JPEG, PNG, WEBP, GIF, SVG) yang diperbolehkan!'));
  }
});

// Middleware to check authentication
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect('/admin/login');
  }
  next();
}

// Middleware to inject site settings and user info to admin views
router.use(async (req, res, next) => {
  try {
    res.locals.settings = await getSettings();
    res.locals.adminUsername = req.session.username || null;
    res.locals.currentPath = req.path;
    next();
  } catch (err) {
    next(err);
  }
});

// Helper: Slug generator
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// ==================== AUTHENTICATION ==================== //

// GET /admin/login
router.get('/login', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/admin');
  }
  const flash = req.session.flash || null;
  delete req.session.flash;
  res.render('admin/login', { title: 'Login Admin', flash });
});

// POST /admin/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      req.session.flash = { type: 'error', message: 'Username dan password wajib diisi!' };
      return res.redirect('/admin/login');
    }

    const user = await queryOne('SELECT * FROM users WHERE username = ?', [username.trim()]);
    if (!user) {
      req.session.flash = { type: 'error', message: 'Username atau password salah!' };
      return res.redirect('/admin/login');
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      req.session.flash = { type: 'error', message: 'Username atau password salah!' };
      return res.redirect('/admin/login');
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    req.session.flash = { type: 'error', message: 'Terjadi kesalahan sistem.' };
    res.redirect('/admin/login');
  }
});

// GET /admin/logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

// Apply requireAuth for all subsequent routes
router.use(requireAuth);

// ==================== DASHBOARD ==================== //

// GET /admin - Dashboard Overview
router.get('/', async (req, res) => {
  try {
    const projectCount = (await queryOne('SELECT COUNT(*) as c FROM projects')).c;
    const blogCount = (await queryOne('SELECT COUNT(*) as c FROM blogs')).c;
    const totalMessages = (await queryOne('SELECT COUNT(*) as c FROM messages')).c;
    const unreadMessages = (await queryOne('SELECT COUNT(*) as c FROM messages WHERE is_read = 0')).c;

    const recentMessages = await queryAll('SELECT * FROM messages ORDER BY id DESC LIMIT 5');
    const recentProjects = await queryAll('SELECT * FROM projects ORDER BY id DESC LIMIT 3');

    const flash = req.session.flash || null;
    delete req.session.flash;

    res.render('admin/dashboard', {
      title: 'Dashboard Admin',
      stats: {
        projects: projectCount,
        blogs: blogCount,
        totalMessages,
        unreadMessages
      },
      recentMessages,
      recentProjects,
      flash
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading admin dashboard');
  }
});

// ==================== PROJECTS CRUD ==================== //

// GET /admin/projects
router.get('/projects', async (req, res) => {
  try {
    const projects = await queryAll('SELECT * FROM projects ORDER BY id DESC');
    const flash = req.session.flash || null;
    delete req.session.flash;

    res.render('admin/projects', {
      title: 'Kelola Proyek',
      projects,
      flash
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// GET /admin/projects/new
router.get('/projects/new', (req, res) => {
  res.render('admin/project-form', {
    title: 'Tambah Proyek Baru',
    project: null,
    isEdit: false
  });
});

// POST /admin/projects/new
router.post('/projects/new', async (req, res) => {
  try {
    const { title, description, category, tags, image_url, demo_url, github_url, featured } = req.body;
    await run(`
      INSERT INTO projects (title, description, category, tags, image_url, demo_url, github_url, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title.trim(),
      description.trim(),
      category.trim() || 'Web App',
      tags.trim() || '',
      image_url.trim() || 'https://images.unsplash.com/photo-1557821552-17105176677c?auto=format&fit=crop&w=800&q=80',
      demo_url.trim() || '',
      github_url.trim() || '',
      featured ? 1 : 0
    ]);

    req.session.flash = { type: 'success', message: 'Proyek baru berhasil ditambahkan!' };
    res.redirect('/admin/projects');
  } catch (err) {
    console.error(err);
    req.session.flash = { type: 'error', message: 'Gagal menambahkan proyek.' };
    res.redirect('/admin/projects/new');
  }
});

// GET /admin/projects/edit/:id
router.get('/projects/edit/:id', async (req, res) => {
  try {
    const project = await queryOne('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    if (!project) return res.redirect('/admin/projects');

    res.render('admin/project-form', {
      title: 'Edit Proyek',
      project,
      isEdit: true
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/projects');
  }
});

// POST /admin/projects/edit/:id
router.post('/admin/projects/edit/:id', async (req, res) => {
  try {
    const { title, description, category, tags, image_url, demo_url, github_url, featured } = req.body;
    await run(`
      UPDATE projects
      SET title = ?, description = ?, category = ?, tags = ?, image_url = ?, demo_url = ?, github_url = ?, featured = ?
      WHERE id = ?
    `, [
      title.trim(),
      description.trim(),
      category.trim() || 'Web App',
      tags.trim() || '',
      image_url.trim() || '',
      demo_url.trim() || '',
      github_url.trim() || '',
      featured ? 1 : 0,
      req.params.id
    ]);

    req.session.flash = { type: 'success', message: 'Proyek berhasil diperbarui!' };
    res.redirect('/admin/projects');
  } catch (err) {
    console.error(err);
    req.session.flash = { type: 'error', message: 'Gagal memperbarui proyek.' };
    res.redirect(`/admin/projects/edit/${req.params.id}`);
  }
});

// POST /admin/projects/delete/:id
router.post('/projects/delete/:id', async (req, res) => {
  try {
    await run('DELETE FROM projects WHERE id = ?', [req.params.id]);
    req.session.flash = { type: 'success', message: 'Proyek berhasil dihapus!' };
    res.redirect('/admin/projects');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/projects');
  }
});

// ==================== BLOGS CRUD ==================== //

// GET /admin/blogs
router.get('/blogs', async (req, res) => {
  try {
    const blogs = await queryAll('SELECT * FROM blogs ORDER BY id DESC');
    const flash = req.session.flash || null;
    delete req.session.flash;

    res.render('admin/blogs', {
      title: 'Kelola Artikel Blog',
      blogs,
      flash
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// GET /admin/blogs/new
router.get('/blogs/new', (req, res) => {
  res.render('admin/blog-form', {
    title: 'Tulis Artikel Baru',
    blog: null,
    isEdit: false
  });
});

// POST /admin/blogs/new
router.post('/blogs/new', async (req, res) => {
  try {
    const { title, slug, excerpt, content, cover_image, tags, read_time, published } = req.body;
    let finalSlug = slug ? slugify(slug) : slugify(title);
    if (!finalSlug) finalSlug = 'article-' + Date.now();

    // Check slug collision
    const existing = await queryOne('SELECT id FROM blogs WHERE slug = ?', [finalSlug]);
    if (existing) {
      finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
    }

    await run(`
      INSERT INTO blogs (title, slug, excerpt, content, cover_image, tags, read_time, published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title.trim(),
      finalSlug,
      excerpt.trim() || title.trim(),
      content.trim(),
      cover_image.trim() || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
      tags.trim() || '',
      read_time.trim() || '3 min read',
      published ? 1 : 0
    ]);

    req.session.flash = { type: 'success', message: 'Artikel baru berhasil dipublikasikan!' };
    res.redirect('/admin/blogs');
  } catch (err) {
    console.error(err);
    req.session.flash = { type: 'error', message: 'Gagal menambahkan artikel blog.' };
    res.redirect('/admin/blogs/new');
  }
});

// GET /admin/blogs/edit/:id
router.get('/blogs/edit/:id', async (req, res) => {
  try {
    const blog = await queryOne('SELECT * FROM blogs WHERE id = ?', [req.params.id]);
    if (!blog) return res.redirect('/admin/blogs');

    res.render('admin/blog-form', {
      title: 'Edit Artikel Blog',
      blog,
      isEdit: true
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/blogs');
  }
});

// POST /admin/blogs/edit/:id
router.post('/blogs/edit/:id', async (req, res) => {
  try {
    const { title, slug, excerpt, content, cover_image, tags, read_time, published } = req.body;
    let finalSlug = slug ? slugify(slug) : slugify(title);
    if (!finalSlug) finalSlug = 'article-' + req.params.id;

    // Check duplicate slug with another article
    const existing = await queryOne('SELECT id FROM blogs WHERE slug = ? AND id != ?', [finalSlug, req.params.id]);
    if (existing) {
      finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
    }

    await run(`
      UPDATE blogs
      SET title = ?, slug = ?, excerpt = ?, content = ?, cover_image = ?, tags = ?, read_time = ?, published = ?
      WHERE id = ?
    `, [
      title.trim(),
      finalSlug,
      excerpt.trim(),
      content.trim(),
      cover_image.trim() || '',
      tags.trim() || '',
      read_time.trim() || '3 min read',
      published ? 1 : 0,
      req.params.id
    ]);

    req.session.flash = { type: 'success', message: 'Artikel berhasil diperbarui!' };
    res.redirect('/admin/blogs');
  } catch (err) {
    console.error(err);
    req.session.flash = { type: 'error', message: 'Gagal memperbarui artikel.' };
    res.redirect(`/admin/blogs/edit/${req.params.id}`);
  }
});

// POST /admin/blogs/delete/:id
router.post('/blogs/delete/:id', async (req, res) => {
  try {
    await run('DELETE FROM blogs WHERE id = ?', [req.params.id]);
    req.session.flash = { type: 'success', message: 'Artikel berhasil dihapus!' };
    res.redirect('/admin/blogs');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/blogs');
  }
});

// ==================== MESSAGES INBOX ==================== //

// GET /admin/messages
router.get('/messages', async (req, res) => {
  try {
    const messages = await queryAll('SELECT * FROM messages ORDER BY id DESC');
    const flash = req.session.flash || null;
    delete req.session.flash;

    res.render('admin/messages', {
      title: 'Pesan Masuk (Kontak)',
      messages,
      flash
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// POST /admin/messages/read/:id
router.post('/messages/read/:id', async (req, res) => {
  try {
    await run('UPDATE messages SET is_read = 1 WHERE id = ?', [req.params.id]);
    res.redirect('/admin/messages');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/messages');
  }
});

// POST /admin/messages/delete/:id
router.post('/messages/delete/:id', async (req, res) => {
  try {
    await run('DELETE FROM messages WHERE id = ?', [req.params.id]);
    req.session.flash = { type: 'success', message: 'Pesan berhasil dihapus.' };
    res.redirect('/admin/messages');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/messages');
  }
});

// ==================== SETTINGS & PROFILE ==================== //

// GET /admin/settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await getSettings();
    const flash = req.session.flash || null;
    delete req.session.flash;

    res.render('admin/settings', {
      title: 'Pengaturan Profil & Website',
      settings,
      flash
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// POST /admin/settings
router.post('/settings', upload.single('avatar_file'), async (req, res) => {
  try {
    const {
      site_title,
      owner_name,
      tagline,
      bio,
      avatar_url,
      skills,
      email,
      phone,
      location,
      github_url,
      linkedin_url,
      twitter_url
    } = req.body;

    let finalAvatar = avatar_url?.trim() || '';
    // Jika user mengunggah file gambar baru melalui form
    if (req.file) {
      finalAvatar = '/uploads/' + req.file.filename;
    }

    await updateSettings({
      site_title: site_title?.trim() || 'Portfolio Farhan Ale',
      owner_name: owner_name?.trim() || 'Farhan Ale',
      tagline: tagline?.trim() || 'Network Engineer & Security Engineer',
      bio: bio?.trim() || '',
      avatar_url: finalAvatar,
      skills: skills?.trim() || '',
      email: email?.trim() || '',
      phone: phone?.trim() || '',
      location: location?.trim() || '',
      github_url: github_url?.trim() || '',
      linkedin_url: linkedin_url?.trim() || '',
      twitter_url: twitter_url?.trim() || ''
    });

    req.session.flash = { type: 'success', message: 'Pengaturan profil dan foto hero berhasil disimpan!' };
    res.redirect('/admin/settings');
  } catch (err) {
    console.error(err);
    req.session.flash = { type: 'error', message: 'Gagal menyimpan pengaturan: ' + (err.message || err) };
    res.redirect('/admin/settings');
  }
});

// POST /admin/settings/password
router.post('/settings/password', async (req, res) => {
  try {
    const { current_password, new_password, confirm_password } = req.body;

    if (!current_password || !new_password || !confirm_password) {
      req.session.flash = { type: 'error', message: 'Semua kolom password wajib diisi!' };
      return res.redirect('/admin/settings');
    }

    if (new_password !== confirm_password) {
      req.session.flash = { type: 'error', message: 'Konfirmasi password baru tidak cocok!' };
      return res.redirect('/admin/settings');
    }

    const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.session.userId]);
    if (!user || !bcrypt.compareSync(current_password, user.password_hash)) {
      req.session.flash = { type: 'error', message: 'Password saat ini salah!' };
      return res.redirect('/admin/settings');
    }

    const newHash = bcrypt.hashSync(new_password, 10);
    await run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.session.userId]);

    req.session.flash = { type: 'success', message: 'Password admin berhasil diganti!' };
    res.redirect('/admin/settings');
  } catch (err) {
    console.error(err);
    req.session.flash = { type: 'error', message: 'Gagal memperbarui password.' };
    res.redirect('/admin/settings');
  }
});

module.exports = router;
