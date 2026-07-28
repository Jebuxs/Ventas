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
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Función para verificar si el usuario actual es administrador
export async function esAdmin() {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                resolve(false);
                return;
            }
            try {
                const docRef = doc(db, "usuarios_registrados", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().rol === "admin") {
                    resolve(true);
                } else if (user.email && user.email.toLowerCase() === "villjebuxs@gmail.com") {
                    resolve(true);
                } else {
                    resolve(false);
                }
            } catch (error) {
                console.error("Error al verificar rol:", error);
                resolve(false);
            }
        });
    });
}

// Función para obtener el usuario actual
export function obtenerUsuarioActual() {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
            resolve(user);
        });
    });
}

// Cerrar sesión
export async function cerrarSesion() {
    await signOut(auth);
    window.location.href = "../login.html";
}

// Iniciar sesión con email y contraseña
export async function iniciarSesion(email, password) {
    try {
        const credenciales = await signInWithEmailAndPassword(auth, email, password);
        return credenciales.user;
    } catch (error) {
        throw error;
    }
}

// Registrar nuevo usuario
export async function registrarUsuario(email, password, datosAdicionales) {
    try {
        const credenciales = await createUserWithEmailAndPassword(auth, email, password);
        // Aquí podrías guardar datos adicionales en Firestore
        return credenciales.user;
    } catch (error) {
        throw error;
    }
}

export { auth, db };
