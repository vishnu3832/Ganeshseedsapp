const express = require('express');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const fs = require('fs');
const app = express();

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

// --- CLOUDINARY CONFIGURATION ---
cloudinary.config({ 
  cloud_name: 'dkrdr3gze', 
  api_key: '933238831795591', 
  api_secret: 'jj95TYp2E7epFhWtOiNYBf5d0Yo' 
});

// --- CLOUD STORAGE SETUP ---
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ganesh_seeds_reports',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});
const upload = multer({ storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Database Helper Functions
const getDB = () => {
    if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], reports: [] }));
    return JSON.parse(fs.readFileSync(DB_FILE));
};
const saveDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

let currentUser = null;

// --- ROUTES ---

// Registration (Supports Cloud Photo)
app.post('/register', upload.single('userPhoto'), (req, res) => {
    const db = getDB();
    db.users.push({
        username: req.body.fullname,
        role: req.body.role,
        password: req.body.password,
        photo: req.file ? req.file.path : null // Cloud URL
    });
    saveDB(db);
    res.send(`<script>alert("Staff Onboarded!"); window.location.href="/login.html";</script>`);
});

// Login
app.post('/login', (req, res) => {
    const db = getDB();
    const { username, password } = req.body;
    const user = db.users.find(u => u.username === username && u.password === password);
    
    if (user) {
        currentUser = user;
        if (user.role === 'manager') return res.redirect('/manager_dashboard.html');
        if (user.role === 'fieldassistant') return res.redirect('/field_assistant_dashboard.html');
        res.redirect('/index.html');
    } else {
        res.send(`<script>alert("Login Failed for ${username}"); window.location.href="/login.html";</script>`);
    }
});

// Submit Report (Sends Photo to Cloudinary)
app.post('/submit-report', upload.single('fieldPhoto'), (req, res) => {
    const db = getDB();
    db.reports.unshift({
        farmer: req.body.farmerName,
        village: req.body.village,
        text: req.body.observations,
        photo: req.file ? req.file.path : null, // The permanent Cloud link
        date: new Date().toLocaleString()
    });
    saveDB(db);
    res.send(`<script>alert("Report Transmitted to Cloud!"); window.location.href="/field_assistant_dashboard.html";</script>`);
});

app.get('/api/user', (req, res) => res.json(currentUser || {}));
app.get('/api/reports', (req, res) => res.json(getDB().reports));

app.listen(PORT, () => console.log(`🚀 Live Cloud Server on Port ${PORT}`));