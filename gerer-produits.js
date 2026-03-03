import { collection, query, doc, updateDoc, deleteDoc, onSnapshot }
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from './firebase-config.js';

let allProducts = [];

// ========== CHARGEMENT DES PRODUITS ==========
function loadProducts() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px"><i class="fa-solid fa-circle-notch fa-spin"></i> Chargement...</td></tr>`;

    // No index on products, just get them all
    const q = query(collection(db, "produits"));

    onSnapshot(q, (snapshot) => {
        allProducts = [];
        snapshot.forEach(docSnap => {
            allProducts.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Sort by name client side
        allProducts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        displayProducts(allProducts);

        if (allProducts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-light)">Aucun produit enregistré</td></tr>`;
        }
    }, (error) => {
        console.error("❌ Erreur Firebase:", error);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--danger)">Erreur: ${error.message}</td></tr>`;
    });
}

// ========== AFFICHAGE TABLEAU ==========
function displayProducts(products) {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    if (products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-light)">Aucun produit trouvé</td></tr>`;
        return;
    }

    tbody.innerHTML = products.map(p => {
        const qty = parseInt(p.quantity) || 0;
        const statusClass = qty > 0 ? 'status-in-stock' : 'status-out-of-stock';
        const statusLabel = qty > 0 ? `${qty} en stock` : `Rupture`;
        const imagePreview = p.image ? `<img src="${p.image}" class="product-img-td" alt="${p.name}" onerror="this.src='https://via.placeholder.com/60'">` : `<div class="product-img-td" style="display:flex;align-items:center;justify-content:center;background:#222;color:#888;"><i class="fa-solid fa-image"></i></div>`;

        return `
      <tr>
        <td>${imagePreview}</td>
        <td style="font-weight:600">${p.name || 'Sans nom'}</td>
        <td><span style="font-size:.85rem;color:var(--primary);">${p.category || '-'}</span></td>
        <td style="font-weight:600">${(parseFloat(p.price) || 0).toFixed(2)} DA</td>
        <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
        <td>
          <button onclick="openEditProductModal('${p.id}')" style="padding:6px 12px;background:var(--primary);color:#000;border:none;border-radius:4px;cursor:pointer;font-weight:600;">Modifier</button>
          <button onclick="deleteProduct('${p.id}')" style="padding:6px 12px;background:var(--danger);color:#fff;border:none;border-radius:4px;cursor:pointer;margin-left:5px">🗑</button>
        </td>
      </tr>`;
    }).join('');
}

// ========== FILTRES ==========
function filterProducts() {
    const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const category = document.getElementById('filterCategory')?.value || '';

    const filtered = allProducts.filter(p => {
        const matchSearch = p.name?.toLowerCase().includes(search) || p.description?.toLowerCase().includes(search);
        return matchSearch && (!category || p.category === category);
    });
    displayProducts(filtered);
}

function clearFilters() {
    if (document.getElementById('searchInput')) document.getElementById('searchInput').value = '';
    if (document.getElementById('filterCategory')) document.getElementById('filterCategory').value = '';
    filterProducts();
}

// ========== SUPPRESSION ==========
function deleteProduct(id) {
    const p = allProducts.find(prod => prod.id === id);
    if (!p) return;

    if (!confirm(`T'es Sûr(e) de vouloir supprimer définitivement le produit "${p.name}" ?`)) return;

    deleteDoc(doc(db, "produits", id))
        .then(() => {
            showNotification('✅ Produit supprimé', 'success');
            // No need to manually refresh list since snapshot event will trigger
        })
        .catch((error) => {
            console.error("Erreur:", error);
            showNotification('❌ Erreur suppression', 'error');
        });
}

// ========== MODIFICATION PRODUIT ==========
function openEditProductModal(id) {
    const p = allProducts.find(prod => prod.id === id);
    if (!p) return;

    document.getElementById('editProductId').value = p.id;
    document.getElementById('editProductName').value = p.name || '';
    document.getElementById('editProductImage').value = p.image || '';
    document.getElementById('editProductCategory').value = p.category || '';
    document.getElementById('editProductDescription').value = p.description || '';
    document.getElementById('editProductQuantity').value = p.quantity !== undefined ? p.quantity : 10;
    document.getElementById('editProductPrice').value = p.price || 0;

    // Render flavors
    const flavorsList = document.getElementById('editFlavorsList');
    flavorsList.innerHTML = '';

    if (p.flavors && Array.isArray(p.flavors)) {
        p.flavors.forEach(f => {
            addEditFlavorField(f.name, f.image);
        });
    }

    document.getElementById('editProductModal').classList.add('active');
}

function closeEditProductModal() {
    document.getElementById('editProductModal').classList.remove('active');
}

function addEditFlavorField(nameVal = '', imageVal = '') {
    const list = document.getElementById('editFlavorsList');
    if (!list) return;

    const div = document.createElement('div');
    div.className = 'flavor-item form-row';
    div.style.marginBottom = '0';
    div.style.alignItems = 'center';

    div.innerHTML = `
    <input type="text" class="form-control flavor-name" placeholder="Nom (ex: Chocolat)" value="${nameVal}" required>
    <input type="url" class="form-control flavor-image" placeholder="Image URL (Optionnelle)" value="${imageVal}">
    <button type="button" class="btn btn-outline" style="color:var(--danger); border-color:var(--danger); padding:10px; margin-top:5px; width:100%;" onclick="this.parentElement.remove()">
      <i class="fa-solid fa-trash"></i>
    </button>
  `;
    list.appendChild(div);
}

// Submit Edits
document.getElementById('editProductForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('editProductId').value;
    const name = document.getElementById('editProductName').value.trim();
    const image = document.getElementById('editProductImage').value.trim();
    const category = document.getElementById('editProductCategory').value;
    const description = document.getElementById('editProductDescription').value.trim();
    const quantity = parseInt(document.getElementById('editProductQuantity').value) || 0;
    const price = parseFloat(document.getElementById('editProductPrice').value);

    if (!id || !name || !image || !category || isNaN(price) || price <= 0) {
        showNotification('Veuillez remplir tous les champs obligatoires', 'error'); return;
    }

    // Gather flavors
    const flavors = [];
    document.querySelectorAll('#editFlavorsList .flavor-item').forEach(item => {
        const fName = item.querySelector('.flavor-name')?.value.trim();
        const fImage = item.querySelector('.flavor-image')?.value.trim();
        if (fName) {
            flavors.push({ name: fName, image: fImage || image });
        }
    });

    try {
        await updateDoc(doc(db, "produits", id), {
            name, image, category, description, price, quantity, flavors
        });
        showNotification('✅ Produit mis à jour!', 'success');
        closeEditProductModal();
    } catch (error) {
        console.error("Erreur:", error);
        showNotification('❌ Erreur mise à jour', 'error');
    }
});

// ========== UTILITAIRES ==========
function showNotification(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    document.getElementById('searchInput')?.addEventListener('input', filterProducts);
    document.getElementById('filterCategory')?.addEventListener('change', filterProducts);
});

// Expose global functions
window.deleteProduct = deleteProduct;
window.filterProducts = filterProducts;
window.clearFilters = clearFilters;
window.openEditProductModal = openEditProductModal;
window.closeEditProductModal = closeEditProductModal;
window.addEditFlavorField = addEditFlavorField;
