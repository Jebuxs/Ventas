// ============================================================
// ADMIN.JS - LÓGICA DEL PANEL DE ADMINISTRACIÓN
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
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { firebaseConfig } from "../core/firebase-config.js";
import { esAdmin, cerrarSesion } from "../core/auth.js";

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Variables globales
let productosCache = [];
let usuarioAdmin = null;

// ============================================================
// 1. VERIFICAR ACCESO ADMIN
// ============================================================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "../login.html";
        return;
    }
    const admin = await esAdmin();
    if (!admin) {
        alert("⛔ Acceso denegado. No eres administrador.");
        await cerrarSesion();
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
// 2. NAVEGACIÓN POR SIDEBAR
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

// Toggle menú móvil
document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

// ============================================================
// 3. CERRAR SESIÓN
// ============================================================
window.cerrarSesionAdmin = cerrarSesion;

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
                    productosHtml += `${art.nombre} (Talla: ${art.talla || 'N/A'}, Color: ${art.color || 'N/A'})<br />`;
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
                    <button onclick="verDetallePedido('${id}')" class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs">📋 Ver</button>
                    <select onchange="cambiarEstadoPedido('${id}', this.value)" class="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700">
                        <option value="pendiente_pago" ${estado === 'pendiente_pago' ? 'selected' : ''}>Pendiente pago</option>
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

// ============================================================
// 5. VER DETALLE DE PEDIDO (Modal)
// ============================================================
window.verDetallePedido = async (id) => {
    try {
        const docRef = doc(db, "pedidos", id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            alert('Pedido no encontrado.');
            return;
        }
        const data = docSnap.data();
        const modal = document.getElementById('modalDetallePedido');
        const contenido = document.getElementById('contenidoDetallePedido');
        
        let productosHtml = '';
        if (data.articulos && data.articulos.length) {
            data.articulos.forEach(art => {
                productosHtml += `
                    <tr>
                        <td>${art.nombre}</td>
                        <td>${art.talla || 'N/A'}</td>
                        <td>${art.color || 'N/A'}</td>
                        <td>${art.cantidad || 1}</td>
                        <td>$${(art.precio || 0).toFixed(2)}</td>
                    </tr>
                `;
            });
        }

        contenido.innerHTML = `
            <div class="mb-4">
                <p><strong>Cliente:</strong> ${data.clienteEmail || 'Anónimo'}</p>
                <p><strong>Fecha:</strong> ${data.fecha || '--'}</p>
                <p><strong>Estado:</strong> ${data.estado || 'pendiente'}</p>
                <p><strong>Banco:</strong> ${data.banco || 'No especificado'}</p>
                <p><strong>Número de Transacción:</strong> ${data.numeroTransaccion || 'No ingresado'}</p>
                <p><strong>Total:</strong> $${data.total?.toFixed(2) || '0.00'}</p>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Talla</th>
                            <th>Color</th>
                            <th>Cantidad</th>
                            <th>Precio</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productosHtml}
                    </tbody>
                </table>
            </div>
        `;
        modal.classList.add('active');
    } catch (error) {
        alert('Error al cargar el detalle: ' + error.message);
    }
};

// ============================================================
// 6. CAMBIAR ESTADO DEL PEDIDO
// ============================================================
window.cambiarEstadoPedido = async (id, nuevoEstado) => {
    try {
        await updateDoc(doc(db, "pedidos", id), { estado: nuevoEstado });
    } catch (err) {
        alert('Error al actualizar estado: ' + err.message);
    }
};

// ============================================================
// 7. ELIMINAR PEDIDO
// ============================================================
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
// 8. GESTIÓN DE CATÁLOGO (CRUD)
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
// 9. ABRIR MODAL DE PRODUCTO
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
        // Mostrar tallas y colores si existen
        document.getElementById('prodTallas').value = producto.tallas ? producto.tallas.join(', ') : '';
        document.getElementById('prodColores').value = producto.colores ? producto.colores.join(', ') : '';
        // Vista previa de imagen
        const preview = document.getElementById('previewImagen');
        if (producto.imagen) {
            preview.src = producto.imagen;
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }
        document.getElementById('estadoSubida').innerHTML = producto.imagen ? '<span class="status-ok">✅ Imagen cargada</span>' : 'Sin imagen';
        document.getElementById('prodDescripcion').value = producto.descripcion || '';
    } else {
        titulo.textContent = '🆕 Nuevo Producto';
        document.getElementById('formProducto').reset();
        document.getElementById('productoId').value = '';
        document.getElementById('prodImagen').value = '';
        document.getElementById('prodTallas').value = '';
        document.getElementById('prodColores').value = '';
        document.getElementById('previewImagen').style.display = 'none';
        document.getElementById('estadoSubida').innerHTML = 'Sin imagen';
        document.getElementById('prodGarantia').value = 6;
        document.getElementById('prodStock').value = 10;
    }

    modal.classList.add('active');
};

