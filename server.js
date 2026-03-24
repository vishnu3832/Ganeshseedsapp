/**
 * GANESH SEEDS ERP - CORE SERVER
 * Version: 3.0.0 (Cloud-Native)
 * Features: MongoDB Persistence, Cloudinary Image Vault, Role-Based Access
 */

const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const compression = require('compression');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. PERMANENT DATABASE CONNECTION ---
// Replace 'your_password' with the password you created in MongoDB Atlas
const MONGO_URI = "mongodb+srv://dkrdr3gze:your_password@cluster0.xxxx.mongodb.net/ganesh_seeds?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log("--------------------------------------------");
        console.log("✅ GANESH SEEDS DATABASE: CONNECTED");
        console.log("--------------------------------------------");
    })
    .catch(err => {
        console.error("❌ DATABASE CONNECTION ERROR:", err.message);
    });

// --- 2. ADVANCED DATA SCHEMAS ---
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    role: { type: String, enum: ['manager', 'fieldassistant', 'admin'], default: 'fieldassistant' },
    password: { type: String, required: true },
    photo: { type: String, default: 'https://via.placeholder.com/150' },
    createdAt: { type: Date, default: Date.now }
});

const ReportSchema = new mongoose.Schema({
    farmer: { type: String, required: true },
    village: { type: String, required: true },
    text: { type: String },
    photo: { type: String },
    submittedBy: { type: String },
    status: { type: String, default: 'Pending Review' },
    date: { type: String, default: () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) }
});

const User = mongoose.model('User', UserSchema);
const Report = mongoose.model('Report', ReportSchema);

// --- 3. CLOUDINARY PERMANENT STORAGE CONFIG ---
cloudinary.config({ 
  cloud_name: 'dkrdr3gze', 
  api_key: '933238831795591', 
  api_secret: 'jj95TYp2E7epFhWtOiNYBf5d0Yo' 
});

const cloudStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ganesh_seeds_erp_production',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
  },
});

const upload = multer({ 
    storage: cloudStorage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB Limit
});

// --- 4. MIDDLEWARE STACK ---
app.use(compression()); // Makes the app load faster
app.use(morgan('dev')); // Logs every request for debugging
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname))); 

// Global session simulation (In production, use express-session)
let globalSessionUser = null;

// --- 5. ENTERPRISE ROUTES ---

/**
 * @route   POST /register
 * @desc    Onboards new staff with permanent Cloudinary profile photos
 */
app.post('/register', upload.single('userPhoto'), async (req, res) => {
    try {
        console.log(`Attempting to register: ${req.body.fullname}`);
        
        const existingUser = await User.findOne({ username: req.body.fullname });
        if (existingUser) {
            return res.send(`<script>alert("Username already exists!"); window.history.back();</script>`);
        }

        const newUser = new User({
            username: req.body.fullname,
            role: req.body.role,
            password: req.body.password, // In a real app, hash this with bcrypt
            photo: req.file ? req.file.path : 'https://via.placeholder.com/150'
        });

        await newUser.save();
        console.log(`✅ User ${req.body.fullname} saved to MongoDB`);
        res.send(`<script>alert("Staff Onboarding Successful!"); window.location.href="/login.html";</script>`);
    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).send("Critical error during staff registration.");
    }
});

/**
 * @route   POST /login
 * @desc    Authenticates users and routes them to their specific dashboards
 */
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, password });

        if (user) {
            globalSessionUser = user;
            console.log(`🔑 ${user.username} logged in as ${user.role}`);
            
            // Strategic Redirection Logic
            if (user.role === 'manager' || user.username.includes('Gangadhar')) {
                return res.redirect('/index.html'); // CEO Dashboard
            } else if (user.role === 'fieldassistant') {
                return res.redirect('/field_assistant_dashboard.html');
            }
            res.redirect('/index.html');
        } else {
            res.send(`<script>alert("Invalid Credentials. Please try again."); window.location.href="/login.html";</script>`);
        }
    } catch (error) {
        res.status(500).send("Server error during authentication.");
    }
});

/**
 * @route   POST /submit-report
 * @desc    Receives field reports and saves images to Cloudinary
 */
app.post('/submit-report', upload.single('fieldPhoto'), async (req, res) => {
    try {
        if (!globalSessionUser) {
            return res.send(`<script>alert("Session expired. Please login again."); window.location.href="/login.html";</script>`);
        }

        const newReport = new Report({
            farmer: req.body.farmerName,
            village: req.body.village,
            text: req.body.observations,
            photo: req.file ? req.file.path : null,
            submittedBy: globalSessionUser.username
        });

        await newReport.save();
        console.log(`📄 New report from ${req.body.village} received`);
        res.send(`<script>alert("Data synced to CEO Dashboard!"); window.location.href="/field_assistant_dashboard.html";</script>`);
    } catch (error) {
        console.error("Report Error:", error);
        res.status(500).send("Failed to sync field report.");
    }
});

/**
 * @route   GET /api/user
 * @desc    Returns current logged-in user profile data
 */
app.get('/api/user', (req, res) => {
    if (globalSessionUser) {
        res.json(globalSessionUser);
    } else {
        res.json({ username: "Guest", photo: "https://via.placeholder.com/150", role: "none" });
    }
});

/**
 * @route   GET /api/reports
 * @desc    Fetches all reports from MongoDB, newest first
 */
app.get('/api/reports', async (req, res) => {
    try {
        const reports = await Report.find().sort({ _id: -1 }).limit(50);
        res.json(reports);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch reports" });
    }
});

/**
 * @route   GET /logout
 * @desc    Clears the current session
 */
app.get('/logout', (req, res) => {
    globalSessionUser = null;
    res.redirect('/login.html');
});

// --- 6. ERROR HANDLING & STARTUP ---

// Catch-all for 404
app.use((req, res) => {
    res.status(404).send("<h1>404 - Ganesh Seeds Portal Error</h1><p>The page you are looking for does not exist.</p>");
});

app.listen(PORT, () => {
    console.log(`
    ============================================
    🚀 GANESH SEEDS ERP IS LIVE
    PORT: ${PORT}
    ENV: PRODUCTION
    URL: https://ganeshseedsapp.onrender.com
    ============================================
    `);
});