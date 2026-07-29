// ============================================================
// ADMIN.JS - LÓGICA DEL PANEL DE ADMINISTRACIÓN (CORREGIDO)
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import {
    getFirestore,
    collection,
    onSnapshot,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { firebaseConfig } from "../core/firebase-config.js";
import { esAdmin, obtenerRolUsuario, auth, db } from "../core/auth.js";
import { IMGBB_API_KEY, IMGBB_ENDPOINT } from "../config/imgbb-config.js";

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
// Usar auth y db importados desde auth.js

let usuarioAdmin = null;
let productosCache = [];

// ============================================================
// 1. VERIFICAR ACCESO ADMIN (CORREGIDO)
// ============================================================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "../login.html";
        return;
    }

    // Verificar si el usuario tiene rol admin
    const admin = await esAdmin(user.uid);
    if (!admin) {
        alert("⛔ Acceso denegado. No eres administrador.");
        await signOut(auth);
        window.location.href = "../login.html";
        return;
    }

    usuarioAdmin = user;
    document.getElementById('adminEmail').textContent = user.email;
    
    // Cargar datos
    cargarPedidos();
    cargarCatalogo();
    cargarUsuarios();
    cargarGarantias();
});

// ============================================================
// 2. CERRAR SESIÓN
// ============================================================
window.cerrarSesionAdmin = async () => {
    if (confirm('¿Seguro que deseas cerrar sesión?')) {
        await signOut(auth);
        window.location.href = "../login.html";
    }
};

// ============================================================
// 3. NAVEGACIÓN POR SIDEBAR
// ============================================================
const navItems = document.querySelectorAll('.nav-item');
const sections = {
    pedidos: document.getElementById('section-pedidos'),
    catalogo: document.getElementById('section-catalogo'),
    usuarios: document.getElementById('section-usuarios'),
    garantias: document.getElementById('section-garantias')
};

navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        Object.values(sections).forEach(s => s.classList.add('hidden'));
        const sectionName = item.dataset.section;
        if (sections[sectionName]) {
            sections[sectionName].classList.remove('hidden');
        }
        document.getElementById('sidebar').classList.remove('open');
    });
});

document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

// ============================================================
// 4. GESTIÓN DE PEDIDOS
// ============================================================
function cargarPedidos() {
    const q = query(collection(db, "pedidos"), orderBy("fecha", "desc"));
    onSnapshot(q, (snapshot) => {
        const tbody = document.getElementById('tablaPedidos');
        tbody.innerHTML = '';
        let count = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            count++;

            let productosHtml = '';
            if (data.articulos && data.articulos.length) {
                data.articulos.forEach(art => {
                    productosHtml += `${art.nombre} (${art.talla || 'N/A'})<br />`;
                });
            } else {
                productosHtml = 'Ver detalle';
            }

            const estado = data.estado || 'pendiente';
            const badgeClass = `badge-${estado}`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${data.clienteEmail || 'Anónimo'}</td>
                <td class="text-xs">${productosHtml}</td>
                <td class="font-semibold text-orange-600">$${data.total?.toFixed(2) || '0.00'}</td>
                <td class="text-xs text-gray-500">${data.fecha || '--'}</td>
                <td><span class="badge ${badgeClass}">${estado}</span></td>
                <td>
                    <select onchange="cambiarEstadoPedido('${id}', this.value)" class="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700">
                        <option value="pendiente" ${estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                        <option value="pagado" ${estado === 'pagado' ? 'selected' : ''}>Pagado</option>
                        <option value="enviado" ${estado === 'enviado' ? 'selected' : ''}>Enviado</option>
                        <option value="entregado" ${estado === 'entregado' ? 'selected' : ''}>Entregado</option>
                    </select>
                    <button onclick="eliminarPedido('${id}')" class="btn-danger mt-1">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('totalPedidos').textContent = count;
        if (count === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">No hay pedidos registrados.</td></tr>`;
        }
    });
}

window.cambiarEstadoPedido = async (id, nuevoEstado) => {
    try {
        await updateDoc(doc(db, "pedidos", id), { estado: nuevoEstado });
    } catch (err) {
        alert('Error al actualizar estado: ' + err.message);
    }
};

window.eliminarPedido = async (id) => {
    if (confirm('¿Eliminar este pedido permanentemente?')) {
        try {
            await deleteDoc(doc(db, "pedidos", id));
        } catch (err) {
            alert('Error: ' + err.message);
        }
    }
};

// ============================================================
// 5. GESTIÓN DE CATÁLOGO
// ============================================================
function cargarCatalogo() {
    onSnapshot(collection(db, "calzado"), (snapshot) => {
        const tbody = document.getElementById('tablaCatalogo');
        tbody.innerHTML = '';
        productosCache = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            productosCache.push({ id, ...data });

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${data.imagen || 'https://via.placeholder.com/50'}" class="w-12 h-12 object-cover rounded-lg border border-gray-200" /></td>
                <td class="font-medium">${data.nombre}</td>
                <td class="text-orange-600 font-semibold">$${data.precio?.toFixed(2) || '0.00'}</td>
                <td class="text-xs text-gray-500">${data.proveedorId || '—'}</td>
                <td>
                    <button onclick="editarProducto('${id}')" class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs">✏️</button>
                    <button onclick="eliminarProducto('${id}')" class="btn-danger text-xs px-2 py-1">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">No hay productos en el catálogo.</td></tr>`;
        }
    });
}

