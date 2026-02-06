/* ==============================
GESTION DES COMMANDES (FIREBASE)
============================== */

let allCommandes = [];

// ========== CHARGEMENT DES COMMANDES DEPUIS FIREBASE ==========
function loadCommandes() {
  const tbody = document.getElementById('ordersTableBody');
  tbody.innerHTML = '<tr><td colspan="9">Chargement...</td></tr>';

  db.collection("commandes")
    .orderBy("date", "desc")
    .get()
    .then((snapshot) => {
      allCommandes = [];
      snapshot.forEach(doc => {
        allCommandes.push({ id: doc.id, ...doc.data() });
      });
      displayCommandes(allCommandes);
      updateStats();
      initializeWilayaFilter();
    })
    .catch((error) => {
      console.error("Erreur Firebase:", error);
      tbody.innerHTML = `<tr><td colspan="9">Erreur de chargement</td></tr>`;
    });
}

// ========== AFFICHAGE DU TABLEAU ==========
function displayCommandes(commandes) {
  const tbody = document.getElementById('ordersTableBody');
  if (commandes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9">Aucune commande trouvée</td></tr>`;
    return;
  }
  tbody.innerHTML = commandes.map(cmd => `
    <tr>
      <td class="order-id">${cmd.orderNumber}</td>
      <td>${cmd.firstName} ${cmd.lastName}</td>
      <td>
        <span class="order-type ${cmd.orderType}">
          ${cmd.orderType === 'domicile' ? '🏠 Domicile' : '🏪 Stop Desk'}
        </span>
      </td>
      <td>${cmd.wilaya}</td>
      <td>${cmd.phone1}</td>
      <td class="total-price">${(cmd.grandTotal || 0).toFixed(2)} DA</td>
      <td>
        <span class="status-badge-table ${getStatusClass(cmd.status || 'pending')}">
          ${getStatusLabel(cmd.status || 'pending')}
        </span>
      </td>
      <td>
        <button onclick="showDetail('${cmd.orderNumber}')">Détails</button>
        <button class="delete-btn" onclick="deleteCommande('${cmd.orderNumber}')">🗑</button>
      </td>
    </tr>
  `).join('');
}

// ========== MODAL DÉTAILS ==========
function showDetail(orderNumber) {
  const cmd = allCommandes.find(c => c.orderNumber === orderNumber);
  if (!cmd) return;

  // Sauvegarder l'ID du document Firebase dans le modal
  document.getElementById('detailModal').dataset.firebaseId = cmd.id;
  document.getElementById('detailModal').dataset.currentOrderNumber = orderNumber;

  document.getElementById('detailOrderNumber').textContent = cmd.orderNumber;
  document.getElementById('detailDate').textContent = formatDateTime(cmd.date);
  document.getElementById('detailName').textContent = `${cmd.firstName} ${cmd.lastName}`;
  document.getElementById('detailPhone1').textContent = cmd.phone1 || '—';
  document.getElementById('detailPhone2').textContent = cmd.phone2 || '—';
  document.getElementById('detailWilaya').textContent = cmd.wilaya || '—';
  document.getElementById('detailCommune').textContent = cmd.commune || '—';

  const status = cmd.status || 'pending';
  const badge = document.getElementById('detailStatusBadge');
  badge.textContent = getStatusLabel(status);
  badge.className = 'status-badge-table ' + getStatusClass(status);

  // Produits
  const itemsContainer = document.getElementById('detailItems');
  if (cmd.cartItems && cmd.cartItems.length > 0) {
    itemsContainer.innerHTML = cmd.cartItems.map(item => `
      <div class="item-entry">
        <div><strong>${item.name}</strong><br>${item.price} DA × ${item.quantity}</div>
        <div><strong>${(item.price * item.quantity).toFixed(2)} DA</strong></div>
      </div>
    `).join('');
  } else {
    itemsContainer.innerHTML = '<p>Aucun produit</p>';
  }

  // Totals
  document.getElementById('detailCartTotal').textContent = (cmd.cartTotal || 0).toFixed(2);
  document.getElementById('detailShipping').textContent = (cmd.shippingPrice || 0).toFixed(2);
  document.getElementById('detailTotal').textContent = (cmd.grandTotal || 0).toFixed(2);

  document.getElementById('detailModal').classList.add('active');
}

function closeDetail() {
  document.getElementById('detailModal').classList.remove('active');
}

// ========== GESTION DU STATUT ==========
function getStatusClass(status) {
  return {
    pending: 'status-pending',
    accepted: 'status-accepted',
    shipped: 'status-shipped',
    arrived: 'status-arrived',
    returned: 'status-returned'
  }[status] || 'status-pending';
}

function getStatusLabel(status) {
  return {
    pending: '⏳ En attente',
    accepted: '✓ Acceptée',
    shipped: '🚚 En route',
    arrived: '📦 Arrivée',
    returned: '↩️ Retournée'
  }[status] || '⏳ En attente';
}

// ✅ Mise à jour du statut dans Firebase
function updateOrderStatus(newStatus) {
  const firebaseId = document.getElementById('detailModal').dataset.firebaseId;
  const orderNumber = document.getElementById('detailModal').dataset.currentOrderNumber;

  if (!firebaseId) {
    alert("Erreur: ID Firebase manquant");
    return;
  }

  db.collection("commandes").doc(firebaseId).update({
    status: newStatus
  })
  .then(() => {
    // Mettre à jour localement
    const cmd = allCommandes.find(c => c.orderNumber === orderNumber);
    if (cmd) cmd.status = newStatus;
    showNotification('Statut mis à jour');
    filterCommandes(); // Recharger la table
  })
  .catch((error) => {
    console.error("Erreur mise à jour:", error);
    alert("Erreur lors de la mise à jour du statut");
  });
}

