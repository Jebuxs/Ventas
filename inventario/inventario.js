// ============================================================
// IMPORTS DE FIREBASE Y CONFIGURACIONES
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import {
    getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, getDocs, query, where
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { firebaseConfig } from "../core/firebase-config.js";
import { esAdmin, cerrarSesion } from "../core/auth.js";

// ============================================================
// INICIALIZACIÓN
// ============================================================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ============================================================
// VERIFICAR ACCESO ADMIN
// ============================================================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "../login.html";
        return;
    }
    const admin = await esAdmin(user);
    if (!admin) {
        alert("⛔ Acceso denegado. No eres administrador.");
        await cerrarSesion();
        return;
    }
    document.getElementById('adminEmail').textContent = user.email;
    cargarProductos();
    cargarMateriaPrima();
    cargarProductosParaCatalogo();
});

// ============================================================
// FUNCIONES GLOBALES
// ============================================================
window.cerrarSesion = cerrarSesion;

// ============================================================
// NAVEGACIÓN DE TABS
// ============================================================
const tabButtons = document.querySelectorAll('.tab-btn');
tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
});

// ============================================================
// MENÚ MÓVIL
// ============================================================
document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

// ============================================================
// CRUD: PRODUCTOS
// ============================================================
async function cargarProductos() {
    const tbody = document.getElementById('tablaProductos');
    onSnapshot(collection(db, "inventario_productos"), (snapshot) => {
        tbody.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${data.nombre}</strong><br><span class="text-xs text-gray-500">${data.marca || ''} ${data.modelo || ''}</span></td>
                <td>${data.tallas ? data.tallas.join(', ') : 'N/A'}</td>
                <td>${data.colores ? data.colores.join(', ') : 'N/A'}</td>
                <td>$${data.precioCompra?.toFixed(2) || '0.00'}</td>
                <td class="font-semibold text-orange-600">$${data.precioVenta?.toFixed(2) || '0.00'}</td>
                <td>${data.stock || 0}</td>
                <td>
                    <button onclick="editarProducto('${id}')" class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs">✏️</button>
                    <button onclick="eliminarProducto('${id}')" class="btn-danger text-xs px-2 py-1">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-gray-500">No hay productos registrados.</td></tr>`;
        }
    });
}

window.abrirModalProducto = (producto = null) => {
    const modal = document.getElementById('modalProducto');
    const titulo = document.getElementById('modalProductoTitulo');
    if (producto) {
        titulo.textContent = '✏️ Editar Producto';
        document.getElementById('productoId').value = producto.id;
        document.getElementById('prodNombre').value = producto.nombre || '';
        document.getElementById('prodMarca').value = producto.marca || '';
        document.getElementById('prodModelo').value = producto.modelo || '';
        document.getElementById('prodCategoria').value = producto.categoria || 'zapatos';
        document.getElementById('prodPrecioCompra').value = producto.precioCompra || '';
        document.getElementById('prodPrecioVenta').value = producto.precioVenta || '';
        document.getElementById('prodTallas').value = producto.tallas ? producto.tallas.join(',') : '';
        document.getElementById('prodColores').value = producto.colores ? producto.colores.join(',') : '';
        document.getElementById('prodStock').value = producto.stock || '';
        document.getElementById('prodFichaTecnica').value = producto.fichaTecnica || '';
        document.getElementById('prodGarantia').value = producto.garantiaMeses || 6;
        document.getElementById('prodImagen').value = producto.imagen || '';
        if (producto.imagen) {
            document.getElementById('previewContainer').style.display = 'block';
            document.getElementById('previewImagen').src = producto.imagen;
            document.getElementById('linkImagen').href = producto.imagen;
            document.getElementById('estadoSubida').innerHTML = '✅ Imagen cargada';
        }
    } else {
        titulo.textContent = '🆕 Nuevo Producto';
        document.getElementById('formProducto').reset();
        document.getElementById('productoId').value = '';
        document.getElementById('prodGarantia').value = 6;
        document.getElementById('prodImagen').value = '';
        document.getElementById('previewContainer').style.display = 'none';
        document.getElementById('estadoSubida').textContent = 'Sin imagen';
    }
    modal.classList.add('active');
};

window.cerrarModalProducto = () => {
    document.getElementById('modalProducto').classList.remove('active');
};

