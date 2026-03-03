// script.js - Gestion du site client (Firebase v10+ Compatible)
import { collection, getDocs, addDoc, query, orderBy, doc, updateDoc, getDoc } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from './firebase-config.js';

// ========== VARIABLES GLOBALES ==========
let products = [];
let cart = [];
let currentProductId = null;
let shippingPrice = 0;

// ========== PLACEHOLDER IMAGE (SVG Inline) ==========
const PLACEHOLDER_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect fill='%23f3f4f6' width='300' height='200'/%3E%3Ccircle cx='150' cy='80' r='40' fill='%23d1d5db'/%3E%3Crect x='60' y='140' width='180' height='20' rx='10' fill='%23d1d5db'/%3E%3Ctext x='50%25' y='185' font-family='Arial' font-size='12' fill='%236b7280' text-anchor='middle'%3EImage non disponible%3C/text%3E%3C/svg%3E`;

// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', function() {
  console.log("🚀 Application démarrée...");
  loadProductsFromFirebase();
  setupEventListeners();
  loadCartFromStorage();
});

// ========== CHARGER LES PRODUITS DEPUIS FIREBASE ==========
async function loadProductsFromFirebase() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  
  grid.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-light);grid-column:1/-1"><i class="fa-solid fa-circle-notch fa-spin" style="font-size:2rem"></i><p style="margin-top:16px">Chargement des produits...</p></div>`;
  
  try {
    console.log("📦 Chargement des produits depuis Firebase...");
    const productsRef = collection(db, "produits");
    const productsQuery = query(productsRef, orderBy("dateAdded", "desc"));
    const querySnapshot = await getDocs(productsQuery);
    
    products = [];
    querySnapshot.forEach(docSnap => {
      console.log("📄 Produit trouvé:", docSnap.id, docSnap.data());
      products.push({ id: docSnap.id, ...docSnap.data() });
    });
    
    console.log(`✅ ${products.length} produits chargés`);
    
    if (products.length === 0) {
      console.warn("⚠️ Aucun produit trouvé dans la base de données!");
      grid.innerHTML = `<div style="text-align:center;padding:60px;color:var(--warning);grid-column:1/-1"><i class="fa-solid fa-box-open" style="font-size:3rem;margin-bottom:16px"></i><p>Aucun produit disponible pour le moment.<br>Veuillez contacter l'administrateur.</p></div>`;
    } else {
      loadProducts();
    }
  } catch (error) {
    console.error("❌ Erreur chargement produits:", error);
    if (grid) {
      grid.innerHTML = `<div style="text-align:center;padding:60px;color:var(--danger);grid-column:1/-1"><i class="fa-solid fa-triangle-exclamation" style="font-size:3rem;margin-bottom:16px"></i><p>Erreur de chargement des produits.<br>Vérifiez votre connexion internet.</p></div>`;
    }
  }
}

