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

app.post('/login', (req, res) => {
    const db = getDB();
    const user = db.users.find(u => u.username === req.body.username && u.password === req.body.password);
    if (user) {
        currentUser = user;
        const target = { manager: '/manager_dashboard.html', fieldassistant: '/field_assistant_dashboard.html' };
        res.redirect(target[user.role] || '/index.html');
    } else {
        res.send(`<script>alert("Login Failed"); window.location.href="/login.html";</script>`);
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
    res.send(`<script>alert("Report Transmitted!"); window.location.href="/field_assistant_dashboard.html";</script>`);
});

app.get('/api/user', (req, res) => res.json(currentUser || {}));
app.get('/api/reports', (req, res) => res.json(getDB().reports));

app.listen(PORT, () => console.log(`🚀 Server Live on Port ${PORT}`));