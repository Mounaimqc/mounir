// ========== IMPORT FIREBASE ==========
import { collection, getDocs, addDoc, query, doc, updateDoc, getDoc, orderBy }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from './firebase-config.js';

// ========== VARIABLES GLOBALES ==========
let products = [];
let cart = [];
let currentProductId = null;

// ========== PLACEHOLDER IMAGE (SVG Inline) ==========
const PLACEHOLDER_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect fill='%23f3f4f6' width='300' height='200'/%3E%3Ccircle cx='150' cy='80' r='40' fill='%23d1d5db'/%3E%3Crect x='60' y='140' width='180' height='20' rx='10' fill='%23d1d5db'/%3E%3Ctext x='50%25' y='185' font-family='Arial' font-size='12' fill='%236b7280' text-anchor='middle'%3EImage non disponible%3C/text%3E%3C/svg%3E`;

// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', function () {
  console.log("🚀 Application démarrée...");
  loadProductsFromFirebase();
  setupEventListeners();
  loadCartFromStorage();

  // Modal Add to Cart Button
  const modalBtn = document.getElementById('modalAddToCartBtn');
  if (modalBtn) {
    modalBtn.addEventListener('click', () => {
      if (currentProductId) {
        addToCart(currentProductId);
        document.getElementById('productDetailModal').classList.remove('active');
      }
    });
  }
});

// ========== CHARGER LES PRODUITS DEPUIS FIREBASE ==========
async function loadProductsFromFirebase() {
  const grid = document.getElementById('productsGrid');
  if (!grid) {
    console.error("❌ productsGrid non trouvé dans le HTML");
    return;
  }

  grid.innerHTML = `
    <div style="text-align:center; padding:60px; color:#6b7280; grid-column:1/-1;">
      <i class="fa-solid fa-circle-notch fa-spin" style="font-size:2rem;"></i>
      <p style="margin-top:16px;">Chargement des produits...</p>
    </div>`;

  try {
    console.log("📦 Chargement des produits depuis Firebase...");

    // ✅ CORRECT : Pas d'espaces dans le nom de collection
    const productsRef = collection(db, "produits");
    const productsQuery = query(productsRef, orderBy("dateAdded", "desc"));
    const querySnapshot = await getDocs(productsQuery);

    products = [];
    querySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      console.log("📄 Produit trouvé:", docSnap.id, data);
      products.push({
        id: docSnap.id,
        name: data.name || 'Produit sans nom',
        price: parseFloat(data.price) || 0,
        category: data.category || 'Autre',
        description: data.description || '',
        image: data.image || '',
        quantity: parseInt(data.quantity) || 0,
        dateAdded: data.dateAdded
      });
    });

    console.log(`✅ ${products.length} produits chargés`);

    if (products.length === 0) {
      console.warn("⚠️ Aucun produit trouvé dans la base de données!");
      grid.innerHTML = `
        <div style="text-align:center; padding:60px; color:#e74c3c; grid-column:1/-1;">
          <i class="fa-solid fa-box-open" style="font-size:3rem; margin-bottom:16px;"></i>
          <p>Aucun produit disponible pour le moment.</p>
          <p style="font-size:0.875rem; margin-top:8px;">Veuillez contacter l'administrateur ou ajouter des produits via le panel admin.</p>
        </div>`;
    } else {
      loadProducts(products);
    }
  } catch (error) {
    console.error("❌ Erreur chargement produits:", error);
    grid.innerHTML = `
      <div style="text-align:center; padding:60px; color:#ef4444; grid-column:1/-1;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size:3rem; margin-bottom:16px;"></i>
        <p>Erreur de chargement des produits.</p>
        <p style="font-size:0.875rem; margin-top:8px;">${error.message}</p>
      </div>`;
  }
}
// ========== AFFICHAGE DES PRODUITS ==========
function loadProducts(productsToDisplay) {
  const grid = document.getElementById('productsGrid');
  if (!grid) {
    console.error("❌ productsGrid non trouvé");
    return;
  }

  if (!productsToDisplay || productsToDisplay.length === 0) {
    grid.innerHTML = `
      <div style="text-align:center; padding:60px; color:#6b7280; grid-column:1/-1;">
        <i class="fa-solid fa-search" style="font-size:3rem; margin-bottom:16px;"></i>
        <p>Aucun produit trouvé.</p>
      </div>`;
    return;
  }

  grid.innerHTML = '';

  productsToDisplay.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    // REMOVED: Inline styles that override CSS classes

    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('add-to-cart-btn')) return;
      openProductDetail(product.id);
    });

    // Image
    const img = document.createElement('img');
    img.src = (product.image && product.image.trim()) ? product.image : 'https://via.placeholder.com/300x200?text=Produit';
    img.alt = product.name;
    img.className = 'product-image';
    // REMOVED: Inline height/background to allow CSS control
    img.onerror = function () {
      this.src = PLACEHOLDER_SVG;
      this.style.objectFit = 'contain';
    };
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      openProductDetail(product.id);
    });

    // Informations
    const info = document.createElement('div');
    info.className = 'product-info';
    // REMOVED: Inline padding to allow CSS control

    const shortDesc = truncateDescription(product.description || '', 50);
    const quantity = product.quantity || 0;
    const quantityHTML = quantity > 0
      ? `<span class="product-quantity">${quantity} en stock</span>`
      : `<span class="product-quantity out-of-stock">Rupture de stock</span>`;

    info.innerHTML = `
      <h3 class="product-name" style="font-size:1.1rem; font-family:'Montserrat', sans-serif; font-weight:700; margin-bottom:8px; color:var(--gb-white); text-transform:uppercase;">${product.name}</h3>
      <p class="product-category" style="font-size:0.75rem; color:var(--gb-gold); text-transform:uppercase; font-weight:700; margin-bottom:8px; letter-spacing:1px;">${product.category}</p>
      <p class="product-description" style="font-size:0.875rem; color:var(--gb-light-grey); margin-bottom:16px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${shortDesc}</p>
      ${quantityHTML}
      <div class="product-footer">
        <span class="product-price">${product.price.toFixed(2)} DA</span>
        <button class="add-to-cart-btn" data-product-id="${product.id}" 
          ${quantity <= 0 ? 'disabled' : ''}>
          ${quantity > 0 ? `<i class="fa-solid fa-cart-plus"></i> Ajouter` : 'Indisponible'}
        </button>
      </div>
    `;

    // Button hover effects are handled by CSS

    card.appendChild(img);
    card.appendChild(info);
    grid.appendChild(card);
  });

  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const productId = btn.getAttribute('data-product-id');
      addToCart(productId);
    });
  });

  console.log(`✅ ${productsToDisplay.length} produits affichés`);
}

// ========== UTILITAIRE: TRONQUER DESCRIPTION ==========
function truncateDescription(description, maxLength) {
  if (!description) return '';
  description = description.trim();
  if (description.length <= maxLength) return description;
  const trimmed = description.substring(0, maxLength);
  const lastSpace = trimmed.lastIndexOf(' ');
  return lastSpace > 0 ? trimmed.substring(0, lastSpace) + '...' : trimmed + '...';
}

function openProductDetail(productId) {
  window.location.href = `produit.html?id=${productId}`;
}

// ========== ANCIEN MODAL DÉTAIL PRODUIT (DÉSACTIVÉ) ==========
function oldOpenProductDetail(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) {
    console.error("❌ Produit non trouvé:", productId);
    return;
  }

  currentProductId = productId;

  const detailImage = document.getElementById('detailImage');
  if (detailImage) {
    detailImage.src = (product.image && product.image.trim()) ? product.image : PLACEHOLDER_SVG;
    detailImage.style.cssText = 'width:100%; max-height:300px; object-fit:contain; margin-bottom:16px; border-radius:8px; background:#f3f4f6;';
  }

  const detailName = document.getElementById('detailName');
  if (detailName) detailName.textContent = product.name;

  const detailCategory = document.getElementById('detailCategory');
  if (detailCategory) detailCategory.textContent = product.category;

  const quantity = product.quantity || 0;
  const quantityText = quantity > 0
    ? `<span style="color:#10b981; font-weight:bold;">${quantity} en stock</span>`
    : `<span style="color:#f59e0b; font-weight:bold;">Rupture de stock</span>`;

  const detailDescription = document.getElementById('detailDescription');
  if (detailDescription) {
    const description = product.description || 'Pas de description disponible.';
    detailDescription.innerHTML = `
      <strong>Description:</strong><br>
      <span style="font-size:16px; line-height:1.6; color:#34495e;">${description.replace(/\n/g, '<br>')}</span><br><br>
      <strong>Quantité:</strong><br>${quantityText}
    `;
  }

  const detailPrice = document.getElementById('detailPrice');
  if (detailPrice) detailPrice.textContent = product.price.toFixed(2);

  const modal = document.getElementById('productDetailModal');
  if (modal) modal.classList.add('active');

  console.log(`📦 Détails du produit "${product.name}" affichés`);
}

// ========== FONCTIONS DU PANIER ==========
function addToCart(productId, flavorName = null) {
  const product = products.find(p => p.id === productId);
  if (!product) {
    console.error("❌ Produit non trouvé:", productId);
    return;
  }

  const quantity = product.quantity || 0;
  if (quantity <= 0) {
    showNotification('Produit indisponible - rupture de stock!', 'error');
    return;
  }

  // Generate a unique ID for the cart item combining productId and flavor
  const cartItemId = flavorName ? `${productId}_${flavorName}` : productId;

  const existingItem = cart.find(item => item.cartItemId === cartItemId);
  if (existingItem) {
    if (existingItem.quantity >= quantity) {
      showNotification('Quantité maximale atteinte!', 'error');
      return;
    }
    existingItem.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1, flavor: flavorName, cartItemId: cartItemId });
  }

  saveCartToStorage();
  updateCartCount();
  showNotification(`${product.name} ${flavorName ? `(${flavorName}) ` : ''}ajouté au panier!`, 'success');
}

function updateCartQuantity(cartItemId, change) {
  const item = cart.find(i => (i.cartItemId || i.id) === cartItemId);
  if (!item) return;

  item.quantity += change;
  if (item.quantity <= 0) {
    removeCartItem(cartItemId);
  } else {
    const product = products.find(p => p.id === item.id);
    const maxQuantity = product?.quantity || 0;
    if (item.quantity > maxQuantity) {
      item.quantity = maxQuantity;
      showNotification('Quantité maximale atteinte!', 'error');
    }
    saveCartToStorage();
    displayCart();
  }
}

function removeCartItem(cartItemId) {
  cart = cart.filter(item => (item.cartItemId || item.id) !== cartItemId);
  saveCartToStorage();
  updateCartCount();
  displayCart();
}

function displayCart() {
  const cartItems = document.getElementById('cartItems');
  if (!cartItems) return;

  let total = 0;
  if (cart.length === 0) {
    cartItems.innerHTML = `<p style="text-align:center; color:#6b7280; padding:40px 0;">Votre panier est vide</p>`;
    const totalPrice = document.getElementById('totalPrice');
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (totalPrice) totalPrice.textContent = '0.00';
    if (checkoutBtn) checkoutBtn.disabled = true;
    return;
  }

  cartItems.innerHTML = '';
  cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;

    // Fallback if old cart items don't have cartItemId
    const currentCartItemId = item.cartItemId || item.id;

    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item';
    cartItem.style.cssText = 'display:flex; gap:16px; padding:16px 0; border-bottom:1px solid #e5e7eb;';
    cartItem.innerHTML = `
      <div class="cart-item-info" style="flex:1;">
        <div class="cart-item-name" style="font-weight:500; margin-bottom:4px;">
          ${item.name} 
          ${item.flavor ? `<span style="font-size:0.75rem;color:var(--gb-gold);padding:2px 6px;background:rgba(212,175,55,0.1);border-radius:4px;margin-left:6px;">${item.flavor}</span>` : ''}
        </div>
        <div class="cart-item-price" style="color:#6b7280; font-size:0.875rem;">${item.price.toFixed(2)} DA × ${item.quantity} = ${itemTotal.toFixed(2)} DA</div>
      </div>
      <div class="cart-item-quantity" style="display:flex; align-items:center; gap:8px;">
        <button class="quantity-btn" onclick="window.updateCartQuantity('${currentCartItemId}', -1)" style="width:28px; height:28px; border:1px solid #e5e7eb; background:#fff; border-radius:6px; cursor:pointer;">-</button>
        <span>${item.quantity}</span>
        <button class="quantity-btn" onclick="window.updateCartQuantity('${currentCartItemId}', 1)" style="width:28px; height:28px; border:1px solid #e5e7eb; background:#fff; border-radius:6px; cursor:pointer;">+</button>
      </div>
      <button class="remove-btn" onclick="window.removeCartItem('${currentCartItemId}')" style="background:#f59e0b; color:#fff; border:none; padding:4px 12px; border-radius:4px; cursor:pointer; font-size:0.75rem;">Supprimer</button>
    `;
    cartItems.appendChild(cartItem);
  });

  const totalPrice = document.getElementById('totalPrice');
  const checkoutBtn = document.getElementById('checkoutBtn');
  if (totalPrice) totalPrice.textContent = total.toFixed(2);
  if (checkoutBtn) checkoutBtn.disabled = false;
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById('cartCount');
  if (badge) badge.textContent = count;
}

function saveCartToStorage() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
  const saved = localStorage.getItem('cart');
  if (saved) {
    try {
      cart = JSON.parse(saved);
      updateCartCount();
    } catch (e) {
      console.error("Erreur chargement panier:", e);
      cart = [];
    }
  }
}

// ========== ÉVÉNEMENTS ==========
function setupEventListeners() {
  const cartBtn = document.getElementById('cartBtn');
  const cartModal = document.getElementById('cartModal');
  const closeButtons = document.querySelectorAll('.close-modal');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const searchInput = document.getElementById('searchInput');
  const filterBtns = document.querySelectorAll('.filter-btn');

  if (cartBtn && cartModal) {
    cartBtn.addEventListener('click', () => {
      cartModal.classList.add('active');
      displayCart();
    });
  }

  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      if (modal) modal.classList.remove('active');
    });
  });

  window.addEventListener('click', (e) => {
    document.querySelectorAll('.modal').forEach(modal => {
      if (e.target === modal) modal.classList.remove('active');
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
    }
  });

  if (checkoutBtn && cartModal) {
    checkoutBtn.addEventListener('click', () => {
      if (cart.length > 0) {
        cartModal.classList.remove('active');
        openOrderForm();
      }
    });
  }

  if (searchInput) searchInput.addEventListener('input', filterProducts);

  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Retirer active de tous
      filterBtns.forEach(b => b.classList.remove('active'));
      // Ajouter au cliqué
      e.target.classList.add('active');
      filterProducts();
    });
  });
}

function filterProducts() {
  const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const activeBtn = document.querySelector('.filter-btn.active');
  const selectedCategory = activeBtn ? activeBtn.getAttribute('data-category') : 'all';

  const filtered = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm) ||
      (product.description && product.description.toLowerCase().includes(searchTerm));

    // Le bouton 'all' montre tout
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  loadProducts(filtered);
}

// ========== FORMULAIRE DE COMMANDE ==========
function generateOrderNumber() {
  const now = new Date();
  const datePart = now.toISOString().slice(2, 10).replace(/-/g, '');
  let count = localStorage.getItem('orderCount') || '0';
  count = String(parseInt(count) + 1).padStart(3, '0');
  localStorage.setItem('orderCount', count);
  return `AM${datePart}${count}`;
}

function openOrderForm() {
  const modal = document.getElementById('orderFormModal');
  if (modal) {
    modal.classList.add('active');
    initializeWilayaSelect();
  }
}

function closeOrderForm() {
  const modal = document.getElementById('orderFormModal');
  if (modal) modal.classList.remove('active');
}

function initializeWilayaSelect() {
  const select = document.getElementById('wilaya');
  if (!select) return;

  select.innerHTML = '<option value="">Sélectionner une wilaya</option>';
  Object.keys(wilayasData).forEach(wilaya => {
    const opt = document.createElement('option');
    opt.value = wilaya;
    opt.textContent = wilaya;
    select.appendChild(opt);
  });
}

function updateShippingPrice() {
  const type = document.getElementById('orderType')?.value;
  const wilaya = document.getElementById('wilaya')?.value;
  const priceEl = document.getElementById('shippingPrice');
  const info = document.querySelector('.shipping-info');

  if (!type || !wilaya || !priceEl) return;

  let price = 0;
  if (type === 'domicile') price = shippingPrices[wilaya] || 0;
  else if (type === 'stopdesk') price = stopDeskPrices[wilaya] || 0;

  priceEl.textContent = price + ' DA';
  if (info) info.classList.add('active');

  const cartTotal = parseFloat(document.getElementById('totalPrice')?.textContent || '0');
  const grandTotalEl = document.getElementById('grandTotal');
  if (grandTotalEl) grandTotalEl.textContent = (cartTotal + price).toFixed(2) + ' DA';
}

// ========== DONNÉES WILAYAS & PRIX ==========
const wilayasData = {
  "16 - Alger": ["Alger Centre", "Bab El Oued", "Hydra", "El Biar", "Bouzareah", "Birkhadem", "Kouba", "Bab Ezzouar"],
  "31 - Oran": ["Oran", "Es Senia", "Bir El Djir", "Arzew", "Misserghin"],
  "19 - Sétif": ["Sétif", "El Eulma", "Aïn Oulmene", "Béni Ourtilane"],
  "15 - Tizi Ouzou": ["Tizi Ouzou", "Draâ Ben Khedda", "Azazga", "Boghni"],
  "25 - Constantine": ["Constantine", "El Khroub", "Hamma Bouziane", "Aïn Smara"],
  "09 - Blida": ["Blida", "Boufarik", "Oued El Alleug", "Mouzaia"]
};

const shippingPrices = {
  "16 - Alger": 600, "31 - Oran": 700, "19 - Sétif": 550,
  "15 - Tizi Ouzou": 700, "25 - Constantine": 650, "09 - Blida": 700
};

const stopDeskPrices = {
  "16 - Alger": 400, "31 - Oran": 500, "19 - Sétif": 400,
  "15 - Tizi Ouzou": 500, "25 - Constantine": 450, "09 - Blida": 500
};

// ========== SOUMISSION COMMANDE ==========
async function submitOrderForm() {
  const form = document.getElementById('orderForm');
  if (!form) return;

  const orderType = form.orderType?.value;
  const wilaya = form.wilaya?.value;
  const commune = form.commune?.value;

  if (!orderType || !wilaya || !commune) {
    showNotification("Veuillez remplir tous les champs obligatoires.", 'error');
    return;
  }

  let shippingPrice = 0;
  if (orderType === 'domicile') shippingPrice = shippingPrices[wilaya] || 0;
  else if (orderType === 'stopdesk') shippingPrice = stopDeskPrices[wilaya] || 0;

  const orderNumber = generateOrderNumber();
  const cartTotal = parseFloat(document.getElementById('totalPrice')?.textContent || '0');
  const grandTotal = cartTotal + shippingPrice;

  const commande = {
    orderNumber,
    status: 'pending',
    orderType,
    firstName: form.firstName?.value.trim() || '',
    lastName: form.lastName?.value.trim() || '',
    phone1: form.phone1?.value.trim() || '',
    phone2: form.phone2?.value.trim() || null,
    wilaya,
    commune,
    cartItems: cart.map(item => ({
      id: item.id,
      name: item.name,
      flavor: item.flavor || null,
      price: item.price,
      quantity: item.quantity,
      total: item.price * item.quantity
    })),
    cartTotal,
    shippingPrice,
    grandTotal,
    date: new Date().toISOString()
  };

  try {
    console.log("📤 Envoi de la commande à Firebase...");
    const orderRef = await addDoc(collection(db, "commandes"), commande);
    console.log("✅ Commande sauvegardée avec ID:", orderRef.id);

    await updateProductsQuantities(cart);
    await loadProductsFromFirebase();

    closeOrderForm();
    const confirmModal = document.getElementById('confirmModal');
    const orderNumberEl = document.getElementById('orderNumber');
    if (confirmModal) confirmModal.classList.add('active');
    if (orderNumberEl) orderNumberEl.textContent = orderNumber;

    cart = [];
    saveCartToStorage();
    updateCartCount();

    form.reset();
    if (document.getElementById('shippingPrice')) {
      document.getElementById('shippingPrice').textContent = '0 DA';
    }

    showNotification(`Commande envoyée avec succès!`, 'success');
  } catch (error) {
    console.error("❌ Erreur Firebase:", error);
    showNotification("Erreur lors de l'envoi. Vérifiez votre connexion.", 'error');
  }
}

// ========== METTRE À JOUR QUANTITÉS ==========
async function updateProductsQuantities(cartItems) {
  const results = [];
  for (const item of cartItems) {
    try {
      console.log(`📦 Mise à jour: ${item.name} (ID: ${item.id})`);
      const productRef = doc(db, "produits", item.id);
      const productDoc = await getDoc(productRef);

      if (productDoc.exists()) {
        const currentQuantity = productDoc.data().quantity || 0;
        const newQuantity = currentQuantity - item.quantity;

        if (newQuantity >= 0) {
          await updateDoc(productRef, { quantity: newQuantity });
          console.log(`✅ ${item.name}: ${currentQuantity} → ${newQuantity}`);
          results.push({ success: true, productId: item.id, newQuantity });
        } else {
          console.warn(`⚠️ Quantité insuffisante: ${item.name}`);
          results.push({ success: false, productId: item.id, reason: 'Insufficient quantity' });
        }
      } else {
        console.warn(`⚠️ Produit non trouvé: ${item.id}`);
        results.push({ success: false, productId: item.id, reason: 'Product not found' });
      }
    } catch (error) {
      console.error(`❌ Erreur pour ${item.name}:`, error);
      results.push({ success: false, productId: item.id, reason: error.message });
    }
  }
  return results;
}

// ========== NOTIFICATIONS ==========
function showNotification(message, type = 'success') {
  const existing = document.querySelector('.notification-toast');
  if (existing) existing.remove();

  const notif = document.createElement('div');
  notif.className = 'notification-toast';
  const bgColor = type === 'success' ? '#10b981' : '#f59e0b';
  notif.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${bgColor};
    color: white;
    padding: 15px 25px;
    border-radius: 8px;
    z-index: 9999;
    animation: slideIn 0.3s ease-out;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    font-size: 14px;
    font-weight: 500;
  `;
  notif.textContent = message;
  document.body.appendChild(notif);

  setTimeout(() => {
    notif.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notif.remove(), 300);
  }, 3000);
}

