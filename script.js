// ========== VARIABLES GLOBALES ==========
let products = [];
let cart = [];
let currentProductId = null;

// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', function () {
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
    const snapshot = await db.collection("produits").get();
    products = [];
    snapshot.forEach(doc => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });
    loadProducts();
  } catch (error) {
    console.error("Erreur chargement produits:", error);
    document.getElementById('productsGrid').innerHTML = '<p style="text-align:center; grid-column:1/-1; color:red;">❌ Erreur de chargement des produits.</p>';
  }
}

// ========== AFFICHAGE DES PRODUITS ==========
function loadProducts(filteredProducts = null) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  const productsToDisplay = filteredProducts || products;
  grid.innerHTML = '';

  if (productsToDisplay.length === 0) {
    grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">Aucun produit trouvé.</p>';
    return;
  }

  productsToDisplay.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.onclick = () => openProductDetail(product.id);

    const img = document.createElement('img');
    img.src = product.image;
    img.alt = product.name;
    img.className = 'product-image';
    img.onerror = function() {
      this.src = 'image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22250%22 height=%22200%22%3E%3Crect fill=%22%23ddd%22 width=%22250%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-family=%22Arial%22 font-size=%2216%22 fill=%22%23666%22%3EImage non disponible%3C/text%3E%3C/svg%3E';
    };

    const info = document.createElement('div');
    info.className = 'product-info';
    info.innerHTML = `
      <h3 class="product-name">${product.name}</h3>
      <p class="product-category">${product.category}</p>
      <p class="product-description">${product.description || ''}</p>
      <div class="product-footer">
        <span class="product-price">${(product.price || 0).toFixed(2)} DA</span>
        <button class="add-to-cart-btn" onclick="event.stopPropagation(); addToCart('${product.id}')">Ajouter</button>
      </div>
    `;

    card.appendChild(img);
    card.appendChild(info);
    grid.appendChild(card);
  });
}

// ========== MODAL DÉTAIL PRODUIT ==========
function openProductDetail(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  currentProductId = productId;
  document.getElementById('detailImage').src = product.image;
  document.getElementById('detailName').textContent = product.name;
  document.getElementById('detailCategory').textContent = product.category;
  document.getElementById('detailDescription').textContent = product.description || 'Pas de description.';
  document.getElementById('detailPrice').textContent = (product.price || 0).toFixed(2);

  document.getElementById('productDetailModal').classList.add('active');
}

// ========== FONCTIONS DU PANIER ==========
function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  const existingItem = cart.find(item => item.id === productId);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  saveCartToStorage();
  updateCartCount();
  showNotification(`${product.name} ajouté au panier!`);
}

