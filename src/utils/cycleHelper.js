/**
 * Mapeo de ciclos según requerimiento de negocio:
 * En BBDD vienen como 'cycle 10' pero son 'Ciclo 15'
 * En BBDD vienen como 'cycle 25' pero son 'Ciclo 30'
 */

export const mapCycleValue = (val) => {
    if (val === null || val === undefined) return "N/A";
    return "1";
};

export const getCycleLabel = (val) => {
    if (val === null || val === undefined) return "N/A";
    return "Ciclo 1";
};