// Ajouter les animations CSS
if (!document.getElementById('notification-styles')) {
  const style = document.createElement('style');
  style.id = 'notification-styles';
  style.textContent = `
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
  `;
  document.head.appendChild(style);
}

// ========== LISTENERS SUPPLÉMENTAIRES ==========
document.addEventListener('DOMContentLoaded', () => {
  const wilayaSel = document.getElementById('wilaya');
  const typeSel = document.getElementById('orderType');
  const communeSel = document.getElementById('commune');

  if (wilayaSel) {
    wilayaSel.addEventListener('change', () => {
      const w = wilayaSel.value;
      if (communeSel) {
        communeSel.innerHTML = '<option value="">Sélectionner une commune</option>';
        if (w && wilayasData[w]) {
          wilayasData[w].forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            communeSel.appendChild(opt);
          });
        }
      }
      updateShippingPrice();
    });
  }

  if (typeSel) {
    typeSel.addEventListener('change', updateShippingPrice);
  }

  const orderForm = document.getElementById('orderForm');
  if (orderForm) {
    orderForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitOrderForm();
    });
  }
});

// ========== EXPOSER FONCTIONS GLOBALES ==========
window.addToCart = addToCart;
window.updateCartQuantity = updateCartQuantity;
window.removeCartItem = removeCartItem;
// Backward compatibility for old calls
window.updateQuantity = updateCartQuantity;
window.removeFromCart = removeCartItem;

window.openProductDetail = openProductDetail;
window.displayCart = displayCart;