function updateQuantity(productId, change) {
  const item = cart.find(item => item.id === productId);
  if (item) {
    item.quantity += change;
    if (item.quantity <= 0) {
      removeFromCart(productId);
    } else {
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
    cartItems.innerHTML = '<div class="cart-empty">Votre panier est vide</div>';
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

  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.classList.remove('active');
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
                          product.description.toLowerCase().includes(searchTerm);
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

// ✅ ENVOI À FIREBASE
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
    cartItems: [...cart],
    cartTotal,
    shippingPrice,
    grandTotal,
    date: new Date().toISOString()
  };

  try {
    await db.collection("commandes").add(commande);
    
    document.getElementById('orderFormModal').classList.remove('active');
    document.getElementById('confirmModal').classList.add('active');
    document.getElementById('orderNumber').textContent = orderNumber;

    cart = [];
    saveCartToStorage();
    updateCartCount();
    form.reset();
    document.getElementById('shippingPrice').textContent = '0 DA';

    showNotification('Commande envoyée avec succès!');
  } catch (error) {
    console.error("Erreur Firebase:", error);
    alert("Erreur lors de l'envoi. Vérifiez votre connexion.");
  }
}

// ========== NOTIFICATIONS ==========
function showNotification(message) {
  const notif = document.createElement('div');
  notif.style.cssText = `
    position: fixed; top: 20px; right: 20px;
    background: #27ae60; color: white; padding: 15px 25px;
    border-radius: 5px; z-index: 300;
    animation: slideIn 0.3s ease-out;
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
@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
`;
document.head.appendChild(style);



// ========== DONNÉES WILAYAS & PRIX ==========
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

// ========== PRIX DE LIVRAISON À DOMICILE ==========
const shippingPrices = {
  "01 - Adrar": 1500,
  "02 - Chlef": 700,
  "03 - Laghouat": 1200,
  "04 - Oum El Bouaghi": 800,
  "05 - Batna": 700,
  "06 - Béjaïa": 700,
  "07 - Biskra": 1100,
  "08 - Béchar": 2200,
  "09 - Blida": 700,
  "10 - Bouira": 700,
  "11 - Tamanrasset": 3500,
  "12 - Tébessa": 1100,
  "13 - Tlemcen": 900,
  "14 - Tiaret": 900,
  "15 - Tizi Ouzou": 700,
  "16 - Alger": 600,
  "17 - Djelfa": 1000,
  "18 - Jijel": 700,
  "19 - Sétif": 550,
  "20 - Saïda": 900,
  "21 - Skikda": 800,
  "22 - Sidi Bel Abbès": 900,
  "23 - Annaba": 700,
  "24 - Guelma": 850,
  "25 - Constantine": 650,
  "26 - Médéa": 800,
  "27 - Mostaganem": 800,
  "28 - M'Sila": 700,
  "29 - Mascara": 900,
  "30 - Ouargla": 2000,
  "31 - Oran": 700,
  "32 - El Bayadh": 1500,
  "33 - Illizi": 3000,
  "34 - Bordj Bou Arréridj": 600,
  "35 - Boumerdès": 700,
  "36 - El Tarf": 1100,
  "37 - Tindouf": 3500,
  "38 - Tissemsilt": 900,
  "39 - El Oued": 1800,
  "40 - Khenchela": 800,
  "41 - Souk Ahras": 1100,
  "42 - Tipaza": 700,
  "43 - Mila": 800,
  "44 - Aïn Defla": 800,
  "45 - Naâma": 1500,
  "46 - Aïn Témouchent": 900,
  "47 - Ghardaïa": 1800,
  "48 - Relizane": 800,
  "49 - Timimoun": 2500,
  "50 - Bordj Badji Mokhtar": 3500,
  "51 - Ouled Djellal": 1200,
  "52 - Béni Abbès": 2500,
  "53 - In Salah": 3000,
  "54 - In Guezzam": 3500,
  "55 - Touggourt": 2000,
  "56 - Djanet": 3500,
  "57 - El M'Ghair": 1800,
  "58 - El Meniaa": 1800
};

// ========== PRIX DE LIVRAISON STOP DESK ==========
const stopDeskPrices = {
  "01 - Adrar": 600,
  "02 - Chlef": 600,
  "03 - Laghouat": 600,
  "04 - Oum El Bouaghi": 800,
  "05 - Batna": 700,
  "06 - Béjaïa":700,
  "07 - Biskra": 900,
  "08 - Béchar": 600,
  "09 - Blida": 700,
  "10 - Bouira": 700,
  "11 - Tamanrasset": 600,
  "12 - Tébessa": 850,
  "13 - Tlemcen": 800,
  "14 - Tiaret": 800,
  "15 - Tizi Ouzou": 600,
  "16 - Alger": 600,
  "17 - Djelfa": 600,
  "18 - Jijel": 700,
  "19 - Sétif": 550,
  "20 - Saïda": 900,
  "21 - Skikda": 800,
  "22 - Sidi Bel Abbès": 800,
  "23 - Annaba": 600,
  "24 - Guelma": 850,
  "25 - Constantine": 600,
  "26 - Médéa": 600,
  "27 - Mostaganem": 800,
  "28 - M'Sila": 600,
  "29 - Mascara": 800,
  "30 - Ouargla": 600,
  "31 - Oran": 600,
  "32 - El Bayadh": 600,
  "33 - Illizi": 600,
  "34 - Bordj Bou Arréridj": 600,
  "35 - Boumerdès": 700,
  "36 - El Tarf": 850,
  "37 - Tindouf": 600,
  "38 - Tissemsilt": 850,
  "39 - El Oued": 600,
  "40 - Khenchela": 600,
  "41 - Souk Ahras": 850,
  "42 - Tipaza": 600,
  "43 - Mila": 600,
  "44 - Aïn Defla": 800,
  "45 - Naâma": 600,
  "46 - Aïn Témouchent": 800,
  "47 - Ghardaïa": 600,
  "48 - Relizane": 800,
  "49 - Timimoun": 600,
  "50 - Bordj Badji Mokhtar": 600,
  "51 - Ouled Djellal": 900,
  "52 - Béni Abbès": 600,
  "53 - In Salah": 600,
  "54 - In Guezzam": 600,
  "55 - Touggourt": 600,
  "56 - Djanet": 600,
  "57 - El M'Ghair": 600,
  "58 - El Meniaa": 600
};