/**
 * SGF | PLAN DE BANCOS · MATRIZ MAESTRA Y POLÍTICAS DE SEGREGACIÓN
 *
 * Fuente: Plan de Bancos SGF V6 y Procedimiento Contable y Administrativo
 * Integración: Sisprot BI, Chatbot / IA Engine, ERP A2 y Tesorería.
 */

// ── 1. CATÁLOGO MAESTRO DE CUENTAS BANCARIAS ──────────────────────────────────
export const PLAN_DE_BANCOS = [
    // --- CUENTAS JURÍDICAS EN MONEDA NACIONAL (Bs.) ---
    {
        id: "bnc-3732",
        titularidad: "Jurídica",
        banco: "BNC",
        bancoNombre: "Banco Nacional de Crédito",
        titular: "SISPROT GLOBAL FIBER C.A",
        rif: "J501260087",
        ultimos4: "3732",
        numeroCuenta: "0191-0199-1221-0010-3732",
        moneda: "VES",
        rol: "Recaudadora",
        categoria: "RECAUDADORA_PRINCIPAL",
        usoOriginal: "Recaudadora principal",
        entradasPermitidas: "Cobros de clientes (mensualidad recurrente, prorrateo, soporte técnico, metraje adicional), intereses bancarios, reintegros documentados",
        salidasPermitidas: "Traslados a tesorería pagadora o reintegros documentados. Prohibido pagos ordinarios a proveedores",
        estado: "Activa",
        codigoContableV6: "1.1.01.02.001",
        cuentaContableV6: "Banco Nacional de Crédito (BNC) Cta. Cte. N° 3732",
        esRecaudadora: true,
        esHibrida: false,
        esPagadora: false,
        observaciones: "Recaudadora exclusiva de clientes. No recibe traslados entre cuentas ni aportes de socios."
    },
    {
        id: "bnc-2731",
        titularidad: "Jurídica",
        banco: "BNC",
        bancoNombre: "Banco Nacional de Crédito",
        titular: "SISPROT GLOBAL FIBER C.A",
        rif: "J501260087",
        ultimos4: "2731",
        numeroCuenta: "0191-0199-1021-0011-2731",
        moneda: "VES",
        rol: "Recaudadora / Pagadora",
        categoria: "HIBRIDA",
        usoOriginal: "Punto de venta / débito inmediato",
        entradasPermitidas: "Cobros POS y débito inmediato online, traslados interbancarios, liquidaciones de créditos, intereses bancarios",
        salidasPermitidas: "Pagos a proveedores autorizados por gerencia, traslados entre cuentas, devoluciones",
        estado: "Activa",
        codigoContableV6: "1.1.01.02.002",
        cuentaContableV6: "Banco Nacional de Crédito (BNC) Cta. Cte. N° 2731",
        esRecaudadora: true,
        esHibrida: true,
        esPagadora: true,
        observaciones: "Excepción aprobada: cuenta mixta recaudadora/pagadora con control dual."
    },
    {
        id: "bnc-9469",
        titularidad: "Jurídica",
        banco: "BNC",
        bancoNombre: "Banco Nacional de Crédito",
        titular: "SISPROT GLOBAL FIBER C.A",
        rif: "J501260087",
        ultimos4: "9469",
        numeroCuenta: "0191-0199-1021-0011-9469",
        moneda: "VES",
        rol: "Pagadora",
        categoria: "PAGADORA_RRHH",
        usoOriginal: "Recursos humanos",
        entradasPermitidas: "Traslados internos autorizados y traslados de fondos de recaudadoras",
        salidasPermitidas: "Nómina, complemento, bono transporte, uniformes, vacaciones, utilidades, liquidaciones, médico ocupacional, guardias, préstamos a personal",
        estado: "Activa",
        codigoContableV6: "1.1.01.02.003",
        cuentaContableV6: "Banco Nacional de Crédito (BNC) Cta. Cte. N° 9469",
        esRecaudadora: false,
        esHibrida: false,
        esPagadora: true,
        observaciones: "Prohibido recibir cobros de clientes. Exclusiva para egresos de personal y servicios de RRHH."
    },
    {
        id: "provincial-4588",
        titularidad: "Jurídica",
        banco: "Banco Provincial",
        bancoNombre: "BBVA Banco Provincial",
        titular: "SISPROT GLOBAL FIBER C.A",
        rif: "J501260087",
        ultimos4: "4588",
        numeroCuenta: "0108-0941-0101-0003-4588",
        moneda: "VES",
        rol: "Recaudadora",
        categoria: "RECAUDADORA_PRINCIPAL",
        usoOriginal: "Recaudadora principal clientes",
        entradasPermitidas: "Cobros de clientes por actividad empresarial, intereses bancarios, reintegros",
        salidasPermitidas: "Traslado a tesorería pagadora bajo autorización documentada",
        estado: "Activa",
        codigoContableV6: "1.1.01.02.008",
        cuentaContableV6: "Banco Provincial Cta. Cte. N° 4588",
        esRecaudadora: true,
        esHibrida: false,
        esPagadora: false,
        observaciones: "Recaudadora operativa confirmada. Prohibido clasificar ingresos como aportes de socios."
    },
    {
        id: "bancaribe-9957",
        titularidad: "Jurídica",
        banco: "Bancaribe",
        bancoNombre: "Banco del Caribe",
        titular: "SISPROT GLOBAL FIBER C.A",
        rif: "J501260087",
        ultimos4: "9957",
        numeroCuenta: "0114-0200-3320-0088-9957",
        moneda: "VES",
        rol: "Recaudadora / Pagadora",
        categoria: "HIBRIDA",
        usoOriginal: "Ingreso por Instalaciones",
        entradasPermitidas: "Cobros por concepto de instalación, traslados interbancarios",
        salidasPermitidas: "Proveedores de equipos y materiales de instalación, comisiones de ventas a outsourcing",
        estado: "Activa",
        codigoContableV6: "1.1.01.02.009",
        cuentaContableV6: "Banco Bancaribe Cta. Cte. N° 9957",
        esRecaudadora: true,
        esHibrida: true,
        esPagadora: true,
        observaciones: "Excepción aprobada: cuenta mixta para ciclo de instalaciones y comisiones."
    },
    {
        id: "banplus-6895",
        titularidad: "Jurídica",
        banco: "Banplus",
        bancoNombre: "Banplus Banco Universal",
        titular: "SISPROT GLOBAL FIBER C.A",
        rif: "J501260087",
        ultimos4: "6895",
        numeroCuenta: "0174-0101-0000-0000-6895",
        moneda: "VES",
        rol: "Recaudadora",
        categoria: "RECAUDADORA_SECUNDARIA",
        usoOriginal: "Recaudadora secundaria",
        entradasPermitidas: "Cobros de clientes por servicios de internet, soporte y ventas recurrentes",
        salidasPermitidas: "Traslado a tesorería pagadora",
        estado: "Activa",
        codigoContableV6: "1.1.01.02.004",
        cuentaContableV6: "Banco Banplus Cta. Cte. N° 6895",
        esRecaudadora: true,
        esHibrida: false,
        esPagadora: false,
        observaciones: "Recaudadora sin traslados de entrada. Separar intereses y devoluciones."
    },
    {
        id: "bdv-9572",
        titularidad: "Jurídica",
        banco: "Banco de Venezuela",
        bancoNombre: "Banco de Venezuela",
        titular: "SISPROT GLOBAL FIBER C.A",
        rif: "J501260087",
        ultimos4: "9572",
        numeroCuenta: "0102-0115-2900-0049-9572",
        moneda: "VES",
        rol: "Pagadora",
        categoria: "PAGADORA_TRIBUTOS",
        usoOriginal: "Impuestos / parafiscales",
        entradasPermitidas: "Traslados internos autorizados según calendario fiscal",
        salidasPermitidas: "SENIAT, Alcaldía Santiago Mariño, CONATEL, parafiscales",
        estado: "Activa",
        codigoContableV6: "1.1.01.02.011",
        cuentaContableV6: "Banco de Venezuela (Tesorería 9572)",
        esRecaudadora: false,
        esHibrida: false,
        esPagadora: true,
        observaciones: "Segregada exclusivamente para pagos fiscales y parafiscales."
    },
    {
        id: "bfc-5080",
        titularidad: "Jurídica",
        banco: "Banco Fondo Común",
        bancoNombre: "Banco Fondo Común (BFC)",
        titular: "SISPROT GLOBAL FIBER C.A",
        rif: "J501260087",
        ultimos4: "5080",
        numeroCuenta: "0151-0042-7510-0192-5080",
        moneda: "VES",
        rol: "Inactiva",
        categoria: "INACTIVA",
        usoOriginal: "Sin uso / evaluación de cierre",
        entradasPermitidas: "Ninguna",
        salidasPermitidas: "Ninguna",
        estado: "Inactiva",
        codigoContableV6: "1.1.01.02.010",
        cuentaContableV6: "Banco Fondo Común Cta. Cte. N° 5080",
        esRecaudadora: false,
        esHibrida: false,
        esPagadora: false,
        observaciones: "Sin operación. Verificar ausencia de financiamientos previos antes de cierre."
    },
    {
        id: "banplus-6820",
        titularidad: "Jurídica",
        banco: "Banplus",
        bancoNombre: "Banplus Banco Universal",
        titular: "SISPROT GLOBAL FIBER C.A",
        rif: "J501260087",
        ultimos4: "6820",
        numeroCuenta: "0174-0101-0000-0000-6820",
        moneda: "VES",
        rol: "Inactiva",
        categoria: "INACTIVA",
        usoOriginal: "Cuenta nómina sin uso",
        entradasPermitidas: "Ninguna",
        salidasPermitidas: "Ninguna",
        estado: "Inactiva",
        codigoContableV6: "1.1.01.02.005",
        cuentaContableV6: "Banco Banplus Cta. Cte. N° 6820",
        esRecaudadora: false,
        esHibrida: false,
        esPagadora: false,
        observaciones: "Sin uso según archivo corregido."
    },
    {
        id: "banplus-6937",
        titularidad: "Jurídica",
        banco: "Banplus",
        bancoNombre: "Banplus Banco Universal",
        titular: "SISPROT GLOBAL FIBER C.A",
        rif: "J501260087",
        ultimos4: "6937",
        numeroCuenta: "0174-0101-0000-0000-6937",
        moneda: "VES",
        rol: "Inactiva",
        categoria: "INACTIVA",
        usoOriginal: "Sin uso",
        entradasPermitidas: "Ninguna",
        salidasPermitidas: "Ninguna",
        estado: "Inactiva",
        codigoContableV6: "1.1.01.02.006",
        cuentaContableV6: "Banco Banplus Cta. Cte. N° 6937",
        esRecaudadora: false,
        esHibrida: false,
        esPagadora: false,
        observaciones: "Sin uso según archivo corregido."
    },
    {
        id: "banplus-6929",
        titularidad: "Jurídica",
        banco: "Banplus",
        bancoNombre: "Banplus Banco Universal",
        titular: "SISPROT GLOBAL FIBER C.A",
        rif: "J501260087",
        ultimos4: "6929",
        numeroCuenta: "0174-0101-0000-0000-6929",
        moneda: "VES",
        rol: "Inactiva en revisión",
        categoria: "INACTIVA_REVISION",
        usoOriginal: "Sin uso con alerta de depósitos",
        entradasPermitidas: "Ninguna autorizada",
        salidasPermitidas: "Ninguna",
        estado: "Inactiva en revisión",
        codigoContableV6: "1.1.01.02.007",
        cuentaContableV6: "Banco Banplus Cta. Cte. N° 6929",
        esRecaudadora: false,
        esHibrida: false,
        esPagadora: false,
        observaciones: "ALERTA: Sin uso oficial pero con posibles clientes depositando. Auditar antes de desactivar."
    },

    // --- CUENTAS EN DIVISAS (USD / CUSTODIA) ---
    {
        id: "bnc-usd-9969",
        titularidad: "Jurídica",
        banco: "BNC",
        bancoNombre: "Banco Nacional de Crédito",
        titular: "SISPROT GLOBAL FIBER C.A",
        ultimos4: "9969",
        numeroCuenta: "0191-USD-9969",
        moneda: "USD",
        rol: "Custodia de divisas",
        categoria: "DIVISAS_USD",
        estado: "Por validar",
        codigoContableV6: "1.1.01.03.001",
        cuentaContableV6: "BNC Cta. Custodia Divisas N° 9969"
    },
    {
        id: "banplus-usd-7112",
        titularidad: "Jurídica",
        banco: "Banplus",
        bancoNombre: "Banplus Banco Universal",
        titular: "SISPROT GLOBAL FIBER C.A",
        ultimos4: "7112",
        numeroCuenta: "0174-USD-7112",
        moneda: "USD",
        rol: "Custodia de divisas",
        categoria: "DIVISAS_USD",
        estado: "Por validar",
        codigoContableV6: "1.1.01.03.002",
        cuentaContableV6: "Banplus Cta. Custodia Divisas N° 7112"
    },
    {
        id: "bfc-usd-5586",
        titularidad: "Jurídica",
        banco: "Banco Fondo Común",
        bancoNombre: "Banco Fondo Común (BFC)",
        titular: "SISPROT GLOBAL FIBER C.A",
        ultimos4: "5586",
        numeroCuenta: "0151-USD-5586",
        moneda: "USD",
        rol: "Custodia de divisas",
        categoria: "DIVISAS_USD",
        estado: "Por validar",
        codigoContableV6: "1.1.01.03.003",
        cuentaContableV6: "Banco Fondo Común Custodia N° 5586"
    },
    {
        id: "provincial-usd-4596",
        titularidad: "Jurídica",
        banco: "Banco Provincial",
        bancoNombre: "BBVA Banco Provincial",
        titular: "SISPROT GLOBAL FIBER C.A",
        ultimos4: "4596",
        numeroCuenta: "0108-USD-4596",
        moneda: "USD",
        rol: "Custodia de divisas",
        categoria: "DIVISAS_USD",
        estado: "Por validar",
        codigoContableV6: "1.1.01.03.004",
        cuentaContableV6: "Banco Provincial USD N° 4596"
    },
    {
        id: "bdv-usd-4396",
        titularidad: "Jurídica",
        banco: "Banco de Venezuela",
        bancoNombre: "Banco de Venezuela",
        titular: "SISPROT GLOBAL FIBER C.A",
        ultimos4: "4396",
        numeroCuenta: "0102-USD-4396",
        moneda: "USD",
        rol: "Custodia de divisas",
        categoria: "DIVISAS_USD",
        estado: "Por validar",
        codigoContableV6: "1.1.01.03.005",
        cuentaContableV6: "Banco de Venezuela USD N° 4396"
    },
    {
        id: "bdv-usd-4406",
        titularidad: "Jurídica",
        banco: "Banco de Venezuela",
        bancoNombre: "Banco de Venezuela",
        titular: "SISPROT GLOBAL FIBER C.A",
        ultimos4: "4406",
        numeroCuenta: "0102-USD-4406",
        moneda: "USD",
        rol: "Custodia de divisas",
        categoria: "DIVISAS_USD",
        estado: "Por validar",
        codigoContableV6: "1.1.01.03.006",
        cuentaContableV6: "Banco de Venezuela USD N° 4406"
    },
    {
        id: "bdv-usd-7860",
        titularidad: "Jurídica",
        banco: "Banco de Venezuela",
        bancoNombre: "Banco de Venezuela",
        titular: "SISPROT GLOBAL FIBER C.A",
        ultimos4: "7860",
        numeroCuenta: "0102-USD-7860",
        moneda: "USD",
        rol: "Custodia de divisas",
        categoria: "DIVISAS_USD",
        estado: "Por validar",
        codigoContableV6: "1.1.01.03.007",
        cuentaContableV6: "Banco de Venezuela USD N° 7860"
    },
    {
        id: "bdv-usd-0971",
        titularidad: "Jurídica",
        banco: "Banco de Venezuela",
        bancoNombre: "Banco de Venezuela",
        titular: "SISPROT GLOBAL FIBER C.A",
        ultimos4: "0971",
        numeroCuenta: "0102-USD-0971",
        moneda: "USD",
        rol: "Custodia de divisas",
        categoria: "DIVISAS_USD",
        estado: "Por validar",
        codigoContableV6: "1.1.01.03.008",
        cuentaContableV6: "Banco de Venezuela USD N° 0971"
    },

    // --- CUENTAS DE PERSONAS NATURALES (EN REVISIÓN / REGULARIZACIÓN) ---
    {
        id: "natural-5695",
        titularidad: "Natural",
        banco: "Banplus",
        bancoNombre: "Banplus Banco Universal",
        titular: "Elisaul Reyes",
        ultimos4: "5695",
        moneda: "VES",
        rol: "Revisión / Regularización",
        categoria: "CUENTA_NATURAL_REGULARIZAR",
        estado: "En revisión",
        observaciones: "Cuenta personal con cobros históricos de actividad empresarial. Segregar fondos y regularizar traslados a cuentas jurídicas."
    },
    {
        id: "natural-5703",
        titularidad: "Natural",
        banco: "Banplus",
        bancoNombre: "Banplus Banco Universal",
        titular: "Diego Arriechi",
        ultimos4: "5703",
        moneda: "VES",
        rol: "Revisión / Regularización",
        categoria: "CUENTA_NATURAL_REGULARIZAR",
        estado: "En revisión",
        observaciones: "Cuenta personal vinculada a actividad SGF. Regularizar y migrar a cuenta jurídica."
    },
    {
        id: "natural-6339",
        titularidad: "Natural",
        banco: "Banplus",
        bancoNombre: "Banplus Banco Universal",
        titular: "Bryant Reyes",
        ultimos4: "6339",
        moneda: "VES",
        rol: "Revisión / Regularización",
        categoria: "CUENTA_NATURAL_REGULARIZAR",
        estado: "En revisión",
        observaciones: "Cuenta personal vinculada a actividad SGF. Regularizar y migrar a cuenta jurídica."
    },
    {
        id: "natural-6271",
        titularidad: "Natural",
        banco: "Banplus",
        bancoNombre: "Banplus Banco Universal",
        titular: "Sebastian Arriechi",
        ultimos4: "6271",
        moneda: "VES",
        rol: "Revisión / Regularización",
        categoria: "CUENTA_NATURAL_REGULARIZAR",
        estado: "En revisión",
        observaciones: "Cuenta personal vinculada a actividad SGF. Regularizar y migrar a cuenta jurídica."
    },
    {
        id: "natural-6229",
        titularidad: "Natural",
        banco: "Banplus",
        bancoNombre: "Banplus Banco Universal",
        titular: "Susana Colmenares",
        ultimos4: "6229",
        moneda: "VES",
        rol: "Inactiva",
        categoria: "CUENTA_NATURAL_INACTIVA",
        estado: "Sin uso",
        observaciones: "Aclarar movimientos históricos antes de cierre definitivo."
    }
];

