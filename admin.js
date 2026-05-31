// admin.js - Firebase v10+ Compatible + Cloudinary Integration
import { collection, getDocs, orderBy, query, doc, updateDoc, deleteDoc, addDoc, onSnapshot }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from './firebase-config.js';

let allCommandes = [];

// ========== CHARGEMENT DES COMMANDES ==========
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

// ========== AFFICHAGE TABLEAU ==========
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

// ========== MODAL DÉTAILS ==========
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

  // 👇 إظهار قسم السائق
  toggleDriverSection(cmd);

  document.getElementById('detailModal').classList.add('active');
}

function closeDetail() {
  document.getElementById('detailModal').classList.remove('active');
}

// ========== DRIVER SECTION TOGGLE ==========
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

// ========== HELPERS STATUT ==========
function getStatusClass(s) {
  return { pending: 'status-pending', accepted: 'status-accepted', shipped: 'status-shipped', arrived: 'status-arrived', returned: 'status-returned' }[s] || 'status-pending';
}
function getStatusLabel(s) {
  return { pending: '⏳ En attente', accepted: '✓ Acceptée', shipped: '🚚 En route', arrived: '📦 Arrivée', returned: '↩️ Retournée' }[s] || '⏳ En attente';
}

// ========== MISE À JOUR STATUT ==========
function confirmStatusUpdate() {
  const newStatus = document.getElementById('statusSelect').value;
  updateOrderStatus(newStatus);
}

function updateOrderStatus(newStatus) {
  const firebaseId = document.getElementById('detailModal')?.dataset.firebaseId;
  const orderNumber = document.getElementById('detailModal')?.dataset.currentOrderNumber;

  if (!firebaseId) {
    showNotification('Erreur: ID Firebase manquant', 'error');
    return;
  }

  // جمع بيانات السائق
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
      showNotification('✅ Statut et livreur mis à jour', 'success');
      closeDetail();
    })
    .catch((error) => {
      console.error("Erreur:", error);
      showNotification('❌ Erreur mise à jour', 'error');
    });
}

// ========== SUPPRESSION ==========
function deleteCommande(orderNumber) {
  if (!confirm(`Supprimer la commande ${orderNumber} ?`)) return;

  const cmd = allCommandes.find(c => c.orderNumber === orderNumber);
  if (!cmd?.id) {
    showNotification('Commande introuvable', 'error');
    return;
  }

  deleteDoc(doc(db, "commandes", cmd.id))
    .then(() => {
      allCommandes = allCommandes.filter(c => c.orderNumber !== orderNumber);
      displayCommandes(allCommandes);
      updateStats();
      showNotification('✅ Commande supprimée', 'success');
    })
    .catch((error) => {
      console.error("Erreur:", error);
      showNotification('❌ Erreur suppression', 'error');
    });
}

// ========== FILTRES ==========
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

// ========== STATISTIQUES ==========
function updateStats() {
  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el('totalCommandes', allCommandes.length);
  const total = allCommandes.reduce((sum, c) => sum + (c.grandTotal || 0), 0);
  el('totalRevenu', total.toFixed(2) + ' DA');
  el('totalDomicile', allCommandes.filter(c => c.orderType === 'domicile').length);
  el('totalStopdesk', allCommandes.filter(c => c.orderType === 'stopdesk').length);
}

// ========== FILTRE WILAYA ==========
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