document.getElementById('modalProducto').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) cerrarModalProducto();
});

// Guardar producto
document.getElementById('formProducto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('productoId').value;
    const imagenURL = document.getElementById('prodImagen').value.trim();
    if (!imagenURL) {
        alert('⚠️ Debes subir una imagen primero.');
        return;
    }
    const data = {
        nombre: document.getElementById('prodNombre').value.trim(),
        marca: document.getElementById('prodMarca').value.trim(),
        modelo: document.getElementById('prodModelo').value.trim(),
        categoria: document.getElementById('prodCategoria').value,
        precioCompra: parseFloat(document.getElementById('prodPrecioCompra').value),
        precioVenta: parseFloat(document.getElementById('prodPrecioVenta').value),
        tallas: document.getElementById('prodTallas').value.split(',').map(t => t.trim()).filter(Boolean),
        colores: document.getElementById('prodColores').value.split(',').map(c => c.trim()).filter(Boolean),
        stock: parseInt(document.getElementById('prodStock').value),
        fichaTecnica: document.getElementById('prodFichaTecnica').value.trim(),
        garantiaMeses: parseInt(document.getElementById('prodGarantia').value) || 6,
        imagen: imagenURL,
        fechaRegistro: new Date().toLocaleDateString()
    };
    try {
        if (id) {
            await updateDoc(doc(db, "inventario_productos", id), data);
            alert('✅ Producto actualizado.');
        } else {
            await addDoc(collection(db, "inventario_productos"), data);
            alert('✅ Producto agregado al inventario.');
        }
        cerrarModalProducto();
    } catch (err) {
        alert('Error: ' + err.message);
    }
});

window.editarProducto = async (id) => {
    const docRef = doc(db, "inventario_productos", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        abrirModalProducto({ id, ...docSnap.data() });
    } else {
        alert('Producto no encontrado.');
    }
};

window.eliminarProducto = async (id) => {
    if (confirm('¿Eliminar este producto del inventario?')) {
        try {
            await deleteDoc(doc(db, "inventario_productos", id));
        } catch (err) {
            alert('Error: ' + err.message);
        }
    }
};

// ============================================================
// SUBIR IMAGEN A IMGBB (desde inventario)
// ============================================================
const IMGBB_API_KEY = 'cb12e6a76abb14df50fa90b78479a43c';
const IMGBB_ENDPOINT = 'https://api.imgbb.com/1/upload';

document.getElementById('btnSubirImgBB')?.addEventListener('click', async () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    if (!file) {
        alert('Selecciona una imagen primero.');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        alert('La imagen es demasiado grande. Máximo 5MB.');
        return;
    }
    const estadoDiv = document.getElementById('estadoSubida');
    estadoDiv.innerHTML = '<span class="status-loading">⏳ Subiendo imagen...</span>';
    try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('key', IMGBB_API_KEY);
        const response = await fetch(IMGBB_ENDPOINT, { method: 'POST', body: formData });
        const data = await response.json();
        if (data.success) {
            const url = data.data.url;
            document.getElementById('prodImagen').value = url;
            document.getElementById('previewContainer').style.display = 'block';
            document.getElementById('previewImagen').src = url;
            document.getElementById('linkImagen').href = url;
            estadoDiv.innerHTML = '<span class="status-ok">✅ Imagen subida con éxito</span>';
        } else {
            throw new Error(data.error?.message || 'Error desconocido');
        }
    } catch (error) {
        estadoDiv.innerHTML = `<span class="status-error">❌ Error: ${error.message}</span>`;
        alert('Error al subir la imagen: ' + error.message);
    }
});

// ============================================================
// CRUD: MATERIA PRIMA
// ============================================================
async function cargarMateriaPrima() {
    const tbody = document.getElementById('tablaMateriaPrima');
    onSnapshot(collection(db, "inventario_materiaprima"), (snapshot) => {
        tbody.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${data.nombre}</strong></td>
                <td>${data.cantidad || 0}</td>
                <td>${data.unidad || 'unidades'}</td>
                <td>${data.proveedor || '—'}</td>
                <td>
                    <button onclick="editarMateriaPrima('${id}')" class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs">✏️</button>
                    <button onclick="eliminarMateriaPrima('${id}')" class="btn-danger text-xs px-2 py-1">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">No hay materiales registrados.</td></tr>`;
        }
    });
}

