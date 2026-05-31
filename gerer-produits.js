// gerer-produits.js - Firebase v10+ Compatible + Cloudinary Integration
import { collection, query, doc, updateDoc, deleteDoc, onSnapshot }
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from './firebase-config.js';

let allProducts = [];

// ==========================================
// 📦 PRODUCTS LOADING & DISPLAY
// ==========================================

function loadProducts() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px"><i class="fa-solid fa-circle-notch fa-spin"></i> Chargement...</td></tr>`;

    const q = query(collection(db, "produits"));

    onSnapshot(q, (snapshot) => {
        allProducts = [];
        snapshot.forEach(docSnap => {
            allProducts.push({ id: docSnap.id, ...docSnap.data() });
        });

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
        const imagePreview = p.image ? 
            `<img src="${p.image}" class="product-img-td" alt="${p.name}" onerror="this.src='https://via.placeholder.com/60'">` : 
            `<div class="product-img-td" style="display:flex;align-items:center;justify-content:center;background:#222;color:#888;"><i class="fa-solid fa-image"></i></div>`;

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

// ==========================================
// 🔍 FILTERS & UTILITIES
// ==========================================

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

function deleteProduct(id) {
    const p = allProducts.find(prod => prod.id === id);
    if (!p) return;

    if (!confirm(`T'es Sûr(e) de vouloir supprimer définitivement le produit "${p.name}" ?`)) return;

    deleteDoc(doc(db, "produits", id))
        .then(() => { showNotification('✅ Produit supprimé', 'success'); })
        .catch((error) => {
            console.error("Erreur:", error);
            showNotification('❌ Erreur suppression', 'error');
        });
}

function showNotification(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ==========================================
// 🖼️ IMAGE UPLOAD HANDLING (Main Product)
// ==========================================

let editImageMode = 'url';

function setupEditImageUploadUI() {
    const modeUrlBtn = document.getElementById('editImageModeUrl');
    const modeUploadBtn = document.getElementById('editImageModeUpload');
    const urlContainer = document.getElementById('editImageModeUrlContainer');
    const uploadContainer = document.getElementById('editImageModeUploadContainer');
    const urlInput = document.getElementById('editProductImage');
    const fileInput = document.getElementById('editProductImageFile');
    const previewContainer = document.getElementById('editImagePreview');
    const previewImg = document.getElementById('editPreviewImg');
    const finalImageInput = document.getElementById('editProductImageFinal');

    if (!modeUrlBtn || !urlContainer) return;

    modeUrlBtn.addEventListener('click', () => {
        editImageMode = 'url';
        modeUrlBtn.className = 'btn btn-primary';
        modeUploadBtn.className = 'btn btn-outline';
        urlContainer.style.display = 'block';
        uploadContainer.style.display = 'none';
        if (urlInput && finalImageInput) finalImageInput.value = urlInput.value;
    });

    modeUploadBtn.addEventListener('click', () => {
        editImageMode = 'upload';
        modeUploadBtn.className = 'btn btn-primary';
        modeUrlBtn.className = 'btn btn-outline';
        urlContainer.style.display = 'none';
        uploadContainer.style.display = 'block';
    });

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

    urlInput?.addEventListener('input', () => {
        if (editImageMode === 'url' && finalImageInput) finalImageInput.value = urlInput.value;
    });
}

// ==========================================
// 🎨 FLAVOR FIELDS WITH UPLOAD SUPPORT
// ==========================================

function addEditFlavorField(nameVal = '', imageVal = '') {
    const list = document.getElementById('editFlavorsList');
    if (!list) return;

    const div = document.createElement('div');
    div.className = 'flavor-item';
    div.style.cssText = 'border:1px solid var(--border); padding:12px; border-radius:var(--radius); margin-bottom:10px; background:var(--bg);';

    div.innerHTML = `
        <div class="form-group" style="margin-bottom:10px;">
            <label class="form-label" style="font-size:0.8rem;">Nom du goût *</label>
            <input type="text" class="form-control flavor-name" placeholder="Ex: Chocolat, Vanille..." value="${nameVal}" required>
        </div>
        
        <div class="form-group" style="margin-bottom:10px;">
            <label class="form-label" style="font-size:0.8rem;">Image du goût</label>
            <div style="display:flex; gap:6px; margin-bottom:8px; flex-wrap:wrap;">
                <button type="button" class="btn btn-outline flavor-mode-url" style="padding:4px 10px; font-size:0.75rem; background:var(--primary); color:#fff; border-color:var(--primary);">
                    <i class="fa-solid fa-link"></i> URL
                </button>
                <button type="button" class="btn btn-outline flavor-mode-upload" style="padding:4px 10px; font-size:0.75rem;">
                    <i class="fa-solid fa-cloud-arrow-up"></i> Upload
                </button>
            </div>
            
            <div class="flavor-url-container">
                <input type="url" class="form-control flavor-image-url" placeholder="https://example.com/image.jpg" value="${imageVal}">
            </div>
            
            <div class="flavor-upload-container" style="display:none;">
                <input type="file" class="form-control flavor-image-file" accept="image/*" style="padding:6px; cursor:pointer; font-size:0.85rem;">
                <div class="flavor-preview" style="display:none; margin-top:8px;">
                    <p style="font-size:0.7rem; color:var(--text-light); margin-bottom:4px;">Aperçu:</p>
                    <img src="${imageVal || ''}" alt="Preview" class="flavor-preview-img" style="max-width:100%; max-height:100px; border-radius:4px; border:1px solid var(--border); object-fit:contain; background:var(--surface);">
                </div>
            </div>
            <input type="hidden" class="flavor-image-final" value="${imageVal}">
            <p style="font-size:0.7rem; color:var(--text-light); margin-top:4px;"><i class="fa-solid fa-circle-info"></i> JPG, PNG, WebP • Max: 5Mo</p>
        </div>
        
        <button type="button" class="btn btn-outline" onclick="this.closest('.flavor-item').remove()" style="width:100%; padding:8px; font-size:0.8rem; color:var(--danger); border-color:var(--danger);">
            <i class="fa-solid fa-trash"></i> Supprimer ce goût
        </button>
    `;
    
    list.appendChild(div);
    initEditFlavorFieldEvents(div, imageVal);
}

function initEditFlavorFieldEvents(field, initialImage = '') {
    const modeUrlBtn = field.querySelector('.flavor-mode-url');
    const modeUploadBtn = field.querySelector('.flavor-mode-upload');
    const urlContainer = field.querySelector('.flavor-url-container');
    const uploadContainer = field.querySelector('.flavor-upload-container');
    const urlInput = field.querySelector('.flavor-image-url');
    const fileInput = field.querySelector('.flavor-image-file');
    const previewContainer = field.querySelector('.flavor-preview');
    const previewImg = field.querySelector('.flavor-preview-img');
    const finalInput = field.querySelector('.flavor-image-final');
    
    modeUrlBtn?.addEventListener('click', () => {
        modeUrlBtn.style.background = 'var(--primary)'; modeUrlBtn.style.color = '#fff'; modeUrlBtn.style.borderColor = 'var(--primary)';
        modeUploadBtn.style.background = ''; modeUploadBtn.style.color = ''; modeUploadBtn.style.borderColor = '';
        urlContainer.style.display = 'block'; uploadContainer.style.display = 'none';
        if (urlInput && finalInput) finalInput.value = urlInput.value;
    });
    
    modeUploadBtn?.addEventListener('click', () => {
        modeUploadBtn.style.background = 'var(--primary)'; modeUploadBtn.style.color = '#fff'; modeUploadBtn.style.borderColor = 'var(--primary)';
        modeUrlBtn.style.background = ''; modeUrlBtn.style.color = ''; modeUrlBtn.style.borderColor = '';
        urlContainer.style.display = 'none'; uploadContainer.style.display = 'block';
    });
    
    fileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && previewImg && previewContainer) {
            const reader = new FileReader();
            reader.onload = (ev) => { previewImg.src = ev.target.result; previewContainer.style.display = 'block'; };
            reader.readAsDataURL(file);
        } else if (previewContainer) { previewContainer.style.display = 'none'; }
    });
    
    urlInput?.addEventListener('input', () => {
        if (finalInput && modeUrlBtn.style.background === 'var(--primary)') finalInput.value = urlInput.value;
    });
    
    // Set initial state if imageVal provided
    if (initialImage && !initialImage.startsWith('blob:')) {
        modeUrlBtn.style.background = 'var(--primary)';
        modeUrlBtn.style.color = '#fff';
        modeUrlBtn.style.borderColor = 'var(--primary)';
    }
}

