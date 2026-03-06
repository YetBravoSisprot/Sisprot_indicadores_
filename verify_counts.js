
const fs = require('fs');
const path = require('path');

// Leer el archivo data.jsx
// El archivo exporta una constante largeArraydata
// Dado que es un .jsx y probablemente usa syntax de ES6, necesitamos leerlo como texto y parsear el JSON si es posible,
// o simplemente buscar patrones si el JSON está bien estructurado.

const filePath = 'c:\\Users\\yetza\\Downloads\\Sisprot_indicadores_-main\\Sisprot_indicadores_-main\\src\\PasswordContext\\data.jsx';
const content = fs.readFileSync(filePath, 'utf8');

// Intentar extraer el objeto JSON. Empieza después de "const largeArraydata ="
const startMatch = content.indexOf('{');
const endMatch = content.lastIndexOf('}');
const jsonString = content.substring(startMatch, endMatch + 1);

try {
    const data = JSON.parse(jsonString);
    const clients = data.results;

    const suspendedCycle15 = clients.filter(c =>
        c.status_name === "Suspendido" && c.cycle === 10
    );

    console.log(`Clientes Suspendidos en Ciclo 15 (Backend cycle 10): ${suspendedCycle15.length}`);

    // También verificar Ciclo 30 (Backend cycle 25)
    const suspendedCycle30 = clients.filter(c =>
        c.status_name === "Suspendido" && c.cycle === 25
    );
    console.log(`Clientes Suspendidos en Ciclo 30 (Backend cycle 25): ${suspendedCycle30.length}`);

} catch (e) {
    console.error("Error parseando data.jsx:", e);
}
