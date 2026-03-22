const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const app = express();

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');
const UPLOADS = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], reports: [] }));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS));
app.use(express.static(__dirname)); 

let currentUser = null;

const getDB = () => JSON.parse(fs.readFileSync(DB_FILE));
const saveDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// LOGIN ROUTE - FIXED FOR RENDER
app.post('/login', (req, res) => {
    const db = getDB();
    const { username, password } = req.body;
    
    const user = db.users.find(u => u.username === username && u.password === password);
    
    if (user) {
        currentUser = user;
        // Use relative paths so it works on any domain
        if (user.role === 'manager') return res.redirect('/manager_dashboard.html');
        if (user.role === 'fieldassistant') return res.redirect('/field_assistant_dashboard.html');
        res.redirect('/index.html');
    } else {
        res.send(`<script>alert("Invalid Login for ${username}"); window.location.href="/login.html";</script>`);
    }
});

app.post('/submit-report', upload.single('fieldPhoto'), (req, res) => {
    const db = getDB();
    db.reports.unshift({
        farmer: req.body.farmerName,
        village: req.body.village,
        text: req.body.observations,
        photo: req.file ? `/uploads/${req.file.filename}` : null,
        date: new Date().toLocaleString()
    });
    saveDB(db);
    res.redirect('/field_assistant_dashboard.html');
});

app.get('/api/user', (req, res) => res.json(currentUser || {}));
app.get('/api/reports', (req, res) => res.json(getDB().reports));

app.listen(PORT, () => console.log(`🚀 Live on port ${PORT}`));