// ========== SUPPRESSION ==========
function deleteCommande(orderNumber) {
  if (!confirm(`Supprimer la commande ${orderNumber} ?`)) return;

  const cmd = allCommandes.find(c => c.orderNumber === orderNumber);
  if (!cmd || !cmd.id) {
    alert("Commande introuvable");
    return;
  }

  db.collection("commandes").doc(cmd.id).delete()
    .then(() => {
      allCommandes = allCommandes.filter(c => c.orderNumber !== orderNumber);
      filterCommandes();
      updateStats();
      showNotification('Commande supprimée');
    })
    .catch((error) => {
      console.error("Erreur suppression:", error);
      alert("Erreur lors de la suppression");
    });
}

// ========== FILTRES ==========
function filterCommandes() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const type = document.getElementById('filterType').value;
  const wilaya = document.getElementById('filterWilaya').value;

  const filtered = allCommandes.filter(c => {
    const matchSearch =
      c.orderNumber.toLowerCase().includes(search) ||
      (c.firstName && c.firstName.toLowerCase().includes(search)) ||
      (c.lastName && c.lastName.toLowerCase().includes(search)) ||
      (c.phone1 && c.phone1.includes(search));
    const matchType = !type || c.orderType === type;
    const matchWilaya = !wilaya || c.wilaya === wilaya;
    return matchSearch && matchType && matchWilaya;
  });

  displayCommandes(filtered);
}

function clearFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('filterType').value = '';
  document.getElementById('filterWilaya').value = '';
  filterCommandes();
}

// ========== STATISTIQUES ==========
function updateStats() {
  document.getElementById('totalCommandes').textContent = allCommandes.length;
  const totalRevenu = allCommandes.reduce((sum, c) => sum + (c.grandTotal || 0), 0);
  document.getElementById('totalRevenu').textContent = totalRevenu.toFixed(2) + ' DA';
  const domicile = allCommandes.filter(c => c.orderType === 'domicile').length;
  const stopdesk = allCommandes.filter(c => c.orderType === 'stopdesk').length;
  document.getElementById('totalDomicile').textContent = domicile;
  document.getElementById('totalStopdesk').textContent = stopdesk;
}

// ========== FILTRE WILAYA ==========
function initializeWilayaFilter() {
  const select = document.getElementById('filterWilaya');
  select.innerHTML = '<option value="">Toutes les wilayas</option>';
  const wilayas = [...new Set(allCommandes.map(c => c.wilaya).filter(Boolean))].sort();
  wilayas.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w;
    opt.textContent = w;
    select.appendChild(opt);
  });
}

// ========== EXPORT CSV ==========
function exportCommandes() {
  if (allCommandes.length === 0) {
    alert("Aucune commande à exporter");
    return;
  }

  let csv = 'N° Commande;Client;Téléphone;Wilaya;Commune;Type;Total (DA);Statut;Date\n';
  allCommandes.forEach(c => {
    csv += `"${c.orderNumber}";"${c.firstName} ${c.lastName}";"${c.phone1}";"${c.wilaya}";"${c.commune}";"${c.orderType}";"${(c.grandTotal || 0).toFixed(2)}";"${c.status || 'pending'}";"${c.date}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `commandes_amar_informatique_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ========== UTILITAIRES ==========
function showNotification(msg) {
  const n = document.createElement('div');
  n.textContent = msg;
  n.style.cssText = `
    position: fixed; top: 20px; right: 20px;
    background: #27ae60; color: white;
    padding: 12px 18px; border-radius: 5px;
    z-index: 9999; font-size: 1rem;
  `;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 3000);
}

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', () => {
  loadCommandes();

  // Écouteurs de filtre
  document.getElementById('searchInput').addEventListener('input', filterCommandes);
  document.getElementById('filterType').addEventListener('change', filterCommandes);
  document.getElementById('filterWilaya').addEventListener('change', filterCommandes);

  // Bouton Réinitialiser
  const resetBtn = document.querySelector('.filters button');
  if (resetBtn) resetBtn.addEventListener('click', clearFilters);
});
// ========== MODAL AJOUT PRODUIT ==========
function openAddProductModal() {
  document.getElementById('addProductModal').classList.add('active');
  document.getElementById('addProductForm').reset();
}

function closeAddProductModal() {
  document.getElementById('addProductModal').classList.remove('active');
}

// ========== ENREGISTRER NOUVEAU PRODUIT ==========
document.getElementById('addProductForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('productName').value.trim();
  const image = document.getElementById('productImage').value.trim();
  const category = document.getElementById('productCategory').value;
  const description = document.getElementById('productDescription').value.trim();
  const price = parseFloat(document.getElementById('productPrice').value);

  if (!name || !image || !category || isNaN(price) || price <= 0) {
    alert("Veuillez remplir tous les champs obligatoires correctement.");
    return;
  }

  const nouveauProduit = {
    name,
    image,
    category,
    description: description || '',
    price,
    dateAdded: new Date().toISOString()
  };

  try {
    await db.collection("produits").add(nouveauProduit);
    showNotification('✅ Produit ajouté avec succès!');
    closeAddProductModal();
    // يمكنك هنا تحديث قائمة المنتجات إذا كنت تملك صفحة إدارة منفصلة
  } catch (error) {
    console.error("Erreur ajout produit:", error);
    alert("❌ Erreur lors de l'ajout du produit. Vérifiez la connexion.");
  }
});