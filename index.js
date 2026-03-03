// index.js
import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let products = [];
let cart = [];
let shippingPrice = 0;

// Load Products from Firebase
async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  try {
    const q = query(collection(db, "produits"), orderBy("dateAdded", "desc"));
    const snapshot = await getDocs(q);
    products = [];
    snapshot.forEach(doc => products.push({ id: doc.id, ...doc.data() }));
    displayProducts(products);
  } catch (error) {
    console.error("Erreur chargement produits:", error);
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px"><i class="fa-solid fa-triangle-exclamation" style="font-size:3rem;color:var(--warning);margin-bottom:16px"></i><p>Erreur de chargement</p></div>`;
  }
}

function displayProducts(list) {
  const grid = document.getElementById('productsGrid');
  if (list.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px"><i class="fa-solid fa-box-open" style="font-size:3rem;color:var(--text-light);margin-bottom:16px"></i><p>Aucun produit disponible</p></div>`;
    return;
  }
  grid.innerHTML = list.map(p => `
    <div class="product-card">
      <img src="${p.image}" alt="${p.name}" class="product-image" onerror="this.src='https://via.placeholder.com/300x200?text=Produit'">
      <div class="product-info">
        <div class="product-category">${p.category || 'Général'}</div>
        <h3 class="product-name">${p.name}</h3>
        <p class="product-description">${p.description || 'Pas de description'}</p>
        <div class="product-footer">
          <span class="product-price">${p.price.toFixed(2)} DA</span>
          <button class="add-to-cart" onclick="addToCart('${p.id}')"><i class="fa-solid fa-cart-plus"></i> Ajouter</button>
        </div>
      </div>
    </div>
  `).join('');
}

// Category Filters
document.getElementById('categoryFilters')?.addEventListener('click', (e) => {
  if (e.target.classList.contains('filter-btn')) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    const cat = e.target.dataset.category;
    displayProducts(cat === 'all' ? products : products.filter(p => p.category === cat));
  }
});

// Cart Functions
function loadCart() {
  const saved = localStorage.getItem('amarCart');
  if (saved) { cart = JSON.parse(saved); updateCartCount(); }
}
function saveCart() { localStorage.setItem('amarCart', JSON.stringify(cart)); updateCartCount(); }
function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById('cartCount').textContent = count;
}
function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  const existing = cart.find(item => item.id === productId);
  if (existing) existing.quantity++;
  else cart.push({ ...product, quantity: 1 });
  saveCart();
  showToast('✅ Produit ajouté au panier', 'success');
}
function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  displayCart();
}
function updateQuantity(productId, change) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.quantity += change;
  if (item.quantity <= 0) removeFromCart(productId);
  else { saveCart(); displayCart(); }
}
function openCart() { displayCart(); document.getElementById('cartModal').classList.add('active'); }
function closeCart() { document.getElementById('cartModal').classList.remove('active'); }

function displayCart() {
  const container = document.getElementById('cartItems');
  const checkoutBtn = document.getElementById('checkoutBtn');
  if (cart.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--text-light);padding:40px 0">Votre panier est vide</p>';
    document.getElementById('cartTotal').textContent = '0.00';
    checkoutBtn.disabled = true;
    checkoutBtn.style.opacity = '0.5';
    return;
  }
  checkoutBtn.disabled = false;
  checkoutBtn.style.opacity = '1';
  let total = 0;
  container.innerHTML = cart.map(item => {
    total += item.price * item.quantity;
    return `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}" class="cart-item-image" onerror="this.src='https://via.placeholder.com/60?text=Produit'">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${item.price.toFixed(2)} DA</div>
          <div class="cart-item-quantity">
            <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
            <span>${item.quantity}</span>
            <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
            <button class="qty-btn" style="color:var(--danger);border-color:var(--danger)" onclick="removeFromCart('${item.id}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
        <div style="font-weight:600">${(item.price * item.quantity).toFixed(2)} DA</div>
      </div>`;
  }).join('');
  document.getElementById('cartTotal').textContent = total.toFixed(2);
}
function getCartTotal() { return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0); }

