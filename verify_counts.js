const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\yetza\\Downloads\\Sisprot_indicadores_-main\\src\\PasswordContext\\data.jsx';
const content = fs.readFileSync(filePath, 'utf8');

const startMatch = content.indexOf('{');
const endMatch = content.lastIndexOf('}');
const jsonString = content.substring(startMatch, endMatch + 1);

const isPymeClient = (cliente) => {
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

const isResidencialClient = (cliente) => {
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
    return tipo === "RESIDENCIAL";
};

const mapCycleValue = (val, cliente) => {
    if (val === null || val === undefined) return "N/A";
    if (!isPymeClient(cliente)) {
        return "1";
    }
    const cycle = String(val).trim();
    if (cycle === "10") return "15";
    if (cycle === "25") return "30";
    return cycle;
};

try {
    const data = JSON.parse(jsonString);
    const clients = data.results;

    console.log(`Total de clientes en data.jsx: ${clients.length}`);

    // Agrupación de clientes por tipo (PYME, RESIDENCIAL, OTROS)
    const types = {};
    clients.forEach(c => {
        let type = 'OTRO';
        if (isPymeClient(c)) type = 'PYME';
        else if (isResidencialClient(c)) type = 'RESIDENCIAL';
        
        types[type] = (types[type] || 0) + 1;
    });
    console.log("Conteo por tipo de cliente:", types);

    // Mapeo detallado de ciclos
    const pymeCycles = {};
    const residentialCycles = {};
    
    clients.forEach(c => {
        const rawCycle = c.cycle;
        const mappedCycle = mapCycleValue(rawCycle, c);
        
        if (isPymeClient(c)) {
            pymeCycles[rawCycle] = pymeCycles[rawCycle] || { count: 0, mapped: {} };
            pymeCycles[rawCycle].count++;
            pymeCycles[rawCycle].mapped[mappedCycle] = (pymeCycles[rawCycle].mapped[mappedCycle] || 0) + 1;
        } else if (isResidencialClient(c)) {
            residentialCycles[rawCycle] = residentialCycles[rawCycle] || { count: 0, mapped: {} };
            residentialCycles[rawCycle].count++;
            residentialCycles[rawCycle].mapped[mappedCycle] = (residentialCycles[rawCycle].mapped[mappedCycle] || 0) + 1;
        }
    });

    console.log("\n--- CLIENTES PYME ---");
    console.log("Ciclo en BBDD -> Conteo [Mapeado a Ciclo Comercial]");
    for (const [raw, info] of Object.entries(pymeCycles)) {
        console.log(`  Raw Cycle: ${raw} -> ${info.count} clientes (Mapped to: ${JSON.stringify(info.mapped)})`);
    }

    console.log("\n--- CLIENTES RESIDENCIALES ---");
    console.log("Ciclo en BBDD -> Conteo [Mapeado a Ciclo Comercial]");
    for (const [raw, info] of Object.entries(residentialCycles)) {
        console.log(`  Raw Cycle: ${raw} -> ${info.count} clientes (Mapped to: ${JSON.stringify(info.mapped)})`);
    }

} catch (e) {
    console.error("Error parseando data.jsx:", e);
}