// ========== AFFICHAGE DES PRODUITS ==========
function loadProducts(filteredProducts = null) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  
  const productsToDisplay = filteredProducts || products;
  grid.innerHTML = '';
  
  if (productsToDisplay.length === 0) {
    grid.innerHTML = `<p style="text-align:center;color:var(--text-light);padding:40px;grid-column:1/-1">Aucun produit trouvé.</p>`;
    return;
  }
  
  productsToDisplay.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Ouvrir le détail au clic sur la carte (sauf sur le bouton Ajouter)
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('add-to-cart-btn')) return;
      openProductDetail(product.id);
    });
    
    // Image
    const img = document.createElement('img');
    img.src = (product.image && product.image.trim()) ? product.image : PLACEHOLDER_SVG;
    img.alt = product.name || 'Produit';
    img.className = 'product-image';
    img.style.cssText = 'width:100%;height:200px;object-fit:cover;display:block';
    img.onerror = function() { this.src = PLACEHOLDER_SVG; this.style.objectFit = 'contain'; };
    img.addEventListener('click', (e) => { e.stopPropagation(); openProductDetail(product.id); });
    
    // Info
    const info = document.createElement('div');
    info.className = 'product-info';
    
    const shortDesc = truncateDescription(product.description || '', 50);
    const quantity = product.quantity || 0;
    const quantityHTML = quantity > 0 
      ? `<span class="product-quantity" style="color:var(--success)">${quantity} en stock</span>`
      : `<span class="product-quantity out-of-stock" style="color:var(--danger)">Rupture de stock</span>`;
    
    info.innerHTML = `
      <h3 class="product-name">${product.name || 'Produit sans nom'}</h3>
      <p class="product-category">${product.category || 'Catégorie inconnue'}</p>
      <p class="product-description">${shortDesc}</p>
      ${quantityHTML}
      <div class="product-footer">
        <span class="product-price">${(product.price || 0).toFixed(2)} DA</span>
        <button class="add-to-cart-btn" data-product-id="${product.id}" ${quantity <= 0 ? 'disabled' : ''}>
          ${quantity > 0 ? 'Ajouter' : 'Indisponible'}
        </button>
      </div>
    `;
    
    card.appendChild(img);
    card.appendChild(info);
    grid.appendChild(card);
  });
  
  // Écouteurs boutons "Ajouter"
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const productId = btn.getAttribute('data-product-id');
      addToCart(productId);
    });
  });
  
  // Animation
  setTimeout(() => {
    document.querySelectorAll('.product-card').forEach(card => card.classList.add('visible'));
  }, 100);
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

// ========== MODAL DÉTAIL PRODUIT ==========
function openProductDetail(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  
  currentProductId = productId;
  
  const detailImage = document.getElementById('detailImage');
  if (detailImage) {
    detailImage.src = (product.image && product.image.trim()) ? product.image : PLACEHOLDER_SVG;
  }
  
  document.getElementById('detailName').textContent = product.name || 'Produit sans nom';
  document.getElementById('detailCategory').textContent = product.category || 'Catégorie inconnue';
  
  const quantity = product.quantity || 0;
  const quantityText = quantity > 0
    ? `<span style="color:var(--success);font-weight:bold">${quantity} en stock</span>`
    : `<span style="color:var(--danger);font-weight:bold">Rupture de stock</span>`;
  
  const description = product.description || 'Pas de description disponible.';
  document.getElementById('detailDescription').innerHTML = `
    <strong>Description:</strong><br>
    <span style="font-size:16px;line-height:1.6;color:var(--text-light)">${description.replace(/\n/g, '<br>')}</span><br><br>
    <strong>Quantité:</strong><br>${quantityText}
  `;
  
  document.getElementById('detailPrice').textContent = (product.price || 0).toFixed(2);
  document.getElementById('productDetailModal')?.classList.add('active');
  
  console.log(`📦 Détails du produit "${product.name}" affichés`);
}

// ========== FONCTIONS DU PANIER ==========
function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  
  const quantity = product.quantity || 0;
  if (quantity <= 0) {
    showNotification('Produit indisponible - rupture de stock!', 'error');
    return;
  }
  
  const existingItem = cart.find(item => item.id === productId);
  if (existingItem) {
    if (existingItem.quantity >= quantity) {
      showNotification('Quantité maximale atteinte!', 'error');
      return;
    }
    existingItem.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  
  saveCartToStorage();
  updateCartCount();
  showNotification(`${product.name} ajouté au panier!`, 'success');
}

function updateQuantity(productId, change) {
  const item = cart.find(item => item.id === productId);
  if (!item) return;
  
  item.quantity += change;
  if (item.quantity <= 0) {
    removeFromCart(productId);
  } else {
    const product = products.find(p => p.id === productId);
    const maxQuantity = product?.quantity || 0;
    if (item.quantity > maxQuantity) {
      item.quantity = maxQuantity;
      showNotification('Quantité maximale atteinte!', 'error');
    }
    saveCartToStorage();
    displayCart();
  }
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCartToStorage();
  updateCartCount();
  displayCart();
}

