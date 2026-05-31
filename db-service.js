/**
 * Wahbi Zoghbi - Database Service
 * Firebase Firestore + Cloudinary Integration
 * @version 1.0.0
 */

import {
    collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
    query, orderBy, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase-config.js";

// ============================================
// ☁️ CLOUDINARY IMAGE UPLOAD
// ============================================

/**
 * Upload image to Cloudinary using unsigned preset
 * @param {File} file - The image file to upload
 * @param {string} folder - Optional folder name in Cloudinary
 * @returns {Promise<string>} - Secure URL of the uploaded image
 */
export async function uploadImage(file, folder = 'wahbi-zoghbi') {
    if (!file) return null;
    
    // ✅ Validate file type and size
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!validTypes.includes(file.type)) {
        throw new Error('Format non supporté. Utilisez JPG, PNG ou WebP.');
    }
    if (file.size > maxSize) {
        throw new Error('Image trop lourde. Maximum 5Mo.');
    }

    // ⚙️ Cloudinary Configuration (Same as Phone Haven)
    const CLOUD_NAME = "dy7bererc";
    const UPLOAD_PRESET = "BladiShop";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    if (folder) formData.append("folder", folder);

    try {
        console.log(`☁️ Cloudinary: Upload de ${file.name}...`);
        
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
            { method: "POST", body: formData }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `Erreur HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log("✅ Cloudinary: Upload réussi:", data.secure_url);
        return data.secure_url;
        
    } catch (err) {
        console.error("❌ Cloudinary Error:", err.message);
        throw new Error(`Échec de l'upload: ${err.message}`);
    }
}

// ============================================
// 📦 PRODUCTS SERVICE
// ============================================

/**
 * Add new product to Firestore
 * @param {Object} product - Product data object
 * @returns {Promise<string>} - Document ID
 */
export async function addProduct(product) {
    try {
        const newProduct = {
            ...product,
            dateAdded: serverTimestamp(),
            quantity: product.quantity || 0,
            flavors: product.flavors || [],
            views: 0,
            sold: 0
        };
        const docRef = await addDoc(collection(db, "produits"), newProduct);
        console.log("✅ Product added:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("❌ Error adding product:", error);
        throw error;
    }
}

/**
 * Get all products from Firestore
 * @returns {Promise<Array>} - Array of products
 */
export async function getProducts() {
    try {
        const q = query(collection(db, "produits"), orderBy("dateAdded", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("❌ Error fetching products:", error);
        throw error;
    }
}

/**
 * Update existing product
 * @param {string} id - Product document ID
 * @param {Object} data - Fields to update
 */
export async function updateProduct(id, data) {
    try {
        await updateDoc(doc(db, "produits", id), {
            ...data,
            updatedAt: serverTimestamp()
        });
        console.log("✅ Product updated:", id);
    } catch (error) {
        console.error("❌ Error updating product:", error);
        throw error;
    }
}

/**
 * Delete product from Firestore
 * @param {string} id - Product document ID
 */
export async function deleteProduct(id) {
    try {
        await deleteDoc(doc(db, "produits", id));
        console.log("✅ Product deleted:", id);
    } catch (error) {
        console.error("❌ Error deleting product:", error);
        throw error;
    }
}

/**
 * Get product by ID
 * @param {string} id - Product document ID
 * @returns {Promise<Object|null>}
 */
export async function getProductById(id) {
    try {
        const docRef = doc(db, "produits", id);
        const snapshot = await getDocs(docRef);
        if (snapshot.exists()) {
            return { id: snapshot.id, ...snapshot.data() };
        }
        return null;
    } catch (error) {
        console.error("❌ Error fetching product:", error);
        throw error;
    }
}

// ============================================
// 📤 EXPORTS
// ============================================

export default {
    uploadImage,
    addProduct,
    getProducts,
    updateProduct,
    deleteProduct,
    getProductById,
    db
};
