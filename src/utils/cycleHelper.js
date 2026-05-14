/**
 * Mapeo de ciclos según requerimiento de negocio:
 * En BBDD vienen como 'cycle 10' pero son 'Ciclo 15'
 * En BBDD vienen como 'cycle 25' pero son 'Ciclo 30'
 */

export const mapCycleValue = (val) => {
    if (val === null || val === undefined) return "N/A";
    const cycle = String(val).trim();
    if (cycle === "10") return "15";
    if (cycle === "25") return "30";
    return cycle;
};

export const getCycleLabel = (val) => {
    if (val === null || val === undefined) return "N/A";
    const mapped = mapCycleValue(val);
    return `Ciclo ${mapped}`;
};
