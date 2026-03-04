// script.js - Gestion du site client (Firebase v10+ Compatible)
import { collection, getDocs, addDoc, query, orderBy, doc, updateDoc, getDoc }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from './firebase-config.js';

// ========== VARIABLES GLOBALES ==========
let products = [];
let cart = [];
let shippingPrice = 0;

// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', function () {
  console.log("🚀 Application démarrée...");
  loadProductsFromFirebase();
  setupEventListeners();
  loadCartFromStorage();
});

// ========== CHARGER LES PRODUITS DEPUIS FIREBASE ==========
async function loadProductsFromFirebase() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  grid.innerHTML = `
    <div style="text-align:center; padding:60px; color:#6b7280;">
      <i class="fa-solid fa-circle-notch fa-spin" style="font-size:2rem;"></i>
      <p style="margin-top:16px;">Chargement des produits...</p>
    </div>`;

  try {
    console.log("📦 Chargement des produits depuis Firebase...");
    const productsRef = collection(db, "produits");
    const productsQuery = query(productsRef, orderBy("dateAdded", "desc"));
    const querySnapshot = await getDocs(productsQuery);

    products = [];
    querySnapshot.forEach(doc => {
      console.log("📄 Produit trouvé:", doc.id, doc.data());
      products.push({ id: doc.id, ...doc.data() });
    });

    console.log(`✅ ${products.length} produits chargés`);

    if (products.length === 0) {
      console.warn("⚠️ Aucun produit trouvé dans la base de données!");
      grid.innerHTML = `
        <div style="text-align:center; padding:60px; color:#e74c3c;">
          <i class="fa-solid fa-box-open" style="font-size:3rem; margin-bottom:16px;"></i>
          <p>Aucun produit disponible pour le moment.</p>
          <p style="font-size:0.875rem; margin-top:8px;">Veuillez contacter l'administrateur.</p>
        </div>`;
    } else {
      loadProducts();
    }
  } catch (error) {
    console.error("❌ Erreur chargement produits:", error);
    if (grid) {
      grid.innerHTML = `
        <div style="text-align:center; padding:60px; color:#e74c3c;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size:3rem; margin-bottom:16px;"></i>
          <p>Erreur de chargement des produits.</p>
          <p style="font-size:0.875rem; margin-top:8px;">Vérifiez votre connexion internet.</p>
        </div>`;
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
    grid.innerHTML = `
      <div style="text-align:center; padding:60px; color:#7f8c8d;">
        <i class="fa-solid fa-search" style="font-size:3rem; margin-bottom:16px;"></i>
        <p>Aucun produit trouvé.</p>
      </div>`;
    return;
  }

  productsToDisplay.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';

    const img = document.createElement('img');
    img.src = product.image || 'https://via.placeholder.com/300x200?text=Produit';
    img.alt = product.name || 'Produit';
    img.className = 'product-image';
    img.style.cssText = 'width:100%; height:200px; object-fit:contain; display:block; margin:0 auto; background:transparent;';
    img.onerror = function () {
      this.src = 'https://via.placeholder.com/300x200?text=Image+non+disponible';
    };

    // Ouvrir le détail au clic sur l'image
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      openProductDetail(product.id);
    });

    const info = document.createElement('div');
    info.className = 'product-info';

    const shortDescription = truncateDescription(product.description || '', 50);
    const quantity = product.quantity || 0;
    const quantityHTML = quantity > 0
      ? `<span class="product-quantity">${quantity} en stock</span>`
      : `<span class="product-quantity out-of-stock">Rupture de stock</span>`;

    info.innerHTML = `
      <h3 class="product-name">${product.name || 'Produit sans nom'}</h3>
      <p class="product-category">${product.category || 'Catégorie inconnue'}</p>
      <p class="product-description">${shortDescription}</p>
      ${quantityHTML}
      <div class="product-footer">
        <span class="product-price">${(product.price || 0).toFixed(2)} DA</span>
        <button class="add-to-cart-btn" data-product-id="${product.id}" 
                ${quantity <= 0 ? 'disabled' : ''}>
          ${quantity > 0 ? 'Ajouter' : 'Indisponible'}
        </button>
      </div>
    `;

    card.appendChild(img);
    card.appendChild(info);
    grid.appendChild(card);

    // Clic sur la carte pour ouvrir le détail
    card.addEventListener('click', (e) => {
      if (!e.target.classList.contains('add-to-cart-btn')) {
        openProductDetail(product.id);
      }
    });
  });

  // Ajouter les écouteurs aux boutons "Ajouter"
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const productId = btn.getAttribute('data-product-id');
      addToCart(productId);
    });
  });

  // Animation
  setTimeout(() => {
    document.querySelectorAll('.product-card').forEach(card => {
      card.classList.add('visible');
    });
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

  const detailImage = document.getElementById('detailImage');
  if (detailImage) {
    detailImage.src = product.image || 'https://via.placeholder.com/300x200?text=Produit';
  }

  const detailName = document.getElementById('detailName');
  if (detailName) detailName.textContent = product.name || 'Produit sans nom';

  const detailCategory = document.getElementById('detailCategory');
  if (detailCategory) detailCategory.textContent = product.category || 'Catégorie inconnue';

  const quantity = product.quantity || 0;
  const quantityText = quantity > 0
    ? `<span style="color:#27ae60; font-weight:bold;">${quantity} en stock</span>`
    : `<span style="color:#e74c3c; font-weight:bold;">Rupture de stock</span>`;

  const detailDescription = document.getElementById('detailDescription');
  if (detailDescription) {
    detailDescription.innerHTML = `
      <strong>Description:</strong><br>
      <span style="font-size:16px; line-height:1.6; color:#34495e;">
        ${(product.description || 'Pas de description disponible.').replace(/\n/g, '<br>')}
      </span><br><br>
      <strong>Quantité:</strong><br>${quantityText}
    `;
  }

  const detailPrice = document.getElementById('detailPrice');
  if (detailPrice) detailPrice.textContent = (product.price || 0).toFixed(2);

  const modal = document.getElementById('productDetailModal');
  if (modal) modal.classList.add('active');

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
    cartItems.innerHTML = `<p class="cart-empty">Votre panier est vide</p>`;
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

    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item';
    cartItem.innerHTML = `
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${item.price.toFixed(2)} DA × ${item.quantity} = ${itemTotal.toFixed(2)} DA</div>
      </div>
      <div class="cart-item-quantity">
        <button class="quantity-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
        <span>${item.quantity}</span>
        <button class="quantity-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
      </div>
      <button class="remove-btn" onclick="removeFromCart('${item.id}')">Supprimer</button>
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
  const cartCount = document.getElementById('cartCount');
  if (cartCount) cartCount.textContent = count;
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
      const modal = btn.closest('.modal');
      if (modal) modal.classList.remove('active');
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
      document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
      });
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
  if (categoryFilter) categoryFilter.addEventListener('change', filterProducts);
}

function filterProducts() {
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');

  const searchTerm = searchInput?.value.toLowerCase() || '';
  const selectedCategory = categoryFilter?.value || '';

  const filtered = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm) ||
      (product.description && product.description.toLowerCase().includes(searchTerm));
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  loadProducts(filtered);
}

// ========== GÉNÉRER NUMÉRO DE COMMANDE ==========
function generateOrderNumber() {
  const now = new Date();
  const datePart = now.toISOString().slice(2, 10).replace(/-/g, '');
  let count = localStorage.getItem('orderCount') || '0';
  count = String(parseInt(count) + 1).padStart(3, '0');
  localStorage.setItem('orderCount', count);
  return `AM${datePart}${count}`;
}

// ========== FORMULAIRE DE COMMANDE ==========
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
  const typeSelect = document.getElementById('orderType');
  const wilayaSelect = document.getElementById('wilaya');
  const priceEl = document.getElementById('shippingPrice');
  const info = document.querySelector('.shipping-info');

  if (!typeSelect || !wilayaSelect || !priceEl) return;

  const type = typeSelect.value;
  const wilaya = wilayaSelect.value;

  if (!wilaya) {
    priceEl.textContent = '0 DA';
    if (info) info.classList.remove('active');
    return;
  }

  let price = 0;
  if (type === 'domicile') price = shippingPrices[wilaya] || 0;
  else if (type === 'stopdesk') price = stopDeskPrices[wilaya] || 0;

  priceEl.textContent = price + ' DA';
  if (info) info.classList.add('active');
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
  const totalPriceEl = document.getElementById('totalPrice');
  const cartTotal = parseFloat(totalPriceEl?.textContent || '0');
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

    // Fermer modal et afficher confirmation
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
    console.log("✅ Commande envoyée avec succès!");
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
  const bgColor = type === 'success' ? '#27ae60' : '#e74c3c';
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
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
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
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.openProductDetail = openProductDetail;
window.displayCart = displayCart;