// ============================================================
// 6. SUBIR IMAGEN A IMGBB
// ============================================================
document.getElementById('btnSubirImgBB').addEventListener('click', async () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        alert('Selecciona una imagen primero.');
        return;
    }

    const estadoDiv = document.getElementById('estadoSubida');
    const previewContainer = document.getElementById('previewContainer');
    const previewImg = document.getElementById('previewImagen');
    const linkImg = document.getElementById('linkImagen');

    estadoDiv.innerHTML = `<span class="status-loading">⏳ Subiendo imagen...</span>`;
    previewContainer.style.display = 'none';

    try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('key', IMGBB_API_KEY);

        const response = await fetch(IMGBB_ENDPOINT, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            const url = data.data.url;
            document.getElementById('prodImagen').value = url;
            estadoDiv.innerHTML = `<span class="status-ok">✅ Imagen subida con éxito</span>`;
            previewImg.src = url;
            previewImg.style.display = 'block';
            linkImg.href = url;
            linkImg.textContent = '🔗 Ver en ImgBB';
            previewContainer.style.display = 'block';
        } else {
            throw new Error(data.error?.message || 'Error desconocido de ImgBB');
        }
    } catch (error) {
        console.error('Error al subir imagen:', error);
        estadoDiv.innerHTML = `<span class="status-error">❌ Error: ${error.message}</span>`;
        alert('Error al subir la imagen: ' + error.message);
    }
});

// ============================================================
// 7. ABRIR / CERRAR MODAL PRODUCTO
// ============================================================
window.abrirModalProducto = (producto = null) => {
    const modal = document.getElementById('modalProducto');
    const titulo = document.getElementById('modalProductoTitulo');

    if (producto) {
        titulo.textContent = '✏️ Editar Producto';
        document.getElementById('productoId').value = producto.id;
        document.getElementById('prodNombre').value = producto.nombre || '';
        document.getElementById('prodCategoria').value = producto.categoria || 'zapatos';
        document.getElementById('prodPrecio').value = producto.precio || '';
        document.getElementById('prodCompra').value = producto.precioCompra || '';
        document.getElementById('prodGarantia').value = producto.garantiaMeses || 6;
        document.getElementById('prodStock').value = producto.stock || 10;
        document.getElementById('prodImagen').value = producto.imagen || '';
        document.getElementById('estadoSubida').innerHTML = producto.imagen ? '✅ Imagen cargada' : 'Sin imagen';
        if (producto.imagen) {
            const preview = document.getElementById('previewImagen');
            preview.src = producto.imagen;
            document.getElementById('previewContainer').style.display = 'block';
            document.getElementById('linkImagen').href = producto.imagen;
        }
        document.getElementById('prodDescripcion').value = producto.descripcion || '';
    } else {
        titulo.textContent = '🆕 Nuevo Producto';
        document.getElementById('formProducto').reset();
        document.getElementById('productoId').value = '';
        document.getElementById('prodImagen').value = '';
        document.getElementById('estadoSubida').innerHTML = 'Sin imagen';
        document.getElementById('previewContainer').style.display = 'none';
        document.getElementById('prodGarantia').value = 6;
        document.getElementById('prodStock').value = 10;
    }

    modal.classList.add('active');
};

window.cerrarModalProducto = () => {
    document.getElementById('modalProducto').classList.remove('active');
};

document.getElementById('modalProducto').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) cerrarModalProducto();
});