// ── 2. CATÁLOGO CONTABLE DEL PLAN DE CUENTAS V6 ──────────────────────────────
export const CUENTAS_CONTABLES_V6 = {
    // Activo Disponible
    BANCOS_NACIONALES_BS: "1.1.01.02",
    BANCOS_NACIONALES_USD: "1.1.01.03",
    PASARELAS_LIQUIDACION: "1.1.01.05.001",

    // Pasivo Corriente (Recaudación y Anticipos)
    DEPOSITOS_POR_IDENTIFICAR: "2.1.04.01.004", // Depósitos recibidos de terceros pendientes de identificación, aplicación o devolución
    ANTICIPOS_RESIDENCIALES: "2.1.06.01.001",   // Mensualidades de Internet cobradas por anticipado – residenciales
    ANTICIPOS_PYME: "2.1.06.01.002",            // Mensualidades de Internet cobradas por anticipado – PyME
    EXCEDENTES_PAGOS_DUPLICADOS: "2.1.06.01.004", // Saldos a favor de clientes por pagos duplicados o excesos

    // Ingresos Operacionales
    INGRESOS_RESIDENCIALES: "4.1.01.01.001",    // Ingresos Planes Residenciales Fibra Óptica
    INGRESOS_PYME: "4.1.01.01.002"              // Ingresos Planes Corporativos / PyME Fibra Óptica
};

