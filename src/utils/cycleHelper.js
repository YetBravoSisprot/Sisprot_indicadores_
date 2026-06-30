/**
 * Mapeo de ciclos según requerimiento de negocio:
 * En BBDD vienen como 'cycle 10' pero son 'Ciclo 15'
 * En BBDD vienen como 'cycle 25' pero son 'Ciclo 30'
 */

export const isPymeClient = (cliente) => {
    if (!cliente) return false;
    let tipo = "";
    if (cliente.client_subdivision && cliente.client_subdivision !== "") {
        const partes = String(cliente.client_subdivision).split("_");
        if (partes.length >= 2 && partes[1]) {
            tipo = partes[1].toUpperCase();
        }
    }
    if (!tipo && cliente.client_type_name) {
        tipo = String(cliente.client_type_name).trim().toUpperCase();
    }
    return tipo === "PYME";
};

export const mapCycleValue = (val, cliente) => {
    if (val === null || val === undefined) return "N/A";
    if (!isPymeClient(cliente)) {
        return "1";
    }
    const cycle = String(val).trim();
    if (cycle === "10") return "15";
    if (cycle === "25") return "30";
    return cycle;
};

export const getCycleLabel = (val, cliente) => {
    if (val === null || val === undefined) return "N/A";
    const mapped = mapCycleValue(val, cliente);
    return `Ciclo ${mapped}`;
};
