/* ==============================
   GESTION DES COMMANDES (FIREBASE) - VERSION PRO
   ============================== */
import { db } from './firebase-config.js';
import { collection, getDocs, orderBy, query, doc, updateDoc, deleteDoc, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let allCommandes = [];
let revenueChartInstance = null;
let statusChartInstance = null;

// ========== CHARGEMENT DES COMMANDES (REAL-TIME) ==========
function loadCommandes() {
    const tbody = document.getElementById('ordersTableBody');
    
    // Listener en temps réel
    const q = query(collection(db, "commandes"), orderBy("date", "desc"));
    
    onSnapshot(q, (snapshot) => {
        allCommandes = [];
        snapshot.forEach(doc => {
            allCommandes.push({ id: doc.id, ...doc.data() });
        });
        
        displayCommandes(allCommandes);
        updateStats();
        updateCharts();
        initializeWilayaFilter();
        
        if(allCommandes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 40px; color: var(--text-light);">Aucune commande trouvée</td></tr>`;
        }
    }, (error) => {
        console.error("Erreur Firebase: ", error);
        showToast("Erreur de connexion à la base de données", "error");
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 40px; color: var(--danger);">Erreur de chargement</td></tr>`;
    });
}

// ========== AFFICHAGE DU TABLEAU ==========
function displayCommandes(commandes) {
    const tbody = document.getElementById('ordersTableBody');
    if (commandes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 40px;">Aucune commande trouvée</td></tr>`;
        return;
    }

    tbody.innerHTML = commandes.map(cmd => {
        const statusClass = getStatusClass(cmd.status || 'pending');
        const statusLabel = getStatusLabel(cmd.status || 'pending');
        
        return `
        <tr>
            <td style="font-weight:600; color:var(--primary);">#${cmd.orderNumber}</td>
            <td>${cmd.firstName} ${cmd.lastName}</td>
            <td><span style="font-size:0.85rem;"><i class="fa-solid ${cmd.orderType === 'domicile' ? 'fa-truck' : 'fa-store'}"></i> ${cmd.orderType === 'domicile' ? 'Domicile' : 'Stop Desk'}</span></td>
            <td>${cmd.wilaya}</td>
            <td>
                ${cmd.phone1} 
                <i class="fa-regular fa-copy icon-btn" onclick="copyToClipboardText('${cmd.phone1}')" title="Copier"></i>
            </td>
            <td style="font-weight:600;">${(cmd.grandTotal || 0).toFixed(2)} DA</td>
            <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
            <td>
                <div class="action-btns">
                    <button class="icon-btn" onclick="showDetail('${cmd.orderNumber}')" title="Détails"><i class="fa-solid fa-eye"></i></button>
                    <button class="icon-btn delete" onclick="deleteCommande('${cmd.orderNumber}')" title="Supprimer"><i class="fa-solid fa-trash"></i></button>
                </div>
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
    document.getElementById('detailName').textContent = `${cmd.firstName} ${cmd.lastName}`;
    document.getElementById('detailPhone1').textContent = cmd.phone1 || '—';
    document.getElementById('detailPhone2').textContent = cmd.phone2 || '—';
    document.getElementById('detailAddress').textContent = `${cmd.wilaya}, ${cmd.commune || ''}`;
    
    const status = cmd.status || 'pending';
    const badge = document.getElementById('detailStatusBadge');
    badge.textContent = getStatusLabel(status);
    badge.className = 'status-badge ' + getStatusClass(status);
    
    // Set select value
    document.getElementById('statusSelect').value = status;

    // Produits
    const itemsContainer = document.getElementById('detailItems');
    if (cmd.cartItems && cmd.cartItems.length > 0) {
        itemsContainer.innerHTML = cmd.cartItems.map(item => `
            <div class="detail-row">
                <span class="detail-label">${item.name} x${item.quantity}</span>
                <span class="detail-value">${(item.price * item.quantity).toFixed(2)} DA</span>
            </div>
        `).join('');
    } else {
        itemsContainer.innerHTML = '<div style="text-align:center; color:var(--text-light);">Aucun produit</div>';
    }

    document.getElementById('detailTotal').textContent = (cmd.grandTotal || 0).toFixed(2) + ' DA';
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

function confirmStatusUpdate() {
    const newStatus = document.getElementById('statusSelect').value;
    updateOrderStatus(newStatus);
}

function updateOrderStatus(newStatus) {
    const firebaseId = document.getElementById('detailModal').dataset.firebaseId;
    if (!firebaseId) {
        showToast("Erreur: ID Firebase manquant", "error");
        return;
    }

    updateDoc(doc(db, "commandes", firebaseId), { status: newStatus })
    .then(() => {
        showToast('Statut mis à jour avec succès', 'success');
        closeDetail();
    })
    .catch((error) => {
        console.error("Erreur mise à jour:", error);
        showToast("Erreur lors de la mise à jour", "error");
    });
}

// ========== SUPPRESSION ==========
function deleteCommande(orderNumber) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la commande ${orderNumber} ?`)) return;
    
    const cmd = allCommandes.find(c => c.orderNumber === orderNumber);
    if (!cmd || !cmd.id) {
        showToast("Commande introuvable", "error");
        return;
    }

    deleteDoc(doc(db, "commandes", cmd.id))
    .then(() => {
        showToast('Commande supprimée', 'success');
    })
    .catch((error) => {
        console.error("Erreur suppression:", error);
        showToast("Erreur lors de la suppression", "error");
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

// ========== STATISTIQUES & CHARTS ==========
function updateStats() {
    document.getElementById('totalCommandes').textContent = allCommandes.length;
    const totalRevenu = allCommandes.reduce((sum, c) => sum + (c.grandTotal || 0), 0);
    document.getElementById('totalRevenu').textContent = totalRevenu.toFixed(2) + ' DA';
    const domicile = allCommandes.filter(c => c.orderType === 'domicile').length;
    const stopdesk = allCommandes.filter(c => c.orderType === 'stopdesk').length;
    document.getElementById('totalDomicile').textContent = domicile;
    document.getElementById('totalStopdesk').textContent = stopdesk;
}

function updateCharts() {
    // Prepare Data
    const statusCounts = { pending: 0, accepted: 0, shipped: 0, arrived: 0, returned: 0 };
    allCommandes.forEach(c => {
        const s = c.status || 'pending';
        if(statusCounts[s] !== undefined) statusCounts[s]++;
    });

    // Status Chart (Doughnut)
    const ctxStatus = document.getElementById('statusChart').getContext('2d');
    if(statusChartInstance) statusChartInstance.destroy();
    
    statusChartInstance = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: ['En Attente', 'Acceptée', 'En Route', 'Arrivée', 'Retournée'],
            datasets: [{
                data: [statusCounts.pending, statusCounts.accepted, statusCounts.shipped, statusCounts.arrived, statusCounts.returned],
                backgroundColor: ['#F59E0B', '#2563EB', '#10B981', '#3B82F6', '#EF4444'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    // Revenue Chart (Simple Bar - Mocked for demo as date aggregation is complex)
    const ctxRevenue = document.getElementById('revenueChart').getContext('2d');
    if(revenueChartInstance) revenueChartInstance.destroy();

    // Group by last 7 days (Simplified logic)
    const revenueData = [0,0,0,0,0,0,0]; 
    // In a real app, you would parse dates and group them properly. 
    // Here we just show total for visual consistency.
    const totalRev = allCommandes.reduce((sum, c) => sum + (c.grandTotal || 0), 0);
    
    revenueChartInstance = new Chart(ctxRevenue, {
        type: 'bar',
        data: {
            labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
            datasets: [{
                label: 'Revenu (DA)',
                data: [totalRev * 0.1, totalRev * 0.2, totalRev * 0.15, totalRev * 0.25, totalRev * 0.1, totalRev * 0.1, totalRev * 0.1], // Dummy distribution
                backgroundColor: '#2563EB',
                borderRadius: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
}

// ========== FILTRE WILAYA ==========
function initializeWilayaFilter() {
    const select = document.getElementById('filterWilaya');
    const currentVal = select.value;
    select.innerHTML = '<option value="">Toutes les wilayas</option>';
    const wilayas = [...new Set(allCommandes.map(c => c.wilaya).filter(Boolean))].sort();
    wilayas.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w;
        opt.textContent = w;
        select.appendChild(opt);
    });
    select.value = currentVal;
}

// ========== EXPORT CSV ==========
function exportCommandes() {
    if (allCommandes.length === 0) {
        showToast("Aucune commande à exporter", "error");
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
    a.download = `commandes_amar_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("Export CSV téléchargé", "success");
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

function copyToClipboardText(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast("Copié dans le presse-papier", "success");
    });
}

function copyToClipboard(elementId) {
    const text = document.getElementById(elementId).textContent;
    copyToClipboardText(text);
}

function formatDateTime(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function printInvoice() {
    window.print();
}

// ========== MODAL PRODUIT ==========
function openAddProductModal() {
    document.getElementById('addProductModal').classList.add('active');
    document.getElementById('addProductForm').reset();
}

function closeAddProductModal() {
    document.getElementById('addProductModal').classList.remove('active');
}

document.getElementById('addProductForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('productName').value.trim();
    const image = document.getElementById('productImage').value.trim();
    const category = document.getElementById('productCategory').value;
    const description = document.getElementById('productDescription').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);

    if (!name || !image || !category || isNaN(price) || price <= 0) {
        showToast("Veuillez remplir tous les champs correctement", "error");
        return;
    }

    const nouveauProduit = {
        name, image, category,
        description: description || '',
        price,
        dateAdded: new Date().toISOString()
    };

    try {
        await addDoc(collection(db, "produits"), nouveauProduit);
        showToast('✅ Produit ajouté avec succès!', 'success');
        closeAddProductModal();
    } catch (error) {
        console.error("Erreur ajout produit:", error);
        showToast("❌ Erreur lors de l'ajout", "error");
    }
});

// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', () => {
    loadCommandes();
    
    // Event Listeners
    document.getElementById('searchInput').addEventListener('input', filterCommandes);
    document.getElementById('filterType').addEventListener('change', filterCommandes);
    document.getElementById('filterWilaya').addEventListener('change', filterCommandes);
    
    // Mobile Sidebar Toggle (Optional enhancement)
    // Add a burger menu in HTML for mobile if needed
});
