/* ==============================
   GESTION DES PRODUITS & PANIER
   ============================== */
import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let products = [];
let cart = [];
let shippingPrice = 0;

// ========== CHARGEMENT DES PRODUITS ==========
async function loadProducts() {
    const grid = document.getElementById('productsGrid');
    try {
        const snapshot = await getDocs(query(collection(db, "produits"), orderBy("dateAdded", "desc")));
        products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });
        displayProducts(products);
    } catch (error) {
        console.error("Erreur chargement produits:", error);
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; color: var(--warning); margin-bottom: 16px;"></i>
                <p>Erreur de chargement des produits</p>
            </div>`;
    }
}

function displayProducts(productsToDisplay) {
    const grid = document.getElementById('productsGrid');
    if (productsToDisplay.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px;">
                <i class="fa-solid fa-box-open" style="font-size: 3rem; color: var(--text-light); margin-bottom: 16px;"></i>
                <p>Aucun produit disponible</p>
            </div>`;
        return;
    }
    grid.innerHTML = productsToDisplay.map(product => `
        <div class="product-card">
            <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='https://via.placeholder.com/300x220?text=Produit'">
            <div class="product-info">
                <div class="product-category">${product.category || 'Général'}</div>
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description || 'Pas de description'}</p>
                <div class="product-footer">
                    <span class="product-price">${product.price.toFixed(2)} DA</span>
                    <button class="add-to-cart" onclick="addToCart('${product.id}')">
                        <i class="fa-solid fa-cart-plus"></i> Ajouter
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ========== FILTRES ==========
document.getElementById('categoryFilters')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        const category = e.target.dataset.category;
        if (category === 'all') {
            displayProducts(products);
        } else {
            const filtered = products.filter(p => p.category === category);
            displayProducts(filtered);
        }
    }
});

// ========== PANIER ==========
function loadCart() {
    const saved = localStorage.getItem('amarCart');
    if (saved) {
        cart = JSON.parse(saved);
        updateCartCount();
    }
}

function saveCart() {
    localStorage.setItem('amarCart', JSON.stringify(cart));
    updateCartCount();
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCount').textContent = count;
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
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
    if (item.quantity <= 0) {
        removeFromCart(productId);
    } else {
        saveCart();
        displayCart();
    }
}

function openCart() {
    displayCart();
    document.getElementById('cartModal').classList.add('active');
}

function closeCart() {
    document.getElementById('cartModal').classList.remove('active');
}

function displayCart() {
    const container = document.getElementById('cartItems');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 40px 0;">Votre panier est vide</p>';
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
                        <button class="qty-btn" style="color: var(--danger); border-color: var(--danger);" onclick="removeFromCart('${item.id}')">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div style="font-weight: 600;">${(item.price * item.quantity).toFixed(2)} DA</div>
            </div>
        `;
    }).join('');
    
    document.getElementById('cartTotal').textContent = total.toFixed(2);
}

function getCartTotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// ========== CHECKOUT ==========
function openCheckout() {
    if (cart.length === 0) {
        showToast('Votre panier est vide', 'error');
        return;
    }
    closeCart();
    loadWilayas();
    document.getElementById('checkoutModal').classList.add('active');
}

function closeCheckout() {
    document.getElementById('checkoutModal').classList.remove('active');
}

function updateShipping() {
    const orderType = document.getElementById('orderType').value;
    const shippingInfo = document.getElementById('shippingInfo');
    
    if (orderType === 'domicile') {
        shippingPrice = 500;
        shippingInfo.style.display = 'block';
    } else if (orderType === 'stopdesk') {
        shippingPrice = 0;
        shippingInfo.style.display = 'block';
    } else {
        shippingInfo.style.display = 'none';
        return;
    }
    
    const cartTotal = getCartTotal();
    const grandTotal = cartTotal + shippingPrice;
    
    document.getElementById('shippingPrice').textContent = shippingPrice.toFixed(2) + ' DA';
    document.getElementById('grandTotal').textContent = grandTotal.toFixed(2) + ' DA';
}

// ========== WILAYAS & COMMUNES ==========
const wilayasData = {
    "16": ["Alger Centre", "Sidi M'Hamed", "El Madania", "Belouizdad", "Bab El Oued", "Casbah", "Oued Koriche", "Bologhine", "Casbah", "El Biar", "Bouzareah", "Birkhadem", "El Harrach", "Baraki", "Oued Smar", "Bachdjerrah", "Hussein Dey", "Kouba", "Bab Ezzouar", "Ben Aknoun", "Dely Ibrahim", "El Hammamet", "Raïs Hamidou", "Djasr Kasentina", "El Mouradia", "Hydra", "Mohammadia", "Bordj El Kiffan", "El Magharia", "Beni Messous", "Les Eucalyptus", "Birtouta", "Tessala El Merdja", "Ouled Chebel", "Sidi Moussa", "Aïn Taya", "Bordj El Bahri", "El Marsa", "H'Raoua", "Rouïba", "Reghaïa", "Aïn Benian", "Staoueli", "Zeralda", "Mahelma", "Rahmania", "Souidania", "Cheraga", "Ouled Fayet", "El Achour", "Draria", "Douera", "Baba Hassen", "Khraicia", "Saoula"],
    "31": ["Oran", "Es Senia", "Bir El Djir", "Hassi Bounif", "Hassi Ben Okba", "Tafraoui", "Sidi Chami", "Boutlelis", "Ami El Foules", "Mers El Kébir", "Bousfer", "El Ançor", "Oued Tlelat", "Tafraoui", "Sidi Ben Yebka", "Ben Freha", "Hassi Mefsoukh", "Es Senia", "Arzew", "Gdyel", "Bethioua", "Marsat El Hadjadj", "Aïn Turk", "El Ancor", "Oued Rhiou", "Boufatis", "Misserghin", "Ben M'Hidi", "Tafraoui", "Aïn El Turk", "El Ancor"]
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
    const wilayaCode = document.getElementById('wilaya').value;
    const communeSelect = document.getElementById('commune');
    communeSelect.innerHTML = '<option value="">Sélectionner une commune</option>';
    
    if (wilayaCode && wilayasData[wilayaCode]) {
        wilayasData[wilayaCode].forEach(commune => {
            const opt = document.createElement('option');
            opt.value = commune;
            opt.textContent = commune;
            communeSelect.appendChild(opt);
        });
    }
}

// ========== SOUMISSION COMMANDE ==========
async function submitOrder() {
    const form = document.getElementById('checkoutForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
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
        
        // Show success
        document.getElementById('orderNumberDisplay').textContent = orderData.orderNumber;
        document.getElementById('checkoutModal').classList.remove('active');
        document.getElementById('successModal').classList.add('active');
        
        // Clear cart
        cart = [];
        saveCart();
        
        showToast('✅ Commande créée avec succès!', 'success');
    } catch (error) {
        console.error("Erreur commande:", error);
        showToast('❌ Erreur lors de la commande', 'error');
    }
}

function continueShopping() {
    document.getElementById('successModal').classList.remove('active');
}

// ========== UTILITAIRES ==========
function showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    loadCart();
});