// ============================================================
// 8. GUARDAR PRODUCTO (CREAR O ACTUALIZAR)
// ============================================================
document.getElementById('formProducto').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('productoId').value;
    const imagenURL = document.getElementById('prodImagen').value.trim();

    if (!imagenURL) {
        alert('⚠️ Debes subir una imagen primero usando el botón "Subir imagen a ImgBB".');
        return;
    }

    const data = {
        nombre: document.getElementById('prodNombre').value.trim(),
        categoria: document.getElementById('prodCategoria').value,
        precio: parseFloat(document.getElementById('prodPrecio').value),
        precioCompra: parseFloat(document.getElementById('prodCompra').value) || 0,
        garantiaMeses: parseInt(document.getElementById('prodGarantia').value) || 6,
        stock: parseInt(document.getElementById('prodStock').value) || 10,
        imagen: imagenURL,
        descripcion: document.getElementById('prodDescripcion').value.trim(),
        proveedorId: 'admin',
        fechaRegistro: new Date().toLocaleDateString()
    };

    try {
        if (id) {
            await updateDoc(doc(db, "calzado", id), data);
            alert('✅ Producto actualizado.');
        } else {
            await addDoc(collection(db, "calzado"), data);
            alert('✅ Producto agregado al catálogo.');
        }
        cerrarModalProducto();
    } catch (err) {
        alert('Error al guardar: ' + err.message);
    }
});

window.editarProducto = async (id) => {
    const prod = productosCache.find(p => p.id === id);
    if (prod) {
        abrirModalProducto(prod);
    } else {
        alert('Producto no encontrado.');
    }
};

window.eliminarProducto = async (id) => {
    if (confirm('¿Eliminar este producto del catálogo?')) {
        try {
            await deleteDoc(doc(db, "calzado", id));
        } catch (err) {
            alert('Error: ' + err.message);
        }
    }
};

// ============================================================
// 9. GESTIÓN DE USUARIOS
// ============================================================
function cargarUsuarios() {
    onSnapshot(collection(db, "usuarios_registrados"), (snapshot) => {
        const tbody = document.getElementById('tablaUsuarios');
        tbody.innerHTML = '';

        snapshot.forEach(doc => {
            const data = doc.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${data.clienteEmail || data.email || '—'}</td>
                <td><span class="badge ${data.rol === 'admin' ? 'badge-entregado' : 'badge-pendiente'}">${data.rol || 'cliente'}</span></td>
                <td>${data.whatsapp || '—'}</td>
                <td class="text-xs text-gray-500">${data.fechaRegistro || '—'}</td>
            `;
            tbody.appendChild(tr);
        });

        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500">No hay usuarios registrados.</td></tr>`;
        }
    });
}

// ============================================================
// 10. GESTIÓN DE GARANTÍAS
// ============================================================
function cargarGarantias() {
    onSnapshot(collection(db, "garantias"), (snapshot) => {
        const tbody = document.getElementById('tablaGarantias');
        tbody.innerHTML = '';

        snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            const estado = data.estado || 'pendiente';
            const badgeClass = `badge-${estado}`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${data.clienteId || '—'}</td>
                <td>${data.productoId || '—'}</td>
                <td class="text-xs">${data.descripcion || 'Sin descripción'}</td>
                <td><span class="badge ${badgeClass}">${estado}</span></td>
                <td>${data.reparadorId || 'Sin asignar'}</td>
                <td>
                    <button onclick="asignarReparador('${id}')" class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs">👤 Asignar</button>
                    <button onclick="eliminarGarantia('${id}')" class="btn-danger text-xs px-2 py-1">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">No hay solicitudes de garantía.</td></tr>`;
        }
    });
}

window.asignarReparador = async (id) => {
    const nuevoReparador = prompt('Ingresa el ID o email del reparador a asignar:');
    if (nuevoReparador) {
        try {
            await updateDoc(doc(db, "garantias", id), {
                reparadorId: nuevoReparador,
                estado: 'asignado'
            });
            alert('✅ Reparador asignado.');
        } catch (err) {
            alert('Error: ' + err.message);
        }
    }
};

window.eliminarGarantia = async (id) => {
    if (confirm('¿Eliminar esta solicitud de garantía?')) {
        try {
            await deleteDoc(doc(db, "garantias", id));
        } catch (err) {
            alert('Error: ' + err.message);
        }
    }
};

console.log('🔥 Panel JADI Admin cargado correctamente.');
