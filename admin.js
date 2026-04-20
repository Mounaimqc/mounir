// admin.js - Firebase v10+ Compatible
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

// ========== AJOUT PRODUIT ==========
function openAddProductModal() { document.getElementById('addProductModal')?.classList.add('active'); }
function closeAddProductModal() { document.getElementById('addProductModal')?.classList.remove('active'); }

document.getElementById('addProductForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('productName')?.value.trim();
  const image = document.getElementById('productImage')?.value.trim();
  const category = document.getElementById('productCategory')?.value;
  const description = document.getElementById('productDescription')?.value.trim();
  const quantity = parseInt(document.getElementById('productQuantity')?.value) || 0;
  const price = parseFloat(document.getElementById('productPrice')?.value);

  if (!name || !image || !category || isNaN(price) || price <= 0) {
    showNotification('Veuillez remplir tous les champs obligatoires', 'error'); return;
  }

  const flavors = [];
  document.querySelectorAll('.flavor-item').forEach(item => {
    const fName = item.querySelector('.flavor-name')?.value.trim();
    const fImage = item.querySelector('.flavor-image')?.value.trim();
    if (fName) {
      flavors.push({ name: fName, image: fImage || image });
    }
  });

  try {
    await addDoc(collection(db, "produits"), {
      name, image, category, description: description || '', price, quantity, flavors,
      dateAdded: new Date().toISOString()
    });
    showNotification('✅ Produit ajouté!', 'success');
    closeAddProductModal();
    document.getElementById('addProductForm').reset();
    const flavorsList = document.getElementById('flavorsList');
    if (flavorsList) flavorsList.innerHTML = '';
  } catch (error) {
    console.error("Erreur:", error);
    showNotification('❌ Erreur ajout produit', 'error');
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

function addFlavorField() {
  const list = document.getElementById('flavorsList');
  if (!list) return;

  const div = document.createElement('div');
  div.className = 'flavor-item form-row';
  div.style.marginBottom = '0';
  div.style.alignItems = 'center';

  div.innerHTML = `
    <input type="text" class="form-control flavor-name" placeholder="Nom (ex: Chocolat)" required>
    <input type="url" class="form-control flavor-image" placeholder="Image URL (Optionnelle)">
    <button type="button" class="btn btn-outline" style="color:var(--danger); border-color:var(--danger); padding:10px; margin-top:5px; width:100%;" onclick="this.parentElement.remove()">
      <i class="fa-solid fa-trash"></i> Supprimer
    </button>
  `;
  list.appendChild(div);
}
window.addFlavorField = addFlavorField;