function displayCart() {
  const cartItems = document.getElementById('cartItems');
  if (!cartItems) return;
  
  let total = 0;
  if (cart.length === 0) {
    cartItems.innerHTML = `<p style="text-align:center;color:var(--text-light);padding:40px 0">Votre panier est vide</p>`;
    document.getElementById('totalPrice').textContent = '0.00';
    const btn = document.getElementById('checkoutBtn');
    if (btn) btn.disabled = true;
    return;
  }
  
  cartItems.innerHTML = '';
  cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    
    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item';
    cartItem.innerHTML = `
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${item.price.toFixed(2)} DA × ${item.quantity} = ${itemTotal.toFixed(2)} DA</div>
      </div>
      <div class="cart-item-quantity">
        <button class="quantity-btn" onclick="window.updateQuantity('${item.id}', -1)">-</button>
        <span>${item.quantity}</span>
        <button class="quantity-btn" onclick="window.updateQuantity('${item.id}', 1)">+</button>
      </div>
      <button class="remove-btn" onclick="window.removeFromCart('${item.id}')">Supprimer</button>
    `;
    cartItems.appendChild(cartItem);
  });
  
  document.getElementById('totalPrice').textContent = total.toFixed(2);
  const btn = document.getElementById('checkoutBtn');
  if (btn) btn.disabled = false;
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
  const categoryFilter = document.getElementById('categoryFilter');
  
  if (cartBtn && cartModal) {
    cartBtn.addEventListener('click', () => {
      cartModal.classList.add('active');
      displayCart();
    });
  }
  
  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal')?.classList.remove('active');
    });
  });
  
  // Fermer modal au clic dehors
  window.addEventListener('click', (e) => {
    document.querySelectorAll('.modal').forEach(modal => {
      if (e.target === modal) modal.classList.remove('active');
    });
  });
  
  // Fermer modal avec ESC
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
  if (categoryFilter) {
    categoryFilter.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-btn')) {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        filterProducts();
      }
    });
  }
  
  // Modal Add To Cart Button
  const modalBtn = document.getElementById('modalAddToCartBtn');
  if (modalBtn) {
    modalBtn.addEventListener('click', () => {
      if (currentProductId) {
        addToCart(currentProductId);
        document.getElementById('productDetailModal')?.classList.remove('active');
      }
    });
  }
  
  // Continue Shopping Button
  const continueBtn = document.getElementById('continueBtn');
  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      document.getElementById('confirmModal')?.classList.remove('active');
    });
  }
}

function filterProducts() {
  const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const selectedCategory = document.querySelector('.filter-btn.active')?.dataset.category || '';
  
  const filtered = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm) ||
      (product.description && product.description.toLowerCase().includes(searchTerm));
    const matchesCategory = !selectedCategory || selectedCategory === 'all' || product.category === selectedCategory;
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
  document.getElementById('orderFormModal')?.classList.remove('active');
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
  const info = document.getElementById('shippingInfo');
  
  if (!type || !wilaya || !priceEl) return;
  
  let price = 0;
  if (type === 'domicile') price = shippingPrices[wilaya] || 0;
  else if (type === 'stopdesk') price = stopDeskPrices[wilaya] || 0;
  
  priceEl.textContent = price + ' DA';
  if (info) info.classList.add('active');
  
  // Update grand total
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
async function submitOrderForm(e) {
  if (e) e.preventDefault();
  
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
    
    // Mettre à jour les quantités
    await updateProductsQuantities(cart);
    
    // Recharger les produits
    await loadProductsFromFirebase();
    
    // Afficher confirmation
    closeOrderForm();
    const confirmModal = document.getElementById('confirmModal');
    const orderNumberEl = document.getElementById('orderNumber');
    if (confirmModal) confirmModal.classList.add('active');
    if (orderNumberEl) orderNumberEl.textContent = orderNumber;
    
    // Vider le panier
    cart = [];
    saveCartToStorage();
    updateCartCount();
    
    // Réinitialiser formulaire
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
  const bgColor = type === 'success' ? 'var(--success)' : 'var(--danger)';
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

// Ajouter les animations CSS si non présentes
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
    orderForm.addEventListener('submit', submitOrderForm);
  }
});

// ========== EXPOSER FONCTIONS GLOBALES ==========
window.addToCart = addToCart;
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.openProductDetail = openProductDetail;
window.displayCart = displayCart;