// ==========================================
// 🔄 EDIT MODAL & SUBMISSION
// ==========================================

function openEditProductModal(id) {
    const p = allProducts.find(prod => prod.id === id);
    if (!p) return;

    // Reset form first
    resetEditForm();
    
    document.getElementById('editProductId').value = p.id;
    document.getElementById('editProductName').value = p.name || '';
    document.getElementById('editProductImage').value = p.image || '';
    document.getElementById('editProductImageFinal').value = p.image || '';
    document.getElementById('editProductCategory').value = p.category || '';
    document.getElementById('editProductDescription').value = p.description || '';
    document.getElementById('editProductQuantity').value = p.quantity !== undefined ? p.quantity : 10;
    document.getElementById('editProductPrice').value = p.price || 0;

    // Set image preview if exists
    if (p.image && !p.image.startsWith('blob:')) {
        const previewImg = document.getElementById('editPreviewImg');
        const previewContainer = document.getElementById('editImagePreview');
        if (previewImg && previewContainer) {
            previewImg.src = p.image;
            previewContainer.style.display = 'block';
        }
    }

    // Render flavors
    const flavorsList = document.getElementById('editFlavorsList');
    flavorsList.innerHTML = '';

    if (p.flavors && Array.isArray(p.flavors)) {
        p.flavors.forEach(f => {
            addEditFlavorField(f.name, f.image);
        });
    }

    // Setup image upload UI
    setupEditImageUploadUI();
    
    document.getElementById('editProductModal').classList.add('active');
}

