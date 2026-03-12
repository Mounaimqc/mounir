// livraison.js
import { db, ordersCollection, query, where, orderBy, getDocs, doc, updateDoc } from './firebase-config.js';

// ===== Global Vars =====
let deliveries = [], selectedDeliveries = [], wilayas = [];
let currentDeliveryId = null;

// ===== Init =====
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Livraisons page loaded');
  
  const yearEl = document.getElementById('currentYear');
  if(yearEl) yearEl.textContent = new Date().getFullYear();
  
  initSidebar();
  await loadWilayas();
  await loadDeliveries();
  initEventListeners();
  
  console.log('✅ Initialization complete');
});

// ===== Sidebar Toggle =====
function initSidebar() {
  const toggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  
  if(toggle && sidebar) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
      console.log('📱 Sidebar toggled');
    });
    
    document.addEventListener('click', (e) => {
      if(window.innerWidth <= 768 && 
         sidebar.classList.contains('active') && 
         !sidebar.contains(e.target) && 
         !toggle.contains(e.target)) {
        sidebar.classList.remove('active');
      }
    });
  }
}

// ===== Event Listeners =====
function initEventListeners() {
  const searchInput = document.getElementById('searchDelivery');
  const filterStatus = document.getElementById('filterStatus');
  const filterWilaya = document.getElementById('filterWilaya');
  const filterDate = document.getElementById('filterDate');
  const assignForm = document.getElementById('assignForm');
  
  if(searchInput) searchInput.addEventListener('input', filterDeliveries);
  if(filterStatus) filterStatus.addEventListener('change', filterDeliveries);
  if(filterWilaya) filterWilaya.addEventListener('change', filterDeliveries);
  if(filterDate) filterDate.addEventListener('change', filterDeliveries);
  if(assignForm) assignForm.addEventListener('submit', saveAssignment);
  
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if(e.target === modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  });
  
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(m => {
        m.classList.remove('active');
      });
      document.body.style.overflow = '';
    }
  });
  
  console.log('🔗 Event listeners attached');
}

// ===== Load Wilayas =====
async function loadWilayas() {
  wilayas = [
    'Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Béjaïa','Biskra','Béchar','Blida','Bouira',
    'Tamanrasset','Tébessa','Tlemcen','Tiaret','Tizi Ouzou','Alger','Djelfa','Jijel','Sétif','Saïda',
    'Skikda','Sidi Bel Abbès','Annaba','Guelma','Constantine','Médéa','Mostaganem','M\'Sila','Mascara',
    'Ouargla','Oran','El Bayadh','Illizi','Bordj Bou Arréridj','Boumerdès','El Tarf','Tindouf',
    'Tissemsilt','El Oued','Khenchela','Souk Ahras','Tipaza','Mila','Aïn Defla','Naâma','Aïn Témouchent',
    'Ghardaïa','Relizane','El M\'Ghair','El Meniaa','Ouled Djellal','Bordj Badji Mokhtar','Béni Abbès',
    'Timimoun','Touggourt','Djanet','In Salah','In Guezzam'
  ];
  
  const select = document.getElementById('filterWilaya');
  if(select) {
    const defaultOption = select.querySelector('option[value=""]');
    select.innerHTML = '';
    if(defaultOption) select.appendChild(defaultOption);
    
    wilayas.forEach(wilaya => {
      const option = document.createElement('option');
      option.value = wilaya;
      option.textContent = wilaya;
      select.appendChild(option);
    });
    console.log(`📍 Loaded ${wilayas.length} wilayas`);
  }
}