// ========== EXPORT CSV ==========
function exportCommandes() {
  if (allCommandes.length === 0) { showNotification('Aucune commande à exporter', 'error'); return; }
  let csv = 'N°;Client;Téléphone;Wilaya;Commune;Type;Total;Statut;Date;DriverName;DriverPhone\n';
  allCommandes.forEach(c => {
    csv += `"${c.orderNumber}";"${c.firstName || ''} ${c.lastName || ''}";"${c.phone1 || ''}";"${c.wilaya || ''}";"${c.commune || ''}";"${c.orderType || ''}";"${(c.grandTotal || 0).toFixed(2)}";"${c.status || 'pending'}";"${c.date || ''}";"${c.driverName || ''}";"${c.driverPhone || ''}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `commandes_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  showNotification('✅ Export CSV téléchargé', 'success');
}

// ========== UTILITAIRES ==========
function showNotification(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}
function formatDateTime(d) { if (!d) return '—'; return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

// ========== AJOUT PRODUIT MODALS ==========
function openAddProductModal() { 
  resetProductForm();
  document.getElementById('addProductModal')?.classList.add('active'); 
}
function closeAddProductModal() { document.getElementById('addProductModal')?.classList.remove('active'); }

// ============================================
// 🖼️ IMAGE UPLOAD HANDLING (Cloudinary)
// ============================================

let imageMode = 'url'; // 'url' or 'upload'

// DOM Elements for Image Upload
const modeUrlBtn = document.getElementById('imageModeUrl');
const modeUploadBtn = document.getElementById('imageModeUpload');
const urlContainer = document.getElementById('imageModeUrlContainer');
const uploadContainer = document.getElementById('imageModeUploadContainer');
const urlInput = document.getElementById('productImage');
const fileInput = document.getElementById('productImageFile');
const previewContainer = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const finalImageInput = document.getElementById('productImageFinal');

// Mode: URL (Default)
modeUrlBtn?.addEventListener('click', () => {
    imageMode = 'url';
    modeUrlBtn.className = 'btn btn-primary';
    modeUploadBtn.className = 'btn btn-outline';
    urlContainer.style.display = 'block';
    uploadContainer.style.display = 'none';
    if (urlInput && finalImageInput) {
        finalImageInput.value = urlInput.value;
    }
});

// Mode: Upload
modeUploadBtn?.addEventListener('click', () => {
    imageMode = 'upload';
    modeUploadBtn.className = 'btn btn-primary';
    modeUrlBtn.className = 'btn btn-outline';
    urlContainer.style.display = 'none';
    uploadContainer.style.display = 'block';
});

// Preview uploaded image
fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && previewImg && previewContainer) {
        const reader = new FileReader();
        reader.onload = (event) => {
            previewImg.src = event.target.result;
            previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else if (previewContainer) {
        previewContainer.style.display = 'none';
    }
});

// Sync URL input to final field
urlInput?.addEventListener('input', () => {
    if (imageMode === 'url' && finalImageInput) {
        finalImageInput.value = urlInput.value;
    }
});

// Reset form function
function resetProductForm() {
    const form = document.getElementById('addProductForm');
    if (form) form.reset();
    
    // Reset flavors list
    const flavorsList = document.getElementById('flavorsList');
    if (flavorsList) flavorsList.innerHTML = '';
    
    // Reset image preview
    if (previewContainer) previewContainer.style.display = 'none';
    if (previewImg) previewImg.src = '';
    if (fileInput) fileInput.value = '';
    
    // Reset to URL mode
    if (urlContainer) urlContainer.style.display = 'block';
    if (uploadContainer) uploadContainer.style.display = 'none';
    if (modeUrlBtn) modeUrlBtn.className = 'btn btn-primary';
    if (modeUploadBtn) modeUploadBtn.className = 'btn btn-outline';
    
    // Clear hidden final image field
    if (finalImageInput) finalImageInput.value = '';
    
    // Reset mode variable
    imageMode = 'url';
}

// ============================================
// 🔄 MODIFIED: Add Product Form Submit
// ============================================

document.getElementById('addProductForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('addProductSubmitBtn');
    const originalBtnText = submitBtn.innerHTML;
    
    // Disable button during processing
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Traitement...';
    
    try {
        // Get form values
        const name = document.getElementById('productName')?.value.trim();
        const category = document.getElementById('productCategory')?.value;
        const description = document.getElementById('productDescription')?.value.trim();
        const quantity = parseInt(document.getElementById('productQuantity')?.value) || 0;
        const price = parseFloat(document.getElementById('productPrice')?.value);
        
        // 🔄 Handle image based on mode
        let imageUrl = '';
        
        if (imageMode === 'upload') {
            const file = fileInput?.files[0];
            if (file) {
                // Import and call uploadImage from db-service.js
                const { uploadImage } = await import('./db-service.js');
                showToast('📤 Upload en cours...', 'info');
                imageUrl = await uploadImage(file);
                showToast('✅ Image uploadée!', 'success');
            }
        } else {
            imageUrl = urlInput?.value.trim();
        }
        
        // Validation
        if (!name || !imageUrl || !category || isNaN(price) || price <= 0) {
            throw new Error('Veuillez remplir tous les champs obligatoires');
        }
        
        // Collect flavors
        const flavors = [];
        document.querySelectorAll('.flavor-item, .flavor-field').forEach(item => {
            const fName = item.querySelector('.flavor-name, [name*="flavorName"]')?.value.trim();
            const fImage = item.querySelector('.flavor-image, [name*="flavorImage"]')?.value.trim();
            if (fName) {
                flavors.push({ name: fName, image: fImage || imageUrl });
            }
        });
        
        // Import and call addProduct
        const { addProduct } = await import('./db-service.js');
        
        await addProduct({
            name, 
            image: imageUrl, 
            category, 
            description: description || '', 
            price, 
            quantity, 
            flavors,
            dateAdded: new Date().toISOString()
        });
        
        // Success
        showToast('✅ Produit ajouté avec succès!', 'success');
        closeAddProductModal();
        e.target.reset();
        
        // Reset flavors and preview
        const flavorsList = document.getElementById('flavorsList');
        if (flavorsList) flavorsList.innerHTML = '';
        if (previewContainer) previewContainer.style.display = 'none';
        
        // Reset to URL mode
        resetProductForm();
        
    } catch (error) {
        console.error("❌ Erreur ajout produit:", error);
        showToast('❌ ' + (error.message || 'Erreur lors de l\'ajout'), 'error');
    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
});

// ========== INITIALISATION ==========
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
window.resetProductForm = resetProductForm;