window.abrirModalMateriaPrima = (material = null) => {
    const modal = document.getElementById('modalMateriaPrima');
    if (material) {
        document.getElementById('materialId').value = material.id;
        document.getElementById('matNombre').value = material.nombre || '';
        document.getElementById('matCantidad').value = material.cantidad || '';
        document.getElementById('matUnidad').value = material.unidad || 'unidades';
        document.getElementById('matProveedor').value = material.proveedor || '';
    } else {
        document.getElementById('formMateriaPrima').reset();
        document.getElementById('materialId').value = '';
    }
    modal.classList.add('active');
};

window.cerrarModalMateriaPrima = () => {
    document.getElementById('modalMateriaPrima').classList.remove('active');
};

document.getElementById('modalMateriaPrima').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) cerrarModalMateriaPrima();
});

document.getElementById('formMateriaPrima').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('materialId').value;
    const data = {
        nombre: document.getElementById('matNombre').value.trim(),
        cantidad: parseFloat(document.getElementById('matCantidad').value),
        unidad: document.getElementById('matUnidad').value,
        proveedor: document.getElementById('matProveedor').value.trim()
    };
    try {
        if (id) {
            await updateDoc(doc(db, "inventario_materiaprima", id), data);
            alert('✅ Material actualizado.');
        } else {
            await addDoc(collection(db, "inventario_materiaprima"), data);
            alert('✅ Material agregado.');
        }
        cerrarModalMateriaPrima();
    } catch (err) {
        alert('Error: ' + err.message);
    }
});

window.editarMateriaPrima = async (id) => {
    const docRef = doc(db, "inventario_materiaprima", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        abrirModalMateriaPrima({ id, ...docSnap.data() });
    } else {
        alert('Material no encontrado.');
    }
};

window.eliminarMateriaPrima = async (id) => {
    if (confirm('¿Eliminar este material?')) {
        try {
            await deleteDoc(doc(db, "inventario_materiaprima", id));
        } catch (err) {
            alert('Error: ' + err.message);
        }
    }
};

// ============================================================
// GENERAR CATÁLOGO (publicar en "calzado")
// ============================================================
async function cargarProductosParaCatalogo() {
    const tbody = document.getElementById('tablaCatalogoPublicar');
    onSnapshot(collection(db, "inventario_productos"), (snapshot) => {
        tbody.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="checkbox" class="producto-select" data-id="${id}" /></td>
                <td><strong>${data.nombre}</strong><br><span class="text-xs text-gray-500">${data.marca || ''} ${data.modelo || ''}</span></td>
                <td>${data.tallas ? data.tallas.join(', ') : 'N/A'}</td>
                <td class="font-semibold text-orange-600">$${data.precioVenta?.toFixed(2) || '0.00'}</td>
                <td>
                    <button onclick="verFichaTecnica('${id}')" class="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs">📄 Ficha</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">No hay productos para publicar.</td></tr>`;
        }
    });
}

window.verFichaTecnica = async (id) => {
    const docRef = doc(db, "inventario_productos", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        alert(`📄 Ficha Técnica\n\n${data.fichaTecnica || 'No disponible'}`);
    }
};

window.publicarCatalogo = async () => {
    const checkboxes = document.querySelectorAll('.producto-select:checked');
    if (checkboxes.length === 0) {
        alert('Selecciona al menos un producto para publicar.');
        return;
    }
    if (!confirm(`¿Publicar ${checkboxes.length} productos en el catálogo?`)) return;
    try {
        for (const checkbox of checkboxes) {
            const id = checkbox.dataset.id;
            const docRef = doc(db, "inventario_productos", id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Publicar en la colección "calzado" (la que usa index.html)
                await addDoc(collection(db, "calzado"), {
                    nombre: data.nombre,
                    categoria: data.categoria || 'zapatos',
                    precio: data.precioVenta,
                    imagen: data.imagen || '',
                    tallas: data.tallas || [],
                    colores: data.colores || [],
                    stock: data.stock || 0,
                    descripcion: data.fichaTecnica || '',
                    proveedorId: 'admin',
                    fechaRegistro: new Date().toLocaleDateString()
                });
            }
        }
        alert('✅ Productos publicados en el catálogo exitosamente.');
    } catch (err) {
        alert('Error al publicar: ' + err.message);
    }
};
