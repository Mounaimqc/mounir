// livraison.js

// ✅ عدّل الـ import بأسماء الكوليكشن الصحيحة
import { 
  db, 
  commandesCollection,  // ← تغير من ordersCollection
  produitsCollection,   // ← جديد إذا حبيت تجيب تفاصيل المنتجات
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  updateDoc 
} from './firebase-config.js';

// ===== Global Vars =====
let deliveries = [], selectedDeliveries = [], wilayas = [];
let products = []; // ← جديد: لتخزين المنتجات
let currentDeliveryId = null;

// ===== Init =====
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Livraisons page loaded');
  
  const yearEl = document.getElementById('currentYear');
  if(yearEl) yearEl.textContent = new Date().getFullYear();
  
  initSidebar();
  await loadWilayas();
  await loadProducts(); // ← جديد: حمّل المنتجات أولاً
  await loadDeliveries(); // ← يحمّل الطلبات من commande
  initEventListeners();
  
  console.log('✅ Initialization complete');
});

// ===== LOAD PRODUCTS (Optional - إذا حبيت تفاصيل المنتجات) =====
async function loadProducts() {
  try {
    console.log('🔄 Fetching products from Firebase...');
    const snapshot = await getDocs(produitsCollection);
    
    products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ Loaded ${products.length} products`);
  } catch(error) {
    console.error('❌ Error loading products:', error);
  }
}

// ===== 🔥 LOAD DELIVERIES FROM FIREBASE (من كوليكشن commande) =====
async function loadDeliveries() {
  const tbody = document.getElementById('deliveriesTableBody');
  
  try {
    console.log('🔄 Fetching deliveries from commande collection...');
    
    // ✅ Query على كوليكشن commande
    const q = query(
      commandesCollection, 
      where('status', '!=', 'cancelled'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    console.log(`📦 Found ${snapshot.size} documents in commande`);
    
    if(snapshot.empty) {
      console.warn('⚠️ No deliveries found in database');
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:40px; color:var(--text-light);">
        <i class="fa-solid fa-inbox" style="font-size:2rem; margin-bottom:10px; display:block;"></i>
        Aucune livraison trouvée</td></tr>`;
      updateStats();
      return;
    }
    
    // ✅ Transform Firestore docs to array
    deliveries = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      
      // ✅ تجميع أسماء المنتجات من items
      let itemsDetails = [];
      if(data.items && Array.isArray(data.items)) {
        itemsDetails = data.items.map(item => {
          // إذا عندك product ID في item، تقدر تجيب التفاصيل من products array
          const product = products.find(p => p.id === item.productId || p.id === item.id);
          return {
            name: item.name || product?.name || 'Produit',
            price: item.price || product?.price || 0,
            quantity: item.quantity || 1,
            image: item.image || product?.image || ''
          };
        });
      }
      
      return {
        id: docSnap.id,
        orderNumber: data.orderNumber || `CMD-${docSnap.id.slice(0,6).toUpperCase()}`,
        clientName: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Client inconnu',
        phone: data.phone1 || data.phone || 'N/A',
        phone2: data.phone2 || '',
        email: data.email || '',
        address: data.address || data.commune || '',
        wilaya: data.wilaya || 'Non spécifiée',
        commune: data.commune || '',
        type: data.orderType || data.type || 'domicile',
        status: data.status || 'pending',
        driver: data.driver || null,
        driverNote: data.driverNote || '',
        estimatedDate: data.estimatedDate || '',
        orderDate: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
        items: itemsDetails,
        cartTotal: data.cartTotal || 0,
        shipping: data.shipping || 0,
        total: data.total || 0,
        orderCount: 1,
        totalSpent: data.total || 0
      };
    });
    
    console.log('✅ Deliveries loaded:', deliveries);
    renderDeliveries(deliveries);
    updateStats();
    
  } catch(error) {
    console.error('❌ Error loading deliveries:', error);
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:40px; color:var(--danger);">
      <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem; margin-bottom:10px; display:block;"></i>
      Erreur: ${error.message}<br>
      <small style="color:var(--text-light);">Vérifiez que la collection s'appelle "commande" dans Firebase</small>
      </td></tr>`;
  }
}