// ── 3. POLÍTICAS DE TESORERÍA SGF (C01 A C16) ─────────────────────────────────
export const POLITICAS_TESORERIA = {
    C01: {
        codigo: "C01",
        nombre: "Recaudación Exclusiva",
        cuentas: ["3732", "6895", "4588"],
        regla: "Cobros por servicios de clientes; sin pagos ordinarios a proveedores ni traslados de entrada. Intereses, reintegros y errores registrados por separado."
    },
    C02: {
        codigo: "C02",
        nombre: "Cuenta Híbrida POS",
        cuentas: ["2731"],
        regla: "Cobra POS y débito inmediato; recibe traslados y créditos; paga proveedores mediante orden autorizada dual."
    },
    C03: {
        codigo: "C03",
        nombre: "Instalaciones",
        cuentas: ["9957"],
        regla: "Cobra instalaciones; paga materiales, equipos y comisiones outsourcing con soporte documental."
    },
    C04: {
        codigo: "C04",
        nombre: "Recursos Humanos",
        cuentas: ["9469"],
        regla: "Pagar nómina, bonos, transporte, uniformes, liquidaciones y préstamos. Prohibido recibir cobros de clientes."
    },
    C05: {
        codigo: "C05",
        nombre: "Tributos",
        cuentas: ["9572"],
        regla: "Recibir traslados internos y liquidar obligaciones fiscales (SENIAT, Alcaldía, CONATEL, parafiscales)."
    },
    C06: {
        codigo: "C06",
        nombre: "Entradas No Comerciales",
        cuentas: ["Todas"],
        regla: "Intereses bancarios, reintegros, errores y créditos no son ventas recurrentes ni ingresos por internet."
    },
    C07: {
        codigo: "C07",
        nombre: "Traslados Internos",
        cuentas: ["Todas"],
        regla: "Los traslados entre cuentas de la empresa nunca deben registrarse como nuevos ingresos por ventas."
    },
    C08: {
        codigo: "C08",
        nombre: "Control Cuentas Personas Naturales",
        cuentas: ["5695", "5703", "6339", "6271"],
        regla: "Evitar mezcla patrimonial; documentar migración y regularización contable hacia cuentas jurídicas."
    },
    C10: {
        codigo: "C10",
        nombre: "Provincial 4588 Recaudadora",
        cuentas: ["4588"],
        regla: "Cuenta recaudadora de clientes confirmada; prohibido clasificar estos cobros como aportes de socios."
    }
};

