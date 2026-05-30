// admin.js - Firebase v10+ Compatible
import { collection, getDocs, orderBy, query, doc, updateDoc, deleteDoc, addDoc, onSnapshot }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { db, storage } from './firebase-config.js';

let allCommandes = [];

// ========== تحميل الصور ==========
async function uploadImageToStorage(file, path) {
  if (!file) return null;
  
  try {
    // ضغط الصورة إذا كانت كبيرة
    if (file.size > 500000) {
      file = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1920,
        useWebWorker: true
      });
    }
    
    const storageRef = ref(storage, `products/${path}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("❌ خطأ في رفع الصورة:", error);
    showToast('❌ فشل رفع الصورة', 'error');
    return null;
  }
}

// ========== معاينة الصورة الرئيسية ==========
document.getElementById('productImageFile')?.addEventListener('change', function(e) {
  const file = e.target.files[0];
  const preview = document.getElementById('productImagePreview');
  const previewBig = document.getElementById('productImagePreviewBig');
  
  if (file) {
    preview.textContent = file.name;
    const reader = new FileReader();
    reader.onload = function(event) {
      previewBig.style.backgroundImage = `url(${event.target.result})`;
      previewBig.style.display = 'block';
    };
    reader.readAsDataURL(file);
  } else {
    preview.textContent = 'لم يتم اختيار صورة';
    previewBig.style.display = 'none';
  }
});

// ========== دالة إضافة حقل نكهة ==========
function addFlavorField() {
  const list = document.getElementById('flavorsList');
  if (!list) return;

  const div = document.createElement('div');
  div.className = 'flavor-item';
  div.style.cssText = 'display:flex; gap:8px; align-items:center; flex-wrap:wrap; padding:10px; background:var(--bg); border-radius:8px;';

  div.innerHTML = `
    <input type="text" class="form-control flavor-name" placeholder="Nom du goût" style="flex:1; min-width:120px;" required>
    <input type="file" class="form-control flavor-image-file" accept="image/*" style="flex:1; min-width:150px; padding:6px;">
    <input type="hidden" class="flavor-image-url">
    <button type="button" class="btn btn-outline" onclick="this.parentElement.remove()" style="padding:8px 12px;">✕</button>
    <div class="flavor-preview"></div>
  `;
  
  // معاينة صورة النكهة
  const fileInput = div.querySelector('.flavor-image-file');
  const preview = div.querySelector('.flavor-preview');
  
  fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        preview.style.backgroundImage = `url(${event.target.result})`;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    } else {
      preview.style.display = 'none';
    }
  });
  
  list.appendChild(div);
}
window.addFlavorField = addFlavorField;

// ========== تحميل الطلبات ==========
function loadCommandes() {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px"><i class="fa-solid fa-circle-notch fa-spin"></i> Chargement...</td></tr>`;

  const q = query(collection(db, "commandes"), orderBy("date", "desc"));

  onSnapshot(q, (snapshot) => {
    allCommandes = [];
    snapshot.forEach(docSnap => {
      allCommandes.push({ id: docSnap.id, ...docSnap.data() });
    });

    displayCommandes(allCommandes);
    updateStats();
    initializeWilayaFilter();

    if (allCommandes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-light)">Aucune commande pour le moment</td></tr>`;
    }
  }, (error) => {
    console.error("❌ Erreur Firebase:", error);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--danger)">Erreur: ${error.message}</td></tr>`;
  });
}

// ========== عرض الطلبات في الجدول ==========
function displayCommandes(commandes) {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;

  if (commandes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-light)">Aucune commande trouvée</td></tr>`;
    return;
  }

  tbody.innerHTML = commandes.map(cmd => {
    const statusClass = getStatusClass(cmd.status || 'pending');
    const statusLabel = getStatusLabel(cmd.status || 'pending');

    return `
      <tr>
        <td style="font-weight:600;color:var(--primary)">#${cmd.orderNumber}</td>
        <td>${cmd.firstName || ''} ${cmd.lastName || ''}</td>
        <td><span style="font-size:.85rem"><i class="fa-solid ${cmd.orderType === 'domicile' ? 'fa-truck' : 'fa-store'}"></i> ${cmd.orderType === 'domicile' ? 'Domicile' : 'Stop Desk'}</span></td>
        <td>${cmd.wilaya || '-'}</td>
        <td>${cmd.phone1 || '-'}</td>
        <td style="font-weight:600">${(cmd.grandTotal || 0).toFixed(2)} DA</td>
        <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
        <td>
          <button onclick="showDetail('${cmd.orderNumber}')" style="padding:6px 12px;background:var(--primary);color:#fff;border:none;border-radius:4px;cursor:pointer">Détails</button>
          <button onclick="deleteCommande('${cmd.orderNumber}')" style="padding:6px 12px;background:var(--danger);color:#fff;border:none;border-radius:4px;cursor:pointer;margin-left:5px">🗑</button>
        </td>
      </tr>`;
  }).join('');
}

