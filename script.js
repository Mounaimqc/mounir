// ========== IMPORT FIREBASE ==========
import { collection, getDocs, addDoc, query, doc, updateDoc, getDoc, orderBy }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from './firebase-config.js';

// ========== VARIABLES GLOBALES ==========
let products = [];
let allFilteredProducts = [];
let displayedCount = 10;
const itemsPerPage = 10;
let cart = [];
let currentProductId = null;

// Utility: Shuffle Array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// ========== PLACEHOLDER IMAGE (SVG Inline) ==========
const PLACEHOLDER_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect fill='%23f3f4f6' width='300' height='200'/%3E%3Ccircle cx='150' cy='80' r='40' fill='%23d1d5db'/%3E%3Crect x='60' y='140' width='180' height='20' rx='10' fill='%23d1d5db'/%3E%3Ctext x='50%25' y='185' font-family='Arial' font-size='12' fill='%236b7280' text-anchor='middle'%3EImage non disponible%3C/text%3E%3C/svg%3E`;

// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', function () {
  console.log("🚀 Application démarrée...");
  
  // حفظ الأسماء الأصلية للأزرار قبل أي تعديل
  saveFilterButtonNames();
  
  loadProductsFromFirebase();
  setupEventListeners();
  loadCartFromStorage();
  populateShippingTable();

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

// ========== حفظ أسماء الأزرار الأصلية ==========
function saveFilterButtonNames() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    const text = btn.textContent.trim();
    btn.dataset.baseName = text;
    console.log("💾 Bouton sauvegardé:", text);
  });
}

// ========== عَد المنتجات حسب القسم ==========
function countProductsByCategory(productList = products) {
  const counts = {
    'all': 0,
    'Protéines whey': 0,
    'Masse / Gainer': 0,
    'Acide aminé': 0,
    'Force / Energie': 0,
    'Brûleur de graisse': 0
  };
  
  productList.forEach(product => {
    const cat = product.category;
    console.log("📊 Catégorie produit:", cat);
    
    if (counts[cat] !== undefined) {
      counts[cat]++;
    }
    counts['all']++;
  });
  
  console.log("📈 Compte par catégorie:", counts);
  return counts;
}

function updateCategoryCounts(productList = products) {
  console.log("🔄 Mise à jour des compteurs...");
  
  const counts = countProductsByCategory(productList);
  const filterBtns = document.querySelectorAll('.filter-btn');
  
  console.log("🔘 Nombre de boutons:", filterBtns.length);
  
  filterBtns.forEach(btn => {
    const category = btn.getAttribute('data-category');
    const count = counts[category] ?? 0;
    const baseName = btn.dataset.baseName || btn.textContent.trim();
    
    console.log(`📍 Bouton: ${category} → ${count} produits`);
    
    btn.innerHTML = `${baseName} <span class="category-count">${count}</span>`;
  });
  
  console.log("✅ Compteurs mis à jour!");
}

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
      shuffleArray(products);
      allFilteredProducts = [...products];
      displayedCount = itemsPerPage;
      
      // ✅ تحديث عدادات الأقسام بعد تحميل المنتجات
      updateCategoryCounts();
      
      loadProducts();
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
function loadProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) {
    console.error("❌ productsGrid non trouvé");
    return;
  }

  const paginationContainer = document.getElementById('paginationContainer');

  if (!allFilteredProducts || allFilteredProducts.length === 0) {
    grid.innerHTML = `
      <div style="text-align:center; padding:60px; color:#6b7280; grid-column:1/-1;">
        <i class="fa-solid fa-search" style="font-size:3rem; margin-bottom:16px;"></i>
        <p>Aucun produit trouvé.</p>
      </div>`;
    if (paginationContainer) paginationContainer.style.display = 'none';
    return;
  }

  const productsToDisplay = allFilteredProducts.slice(0, displayedCount);
  grid.innerHTML = '';

  productsToDisplay.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';

    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('add-to-cart-btn')) return;
      openProductDetail(product.id);
    });

    const img = document.createElement('img');
    img.src = (product.image && product.image.trim()) ? product.image : 'https://via.placeholder.com/300x200?text=Produit';
    img.alt = product.name;
    img.className = 'product-image';
    img.onerror = function () {
      this.src = PLACEHOLDER_SVG;
      this.style.objectFit = 'contain';
    };
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      openProductDetail(product.id);
    });

    const info = document.createElement('div');
    info.className = 'product-info';

    const shortDesc = truncateDescription(product.description || '', 50);
    const quantity = product.quantity || 0;
    const quantityHTML = quantity > 0
      ? `<span class="product-quantity">${quantity} en stock</span>`
      : `<span class="product-quantity out-of-stock">Rupture de stock</span>`;

    info.innerHTML = `
      <h3 class="product-name" style="font-size:1.1rem; font-family:'Montserrat', sans-serif; font-weight:700; margin-bottom:8px; text-transform:uppercase;">${product.name}</h3>
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

  if (paginationContainer) {
    if (displayedCount < allFilteredProducts.length) {
      paginationContainer.style.display = 'block';
    } else {
      paginationContainer.style.display = 'none';
    }
  }
}

