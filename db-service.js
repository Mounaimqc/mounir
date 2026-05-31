/**
 * Wahbi Zoghbi - Database Service
 * Firebase Firestore + Cloudinary Integration
 */

import {
    collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
    query, orderBy, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase-config.js";

// ============================================
// ☁️ CLOUDINARY IMAGE UPLOAD
// ============================================

export async function uploadImage(file, folder = 'wahbi-zoghbi') {
    if (!file) return null;
    
    // ✅ التحقق من نوع وحجم الملف
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!validTypes.includes(file.type)) {
        throw new Error('Format non supporté. Utilisez JPG, PNG ou WebP.');
    }
    if (file.size > maxSize) {
        throw new Error('Image trop lourde. Maximum 5Mo.');
    }

    // ⚙️ إعدادات Cloudinary (نفس الإعدادات تاع السيت الأول)
    const CLOUD_NAME = "dy7bererc";
    const UPLOAD_PRESET = "BladiShop";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", folder);

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

export async function addProduct(product) {
    try {
        const newProduct = {
            ...product,
            dateAdded: serverTimestamp(),
            quantity: product.quantity || 0,
            flavors: product.flavors || []
        };
        const docRef = await addDoc(collection(db, "produits"), newProduct);
        console.log("✅ Product added:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("❌ Error adding product:", error);
        throw error;
    }
}

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

export async function updateProduct(id, data) {
    try {
        await updateDoc(doc(db, "produits", id), {
            ...data,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("❌ Error updating product:", error);
        throw error;
    }
}

export async function deleteProduct(id) {
    try {
        await deleteDoc(doc(db, "produits", id));
    } catch (error) {
        console.error("❌ Error deleting product:", error);
        throw error;
    }
}

// Export default for convenience
export default {
    uploadImage, addProduct, getProducts, updateProduct, deleteProduct, db
};
