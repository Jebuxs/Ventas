// ============================================================
// AUTENTICACIÓN Y ROLES (CORE)
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut 
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// ============================================================
// FUNCIONES DE AUTENTICACIÓN
// ============================================================

// Iniciar sesión con email y contraseña
export async function iniciarSesion(email, password) {
    try {
        const credenciales = await signInWithEmailAndPassword(auth, email, password);
        return credenciales.user;
    } catch (error) {
        throw error;
    }
}

// Registrar nuevo usuario con email y contraseña
export async function registrarUsuario(email, password, datosAdicionales = {}) {
    try {
        const credenciales = await createUserWithEmailAndPassword(auth, email, password);
        const user = credenciales.user;
        // Guardar en Firestore con rol "cliente" por defecto
        await setDoc(doc(db, "usuarios_registrados", user.uid), {
            clienteEmail: email,
            nombre: datosAdicionales.nombre || "Cliente",
            whatsapp: datosAdicionales.whatsapp || "",
            rol: "cliente",
            fechaRegistro: new Date().toLocaleDateString()
        });
        return user;
    } catch (error) {
        throw error;
    }
}

// Iniciar sesión con Google
export async function iniciarSesionConGoogle() {
    try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        throw error;
    }
}

// Obtener el usuario actual
export function obtenerUsuarioActual() {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
            resolve(user);
        });
    });
}

// Verificar si el usuario es administrador
export async function esAdmin(user) {
    if (!user) return false;
    try {
        const docRef = doc(db, "usuarios_registrados", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().rol === "admin") {
            return true;
        }
        // Si el email es el tuyo, también es admin (fallback)
        if (user.email && user.email.toLowerCase() === "villjebuxs@gmail.com") {
            return true;
        }
        return false;
    } catch (error) {
        console.error("Error al verificar rol:", error);
        return false;
    }
}

// Obtener el rol del usuario desde Firestore
export async function obtenerRol(user) {
    if (!user) return null;
    try {
        const docRef = doc(db, "usuarios_registrados", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data().rol || "cliente";
        }
        return "cliente";
    } catch (error) {
        console.error("Error al obtener rol:", error);
        return null;
    }
}

// Cerrar sesión
export async function cerrarSesion() {
    await signOut(auth);
    window.location.href = "login.html";
}

// Guardar o actualizar usuario en Firestore (sin sobrescribir rol)
export async function guardarUsuario(user, datos = {}) {
    if (!user) return;
    const docRef = doc(db, "usuarios_registrados", user.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        // Si ya existe, solo actualizamos campos que no sean el rol
        const dataActual = docSnap.data();
        await setDoc(docRef, {
            ...dataActual,
            ...datos,
            // No sobrescribimos el rol si ya existe
            rol: dataActual.rol || "cliente"
        }, { merge: true });
    } else {
        // Si no existe, lo creamos con rol "cliente" por defecto
        await setDoc(docRef, {
            clienteEmail: user.email,
            nombre: datos.nombre || user.displayName || "Cliente",
            whatsapp: datos.whatsapp || "",
            rol: "cliente",
            fechaRegistro: new Date().toLocaleDateString()
        });
    }
}

export { auth, db };
