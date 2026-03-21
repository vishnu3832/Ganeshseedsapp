const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());

const SECRET = "ganesh_secret_key";

/* ================== MONGODB ================== */
mongoose.connect("mongodb://127.0.0.1:27017/ganeshSeeds")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

/* ================== MODELS ================== */

// User
const User = mongoose.model("User", {
  username: String,
  password: String,
  role: String
});

// Product
const Product = mongoose.model("Product", {
  name: String,
  price: Number,
  image: String
});

// Order
const Order = mongoose.model("Order", {
  product: String,
  quantity: Number,
  username: String
});

/* ================== ROUTES ================== */

// Create Admin (run once)
app.get("/create-admin", async (req, res) => {
  const existing = await User.findOne({ username: "admin" });

  if (existing) return res.send("Admin already exists");

  const hashed = await bcrypt.hash("1234", 10);

  await User.create({
    username: "admin",
    password: hashed,
    role: "admin"
  });

  res.send("Admin created");
});
app.get("/delete-admin", async (req, res) => {
  try {
    await User.deleteOne({ username: "admin" });
    res.send("Admin deleted");
  } catch (err) {
    res.send("Error deleting admin");
  }
});
// Register
app.post("/register", async (req, res) => {
  const { username, password, role } = req.body;

  const existing = await User.findOne({ username });
  if (existing) return res.json({ message: "User exists" });

  const hashed = await bcrypt.hash(password, 10);

  await User.create({
    username,
    password: hashed,
    role
  });

  res.json({ message: "User registered" });
});

// Login
app.post("/login", async (req, res) => {
  const { username, password, role } = req.body;

  const user = await User.findOne({ username, role });
  if (!user) return res.json({ success: false });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.json({ success: false });

  const token = jwt.sign(
    { username: user.username, role: user.role },
    SECRET
  );

  res.json({
    success: true,
    token,
    username: user.username,
    role: user.role
  });
});

// Products
app.get("/products", async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

app.post("/products", async (req, res) => {
  const product = new Product(req.body);
  await product.save();
  res.json({ message: "Product added" });
});

// Orders
app.post("/order", async (req, res) => {
  const order = new Order(req.body);
  await order.save();
  res.json({ message: "Order placed" });
});

// Admin → all orders
app.get("/orders", async (req, res) => {
  const orders = await Order.find();
  res.json(orders);
});

// User → own orders
app.get("/my-orders/:username", async (req, res) => {
  const orders = await Order.find({ username: req.params.username });
  res.json(orders);
});

// Analytics
app.get("/stats", async (req, res) => {
  const users = await User.countDocuments();
  const products = await Product.countDocuments();
  const orders = await Order.countDocuments();

  res.json({ users, products, orders });
});

/* ================== SERVER ================== */

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});