// ── 4. PROCEDIMIENTO CONTABLE EN 3 MOMENTOS (SGF · ERP A2) ───────────────────
export const PROCEDIMIENTO_PAGOS = {
    MOMENTO_1: {
        etapa: "1. Acreditación Bancaria Inicial (Sin Identificar)",
        descripcion: "El banco recibe el dinero (transferencia, pago móvil). Se desconoce a qué cliente o contrato pertenece.",
        asiento: {
            debe: "1.1.01.02.xxx Banco Recaudador",
            haber: "2.1.04.01.004 Depósitos bancarios recibidos pendientes de identificación o devolución"
        },
        efecto: "Aumenta el activo bancario y se reconoce un pasivo transitorio. NO genera ingreso ni venta en A2."
    },
    MOMENTO_2: {
        etapa: "2. Reporte del Cliente en Portal",
        descripcion: "El cliente sube el comprobante al portal web con su referencia y contrato.",
        asiento: "NINGUNO",
        efecto: "Trámite puramente administrativo en estado 'Reportado / En validación'. No altera saldos ni genera asiento hasta validación de Tesorería."
    },
    MOMENTO_3: {
        etapa: "3. Validación y Aplicación Contable",
        descripcion: "Tesorería confirma referencia bancaria, monto, fecha y ausencia de duplicados.",
        asientos: [
            {
                tipo: "Reclasificación",
                debe: "2.1.04.01.004 Depósitos pendientes de identificación",
                haber: "2.1.06.01.001 / 002 Mensualidades cobradas por anticipado (Residencial / PyME)"
            },
            {
                tipo: "Facturación Fiscal",
                debe: "Anticipo del cliente",
                haber: "IVA Débito Fiscal (16%) + Ingreso Operacional devengado (4.1.01.01.xxx)"
            }
        ],
        efecto: "Se cancela el pasivo transitorio, se aplica a la obligación del cliente y se emite la factura fiscal."
    }
};

