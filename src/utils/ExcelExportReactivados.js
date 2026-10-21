import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export const exportReactivadosToExcel = async (items, fileName = "Reactivados_Sisprot_BI.xlsx") => {
  if (!items || items.length === 0) {
    alert("No hay contratos reactivados para exportar.");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sisprot BI";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Reactivados");

  // Configuración de Columnas
  worksheet.columns = [
    { header: "Contrato ID", key: "contract_id", width: 14 },
    { header: "Fecha Reactivación", key: "fecha", width: 20 },
    { header: "Cliente", key: "cliente", width: 34 },
    { header: "Cédula / RIF", key: "cedula", width: 16 },
    { header: "Teléfono", key: "telefono", width: 16 },
    { header: "Email", key: "email", width: 30 },
    { header: "Plan", key: "plan", width: 30 },
    { header: "Tarifa ($)", key: "costo", width: 14 },
    { header: "Tipo Cliente", key: "tipo", width: 16 },
    { header: "Sector", key: "sector", width: 24 },
    { header: "Parroquia", key: "parroquia", width: 22 },
    { header: "Estado Anterior", key: "estado_ant", width: 18 },
    { header: "Estado Actual", key: "estado_act", width: 16 },
  ];

  // Estilo para Encabezados
  const headerRow = worksheet.getRow(1);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF004C6D" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "FF00283A" } },
      bottom: { style: "medium", color: { argb: "FF00D2FF" } },
    };
  });

  // Filas de Datos
  items.forEach((item) => {
    const dateObj = new Date(item.created_at);
    const dateFormatted = !isNaN(dateObj)
      ? dateObj.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : item.created_at;

    const row = worksheet.addRow({
      contract_id: item.contract_id || "",
      fecha: dateFormatted,
      cliente: item.client?.full_name || "Sin nombre",
      cedula: item.client?.identification || "",
      telefono: item.client?.mobile || "",
      email: item.client?.email || "",
      plan: item.plan?.name || "Sin plan",
      costo: parseFloat(item.plan?.cost) || 0,
      tipo: item.plan?.client_type?.name || "RESIDENCIAL",
      sector: item.sector?.name || "",
      parroquia: item.sector?.parish?.name || "",
      estado_ant: item.previous_status?.name || "Cancelado",
      estado_act: item.next_status?.name || "Activo",
    });

    row.height = 20;
    row.getCell("costo").numFmt = '"$"#,##0.00';
    row.getCell("contract_id").alignment = { horizontal: "center" };
    row.getCell("fecha").alignment = { horizontal: "center" };
    row.getCell("cedula").alignment = { horizontal: "center" };
    row.getCell("tipo").alignment = { horizontal: "center" };
    row.getCell("estado_ant").alignment = { horizontal: "center" };
    row.getCell("estado_act").alignment = { horizontal: "center" };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, fileName);
};