// ========== عرض تفاصيل الطلب ==========
function showDetail(orderNumber) {
  const cmd = allCommandes.find(c => c.orderNumber === orderNumber);
  if (!cmd) return;

  document.getElementById('detailModal').dataset.firebaseId = cmd.id;
  document.getElementById('detailModal').dataset.currentOrderNumber = orderNumber;
  document.getElementById('detailOrderNumber').textContent = cmd.orderNumber;
  document.getElementById('detailDate').textContent = formatDateTime(cmd.date);
  document.getElementById('detailName').textContent = `${cmd.firstName || ''} ${cmd.lastName || ''}`;
  document.getElementById('detailPhone1').textContent = cmd.phone1 || '—';
  document.getElementById('detailPhone2').textContent = cmd.phone2 || '—';
  document.getElementById('detailWilaya').textContent = cmd.wilaya || '—';
  document.getElementById('detailCommune').textContent = cmd.commune || '—';

  const status = cmd.status || 'pending';
  const badge = document.getElementById('detailStatusBadge');
  badge.textContent = getStatusLabel(status);
  badge.className = 'status-badge ' + getStatusClass(status);
  document.getElementById('statusSelect').value = status;

  // Produits
  const itemsContainer = document.getElementById('detailItems');
  if (cmd.cartItems?.length > 0) {
    itemsContainer.innerHTML = cmd.cartItems.map(item => `
      <div class="detail-row">
        <span class="detail-label">${item.name} ${item.flavor ? `<span style="color:var(--primary); font-size:0.8rem;">(${item.flavor})</span>` : ''} ×${item.quantity}</span>
        <span class="detail-value">${(item.price * item.quantity).toFixed(2)} DA</span>
      </div>`).join('');
  } else {
    itemsContainer.innerHTML = '<p style="text-align:center;color:var(--text-light)">Aucun produit</p>';
  }

  document.getElementById('detailCartTotal').textContent = (cmd.cartTotal || 0).toFixed(2);
  document.getElementById('detailShipping').textContent = (cmd.shippingPrice || 0).toFixed(2);
  document.getElementById('detailTotal').textContent = (cmd.grandTotal || 0).toFixed(2);

  toggleDriverSection(cmd);
  document.getElementById('detailModal').classList.add('active');
}

function closeDetail() {
  document.getElementById('detailModal').classList.remove('active');
}

// ========== إظهار/إخفاء قسم السائق ==========
function toggleDriverSection(order) {
  const driverSection = document.getElementById('driverSection');
  if (!driverSection) return;
  
  const isDomicile = order.orderType === 'domicile';
  
  if (isDomicile) {
    driverSection.style.display = 'block';
    document.getElementById('driverName').value = order.driverName || '';
    document.getElementById('driverPhone').value = order.driverPhone || '';
  } else {
    driverSection.style.display = 'none';
  }
}

// ========== دوال الحالة ==========
function getStatusClass(s) {
  return { pending: 'status-pending', accepted: 'status-accepted', shipped: 'status-shipped', arrived: 'status-arrived', returned: 'status-returned' }[s] || 'status-pending';
}
function getStatusLabel(s) {
  return { pending: '⏳ En attente', accepted: '✓ Acceptée', shipped: '🚚 En route', arrived: '📦 Arrivée', returned: '↩️ Retournée' }[s] || '⏳ En attente';
}

// ========== تحديث الحالة ==========
function confirmStatusUpdate() {
  const newStatus = document.getElementById('statusSelect').value;
  updateOrderStatus(newStatus);
}