// ── 5. MÉTODOS Y HELPERS DE CONSULTA ──────────────────────────────────────────

/**
 * Devuelve todas las cuentas autorizadas para recaudar fondos de clientes
 */
export const getCuentasRecaudadoras = () => {
    return PLAN_DE_BANCOS.filter(c => c.esRecaudadora && c.estado === "Activa");
};

/**
 * Devuelve las cuentas dedicadas a pagos y egresos (RRHH, Impuestos, Proveedores)
 */
export const getCuentasPagadoras = () => {
    return PLAN_DE_BANCOS.filter(c => c.esPagadora);
};

/**
 * Devuelve las cuentas en custodia de divisas (USD)
 */
export const getCuentasDivisas = () => {
    return PLAN_DE_BANCOS.filter(c => c.moneda === "USD");
};

/**
 * Busca una cuenta bancaria por sus últimos 4 dígitos
 */
export const findCuentaByLastDigits = (ultimos4) => {
    if (!ultimos4) return null;
    const cleanDigits = String(ultimos4).trim().slice(-4);
    return PLAN_DE_BANCOS.find(c => c.ultimos4 === cleanDigits) || null;
};

/**
 * Busca todas las cuentas asociadas a un banco en específico
 */
export const findCuentasByBanco = (nombreBanco) => {
    if (!nombreBanco) return [];
    const search = String(nombreBanco).toLowerCase().trim();
    return PLAN_DE_BANCOS.filter(c =>
        c.banco.toLowerCase().includes(search) ||
        (c.bancoNombre && c.bancoNombre.toLowerCase().includes(search))
    );
};