// ============================================================
// 10. CERRAR MODAL DE PRODUCTO
// ============================================================
window.cerrarModalProducto = () => {
    document.getElementById('modalProducto').classList.remove('active');
};

document.getElementById('modalProducto').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) cerrarModalProducto();
});

// ============================================================
// 11. SUBIR IMAGEN A IMGBB (MANTENEMOS LA LÓGICA QUE YA FUNCIONA)
// ============================================================
const IMGBB_API_KEY = 'cb12e6a76abb14df50fa90b78479a43c';
const IMGBB_ENDPOINT = 'https://api.imgbb.com/1/upload';

document.getElementById('btnSubirImgBB').addEventListener('click', async () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        alert('Selecciona una imagen primero.');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        alert('La imagen es demasiado grande. El tamaño máximo es 5MB.');
        return;
    }

    const estadoDiv = document.getElementById('estadoSubida');
    const preview = document.getElementById('previewImagen');

    estadoDiv.innerHTML = '<span class="status-loading">⏳ Subiendo imagen...</span>';

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
            estadoDiv.innerHTML = '<span class="status-ok">✅ Imagen subida con éxito</span>';
            preview.src = url;
            preview.style.display = 'block';
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
// 12. GUARDAR PRODUCTO (Crear o Actualizar)
// ============================================================
document.getElementById('formProducto').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('productoId').value;
    const imagenUrl = document.getElementById('prodImagen').value.trim();

    if (!imagenUrl) {
        alert('⚠️ Debes subir una imagen primero usando el botón "Subir imagen a ImgBB".');
        return;
    }

    // Procesar tallas y colores
    const tallasRaw = document.getElementById('prodTallas').value.trim();
    const coloresRaw = document.getElementById('prodColores').value.trim();
    const tallas = tallasRaw ? tallasRaw.split(',').map(t => t.trim()) : [];
    const colores = coloresRaw ? coloresRaw.split(',').map(c => c.trim()) : [];

    const data = {
        nombre: document.getElementById('prodNombre').value.trim(),
        categoria: document.getElementById('prodCategoria').value,
        precio: parseFloat(document.getElementById('prodPrecio').value),
        precioCompra: parseFloat(document.getElementById('prodCompra').value) || 0,
        garantiaMeses: parseInt(document.getElementById('prodGarantia').value) || 6,
        stock: parseInt(document.getElementById('prodStock').value) || 10,
        imagen: imagenUrl,
        tallas: tallas,
        colores: colores,
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

// ============================================================
// 13. EDITAR / ELIMINAR PRODUCTO
// ============================================================
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
// 14. GESTIÓN DE USUARIOS
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
// 15. GESTIÓN DE GARANTÍAS
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

// ============================================================
// 16. ASIGNAR REPARADOR Y ELIMINAR GARANTÍA
// ============================================================
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

// ============================================================
// 17. CERRAR MODAL DE DETALLE DE PEDIDO
// ============================================================
document.getElementById('modalDetallePedido').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        document.getElementById('modalDetallePedido').classList.remove('active');
    }
});

console.log('🔥 Panel JADI Admin cargado correctamente.');