// Checkout
function openCheckout() {
  if (cart.length === 0) { showToast('Votre panier est vide', 'error'); return; }
  closeCart();
  loadWilayas();
  document.getElementById('checkoutModal').classList.add('active');
}
function closeCheckout() { document.getElementById('checkoutModal').classList.remove('active'); }
function updateShipping() {
  const type = document.getElementById('orderType').value;
  const info = document.getElementById('shippingInfo');
  if (type === 'domicile') { shippingPrice = 500; info.style.display = 'block'; }
  else if (type === 'stopdesk') { shippingPrice = 0; info.style.display = 'block'; }
  else { info.style.display = 'none'; return; }
  const total = getCartTotal() + shippingPrice;
  document.getElementById('shippingPrice').textContent = shippingPrice.toFixed(2) + ' DA';
  document.getElementById('grandTotal').textContent = total.toFixed(2) + ' DA';
}

// Wilayas & Communes
const wilayasData = {
  "16": ["Alger Centre", "Sidi M'Hamed", "El Madania", "Belouizdad", "Bab El Oued", "Bouzareah", "Birkhadem", "El Harrach", "Baraki", "Oued Smar", "Bachdjerrah", "Hussein Dey", "Kouba", "Bab Ezzouar", "Ben Aknoun", "Dely Ibrahim", "El Biar", "Hydra", "El Mouradia", "Bordj El Kiffan", "Rouïba", "Reghaïa", "Zeralda", "Cheraga"],
  "31": ["Oran", "Es Senia", "Bir El Djir", "Arzew", "Bethioua", "Mers El Kébir", "Aïn Turk", "El Ançor", "Misserghin", "Boutlelis"],
  "19": ["Sétif", "El Eulma", "Aïn Oulmene", "Béni Ourtilane", "Babor"],
  "15": ["Tizi Ouzou", "Draâ Ben Khedda", "Azazga", "Boghni", "Tigzirt"]
};
function loadWilayas() {
  const select = document.getElementById('wilaya');
  select.innerHTML = '<option value="">Sélectionner une wilaya</option>';
  Object.keys(wilayasData).forEach(code => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = `Wilaya ${code}`;
    select.appendChild(opt);
  });
}
function updateCommunes() {
  const code = document.getElementById('wilaya').value;
  const communeSelect = document.getElementById('commune');
  communeSelect.innerHTML = '<option value="">Sélectionner une commune</option>';
  if (code && wilayasData[code]) {
    wilayasData[code].forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      communeSelect.appendChild(opt);
    });
  }
}

// Submit Order to Firebase
async function submitOrder() {
  const form = document.getElementById('checkoutForm');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  
  const orderData = {
    orderType: document.getElementById('orderType').value,
    firstName: document.getElementById('firstName').value.trim(),
    lastName: document.getElementById('lastName').value.trim(),
    phone1: document.getElementById('phone1').value.trim(),
    phone2: document.getElementById('phone2').value.trim(),
    wilaya: document.getElementById('wilaya').value,
    commune: document.getElementById('commune').value,
    cartItems: cart,
    cartTotal: getCartTotal(),
    shippingPrice: shippingPrice,
    grandTotal: getCartTotal() + shippingPrice,
    status: 'pending',
    date: new Date().toISOString(),
    orderNumber: 'CMD-' + Date.now().toString().slice(-6)
  };
  
  try {
    await addDoc(collection(db, "commandes"), orderData);
    document.getElementById('orderNumberDisplay').textContent = orderData.orderNumber;
    document.getElementById('checkoutModal').classList.remove('active');
    document.getElementById('successModal').classList.add('active');
    cart = [];
    saveCart();
    showToast('✅ Commande créée avec succès!', 'success');
  } catch (error) {
    console.error("Erreur commande:", error);
    showToast('❌ Erreur lors de la commande', 'error');
  }
}
function continueShopping() { document.getElementById('successModal').classList.remove('active'); }

// Toast Notification
function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// Init
document.addEventListener('DOMContentLoaded', () => { loadProducts(); loadCart(); });
