const express = require('express');
const router = express.Router();
const { queryAll, queryOne, run, getSettings } = require('../data/db');
const { marked } = require('marked');

// Configure marked options
marked.setOptions({
  breaks: true,
  gfm: true
});

// Middleware to inject site settings into all public views
router.use(async (req, res, next) => {
  try {
    res.locals.settings = await getSettings();
    res.locals.currentPath = req.path;
    res.locals.isLoggedIn = !!req.session.userId;
    next();
  } catch (err) {
    next(err);
  }
});

// GET / - Home Page
router.get('/', async (req, res) => {
  try {
    const featuredProjects = await queryAll('SELECT * FROM projects WHERE featured = 1 ORDER BY id DESC LIMIT 4');
    const recentBlogs = await queryAll('SELECT * FROM blogs WHERE published = 1 ORDER BY id DESC LIMIT 2');
    const totalProjects = await queryOne('SELECT COUNT(*) as count FROM projects');

    // Parse skills from comma-separated string
    const rawSkills = res.locals.settings.skills || '';
    const skillsList = rawSkills.split(',').map(s => s.trim()).filter(Boolean);

    res.render('index', {
      title: 'Beranda',
      featuredProjects,
      recentBlogs,
      totalProjectsCount: totalProjects.count,
      skillsList,
      flash: req.session.flash || null
    });
    delete req.session.flash;
  } catch (err) {
    console.error(err);
    res.status(500).send('Terjadi kesalahan pada server');
  }
});

// GET /projects - Projects Showcase
router.get('/projects', async (req, res) => {
  try {
    const category = req.query.category;
    let projects;
    if (category && category !== 'Semua') {
      projects = await queryAll('SELECT * FROM projects WHERE category = ? ORDER BY id DESC', [category]);
    } else {
      projects = await queryAll('SELECT * FROM projects ORDER BY id DESC');
    }

    const categoriesRow = await queryAll('SELECT DISTINCT category FROM projects');
    const categories = ['Semua', ...categoriesRow.map(c => c.category)];

    res.render('projects', {
      title: 'Portofolio & Proyek',
      projects,
      categories,
      selectedCategory: category || 'Semua'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Terjadi kesalahan pada server');
  }
});

// GET /blog - Blog Listing
router.get('/blog', async (req, res) => {
  try {
    const tag = req.query.tag;
    let blogs;
    if (tag) {
      blogs = await queryAll('SELECT * FROM blogs WHERE published = 1 AND tags LIKE ? ORDER BY id DESC', [`%${tag}%`]);
    } else {
      blogs = await queryAll('SELECT * FROM blogs WHERE published = 1 ORDER BY id DESC');
    }

    res.render('blog-list', {
      title: 'Artikel & Blog',
      blogs,
      selectedTag: tag || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Terjadi kesalahan pada server');
  }
});

// GET /blog/:slug - Blog Detail
router.get('/blog/:slug', async (req, res) => {
  try {
    const blog = await queryOne('SELECT * FROM blogs WHERE slug = ? AND published = 1', [req.params.slug]);
    if (!blog) {
      return res.status(404).render('404', { title: 'Artikel Tidak Ditemukan' });
    }

    // Render markdown content to HTML
    const htmlContent = marked.parse(blog.content);

    // Get related blogs
    const relatedBlogs = await queryAll('SELECT * FROM blogs WHERE published = 1 AND id != ? ORDER BY id DESC LIMIT 2', [blog.id]);

    res.render('blog-detail', {
      title: blog.title,
      blog,
      htmlContent,
      relatedBlogs
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Terjadi kesalahan pada server');
  }
});

// GET /contact - Contact Page
router.get('/contact', (req, res) => {
  res.render('contact', {
    title: 'Hubungi Saya',
    flash: req.session.flash || null
  });
  delete req.session.flash;
});

// POST /contact - Process Contact Submission
router.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(400).json({ success: false, message: 'Harap isi semua kolom formulir!' });
      }
      req.session.flash = { type: 'error', message: 'Harap isi semua kolom formulir!' };
      return res.redirect('back');
    }

    await run(`
      INSERT INTO messages (name, email, subject, message)
      VALUES (?, ?, ?, ?)
    `, [name.trim(), email.trim(), subject.trim(), message.trim()]);

    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({ success: true, message: 'Terima kasih! Pesan Anda berhasil dikirim.' });
    }

    req.session.flash = { type: 'success', message: 'Terima kasih! Pesan Anda berhasil terkirim dan akan segera dibalas.' };
    res.redirect('/contact');
  } catch (err) {
    console.error('Error submitting contact form:', err);
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(500).json({ success: false, message: 'Gagal mengirim pesan. Silakan coba lagi.' });
    }
    req.session.flash = { type: 'error', message: 'Terjadi gangguan server. Silakan coba kembali.' };
    res.redirect('/contact');
  }
});

module.exports = router;
