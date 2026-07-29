// ============================================================
// AUTENTICACIÓN Y ROLES (CORE)
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signOut 
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ============================================================
// FUNCIÓN: OBTENER ROL DEL USUARIO DESDE FIRESTORE
// ============================================================
export async function obtenerRolUsuario(uid) {
    if (!uid) return null;
    try {
        const docRef = doc(db, "usuarios_registrados", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data().rol || "cliente";
        } else {
            return null; // Usuario no registrado en Firestore
        }
    } catch (error) {
        console.error("Error al obtener rol:", error);
        return null;
    }
}

// ============================================================
// FUNCIÓN: VERIFICAR SI ES ADMIN
// ============================================================
export async function esAdmin(uid) {
    const rol = await obtenerRolUsuario(uid);
    return rol === "admin";
}

// ============================================================
// FUNCIÓN: REGISTRAR NUEVO USUARIO (CREA DOCUMENTO EN FIRESTORE)
// ============================================================
export async function registrarUsuario(email, password, datosAdicionales = {}) {
    try {
        const credenciales = await createUserWithEmailAndPassword(auth, email, password);
        const user = credenciales.user;
        
        // Guardar en Firestore con rol "cliente" por defecto
        await setDoc(doc(db, "usuarios_registrados", user.uid), {
            clienteEmail: email,
            nombre: datosAdicionales.nombre || "Cliente",
            whatsapp: datosAdicionales.whatsapp || "",
            rol: "cliente", // <-- Por defecto, cliente
            fechaRegistro: new Date().toLocaleDateString()
        });
        
        return user;
    } catch (error) {
        throw error;
    }
}

// ============================================================
// FUNCIÓN: INICIAR SESIÓN (SOLO AUTENTICA, NO MODIFICA ROLES)
// ============================================================
export async function iniciarSesion(email, password) {
    try {
        const credenciales = await signInWithEmailAndPassword(auth, email, password);
        return credenciales.user;
    } catch (error) {
        throw error;
    }
}

// ============================================================
// FUNCIÓN: CERRAR SESIÓN
// ============================================================
export async function cerrarSesion() {
    await signOut(auth);
    window.location.href = "../login.html";
}

// ============================================================
// EXPORTAR AUTH Y DB PARA USO EN OTROS MÓDULOS
// ============================================================
export { auth, db };