// ===== LOAD DELIVERIES FROM FIREBASE =====
async function loadDeliveries() {
  const tbody = document.getElementById('deliveriesTableBody');
  
  try {
    console.log('🔄 Fetching deliveries from Firebase...');
    
    const q = query(
      ordersCollection, 
      where('status', '!=', 'cancelled'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    console.log(`📦 Found ${snapshot.size} documents`);
    
    if(snapshot.empty) {
      console.warn('⚠️ No deliveries found in database');
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:40px; color:var(--text-light);">
        <i class="fa-solid fa-inbox" style="font-size:2rem; margin-bottom:10px; display:block;"></i>
        Aucune livraison trouvée</td></tr>`;
      updateStats();
      return;
    }
    
    deliveries = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
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
        items: data.items || [],
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
      Erreur: ${error.message}</td></tr>`;
  }
}

// ===== Render Table =====
function renderDeliveries(data) {
  const tbody = document.getElementById('deliveriesTableBody');
  
  if(!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:40px; color:var(--text-light);">
      <i class="fa-solid fa-inbox" style="font-size:2rem; margin-bottom:10px; display:block;"></i>
      Aucune livraison trouvée</td></tr>`;
    return;
  }
  
  tbody.innerHTML = data.map(d => {
    const statusConfig = {
      'pending': { class: 'status-pending-delivery', text: '⏳ En Attente' },
      'transit': { class: 'status-in-transit', text: '🚚 En Route' },
      'delivered': { class: 'status-delivered', text: '✓ Livrée' },
      'failed': { class: 'status-failed', text: '✕ Échouée' },
      'accepted': { class: 'status-in-transit', text: '✓ Acceptée' }
    };
    const status = statusConfig[d.status] || statusConfig['pending'];
    const orderDate = d.orderDate instanceof Date ? d.orderDate : new Date(d.orderDate);
    const dateStr = !isNaN(orderDate) ? orderDate.toLocaleDateString('fr-DZ', { 
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
    }) : '-';
    
    return `<tr data-id="${d.id}">
      <td><input type="checkbox" class="delivery-checkbox" value="${d.id}" onchange="toggleSelection('${d.id}')"></td>
      <td><strong style="color:var(--primary); cursor:pointer;" onclick="viewDelivery('${d.id}')">#${d.orderNumber}</strong>
        <div style="font-size:0.75rem; color:var(--text-light);">${dateStr}</div></td>
      <td><div style="font-weight:500;">${d.clientName}</div>
        <small class="client-phone"><a href="tel:${d.phone}" style="color:var(--primary);">${d.phone}</a></small></td>
      <td><div>${d.address || d.commune || '-'}</div><div class="delivery-address">${d.commune || ''}</div></td>
      <td>${d.wilaya || '-'}</td>
      <td><span style="padding:4px 10px; background:var(--bg); border-radius:20px; font-size:0.75rem; border:1px solid var(--border);">
        ${d.type === 'domicile' ? '🏠 Domicile' : '📦 Stop Desk'}</span></td>
      <td>${d.driver ? `<span class="driver-badge"><i class="fa-solid fa-user"></i> ${d.driver}</span>` : '<span style="color:var(--text-light); font-size:0.8rem;">Non assigné</span>'}</td>
      <td><span class="status-badge ${status.class}" style="cursor:pointer;" onclick="quickUpdateStatus('${d.id}')">${status.text}</span></td>
      <td><div class="action-btns">
        <button class="icon-btn" onclick="viewDelivery('${d.id}')" title="Voir"><i class="fa-solid fa-eye"></i></button>
        <button class="icon-btn" onclick="openAssignModal('${d.id}')" title="Assigner"><i class="fa-solid fa-user-plus"></i></button>
        <button class="icon-btn" onclick="editDelivery('${d.id}')" title="Modifier"><i class="fa-solid fa-pen"></i></button>
      </div></td>
    </tr>`;
  }).join('');
  
  console.log(`🎨 Rendered ${data.length} deliveries`);
}

// ===== Update Stats =====
function updateStats() {
  const pendingCount = deliveries.filter(d => d.status === 'pending').length;
  const transitCount = deliveries.filter(d => d.status === 'transit' || d.status === 'accepted').length;
  const deliveredCount = deliveries.filter(d => d.status === 'delivered').length;
  const failedCount = deliveries.filter(d => d.status === 'failed' || d.status === 'returned').length;
  
  ['pendingCount','transitCount','deliveredCount','failedCount'].forEach((id, i) => {
    const el = document.getElementById(id);
    if(el) el.textContent = [pendingCount, transitCount, deliveredCount, failedCount][i];
  });
  
  console.log(`📊 Stats: ⏳${pendingCount} 🚚${transitCount} ✓${deliveredCount} ✕${failedCount}`);
}

// ===== Filters =====
function filterDeliveries() {
  const search = document.getElementById('searchDelivery')?.value.toLowerCase() || '';
  const status = document.getElementById('filterStatus')?.value || '';
  const wilaya = document.getElementById('filterWilaya')?.value || '';
  const dateFilter = document.getElementById('filterDate')?.value || '';
  
  const filtered = deliveries.filter(d => {
    const matchSearch = !search || d.orderNumber?.toLowerCase().includes(search) || 
      d.clientName?.toLowerCase().includes(search) || d.phone?.includes(search);
    const matchStatus = !status || d.status === status;
    const matchWilaya = !wilaya || d.wilaya === wilaya;
    return matchSearch && matchStatus && matchWilaya;
  });
  renderDeliveries(filtered);
}

function clearFilters() {
  ['searchDelivery','filterStatus','filterWilaya','filterDate'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = '';
  });
  renderDeliveries(deliveries);
  showToast('✅ Filtres réinitialisés');
}

// ===== Selection =====
function toggleSelectAll() {
  const checked = document.getElementById('selectAll')?.checked;
  document.querySelectorAll('.delivery-checkbox').forEach(cb => {
    cb.checked = checked;
    toggleSelection(cb.value, false);
  });
  updateBatchActions();
}

function toggleSelection(id, updateUI = true) {
  const idx = selectedDeliveries.indexOf(id);
  idx === -1 ? selectedDeliveries.push(id) : selectedDeliveries.splice(idx, 1);
  if(updateUI) {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.delivery-checkbox');
    if(selectAll && checkboxes.length > 0) {
      selectAll.checked = selectedDeliveries.length === checkboxes.length;
    }
    updateBatchActions();
  }
}

function updateBatchActions() {
  const batchBar = document.getElementById('batchActions');
  const selectedCount = document.getElementById('selectedCount');
  if(!batchBar) return;
  if(selectedDeliveries.length > 0) {
    batchBar.style.display = 'flex';
    if(selectedCount) selectedCount.textContent = selectedDeliveries.length;
  } else {
    batchBar.style.display = 'none';
  }
}

function clearSelection() {
  selectedDeliveries = [];
  document.querySelectorAll('.delivery-checkbox').forEach(cb => cb.checked = false);
  const selectAll = document.getElementById('selectAll');
  if(selectAll) selectAll.checked = false;
  updateBatchActions();
}

async function batchUpdateStatus(newStatus) {
  if(selectedDeliveries.length === 0) {
    showToast('⚠️ Sélectionnez des livraisons d\'abord', 'error');
    return;
  }
  try {
    for(const id of selectedDeliveries) {
      await updateDoc(doc(db, 'orders', id), { 
        status: newStatus, 
        updatedAt: new Date().toISOString() 
      });
      const idx = deliveries.findIndex(d => d.id === id);
      if(idx !== -1) deliveries[idx].status = newStatus;
    }
    renderDeliveries(deliveries);
    updateStats();
    clearSelection();
    showToast(`✅ ${selectedDeliveries.length} livraison(s) mise(s) à jour`, 'success');
  } catch(error) {
    console.error('❌ Batch update error:', error);
    showToast('❌ Erreur: ' + error.message, 'error');
  }
}

// ===== Modals =====
function openModal(modalId) { 
  const modal = document.getElementById(modalId);
  if(modal) { modal.classList.add('active'); document.body.style.overflow = 'hidden'; } 
}
function closeModal(modalId) { 
  const modal = document.getElementById(modalId);
  if(modal) { modal.classList.remove('active'); document.body.style.overflow = ''; } 
}
function closeDeliveryDetail() { closeModal('deliveryDetailModal'); currentDeliveryId = null; }
function closeAssignModal() { 
  closeModal('assignModal'); 
  const form = document.getElementById('assignForm');
  if(form) form.reset(); 
}

function openAssignModal(deliveryId = null) {
  const idField = document.getElementById('assignDeliveryId');
  if(idField) idField.value = deliveryId || '';
  if(deliveryId) {
    const delivery = deliveries.find(d => d.id === deliveryId);
    if(delivery?.driver) {
      const driverSelect = document.getElementById('driverSelect');
      if(driverSelect) driverSelect.value = delivery.driver;
    }
  }
  openModal('assignModal');
}

function viewDelivery(id) {
  const delivery = deliveries.find(d => d.id === id);
  if(!delivery) return;
  
  const fields = {
    'detailDeliveryNumber': delivery.orderNumber,
    'detailClientName': delivery.clientName,
    'detailPhone': delivery.phone,
    'detailPhone2': delivery.phone2 || '-',
    'detailEmail': delivery.email || '-',
    'detailAddress': delivery.address || delivery.commune || '-',
    'detailLocation': `${delivery.wilaya || '-'} - ${delivery.commune || ''}`,
    'detailType': delivery.type === 'domicile' ? '🏠 Livraison à domicile' : '📦 Stop Desk',
    'detailDriver': delivery.driver || 'Non assigné',
    'detailOrderDate': delivery.orderDate instanceof Date 
      ? delivery.orderDate.toLocaleDateString('fr-DZ', { weekday:'short',year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit' })
      : '-',
    'detailTotal': new Intl.NumberFormat('fr-DZ').format(delivery.total || 0) + ' DA'
  };
  
  Object.entries(fields).forEach(([elId, value]) => {
    const el = document.getElementById(elId);
    if(el) {
      if(el.tagName === 'A' && (elId.includes('Phone') || elId.includes('Email')) && value !== '-') {
        el.href = elId.includes('Email') ? `mailto:${value}` : `tel:${value}`;
      }
      el.textContent = value;
    }
  });
  
  const statusSelect = document.getElementById('updateStatus');
  if(statusSelect && delivery.status) statusSelect.value = delivery.status;
  
  const itemsContainer = document.getElementById('detailItems');
  if(itemsContainer) {
    if(delivery.items?.length) {
      itemsContainer.innerHTML = delivery.items.map(item => `
        <div class="detail-item" style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed var(--border);">
          <div><span style="font-weight:500;">${item.name||'Produit'}</span> ×${item.quantity||1}</div>
          <span style="color:var(--primary);font-weight:600;">
            ${new Intl.NumberFormat('fr-DZ').format((item.price||0)*(item.quantity||1))} DA
          </span>
        </div>`).join('');
    } else {
      itemsContainer.innerHTML = '<p style="color:var(--text-light);text-align:center;padding:20px;">Aucun produit</p>';
    }
  }
  
  updateTimeline(delivery.status);
  currentDeliveryId = id;
  openModal('deliveryDetailModal');
}

function updateTimeline(status) {
  const timeline = document.getElementById('deliveryTimeline');
  if(!timeline) return;
  const steps = timeline.querySelectorAll('.timeline-item');
  const statusOrder = ['pending', 'accepted', 'transit', 'delivered'];
  const currentIndex = statusOrder.indexOf(status);
  steps.forEach((step, index) => {
    step.classList.toggle('active', index <= currentIndex && currentIndex !== -1);
  });
}

function editDelivery(id) { viewDelivery(id); }

function quickUpdateStatus(id) {
  const delivery = deliveries.find(d => d.id === id);
  if(!delivery) return;
  const cycle = ['pending', 'accepted', 'transit', 'delivered'];
  const next = cycle[(cycle.indexOf(delivery.status) + 1) % cycle.length];
  updateDeliveryStatusInDB(id, next);
}

async function updateDeliveryStatus() {
  if(!currentDeliveryId) return;
  const newStatus = document.getElementById('updateStatus')?.value;
  if(!newStatus) { showToast('⚠️ Sélectionnez un statut', 'error'); return; }
  await updateDeliveryStatusInDB(currentDeliveryId, newStatus);
  closeDeliveryDetail();
}

async function updateDeliveryStatusInDB(id, newStatus) {
  try {
    await updateDoc(doc(db, 'orders', id), {
      status: newStatus,
      updatedAt: new Date().toISOString()
    });
    const idx = deliveries.findIndex(d => d.id === id);
    if(idx !== -1) deliveries[idx].status = newStatus;
    renderDeliveries(deliveries);
    updateStats();
    showToast(`✅ Statut mis à jour: ${newStatus}`, 'success');
  } catch(error) {
    console.error('❌ Status update error:', error);
    showToast('❌ Erreur: ' + error.message, 'error');
  }
}

async function saveAssignment(e) {
  e.preventDefault();
  const deliveryId = document.getElementById('assignDeliveryId')?.value;
  const driver = document.getElementById('driverSelect')?.value;
  const note = document.getElementById('driverNote')?.value || '';
  const estimated = document.getElementById('estimatedDate')?.value || '';
  
  if(!deliveryId || !driver) {
    showToast('⚠️ Veuillez sélectionner une livraison et un chauffeur', 'error');
    return;
  }
  
  try {
    await updateDoc(doc(db, 'orders', deliveryId), {
      driver, driverNote: note, estimatedDate: estimated,
      status: 'transit', updatedAt: new Date().toISOString()
    });
    const idx = deliveries.findIndex(d => d.id === deliveryId);
    if(idx !== -1) {
      deliveries[idx] = { ...deliveries[idx], driver, driverNote: note, estimatedDate: estimated, status: 'transit' };
    }
    closeAssignModal();
    renderDeliveries(deliveries);
    updateStats();
    showToast('✅ Chauffeur assigné avec succès', 'success');
  } catch(error) {
    console.error('❌ Assignment error:', error);
    showToast('❌ Erreur: ' + error.message, 'error');
  }
}

function openBulkAssign() {
  if(selectedDeliveries.length === 0) {
    showToast('⚠️ Sélectionnez des livraisons d\'abord', 'error');
    return;
  }
  if(confirm(`Assigner un chauffeur à ${selectedDeliveries.length} livraison(s) ?`)) {
    openAssignModal();
    showToast(`ℹ️ Assignez le chauffeur, puis répétez pour les autres`, 'success');
  }
}

function refreshMap() { showToast('🗺️ Carte actualisée', 'success'); }

function exportDeliveries() {
  if(deliveries.length === 0) { showToast('⚠️ Aucune donnée à exporter', 'error'); return; }
  const headers = ['ID','Commande','Client','Téléphone','Wilaya','Type','Statut','Chauffeur','Total','Date'];
  const rows = deliveries.map(d => [d.id, d.orderNumber, d.clientName, d.phone, d.wilaya, d.type, d.status, d.driver||'', d.total, d.orderDate instanceof Date ? d.orderDate.toISOString() : d.orderDate]);
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `livraisons-${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  showToast('✅ Export CSV téléchargé', 'success');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if(!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${type==='success'?'fa-circle-check':'fa-circle-exclamation'}"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { 
    toast.style.animation = 'slideIn 0.3s ease reverse'; 
    setTimeout(() => toast.remove(), 300); 
  }, 3000);
}

// ===== Debug Helpers =====
window.debugDeliveries = () => ({ deliveries, selectedDeliveries });
window.refreshDeliveries = async () => { await loadDeliveries(); console.log('🔄 Refreshed'); };

// ===== Make functions globally accessible for inline onclick handlers =====
window.toggleSelectAll = toggleSelectAll;
window.toggleSelection = toggleSelection;
window.clearSelection = clearSelection;
window.batchUpdateStatus = batchUpdateStatus;
window.closeDeliveryDetail = closeDeliveryDetail;
window.closeAssignModal = closeAssignModal;
window.openAssignModal = openAssignModal;
window.viewDelivery = viewDelivery;
window.editDelivery = editDelivery;
window.quickUpdateStatus = quickUpdateStatus;
window.updateDeliveryStatus = updateDeliveryStatus;
window.saveAssignment = saveAssignment;
window.openBulkAssign = openBulkAssign;
window.refreshMap = refreshMap;
window.exportDeliveries = exportDeliveries;
window.clearFilters = clearFilters;
