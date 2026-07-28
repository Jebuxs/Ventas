// ============================================================
// FUNCIONES DE UTILIDAD (CORE)
// ============================================================

// Formatear fecha
export function formatearFecha(fecha) {
    if (!fecha) return "--";
    const d = new Date(fecha);
    return d.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
}

// Validar URL
export function esUrlValida(url) {
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
}

// Generar ID único (para uso temporal)
export function generarId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Mostrar mensaje de estado en el DOM
export function mostrarMensaje(elemento, mensaje, tipo = "info") {
    const clases = {
        success: "status-success",
        error: "status-error",
        loading: "status-loading",
        info: "text-gray-500"
    };
    elemento.className = `text-sm ${clases[tipo] || clases.info}`;
    elemento.textContent = mensaje;
}

// Obtener el nombre del banco a partir de su clave
export function obtenerNombreBanco(clave) {
    const bancos = {
        pichincha: "Banco Pichincha",
        solidario: "Banco Solidario",
        guayaquil: "Banco Guayaquil",
        pacifico: "Banco Pacífico",
        produbanco: "Produbanco",
        internacional: "Banco Internacional",
        bolivariano: "Banco Bolivariano",
        austro: "Banco del Austro",
        loja: "Banco de Loja",
        amazonas: "Banco Amazonas"
    };
    return bancos[clave] || clave;
}