function closeEditProductModal() {
    document.getElementById('editProductModal').classList.remove('active');
}

function resetEditForm() {
    const form = document.getElementById('editProductForm');
    if (form) form.reset();
    
    document.getElementById('editFlavorsList')?.replaceChildren();
    
    const previewContainer = document.getElementById('editImagePreview');
    if (previewContainer) previewContainer.style.display = 'none';
    const previewImg = document.getElementById('editPreviewImg');
    if (previewImg) previewImg.src = '';
    const fileInput = document.getElementById('editProductImageFile');
    if (fileInput) fileInput.value = '';
    
    document.getElementById('editImageModeUrlContainer').style.display = 'block';
    document.getElementById('editImageModeUploadContainer').style.display = 'none';
    document.getElementById('editImageModeUrl').className = 'btn btn-primary';
    document.getElementById('editImageModeUpload').className = 'btn btn-outline';
    
    const finalImageInput = document.getElementById('editProductImageFinal');
    if (finalImageInput) finalImageInput.value = '';
    editImageMode = 'url';
    
    // Reset flavor previews
    document.querySelectorAll('.flavor-preview').forEach(p => {
        p.style.display = 'none';
        const img = p.querySelector('img');
        if (img) img.src = '';
    });
    document.querySelectorAll('.flavor-image-file').forEach(input => {
        if (input) input.value = '';
    });
}

// Submit Edits with Cloudinary Upload Support
document.getElementById('editProductForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('editProductSubmitBtn');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Traitement...';

    try {
        const id = document.getElementById('editProductId').value;
        const name = document.getElementById('editProductName').value.trim();
        const category = document.getElementById('editProductCategory').value;
        const description = document.getElementById('editProductDescription').value.trim();
        const quantity = parseInt(document.getElementById('editProductQuantity').value) || 0;
        const price = parseFloat(document.getElementById('editProductPrice').value);

        // Handle main image
        let imageUrl = '';
        if (editImageMode === 'upload') {
            const file = document.getElementById('editProductImageFile')?.files[0];
            if (file) {
                const { uploadImage } = await import('./db-service.js');
                showNotification('📤 Upload image principale...', 'info');
                imageUrl = await uploadImage(file);
            }
        } else {
            imageUrl = document.getElementById('editProductImage')?.value.trim();
        }

        if (!id || !name || !imageUrl || !category || isNaN(price) || price <= 0) {
            throw new Error('Veuillez remplir tous les champs obligatoires');
        }

        // Gather flavors with upload support
        const flavors = [];
        const { uploadImage } = await import('./db-service.js');
        const flavorItems = document.querySelectorAll('#editFlavorsList .flavor-item');
        
        for (const item of flavorItems) {
            const fName = item.querySelector('.flavor-name')?.value.trim();
            if (!fName) continue;
            
            let fImg = '';
            const isUrlMode = item.querySelector('.flavor-mode-url')?.style.background === 'var(--primary)';
            
            if (isUrlMode) {
                fImg = item.querySelector('.flavor-image-url')?.value.trim();
            } else {
                const fFile = item.querySelector('.flavor-image-file')?.files[0];
                if (fFile) {
                    try {
                        showNotification(`📤 Upload "${fName}"...`, 'info');
                        fImg = await uploadImage(fFile, 'wahbi-zoghbi/flavors');
                    } catch (err) {
                        console.error(err);
                        fImg = imageUrl; // Fallback to main image
                    }
                } else {
                    fImg = item.querySelector('.flavor-image-final')?.value || imageUrl;
                }
            }
            
            if (fImg) flavors.push({ name: fName, image: fImg });
        }

        await updateDoc(doc(db, "produits", id), {
            name, image: imageUrl, category, description, price, quantity, flavors
        });
        
        showNotification('✅ Produit mis à jour!', 'success');
        closeEditProductModal();
        
    } catch (error) {
        console.error("Erreur:", error);
        showNotification('❌ ' + (error.message || 'Erreur mise à jour'), 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
});

// ==========================================
// 📌 INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    document.getElementById('searchInput')?.addEventListener('input', filterProducts);
    document.getElementById('filterCategory')?.addEventListener('change', filterProducts);
    setupEditImageUploadUI();
});

// Global Exports
window.deleteProduct = deleteProduct;
window.filterProducts = filterProducts;
window.clearFilters = clearFilters;
window.openEditProductModal = openEditProductModal;
window.closeEditProductModal = closeEditProductModal;
window.addEditFlavorField = addEditFlavorField;
window.resetEditForm = resetEditForm;
