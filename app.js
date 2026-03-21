let currentUser = "";
let role = "";

// LOGIN
async function login() {
  let username = document.getElementById("username").value;
  let password = document.getElementById("password").value;
  role = document.getElementById("roleSelect").value;

  let res = await fetch("http://localhost:5000/login", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ username, password, role })
  });

  let data = await res.json();

  if (data.success) {
    currentUser = data.username;

    document.getElementById("login").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");

    loadDashboard();
  } else {
    alert("Invalid login");
  }
}

// LOGOUT
function logout() {
  location.reload();
}

// DASHBOARD
function loadDashboard() {
  let f = document.getElementById("features");

  if (role === "admin") {
    f.innerHTML = `
      <button onclick="loadProducts()">📦 Products</button>
      <button onclick="addProduct()">➕ Add</button>
      <button onclick="viewOrders()">📋 Orders</button>
      <button onclick="viewStats()">📊 Stats</button>
      <button onclick="registerUser()">👥 Add User</button>
    `;
  } else if (role === "staff") {
    f.innerHTML = `
      <button onclick="loadProducts()">📦 Products</button>
      <button onclick="placeOrder()">🛒 Order</button>
      <button onclick="myOrders()">📄 My Orders</button>
    `;
  } else {
    f.innerHTML = `
      <button onclick="loadProducts()">📦 Products</button>
      <button onclick="myOrders()">📄 My Orders</button>
    `;
  }
}

// LOAD PRODUCTS
async function loadProducts() {
  let res = await fetch("http://localhost:5000/products");
  let data = await res.json();

  let html = "";
  data.forEach(p => {
    html += `
      <div class="product">
        <img src="${p.image}">
        <div>
          <b>${p.name}</b><br>
          ₹${p.price}
        </div>
      </div>
    `;
  });

  document.getElementById("features").innerHTML = html;
}