// ========== IMPORT FIREBASE ==========
import { collection, getDocs, addDoc, query, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from './firebase-config.js';

// ========== VARIABLES GLOBALES ==========
let products = [];
let cart = [];
let currentProductId = null;

// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', function () {
  console.log("🚀 Application démarrée...");
  loadProductsFromFirebase();
  setupEventListeners();
  loadCartFromStorage();
  
  // ربط زر الإضافة في Modal
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
  try {
    console.log("📦 Chargement des produits depuis Firebase...");
    const productsRef = collection(db, "produits");
    const productsQuery = query(productsRef);
    const querySnapshot = await getDocs(productsQuery);
    
    products = [];
    querySnapshot.forEach(doc => {
      console.log("📄 Produit trouvé:", doc.id, doc.data());
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`✅ ${products.length} produits chargés`);
    
    if (products.length === 0) {
      console.warn("⚠️ Aucun produit trouvé dans la base de données!");
      document.getElementById('productsGrid').innerHTML = `
        <p style="text-align:center;color:#e74c3c; padding: 40px;">
          ⚠️ Aucun produit disponible pour le moment.<br>
          Veuillez contacter l'administrateur.
        </p>
      `;
    } else {
      loadProducts();
      loadCategories(); // ✅ Charger les catégories
    }
  } catch (error) {
    console.error("❌ Erreur chargement produits:", error);
    document.getElementById('productsGrid').innerHTML = `
      <p style="text-align:center;color:red; padding: 40px;">
        ❌ Erreur de chargement des produits.<br>
        Vérifiez votre connexion internet.
      </p>
    `;
  }
}

// ========== CHARGER LES CATÉGORIES AVEC QUANTITÉS RÉELLES ==========
// ========== تحميل الفئات مع العدد الحقيقي للمنتجات ==========
function loadCategories() {
  const categoriesSlider = document.getElementById('categoriesSlider');
  if (!categoriesSlider) return;
  
  // تعريف الفئات مع أسماء الصور
  const categories = [
    { id: 'proteines', name: 'Protéines Whey', image: 'images/proteines.jpg' },
    { id: 'gainer', name: 'Masse / Gainer', image: 'images/gainer.jpg' },
    { id: 'fatburner', name: 'Brûleur de Graisse', image: 'images/fatburner.jpg' },
    { id: 'acide', name: 'Acides Aminés', image: 'images/acide.jpg' },
    { id: 'creatine', name: 'Créatine', image: 'images/creatine.jpg' },
    { id: 'accessories', name: 'Accessoires', image: 'images/accessories.jpg' }
  ];
  
  // عدّ المنتجات في كل فئة
  const categoryCounts = {};
  products.forEach(product => {
    const category = product.category;
    if (category) {
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    }
  });
  
  // إنشاء بطاقات الفئات
  categoriesSlider.innerHTML = '';
  
  categories.forEach(cat => {
    const count = categoryCounts[cat.id] || 0;
    if (count === 0) return; // عدم عرض الفئات الفارغة
    
    const card = document.createElement('div');
    card.className = 'category-card';
    card.setAttribute('data-category', cat.id);
    
    card.innerHTML = `
      <img src="${cat.image}" alt="${cat.name}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22140%22 viewBox=%220 0 200 150%22%3E%3Crect fill=%22%233498db%22 width=%22200%22 height=%22150%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22white%22 font-size=%2220%22%3E${cat.name.substring(0, 10)}%3C/text%3E%3C/svg%3E'">
      <h3>${cat.name}</h3>
      <p>${count} produit${count > 1 ? 's' : ''}</p>
    `;
    
    // إضافة حدث النقر لفلترة المنتجات
    card.addEventListener('click', () => filterByCategory(cat.id));
    
    categoriesSlider.appendChild(card);
  });
  
  console.log("✅ الفئات تم تحميلها مع العدد الحقيقي للمنتجات");
}

// ========== فلترة المنتجات حسب الفئة ==========
function filterByCategory(category) {
  console.log("🔍 فلترة حسب الفئة:", category);
  
  // إزالة التحديد من جميع الفئات
  document.querySelectorAll('.category-card').forEach(card => {
    card.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    card.style.transform = 'none';
  });
  
  // إضافة تأثير التحديد للفئة المختارة
  const selectedCard = document.querySelector(`.category-card[data-category="${category}"]`);
  if (selectedCard) {
    selectedCard.style.boxShadow = '0 8px 20px rgba(52, 152, 219, 0.4)';
    selectedCard.style.transform = 'translateY(-5px)';
    
    // إلغاء التحديد بعد 1.5 ثانية
    setTimeout(() => {
      selectedCard.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      selectedCard.style.transform = 'none';
    }, 1500);
  }
  
  // فلترة المنتجات
  if (category === 'all') {
    loadProducts();
    document.getElementById('categoryFilter').value = '';
  } else {
    const filtered = products.filter(product => 
      product.category && product.category.toLowerCase() === category.toLowerCase()
    );
    loadProducts(filtered);
    
    // تحديث الفلتر في القائمة المنسدلة
    const filterSelect = document.getElementById('categoryFilter');
    if (filterSelect) {
      filterSelect.value = category;
    }
  }
}

// ========== تعديل دالة التحميل ==========
document.addEventListener('DOMContentLoaded', function () {
  console.log("🚀 تطبيق بدأ...");
  loadProductsFromFirebase();
  setupEventListeners();
  loadCartFromStorage();
  
  // ربط زر الإضافة في Modal
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

// تعديل دالة تحميل المنتجات
async function loadProductsFromFirebase() {
  try {
    console.log("📦 تحميل المنتجات من Firebase...");
    const productsRef = collection(db, "produits");
    const productsQuery = query(productsRef);
    const querySnapshot = await getDocs(productsQuery);
    
    products = [];
    querySnapshot.forEach(doc => {
      console.log("📄 منتج تم العثور عليه:", doc.id, doc.data());
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`✅ ${products.length} منتج تم تحميله`);
    
    if (products.length === 0) {
      console.warn("⚠️ لا يوجد منتجات في قاعدة البيانات!");
      document.getElementById('productsGrid').innerHTML = `
        <p style="text-align:center;color:#e74c3c; padding: 40px;">
          ⚠️ لا يوجد منتجات متاحة في الوقت الحالي.<br>
          يرجى الاتصال بالإدارة.
        </p>
      `;
    } else {
      loadProducts();
      loadCategories(); // ✅ تحميل الفئات مع العدد الحقيقي للمنتجات
    }
  } catch (error) {
    console.error("❌ خطأ في تحميل المنتجات:", error);
    document.getElementById('productsGrid').innerHTML = `
      <p style="text-align:center;color:red; padding: 40px;">
        ❌ خطأ في تحميل المنتجات.<br>
        يرجى التحقق من اتصال الإنترنت.
      </p>
    `;
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
      <p style="text-align:center;color:#7f8c8d; padding: 40px;">
        Aucun produit trouvé.
      </p>
    `;
    return;
  }
  
  productsToDisplay.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // ✅ عند الضغط على الكارت كله (ما عدا زر "Ajouter")
    card.addEventListener('click', (e) => {
      // لا تفتح المودال إذا ضغط على زر "Ajouter"
      if (e.target.classList.contains('add-to-cart-btn')) {
        return;
      }
      openProductDetail(product.id);
    });
    
    const img = document.createElement('img');
    img.src = product.image || 'image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="250" height="200"%3E%3Crect fill="%23ddd" width="250" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-family="Arial" font-size="16" fill="%23666"%3EImage non disponible%3C/text%3E%3C/svg%3E';
    img.alt = product.name;
    img.className = 'product-image';
    img.style.cssText = `
      width: 100%;
      height: 200px;
      object-fit: contain;
      display: block;
    `;
    img.onerror = function() {
      this.src = 'image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="250" height="200"%3E%3Crect fill="%23ddd" width="250" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-family="Arial" font-size="16" fill="%23666"%3EImage non disponible%3C/text%3E%3C/svg%3E';
      this.style.height = '200px';
      this.style.objectFit = 'contain';
    };
    
    // ✅ جعل الصورة قابلة للضغط لفتح المودال
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      openProductDetail(product.id);
    });
    
    const info = document.createElement('div');
    info.className = 'product-info';
    
    // ✅ عرض جزء من الوصف فقط (50 حرف)
    const shortDescription = truncateDescription(product.description || '', 50);
    
    // ✅ عرض الكمية
    let quantityHTML = '';
    const quantity = product.quantity || 0;
    if (quantity > 0) {
      quantityHTML = `<span class="product-quantity">${quantity} en stock</span>`;
    } else {
      quantityHTML = `<span class="product-quantity out-of-stock">Rupture de stock</span>`;
    }
    
    info.innerHTML = `
      <h3 class="product-name">${product.name || 'Produit sans nom'}</h3>
      <p class="product-category">${product.category || 'Catégorie inconnue'}</p>
      <p class="product-description">${shortDescription}</p>
      ${quantityHTML}
      <div class="product-footer">
        <span class="product-price">${(product.price || 0).toFixed(2)} DA</span>
        <button class="add-to-cart-btn" data-product-id="${product.id}">
          ${quantity > 0 ? 'Ajouter' : 'Indisponible'}
        </button>
      </div>
    `;
    
    card.appendChild(img);
    card.appendChild(info);
    grid.appendChild(card);
  });
  
  // ✅ إضافة مستمع للأحداث لكل أزرار "Ajouter"
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const productId = btn.getAttribute('data-product-id');
      addToCart(productId);
    });
  });
  
  // Animation scroll
  setTimeout(() => {
    document.querySelectorAll('.product-card').forEach(card => {
      card.classList.add('visible');
    });
  }, 100);
}

// ✅ دالة لاقتطاع الوصف
function truncateDescription(description, maxLength) {
  if (!description) return '';
  // إزالة المسافات الزائدة
  description = description.trim();
  if (description.length <= maxLength) {
    return description;
  }
  // اقتطاع الكلمات الكاملة فقط
  const trimmed = description.substring(0, maxLength);
  const lastSpace = trimmed.lastIndexOf(' ');
  if (lastSpace > 0) {
    return trimmed.substring(0, lastSpace) + '...';
  }
  return trimmed + '...';
}

// ========== MODAL DÉTAIL PRODUIT ==========
function openProductDetail(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  
  currentProductId = productId;
  
  // ✅ عرض الصورة
  const detailImage = document.getElementById('detailImage');
  detailImage.src = product.image || 'image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="250" height="200"%3E%3Crect fill="%23ddd" width="250" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-family="Arial" font-size="16" fill="%23666"%3EImage non disponible%3C/text%3E%3C/svg%3E';
  
  // ✅ عرض الاسم
  document.getElementById('detailName').textContent = product.name || 'Produit sans nom';
  
  // ✅ عرض الفئة
  document.getElementById('detailCategory').textContent = product.category || 'Catégorie inconnue';
  
  // ✅ عرض الكمية في المودال
  const quantity = product.quantity || 0;
  let quantityText = '';
  if (quantity > 0) {
    quantityText = `<span style="color: #27ae60; font-weight: bold;">${quantity} en stock</span>`;
  } else {
    quantityText = `<span style="color: #e74c3c; font-weight: bold;">Rupture de stock</span>`;
  }
  
  // ✅ عرض الوصف الكامل بتنسيق أفضل
  const description = product.description || 'Pas de description disponible.';
  document.getElementById('detailDescription').innerHTML = `
    <strong>Description:</strong><br>
    <span style="font-size: 16px; line-height: 1.6; color: #34495e;">
      ${description.replace(/\n/g, '<br>')}
    </span>
    <br><br>
    <strong>Quantité:</strong><br>
    ${quantityText}
  `;
  
  // ✅ عرض السعر
  document.getElementById('detailPrice').textContent = (product.price || 0).toFixed(2);
  
  // ✅ فتح المودال
  document.getElementById('productDetailModal').classList.add('active');
  console.log(`📦 Détails du produit "${product.name}" affichés`);
}

// ========== FILTRER PAR CATÉGORIE ==========
function filterByCategory(category) {
  console.log("🔍 Filtrer par catégorie:", category);
  
  // Mettre en évidence la catégorie sélectionnée
  document.querySelectorAll('.category-card').forEach(card => {
    card.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    card.style.transform = 'none';
  });
  
  const selectedCard = document.querySelector(`.category-card[data-category="${category}"]`);
  if (selectedCard) {
    selectedCard.style.boxShadow = '0 8px 20px rgba(52, 152, 219, 0.4)';
    selectedCard.style.transform = 'translateY(-5px)';
    
    // Réinitialiser après 1.5 secondes
    setTimeout(() => {
      selectedCard.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      selectedCard.style.transform = 'none';
    }, 1500);
  }
  
  // Filtrer les produits
  if (category === 'all') {
    loadProducts();
    document.getElementById('categoryFilter').value = '';
  } else {
    const filtered = products.filter(product => 
      product.category && product.category.toLowerCase() === category.toLowerCase()
    );
    loadProducts(filtered);
    
    // Mettre à jour le filtre dans le menu déroulant
    const filterSelect = document.getElementById('categoryFilter');
    if (filterSelect) {
      filterSelect.value = category;
    }
  }
}

// ========== FONCTIONS DU PANIER ==========
function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  
  // ✅ التحقق من الكمية قبل الإضافة
  const quantity = product.quantity || 0;
  if (quantity <= 0) {
    showNotification('Produit indisponible - rupture de stock!', 'error');
    return;
  }
  
  const existingItem = cart.find(item => item.id === productId);
  if (existingItem) {
    // ✅ التحقق من الكمية المتبقية
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
  if (item) {
    item.quantity += change;
    if (item.quantity <= 0) {
      removeFromCart(productId);
    } else {
      // ✅ التحقق من الكمية المتبقية في المخزن
      const product = products.find(p => p.id === productId);
      const maxQuantity = product.quantity || 0;
      if (item.quantity > maxQuantity) {
        item.quantity = maxQuantity;
        showNotification('Quantité maximale atteinte!', 'error');
      }
      saveCartToStorage();
      displayCart();
    }
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
  let total = 0;
  
  if (cart.length === 0) {
    cartItems.innerHTML = `
      <p class="cart-empty">Votre panier est vide</p>
    `;
    document.getElementById('totalPrice').textContent = '0.00';
    document.getElementById('checkoutBtn').disabled = true;
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
  
  document.getElementById('totalPrice').textContent = total.toFixed(2);
  document.getElementById('checkoutBtn').disabled = false;
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById('cartCount').textContent = count;
}

function saveCartToStorage() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
  const saved = localStorage.getItem('cart');
  if (saved) {
    cart = JSON.parse(saved);
    updateCartCount();
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
  
  cartBtn?.addEventListener('click', () => {
    cartModal.classList.add('active');
    displayCart();
  });
  
  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal').classList.remove('active');
    });
  });
  
  // ✅ إغلاق المودال عند الضغط خارجه
  window.addEventListener('click', (e) => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });
  
  // ✅ إغلاق المودال عند الضغط على ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
      });
    }
  });
  
  checkoutBtn?.addEventListener('click', () => {
    if (cart.length > 0) {
      cartModal.classList.remove('active');
      openOrderForm();
    }
  });
  
  searchInput?.addEventListener('input', filterProducts);
  categoryFilter?.addEventListener('change', filterProducts);
}

function filterProducts() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const selectedCategory = document.getElementById('categoryFilter').value;
  
  const filtered = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
      (product.description && product.description.toLowerCase().includes(searchTerm));
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
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
  select.innerHTML = '<option value="">Sélectionner une wilaya</option>';
  Object.keys(wilayasData).forEach(wilaya => {
    const opt = document.createElement('option');
    opt.value = wilaya;
    opt.textContent = wilaya;
    select.appendChild(opt);
  });
}

function updateShippingPrice() {
  const type = document.getElementById('orderType').value;
  const wilaya = document.getElementById('wilaya').value;
  const priceEl = document.getElementById('shippingPrice');
  const info = document.querySelector('.shipping-info');
  
  if (!wilaya) {
    priceEl.textContent = '0 DA';
    info?.classList.remove('active');
    return;
  }
  
  let price = 0;
  if (type === 'domicile') price = shippingPrices[wilaya] || 0;
  else if (type === 'stopdesk') price = stopDeskPrices[wilaya] || 0;
  
  priceEl.textContent = price + ' DA';
  info?.classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
  const wilayaSel = document.getElementById('wilaya');
  const typeSel = document.getElementById('orderType');
  const communeSel = document.getElementById('commune');
  
  wilayaSel?.addEventListener('change', () => {
    const w = wilayaSel.value;
    communeSel.innerHTML = '<option value="">Sélectionner une commune</option>';
    updateShippingPrice();
    if (w && wilayasData[w]) {
      wilayasData[w].forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        communeSel.appendChild(opt);
      });
    }
  });
  
  typeSel?.addEventListener('change', updateShippingPrice);
  
  document.getElementById('orderForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    submitOrderForm();
  });
});

// ✅ ENVOI À FIREBASE + تقليل الكمية
async function submitOrderForm() {
  const form = document.getElementById('orderForm');
  const orderType = form.orderType.value;
  const wilaya = form.wilaya.value;
  const commune = form.commune.value;
  
  if (!orderType || !wilaya || !commune) {
    alert("Veuillez remplir tous les champs obligatoires.");
    return;
  }
  
  let shippingPrice = 0;
  if (orderType === 'domicile') shippingPrice = shippingPrices[wilaya] || 0;
  else if (orderType === 'stopdesk') shippingPrice = stopDeskPrices[wilaya] || 0;
  
  const orderNumber = generateOrderNumber();
  const cartTotal = parseFloat(document.getElementById('totalPrice').textContent);
  const grandTotal = cartTotal + shippingPrice;
  
  const commande = {
    orderNumber,
    status: 'pending',
    orderType,
    firstName: form.firstName.value.trim(),
    lastName: form.lastName.value.trim(),
    phone1: form.phone1.value.trim(),
    phone2: form.phone2.value.trim() || null,
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
    
    // ✅ حفظ الطلب في قاعدة البيانات
    const orderRef = await addDoc(collection(db, "commandes"), commande);
    console.log("✅ Commande sauvegardée avec ID:", orderRef.id);
    
    // ✅ تقليل الكمية من المنتجات في قاعدة البيانات
    console.log("🔄 Mise à jour des quantités des produits...");
    const updateResults = await updateProductsQuantities(cart);
    
    // ✅ تحديث المنتجات المحلية
    console.log("🔄 Rechargement des produits depuis Firebase...");
    await loadProductsFromFirebase();
    
    // ✅ إغلاق المودال وإظهار رسالة النجاح
    document.getElementById('orderFormModal').classList.remove('active');
    document.getElementById('confirmModal').classList.add('active');
    document.getElementById('orderNumber').textContent = orderNumber;
    
    // ✅ إفراغ السلة
    cart = [];
    saveCartToStorage();
    updateCartCount();
    
    // ✅ إعادة تعيين النموذج
    form.reset();
    document.getElementById('shippingPrice').textContent = '0 DA';
    showNotification(`Commande envoyée avec succès! Quantités mises à jour.`, 'success');
    console.log("✅ Commande envoyée avec succès et quantités mises à jour!");
  } catch (error) {
    console.error("❌ Erreur Firebase:", error);
    alert("Erreur lors de l'envoi. Vérifiez votre connexion.");
  }
}

// ✅ دالة لتقليل الكمية من المنتجات في قاعدة البيانات
async function updateProductsQuantities(cartItems) {
  const results = [];
  for (const item of cartItems) {
    try {
      console.log(`📦 Mise à jour du produit: ${item.name} (ID: ${item.id})`);
      const productRef = doc(db, "produits", item.id);
      const productDoc = await getDoc(productRef);
      
      if (productDoc.exists()) {
        const currentQuantity = productDoc.data().quantity || 0;
        const newQuantity = currentQuantity - item.quantity;
        console.log(`  Quantité actuelle: ${currentQuantity}, Quantité à soustraire: ${item.quantity}, Nouvelle quantité: ${newQuantity}`);
        
        // ✅ التأكد من أن الكمية لا تصبح سالبة
        if (newQuantity >= 0) {
          await updateDoc(productRef, {
            quantity: newQuantity
          });
          console.log(`✅ Quantité du produit "${item.name}" mise à jour: ${currentQuantity} → ${newQuantity}`);
          results.push({ success: true, productId: item.id, newQuantity });
        } else {
          console.warn(`⚠️ Quantité insuffisante pour "${item.name}". Stock actuel: ${currentQuantity}`);
          results.push({ success: false, productId: item.id, reason: 'Insufficient quantity' });
        }
      } else {
        console.warn(`⚠️ Produit non trouvé: ${item.id}`);
        results.push({ success: false, productId: item.id, reason: 'Product not found' });
      }
    } catch (error) {
      console.error(`❌ Erreur mise à jour quantité pour "${item.name}":`, error);
      results.push({ success: false, productId: item.id, reason: error.message });
    }
  }
  return results;
}

// ========== NOTIFICATIONS ==========
function showNotification(message, type = 'success') {
  const notif = document.createElement('div');
  const bgColor = type === 'success' ? '#27ae60' : '#e74c3c';
  notif.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${bgColor};
    color: white;
    padding: 15px 25px;
    border-radius: 5px;
    z-index: 300;
    animation: slideIn 0.3s ease-out;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    font-size: 14px;
  `;
  notif.textContent = message;
  document.body.appendChild(notif);
  
  setTimeout(() => {
    notif.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notif.remove(), 300);
  }, 3000);
}

const style = document.createElement('style');
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

// ========== DONNÉES WILAYAS & PRIX ==========
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

// ========== PRIX DE LIVRAISON À DOMICILE ==========
const shippingPrices = {
  "01 - Adrar": 1500, "02 - Chlef": 700, "03 - Laghouat": 1200, "04 - Oum El Bouaghi": 800,
  "05 - Batna": 700, "06 - Béjaïa": 700, "07 - Biskra": 1100, "08 - Béchar": 2200,
  "09 - Blida": 700, "10 - Bouira": 700, "11 - Tamanrasset": 3500, "12 - Tébessa": 1100,
  "13 - Tlemcen": 900, "14 - Tiaret": 900, "15 - Tizi Ouzou": 700, "16 - Alger": 600,
  "17 - Djelfa": 1000, "18 - Jijel": 700, "19 - Sétif": 550, "20 - Saïda": 900,
  "21 - Skikda": 800, "22 - Sidi Bel Abbès": 900, "23 - Annaba": 700, "24 - Guelma": 850,
  "25 - Constantine": 650, "26 - Médéa": 800, "27 - Mostaganem": 800, "28 - M'Sila": 700,
  "29 - Mascara": 900, "30 - Ouargla": 2000, "31 - Oran": 700, "32 - El Bayadh": 1500,
  "33 - Illizi": 3000, "34 - Bordj Bou Arréridj": 600, "35 - Boumerdès": 700, "36 - El Tarf": 1100,
  "37 - Tindouf": 3500, "38 - Tissemsilt": 900, "39 - El Oued": 1800, "40 - Khenchela": 800,
  "41 - Souk Ahras": 1100, "42 - Tipaza": 700, "43 - Mila": 800, "44 - Aïn Defla": 800,
  "45 - Naâma": 1500, "46 - Aïn Témouchent": 900, "47 - Ghardaïa": 1800, "48 - Relizane": 800,
  "49 - Timimoun": 2500, "50 - Bordj Badji Mokhtar": 3500, "51 - Ouled Djellal": 1200,
  "52 - Béni Abbès": 2500, "53 - In Salah": 3000, "54 - In Guezzam": 3500, "55 - Touggourt": 2000,
  "56 - Djanet": 3500, "57 - El M'Ghair": 1800, "58 - El Meniaa": 1800
};

// ========== PRIX DE LIVRAISON STOP DESK ==========
const stopDeskPrices = {
  "01 - Adrar": 600, "02 - Chlef": 600, "03 - Laghouat": 600, "04 - Oum El Bouaghi": 800,
  "05 - Batna": 700, "06 - Béjaïa": 700, "07 - Biskra": 900, "08 - Béchar": 600,
  "09 - Blida": 700, "10 - Bouira": 700, "11 - Tamanrasset": 600, "12 - Tébessa": 850,
  "13 - Tlemcen": 800, "14 - Tiaret": 800, "15 - Tizi Ouzou": 600, "16 - Alger": 600,
  "17 - Djelfa": 600, "18 - Jijel": 700, "19 - Sétif": 550, "20 - Saïda": 900,
  "21 - Skikda": 800, "22 - Sidi Bel Abbès": 800, "23 - Annaba": 600, "24 - Guelma": 850,
  "25 - Constantine": 600, "26 - Médéa": 600, "27 - Mostaganem": 800, "28 - M'Sila": 600,
  "29 - Mascara": 800, "30 - Ouargla": 600, "31 - Oran": 600, "32 - El Bayadh": 600,
  "33 - Illizi": 600, "34 - Bordj Bou Arréridj": 600, "35 - Boumerdès": 700, "36 - El Tarf": 850,
  "37 - Tindouf": 600, "38 - Tissemsilt": 850, "39 - El Oued": 600, "40 - Khenchela": 600,
  "41 - Souk Ahras": 850, "42 - Tipaza": 600, "43 - Mila": 600, "44 - Aïn Defla": 800,
  "45 - Naâma": 600, "46 - Aïn Témouchent": 800, "47 - Ghardaïa": 600, "48 - Relizane": 800,
  "49 - Timimoun": 600, "50 - Bordj Badji Mokhtar": 600, "51 - Ouled Djellal": 900,
  "52 - Béni Abbès": 600, "53 - In Salah": 600, "54 - In Guezzam": 600, "55 - Touggourt": 600,
  "56 - Djanet": 600, "57 - El M'Ghair": 600, "58 - El Meniaa": 600
};