function updateOrderStatus(newStatus) {
  const firebaseId = document.getElementById('detailModal')?.dataset.firebaseId;
  const orderNumber = document.getElementById('detailModal')?.dataset.currentOrderNumber;

  if (!firebaseId) {
    showToast('Erreur: ID Firebase manquant', 'error');
    return;
  }

  const driverData = {};
  const driverName = document.getElementById('driverName')?.value.trim();
  const driverPhone = document.getElementById('driverPhone')?.value.trim();
  
  if (driverName) driverData.driverName = driverName;
  if (driverPhone) driverData.driverPhone = driverPhone;

  updateDoc(doc(db, "commandes", firebaseId), { 
    status: newStatus,
    ...driverData,
    driverUpdatedAt: new Date().toISOString()
  })
    .then(() => {
      const cmd = allCommandes.find(c => c.orderNumber === orderNumber);
      if (cmd) {
        cmd.status = newStatus;
        if (driverData.driverName) cmd.driverName = driverData.driverName;
        if (driverData.driverPhone) cmd.driverPhone = driverData.driverPhone;
      }
      displayCommandes(allCommandes);
      showToast('✅ Statut et livreur mis à jour', 'success');
      closeDetail();
    })
    .catch((error) => {
      console.error("Erreur:", error);
      showToast('❌ Erreur mise à jour', 'error');
    });
}

// ========== حذف طلب ==========
function deleteCommande(orderNumber) {
  if (!confirm(`Supprimer la commande ${orderNumber} ?`)) return;

  const cmd = allCommandes.find(c => c.orderNumber === orderNumber);
  if (!cmd?.id) {
    showToast('Commande introuvable', 'error');
    return;
  }

  deleteDoc(doc(db, "commandes", cmd.id))
    .then(() => {
      allCommandes = allCommandes.filter(c => c.orderNumber !== orderNumber);
      displayCommandes(allCommandes);
      updateStats();
      showToast('✅ Commande supprimée', 'success');
    })
    .catch((error) => {
      console.error("Erreur:", error);
      showToast('❌ Erreur suppression', 'error');
    });
}

// ========== فلترة الطلبات ==========
function filterCommandes() {
  const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const type = document.getElementById('filterType')?.value || '';
  const wilaya = document.getElementById('filterWilaya')?.value || '';

  const filtered = allCommandes.filter(c => {
    const matchSearch = c.orderNumber?.toLowerCase().includes(search) ||
      c.firstName?.toLowerCase().includes(search) ||
      c.lastName?.toLowerCase().includes(search) ||
      c.phone1?.includes(search);
    return matchSearch && (!type || c.orderType === type) && (!wilaya || c.wilaya === wilaya);
  });
  displayCommandes(filtered);
}

function clearFilters() {
  if (document.getElementById('searchInput')) document.getElementById('searchInput').value = '';
  if (document.getElementById('filterType')) document.getElementById('filterType').value = '';
  if (document.getElementById('filterWilaya')) document.getElementById('filterWilaya').value = '';
  filterCommandes();
}

// ========== الإحصائيات ==========
function updateStats() {
  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el('totalCommandes', allCommandes.length);
  const total = allCommandes.reduce((sum, c) => sum + (c.grandTotal || 0), 0);
  el('totalRevenu', total.toFixed(2) + ' DA');
  el('totalDomicile', allCommandes.filter(c => c.orderType === 'domicile').length);
  el('totalStopdesk', allCommandes.filter(c => c.orderType === 'stopdesk').length);
}

// ========== فلتر الولاية ==========
function initializeWilayaFilter() {
  const select = document.getElementById('filterWilaya');
  if (!select) return;
  const current = select.value;
  select.innerHTML = '<option value="">Toutes les wilayas</option>';
  [...new Set(allCommandes.map(c => c.wilaya).filter(Boolean))].sort().forEach(w => {
    const opt = document.createElement('option');
    opt.value = w; opt.textContent = w;
    select.appendChild(opt);
  });
  select.value = current;
}

