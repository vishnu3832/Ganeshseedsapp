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
    folder: 'ganesh_seeds_erp',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});
const upload = multer({ storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Database initialization
const getDB = () => {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], reports: [] }));
    }
    return JSON.parse(fs.readFileSync(DB_FILE));
};
const saveDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// Global variable to keep track of who is logged in
let currentUser = null;

// --- ROUTES ---

// 1. Register Staff (CEO or Assistants)
app.post('/register', upload.single('userPhoto'), (req, res) => {
    const db = getDB();
    const newUser = {
        username: req.body.fullname,
        role: req.body.role,
        password: req.body.password,
        photo: req.file ? req.file.path : 'https://via.placeholder.com/150' 
    };
    db.users.push(newUser);
    saveDB(db);
    res.send(`<script>alert("Staff Registered Successfully!"); window.location.href="/login.html";</script>`);
});

// 2. Login
app.post('/login', (req, res) => {
    const db = getDB();
    const { username, password } = req.body;
    const user = db.users.find(u => u.username === username && u.password === password);
    
    if (user) {
        currentUser = user; // Remember the session
        if (user.role === 'manager') return res.redirect('/manager_dashboard.html');
        if (user.role === 'fieldassistant') return res.redirect('/field_assistant_dashboard.html');
        res.redirect('/index.html');
    } else {
        res.send(`<script>alert("Login Failed. Check Username/Password"); window.location.href="/login.html";</script>`);
    }
});

// 3. Submit Field Report
app.post('/submit-report', upload.single('fieldPhoto'), (req, res) => {
    const db = getDB();
    const newReport = {
        farmer: req.body.farmerName,
        village: req.body.village,
        text: req.body.observations,
        photo: req.file ? req.file.path : null, // Permanent Cloud Link
        date: new Date().toLocaleString(),
        submittedBy: currentUser ? currentUser.username : "Assistant"
    };
    db.reports.unshift(newReport);
    saveDB(db);
    res.send(`<script>alert("Report sent to CEO!"); window.location.href="/field_assistant_dashboard.html";</script>`);
});

// 4. API for Dashboards
app.get('/api/user', (req, res) => {
    res.json(currentUser || { username: "Guest", photo: "https://via.placeholder.com/150" });
});

app.get('/api/reports', (req, res) => {
    const db = getDB();
    res.json(db.reports);
});

// 5. Logout
app.get('/logout', (req, res) => {
    currentUser = null;
    res.redirect('/login.html');
});

app.listen(PORT, () => console.log(`🚀 Ganesh Seeds Live on Port ${PORT}`));