function handleShowMore() {
  displayedCount += itemsPerPage;
  loadProducts();
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
      const modalOverlay = btn.closest('.modal-overlay');
      if (modalOverlay) modalOverlay.classList.remove('active');
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

  const wilayaSearch = document.getElementById('wilayaSearch');
  if (wilayaSearch) wilayaSearch.addEventListener('input', filterShippingTable);

  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      filterProducts();
    });
  });

  const showMoreBtn = document.getElementById('showMoreBtn');
  if (showMoreBtn) {
    showMoreBtn.addEventListener('click', handleShowMore);
  }
}

function filterProducts() {
  const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const activeBtn = document.querySelector('.filter-btn.active');
  const selectedCategory = activeBtn ? activeBtn.getAttribute('data-category') : 'all';

  allFilteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm) ||
      (product.description && product.description.toLowerCase().includes(searchTerm));

    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  displayedCount = itemsPerPage;
  loadProducts();
}

// ========== FONCTIONS COUVERTURE LIVRAISON ==========
function populateShippingTable() {
  const tableBody = document.getElementById('coverageTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = '';

  const sortedWilayas = Object.keys(wilayasData).sort((a, b) => parseInt(a) - parseInt(b));

  sortedWilayas.forEach(wilaya => {
    const row = document.createElement('tr');
    row.innerHTML = `
            <td>${wilaya}</td>
            <td class="price-tag">${shippingPrices[wilaya]} DA</td>
            <td class="price-tag">${stopDeskPrices[wilaya]} DA</td>
        `;
    tableBody.appendChild(row);
  });
}

function filterShippingTable() {
  const searchTerm = document.getElementById('wilayaSearch')?.value.toLowerCase() || '';
  const tableBody = document.getElementById('coverageTableBody');
  if (!tableBody) return;

  const rows = tableBody.getElementsByTagName('tr');

  for (let row of rows) {
    const wilayaName = row.cells[0].textContent.toLowerCase();
    if (wilayaName.includes(searchTerm)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  }
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

// ========== WILAYAS & COMMUNES ==========
const wilayasData = {
  "01 - Adrar": ["Adrar", "Aoulef", "Charouine", "Reggane", "Tamentit", "Tsabit", "Zaouiet Kounta"],
  "02 - Chlef": ["Chlef", "Abou", "Ain Merane", "Boukadir", "El Karimia", "Oued Fodda", "Tadjena", "Zeboudja"],
  "03 - Laghouat": ["Laghouat", "Ain Madhi", "Brida", "El Ghicha", "Hassi Delaa", "Ksar El Hirane", "Sidi Makhlouf"],
  "04 - Oum El Bouaghi": ["Oum El Bouaghi", "Ain Beida", "Ain M'lila", "Behir Chergui", "El Amiria", "Sigus", "Souk Naamane"],
  "05 - Batna": ["Batna", "Ain Touta", "Arris", "Barika", "Bouzina", "El Madher", "Fesdis", "Ghassira", "Merouana", "N'Gaous", "Ras El Aioun", "Tazoult", "Timgad"],
  "06 - Béjaïa": ["Béjaïa", "Akbou", "Amizour", "Chemini", "Darguina", "El Kseur", "Ifnayen", "Kherrata", "Seddouk", "Tichy", "Tifra", "Timezrit"],
  "07 - Biskra": ["Biskra", "Ain Naga", "Bordj Ben Azzouz", "Chetma", "El Kantara", "El Outaya", "M'Chouneche", "Ouled Djellal", "Sidi Okba", "Zeribet El Oued"],
  "08 - Béchar": ["Béchar", "Abadla", "Beni Ounif", "Kenadsa", "Lahmar", "Mechraa Houari Boumedienne", "Taghit"],
  "09 - Blida": ["Blida", "Boufarik", "Bougara", "Chebli", "Chiffa", "El Affroun", "Mouzaia", "Oued Alleug", "Souhane"],
  "10 - Bouira": ["Bouira", "Ain Bessem", "Bechloul", "Bordj Okhriss", "El Adjiba", "Haizer", "Lakhdaria", "M'Chedallah", "Sour El Ghozlane"],
  "11 - Tamanrasset": ["Tamanrasset", "Abalessa", "Foggaret Ezzaouia", "Idles", "In Amguel", "In Ghar", "In Salah", "Tazrouk"],
  "12 - Tébessa": ["Tébessa", "Ain Zerga", "Bir El Ater", "Cheria", "El Aouinet", "El Ogla", "Morsott", "Negrine", "Ouenza", "Stah Guentis"],
  "13 - Tlemcen": ["Tlemcen", "Ain Fezza", "Ain Youcef", "Beni Bahdel", "Beni Snous", "Bensekrane", "El Aricha", "El Fehoul", "Ghazaouet", "Hennaya", "Maghnia", "Mansourah", "Nedroma", "Remchi", "Sebdou", "Zenata"],
  "14 - Tiaret": ["Tiaret", "Ain Deheb", "Ain Kermes", "Djillali Ben Amar", "Frenda", "Hamadia", "Ksar Chellala", "Mahdia", "Mechraa Safa", "Medroussa", "Oued Lili", "Rahouia", "Sougueur"],
  "15 - Tizi Ouzou": ["Tizi Ouzou", "Ain El Hammam", "Akbil", "Azeffoun", "Boghni", "Boudjima", "Bouira", "Draa El Mizan", "Iferhounene", "Larbaa Nath Irathen", "Maatkas", "Makouda", "Mizrana", "Ouacif", "Ouadhia", "Tigzirt", "Timizart"],
  "16 - Alger": ["Alger Centre", "Bab El Oued", "Birkhadem", "Bouzareah", "Dar El Beida", "El Biar", "Hussein Dey", "Kouba", "Mohamed Belouizdad", "Oued Koriche", "Sidi M'Hamed"],
  "17 - Djelfa": ["Djelfa", "Ain Chouhada", "Ain El Ibel", "Birine", "Charef", "El Idrissia", "Faidh El Botma", "Guernini", "Hassi Bahbah", "Hassi El Euch", "Messaad", "Sidi Ladjel"],
  "18 - Jijel": ["Jijel", "Ain Taya", "Boucif Ouled Askeur", "Chahna", "El Ancer", "El Milia", "Emir Abdelkader", "Ghebala", "Kaous", "Ouled Rabah", "Taher", "Texenna", "Ziama Mansouriah"],
  "19 - Sétif": ["Sétif", "Ain Abessa", "Ain Arnat", "Ain Azel", "Ain El Kebira", "Ain Oulmene", "Amoucha", "Babor", "Bazer Sakhra", "Beidha Bordj", "Beni Aziz", "Bir El Arch", "Bouandas", "Bouga", "Djemila", "El Eulma", "Guenzet", "Guidjel", "Hammam Guergour", "Harbil", "Maaouia", "Maoklane", "Salah Bey", "Serdj El Ghoul", "Tachouda", "Tamazirt", "Tella", "Zerdaza"],
  "20 - Saïda": ["Saïda", "Ain El Hadjar", "Ain Sekhouna", "Doui Thabet", "El Hassasna", "Hounet", "Maamora", "Moulay Larbi", "Ouled Brahim", "Ouled Khaled", "Youb"],
  "21 - Skikda": ["Skikda", "Ain Kechra", "Azzaba", "Ben Azzouz", "Collo", "El Harrouch", "Oued Zehour", "Ramdane Djamel", "Sidi Mezghiche", "Tamalous", "Zitouna"],
  "22 - Sidi Bel Abbès": ["Sidi Bel Abbès", "Ain Adden", "Ain Thrid", "Ben Badis", "Marhoum", "Mérine", "Mostefa Ben Brahim", "Moulay Slissen", "Oued Taourira", "Ras El Ma", "Sfisef", "Tafraoui", "Telagh", "Ténira"],
  "23 - Annaba": ["Annaba", "Ain Berda", "Berrahal", "Chorfa", "El Bouni", "El Hadjar", "Oued El Aneb", "Seraidi", "Treat"],
  "24 - Guelma": ["Guelma", "Ain Ben Beida", "Ain Reggada", "Bou Hamdane", "Bouati Mahmoud", "Dahoua", "El Fedjoudj Boughrara", "Hammam Debagh", "Hammam N'Bails", "Heliopolis", "Khezaras", "Oued Zenati", "Ras El Agba", "Salaoua Announa", "Zemmoura"],
  "25 - Constantine": ["Constantine", "Ain Smara", "Didouche Mourad", "El Khroub", "Hamma Bouziane", "Ibn Ziad", "Messaouda", "Zighoud Youcef"],
  "26 - Médéa": ["Médéa", "Ain Boucif", "Ain Ouksir", "Aziz", "Berrouaghia", "Chahbounia", "Chelif", "Deux Bassins", "Djouab", "El Azizia", "El Omaria", "Guelb El Kebir", "Ksar El Boukhari", "Mihoub", "Oued Harbil", "Ouled Deid", "Ouled Hellal", "Ouled Maaref", "Seghouane", "Si Mahdjoub", "Souagui", "Tablat"],
  "27 - Mostaganem": ["Mostaganem", "Ain Tedles", "Ain Sidi Cherif", "Bouguirat", "Hassi Mamèche", "Kheir Eddine", "Mesra", "Ouled Boughalem", "Ouled Malah", "Sidi Ali", "Sidi Lakhdar", "Sirat", "Stidia", "Tazgait"],
  "28 - M'Sila": ["M'Sila", "Ain El Melh", "Ben Srour", "Bou Saada", "Chellal", "Djebel Messaad", "El Hamel", "El Houamed", "Hammam Dhalaâ", "Khoubana", "Maadid", "Magra", "Medjedel", "Ouanougha", "Ouled Derradj", "Ouled Sidi Brahim", "Sidi Aissa", "Sidi Hadjeres", "Sidi M'hamed", "Souamaa", "Tarmount", "Zarzit"],
  "29 - Mascara": ["Mascara", "Ain Farès", "Ain Fekroun", "Ain Fekan", "Aouf", "El Bordj", "El Gaada", "El Ghomri", "El Keurt", "El Menaouer", "Froha", "Ghriss", "Hachem", "Hacine", "Maoussa", "Mohammadia", "Mocta Douz", "Nesmoth", "Oggaz", "Oued El Abtal", "Oued Taria", "Ras Ain Amirouche", "Sidi Abdeldjebar", "Sidi Kada", "Sidi Zahar", "Tighennif", "Tizi", "Zahana"],
  "30 - Ouargla": ["Ouargla", "Ain Beida", "El Allia", "El Hadjira", "El Hajeb", "Hassi Ben Abdellah", "Hassi Messaoud", "N'Goussa", "Rouissat", "Sidi Khouiled", "Taibet", "Tebesbest", "Touggourt", "Zaouia El Abidia"],
  "31 - Oran": ["Oran", "Arzew", "Bethioua", "Bir El Djir", "Es Senia", "Gdyel", "Hassi Bounif", "Marsat El Hadjadj", "Mers El Kebir", "Misserghin", "Oued Tlelat", "Sidi Ben Yebka", "Sidi Chami"],
  "32 - El Bayadh": ["El Bayadh", "Ain El Orak", "Bougtoub", "Brézina", "Chellala", "El Abiodh Sidi Cheikh", "El Bnoud", "Ghassoul", "Kef El Ahmar", "Rogassa", "Sidi Slimane", "Stitten"],
  "33 - Illizi": ["Illizi", "Bordj Omar Driss", "Djanet", "Debdeb", "El Borma", "In Amenas", "In Guezzam", "In Salah", "Tin Zaouatine"],
  "34 - Bordj Bou Arréridj": ["Bordj Bou Arréridj", "Ain Taghrout", "Belimour", "Bir Kasdali", "Bordj Ghdir", "Bordj Zemmoura", "Colla", "El Achir", "El Anser", "El Hamadia", "El Main", "El M'hir", "Ghilassa", "Haraza", "Hasnaoua", "Ksour", "Mansourah", "Medjana", "Ouled Brahem", "Ouled Dahmane", "Ouled Sidi Brahim", "Ras El Oued", "Righa", "Taglait", "Teniet En Nasr"],
  "35 - Boumerdès": ["Boumerdès", "Ammal", "Baghlia", "Bordj Menaiel", "Boudouaou", "Boudouaou El Bahri", "Chabet El Ameur", "Dellys", "Isser", "Khemis El Khechna", "Legata", "Naciria", "Ouled Aissa", "Ouled Fayet", "Si Mustapha", "Souk El Had", "Thénia"],
  "36 - El Tarf": ["El Tarf", "Ain Kercha", "Ben M'Hidi", "Besbes", "Bouhadjar", "Boutheldja", "Dréan", "El Kala", "Lac des Oiseaux", "Souarekh"],
  "37 - Tindouf": ["Tindouf", "Aouinet Bel Egrâ", "Fenoughil", "Oum El Assel"],
  "38 - Tissemsilt": ["Tissemsilt", "Ammari", "Belaassel Bouzegza", "Beni Chaib", "Boucaid", "Bouhatem", "Boukhanafis", "Khemisti", "Lazharia", "Layoune", "Maacem", "Sidi Abed", "Sidi Boutouchent", "Sidi Lantri", "Tamalaht", "Theniet El Had"],
  "39 - El Oued": ["El Oued", "Bayadha", "Debila", "El Ogla", "Guemar", "Hassi Khelifa", "Magrane", "Mih Ouensa", "Oued Souf", "Reguiba", "Robbah", "Taleb Larbi", "Trifaoui"],
  "40 - Khenchela": ["Khenchela", "Ain Touila", "Babar", "Bouhmama", "Chechar", "El Hamma", "El Mahmal", "El Mahres", "El Ouenza", "Hammam Essalihine", "Kais", "Ouled Rechache", "Remila", "Yabous"],
  "41 - Souk Ahras": ["Souk Ahras", "Ain Zana", "Bir Bouhouche", "Heddada", "Khedara", "M'Daourouch", "Mechroha", "Merahna", "Ouled Driss", "Oum El Adhaïm", "Sedrata", "Taoura", "Zouabi"],
  "42 - Tipaza": ["Tipaza", "Ahmar El Ain", "Bou Ismail", "Cherchell", "Damous", "Fouka", "Gouraya", "Hadjout", "Koléa", "Menaceur", "Nador", "Sidi Amar", "Sidi Ghiles", "Sidi Rached", "Sidi Semiane", "Tipasa"],
  "43 - Mila": ["Mila", "Ain Beida", "Ain Mellouk", "Chelghoum Laid", "El Ayadi Barbes", "El Barka", "El Eulma", "Ferdjioua", "Grarem Gouga", "Hamala", "Oued Athmania", "Oued Endja", "Oued Seguen", "Rouached", "Sidi Khelifa", "Tassadane Haddada", "Teleghma", "Terrai Bainen", "Yahia Beniguecha"],
  "44 - Aïn Defla": ["Aïn Defla", "Arib", "Bathia", "Belaas", "Bir Ould Khelifa", "Birbal", "Birhoum", "Boumedfaa", "Djelida", "Djemaa Ouled Cheikh", "El Amra", "El Attaf", "El Hassania", "El Maine", "Hammam Righa", "Hoceinia", "Khemis Miliana", "Miliana", "Oued Chorfa", "Oued Djemaa", "Rouina", "Tarik Ibn Ziad", "Tiberkanine", "Zeddine"],
  "45 - Naâma": ["Naâma", "Ain Ben Khelil", "Ain Sefra", "Asla", "Djeniene Bourezg", "El Bier", "Makmen Ben Amer", "Mecheria", "Moghrar", "Sfissifa", "Tiout"],
  "46 - Aïn Témouchent": ["Aïn Témouchent", "Ain Kihel", "Aoubellil", "Beni Saf", "Bouzedjar", "El Amria", "El Malah", "Hammam Bouhadjar", "Hassasna", "Oued Berkeche", "Oued Sabah", "Sidi Ben Adda", "Sidi Boumediene", "Sidi Ourial", "Terga", "Tlemcen"],
  "47 - Ghardaïa": ["Ghardaïa", "Berriane", "Bounoura", "Dhayet Bendhahoua", "El Atteuf", "El Guerrara", "El Meniaa", "Metlili", "Sebseb", "Zelfana"],
  "48 - Relizane": ["Relizane", "Ain Rahma", "Ain Tarek", "Ammi Moussa", "Belassel Bouzegza", "Beni Dergoun", "Beni Zentis", "Djidiouia", "El Hamadna", "El Matmar", "El Ouldja", "Had Echkalla", "Hamri", "Kalaa", "Mazouna", "Mendes", "Oued Rhiou", "Oued Sly", "Ramka", "Sidi Khettab", "Sidi Lazreg", "Souk El Had", "Yellel"],
  "49 - Timimoun": ["Timimoun", "Aougrout", "Bordj Badji Mokhtar", "Charouine", "Ouled Said", "Talmine", "Tinerkouk", "Touggourt"],
  "50 - Bordj Badji Mokhtar": ["Bordj Badji Mokhtar", "Tin Zaouatine"],
  "51 - Ouled Djellal": ["Ouled Djellal", "Chaiba", "Sidi Khaled"],
  "52 - Béni Abbès": ["Béni Abbès", "Kerzaz", "Ouled Khodeir", "Tabelbala"],
  "53 - In Salah": ["In Salah", "Abalessa", "Foggaret Ezzaouia", "Idles", "In Ghar", "Tazrouk"],
  "54 - In Guezzam": ["In Guezzam", "Tin Zaouatine"],
  "55 - Touggourt": ["Touggourt", "El Hadjira", "El Ogla", "Nezla", "Tebesbest", "Zaouia El Abidia"],
  "56 - Djanet": ["Djanet", "Bordj Omar Driss"],
  "57 - El M'Ghair": ["El M'Ghair", "Djamaa", "Oum Touyour", "Sidi Khellil"],
  "58 - El Meniaa": ["El Meniaa", "Hassi Gara", "Hassi Fehal"]
};

// ========== PRIX DE LIVRAISON ==========
const shippingPrices = {
  "01 - Adrar": 1500, "02 - Chlef": 700, "03 - Laghouat": 900, "04 - Oum El Bouaghi": 800,
  "05 - Batna": 700, "06 - Béjaïa": 700, "07 - Biskra": 900, "08 - Béchar": 1200,
  "09 - Blida": 700, "10 - Bouira": 700, "11 - Tamanrasset": 2000, "12 - Tébessa": 850,
  "13 - Tlemcen": 800, "14 - Tiaret": 800, "15 - Tizi Ouzou": 700, "16 - Alger": 600,
  "17 - Djelfa": 900, "18 - Jijel": 700, "19 - Sétif": 550, "20 - Saïda": 900,
  "21 - Skikda": 800, "22 - Sidi Bel Abbès": 800, "23 - Annaba": 700, "24 - Guelma": 850,
  "25 - Constantine": 650, "26 - Médéa": 800, "27 - Mostaganem": 800, "28 - M'Sila": 700,
  "29 - Mascara": 800, "30 - Ouargla": 1000, "31 - Oran": 700, "32 - El Bayadh": 1200,
  "33 - Illizi": 1900, "34 - Bordj Bou Arréridj": 600, "35 - Boumerdès": 700, "36 - El Tarf": 850,
  "37 - Tindouf": 1700, "38 - Tissemsilt": 850, "39 - El Oued": 1000, "40 - Khenchela": 600,
  "41 - Souk Ahras": 850, "42 - Tipaza": 600, "43 - Mila": 600, "44 - Aïn Defla": 800,
  "45 - Naâma": 1200, "46 - Aïn Témouchent": 800, "47 - Ghardaïa": 1000, "48 - Relizane": 800,
  "49 - Timimoun": 1500, "50 - Bordj Badji Mokhtar": 600, "51 - Ouled Djellal": 900,
  "52 - Béni Abbès": 1200, "53 - In Salah": 1800, "54 - In Guezzam": 3500,
  "55 - Touggourt": 1000, "56 - Djanet": 3500, "57 - El M'Ghair": 1800, "58 - El Meniaa": 1000
};

const stopDeskPrices = {
  "01 - Adrar": 1000, "02 - Chlef": 450, "03 - Laghouat": 600, "04 - Oum El Bouaghi": 500,
  "05 - Batna": 450, "06 - Béjaïa": 450, "07 - Biskra": 600, "08 - Béchar": 800,
  "09 - Blida": 450, "10 - Bouira": 450, "11 - Tamanrasset": 1200, "12 - Tébessa": 500,
  "13 - Tlemcen": 500, "14 - Tiaret": 500, "15 - Tizi Ouzou": 450, "16 - Alger": 400,
  "17 - Djelfa": 600, "18 - Jijel": 450, "19 - Sétif": 300, "20 - Saïda": 500,
  "21 - Skikda": 500, "22 - Sidi Bel Abbès": 500, "23 - Annaba": 450, "24 - Guelma": 500,
  "25 - Constantine": 400, "26 - Médéa": 500, "27 - Mostaganem": 500, "28 - M'Sila": 450,
  "29 - Mascara": 500, "30 - Ouargla": 600, "31 - Oran": 450, "32 - El Bayadh": 800,
  "33 - Illizi": 1500, "34 - Bordj Bou Arréridj": 400, "35 - Boumerdès": 450, "36 - El Tarf": 500,
  "37 - Tindouf": 1000, "38 - Tissemsilt": 500, "39 - El Oued": 600, "40 - Khenchela": 500,
  "41 - Souk Ahras": 500, "42 - Tipaza": 450, "43 - Mila": 500, "44 - Aïn Defla": 500,
  "45 - Naâma": 800, "46 - Aïn Témouchent": 500, "47 - Ghardaïa": 600, "48 - Relizane": 500,
  "49 - Timimoun": 1000, "50 - Bordj Badji Mokhtar": 1500, "51 - Ouled Djellal": 500,
  "52 - Béni Abbès": 800, "53 - In Salah": 1200, "54 - In Guezzam": 3500,
  "55 - Touggourt": 600, "56 - Djanet": 3500, "57 - El M'Ghair": 1800, "58 - El Meniaa": 600
};

Object.keys(wilayasData).forEach(wilaya => {
  const code = parseInt(wilaya.substring(0, 2));

  if ([16, 9, 42, 35, 31, 25].includes(code)) {
    shippingPrices[wilaya] = 500;
    stopDeskPrices[wilaya] = 300;
  }
  else if ([2, 6, 15, 18, 21, 23, 27].includes(code)) {
    shippingPrices[wilaya] = 600;
    stopDeskPrices[wilaya] = 400;
  }
  else if ([5, 7, 14, 17, 19, 28, 34, 43].includes(code)) {
    shippingPrices[wilaya] = 700;
    stopDeskPrices[wilaya] = 450;
  }
  else if ([8, 30, 39, 47, 49, 50, 51, 55].includes(code)) {
    shippingPrices[wilaya] = 900;
    stopDeskPrices[wilaya] = 600;
  }
  else if ([1, 11, 33, 37, 52, 53, 54, 56, 57, 58].includes(code)) {
    shippingPrices[wilaya] = 1200;
    stopDeskPrices[wilaya] = 800;
  }
  else {
    shippingPrices[wilaya] = 750;
    stopDeskPrices[wilaya] = 500;
  }
});

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
window.updateQuantity = updateCartQuantity;
window.removeFromCart = removeCartItem;
window.openProductDetail = openProductDetail;
window.displayCart = displayCart;