// ========== تصدير CSV ==========
function exportCommandes() {
  if (allCommandes.length === 0) { showToast('Aucune commande à exporter', 'error'); return; }
  let csv = 'N°;Client;Téléphone;Wilaya;Commune;Type;Total;Statut;Date;DriverName;DriverPhone\n';
  allCommandes.forEach(c => {
    csv += `"${c.orderNumber}";"${c.firstName || ''} ${c.lastName || ''}";"${c.phone1 || ''}";"${c.wilaya || ''}";"${c.commune || ''}";"${c.orderType || ''}";"${(c.grandTotal || 0).toFixed(2)}";"${c.status || 'pending'}";"${c.date || ''}";"${c.driverName || ''}";"${c.driverPhone || ''}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `commandes_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  showToast('✅ Export CSV téléchargé', 'success');
}

// ========== إشعارات ==========
function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

function formatDateTime(d) { if (!d) return '—'; return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

// ========== فتح/إغلاق مودال المنتج ==========
function openAddProductModal() { document.getElementById('addProductModal')?.classList.add('active'); }
function closeAddProductModal() { 
  document.getElementById('addProductModal')?.classList.remove('active');
  document.getElementById('addProductForm')?.reset();
  document.getElementById('productImagePreviewBig').style.display = 'none';
  document.getElementById('productImagePreview').textContent = 'لم يتم اختيار صورة';
  document.getElementById('flavorsList').innerHTML = '';
}

// ========== إضافة منتج جديد ==========
document.getElementById('addProductForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = document.getElementById('addProductBtn');
  const originalBtnText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الرفع...';

  try {
    const name = document.getElementById('productName')?.value.trim();
    const category = document.getElementById('productCategory')?.value;
    const description = document.getElementById('productDescription')?.value.trim() || '';
    const quantity = parseInt(document.getElementById('productQuantity')?.value) || 0;
    const price = parseFloat(document.getElementById('productPrice')?.value);

    if (!name || !category || isNaN(price) || price <= 0) {
      showToast('Veuillez remplir tous les champs obligatoires', 'error');
      resetBtn();
      return;
    }

    // رفع الصورة الرئيسية
    const imageFile = document.getElementById('productImageFile')?.files[0];
    let mainImageUrl = '';
    
    if (imageFile) {
      showToast('📤 جاري رفع الصورة الرئيسية...', 'success');
      mainImageUrl = await uploadImageToStorage(imageFile, 'main');
      if (!mainImageUrl) { resetBtn(); return; }
    } else {
      showToast('اختر صورة للمنتج', 'error');
      resetBtn();
      return;
    }

    // رفع صور النكهات
    const flavors = [];
    const flavorItems = document.querySelectorAll('.flavor-item');
    
    for (let i = 0; i < flavorItems.length; i++) {
      const item = flavorItems[i];
      const fName = item.querySelector('.flavor-name')?.value.trim();
      const fFile = item.querySelector('.flavor-image-file')?.files[0];
      
      if (fName) {
        let fImageUrl = mainImageUrl;
        
        if (fFile) {
          showToast(`📤 جاري رفع صورة ${fName}...`, 'success');
          const uploadedUrl = await uploadImageToStorage(fFile, 'flavors');
          if (uploadedUrl) fImageUrl = uploadedUrl;
        }
        
        flavors.push({ 
          name: fName, 
          image: fImageUrl,
          id: `flavor_${Date.now()}_${i}`
        });
      }
    }

    // حفظ المنتج في Firestore
    await addDoc(collection(db, "produits"), {
      name, 
      image: mainImageUrl, 
      category, 
      description, 
      price, 
      quantity, 
      flavors,
      dateAdded: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    showToast('✅ Produit ajouté avec succès!', 'success');
    closeAddProductModal();
    
  } catch (error) {
    console.error("❌ Erreur:", error);
    showToast('❌ Erreur lors de l\'ajout du produit', 'error');
  } finally {
    resetBtn();
  }
  
  function resetBtn() {
    const btn = document.getElementById('addProductBtn');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalBtnText;
    }
  }
});

// ========== التهيئة ==========
document.addEventListener('DOMContentLoaded', () => {
  loadCommandes();
  document.getElementById('searchInput')?.addEventListener('input', filterCommandes);
  document.getElementById('filterType')?.addEventListener('change', filterCommandes);
  document.getElementById('filterWilaya')?.addEventListener('change', filterCommandes);
});

// Expose global functions
window.showDetail = showDetail;
window.closeDetail = closeDetail;
window.confirmStatusUpdate = confirmStatusUpdate;
window.deleteCommande = deleteCommande;
window.filterCommandes = filterCommandes;
window.clearFilters = clearFilters;
window.exportCommandes = exportCommandes;
window.openAddProductModal = openAddProductModal;
window.closeAddProductModal = closeAddProductModal;
window.toggleDriverSection = toggleDriverSection;
window.addFlavorField = addFlavorField;
