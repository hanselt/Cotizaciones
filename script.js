//import { rgb } from 'https://unpkg.com/pdf-lib/dist/pdf-lib.min.js';

// Selección de elementos
const addItemButton = document.getElementById('addItem');
const itemsTableBody = document.querySelector('#itemsTable tbody');
const generatePdfButton = document.getElementById('generatePdf');  // Botón para generar el PDF

// Función para agregar una nueva fila de ítems
addItemButton.addEventListener('click', () => {
  // Crear una nueva fila
  const row = document.createElement('tr');

  // Crear celdas para cada columna
  const conceptCell = document.createElement('td');
  const quantityCell = document.createElement('td');
  const unitPriceCell = document.createElement('td');
  const totalPriceCell = document.createElement('td');
  const actionCell = document.createElement('td');

  // Crear elementos de entrada dentro de las celdas
  conceptCell.innerHTML = '<input type="text" placeholder="Concepto" />';
  quantityCell.innerHTML = '<input type="number" placeholder="Cantidad" min="1" />';
  unitPriceCell.innerHTML = '<input type="number" placeholder="Precio Unitario" step="0.01" min="0" />';
  totalPriceCell.textContent = '0.00'; // Inicialmente vacío

  // Botón para eliminar la fila
  const deleteButton = document.createElement('button');
  deleteButton.textContent = 'Eliminar';
  deleteButton.style.backgroundColor = '#dc3545';
  deleteButton.style.color = 'white';
  deleteButton.style.border = 'none';
  deleteButton.style.padding = '5px 10px';
  deleteButton.style.cursor = 'pointer';
  deleteButton.style.borderRadius = '5px';

  // Evento para eliminar la fila
  deleteButton.addEventListener('click', () => {
    row.remove();
    updateSummary();
  });

  actionCell.appendChild(deleteButton);

  // Agregar celdas a la fila
  row.appendChild(conceptCell);
  row.appendChild(quantityCell);
  row.appendChild(unitPriceCell);
  row.appendChild(totalPriceCell);
  row.appendChild(actionCell);

  // Agregar fila al cuerpo de la tabla
  itemsTableBody.appendChild(row);

  // Actualizar el resumen al modificar cantidad o precio
  const inputs = row.querySelectorAll('input');
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      const quantity = parseFloat(quantityCell.querySelector('input').value) || 0;
      const unitPrice = parseFloat(unitPriceCell.querySelector('input').value) || 0;
      const total = quantity * unitPrice;
      totalPriceCell.textContent = total.toFixed(2); // Solo afecta a esta fila
      updateSummary(); // Actualiza el resumen general
    });
  });
});

// Función para actualizar el resumen (subtotal, IGV, total)
function updateSummary() {
  let subtotal = 0;

  // Calcular subtotal sumando todas las filas
  document.querySelectorAll('#itemsTable tbody tr').forEach(row => {
    const total = parseFloat(row.cells[3]?.textContent) || 0; // Asegura que la celda existe
    subtotal += total;
  });

  const igv = subtotal * 0.18;
  const total = subtotal + igv;

  // Actualizar los valores en pantalla
  document.getElementById('subtotal').textContent = subtotal.toFixed(2);
  document.getElementById('igv').textContent = igv.toFixed(2);
  document.getElementById('total').textContent = total.toFixed(2);
}

async function drawWrappedText(page, text, x, y, maxWidth) {
  const font = await page.doc.embedFont(PDFLib.StandardFonts.Helvetica);
  const fontSize = 10; // Tamaño de la fuente
  let textHeight = 0; // Inicializar en 0
  const words = text.split(' ');

  let line = '';
  for (let i = 0; i < words.length; i++) {
    const testLine = line + (line.length > 0 ? ' ' : '') + words[i];
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > maxWidth) {
      const newY = y - textHeight;
      // Verificación adicional para evitar NaN
      if (isNaN(newY) || newY < 0) {
        console.error(`Valor de Y inválido: ${newY}, ajustando a 0.`);
        return y;  // Retornar y sin cambios si Y es inválido
      } else {
        
        page.drawText(line, { x, y: newY, font, size: fontSize });
      }
      textHeight += fontSize + 2;
      line = words[i];
    } else {
      line = testLine;
    }
  }

  // Imprimir la última línea si existe
  if (line.length > 0) {
    const finalY = y - textHeight;
    if (isNaN(finalY) || finalY < 0) {
      console.error(`Valor de Y final inválido: ${finalY}`);
      return y;  // Retornar y sin cambios si el valor final es inválido
    } else {
      page.drawText(line, { x, y: finalY, font, size: fontSize });
    }
  }

  // Retornar la nueva coordenada Y después de imprimir el texto
  const finalY = y - textHeight;
  return finalY < 0 ? 0 : finalY; // Asegurarse de que no se devuelva un valor negativo
}



// Función para generar el PDF basado en un archivo existente (cotizacion.pdf)
generatePdfButton.addEventListener('click', async () => {
  const ruc = document.getElementById('ruc').value;
  const clientName = document.getElementById('clientName').value;
  
  // Cargar el archivo PDF cotizacion.pdf
  const pdfUrl = 'cotizacion.pdf'; // Asegúrate de que este archivo esté en la raíz del proyecto
  const existingPdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer());

  // Crear un documento PDF a partir del archivo existente
  const { PDFDocument } = PDFLib;
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  
  // Obtener la primera página del PDF
  const page = pdfDoc.getPages()[0]; // Usamos la primera página para insertar datos

  // Insertar datos en campos específicos (aquí asumiendo que conoces la posición y los campos)
  const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
  
  // Fecha actual
  const now = new Date();
  const formatDate = `${now.getDate() < 10 ? '0' + now.getDate() : now.getDate()}/${now.getMonth() + 1 < 10 ? '0' + (now.getMonth() + 1) : now.getMonth() + 1}/${now.getFullYear()}`;

  // Imprimir cliente, RUC y fecha en las posiciones correspondientes
  page.drawText(clientName, { x: 62, y: 638, font, size: 10, maxWidth: 310 }); // nombre del cliente
  page.drawText(`RUC: ${ruc}`, { x: 62, y: 595, font, size: 10 });
  page.drawText(formatDate, { x: 105, y: 581, font, size: 10 });

  // Coordenadas iniciales para la tabla
  const xInicial = 62;
  let yInicial = 530;

  // Recuperar los datos de la tabla e imprimirlos
  const rows = document.querySelectorAll('#itemsTable tbody tr');
  for (let row of rows) {
    const cells = row.querySelectorAll('td');
    const concepto = cells[0].querySelector('input').value || 'No Concepto';
    const cantidad = cells[1].querySelector('input').value || 0;
    const precioUnitario = cells[2].querySelector('input').value || 0;
    const precioTotal = cells[3].textContent || 0;
  
    // Imprimir el concepto (envuelto en el límite de 210px de ancho)
    yInicial = await drawWrappedText(page, concepto, xInicial, yInicial, 210);  // Usar await para esperar a que termine antes de continuar
  
    // Imprimir la cantidad, precio unitario y precio total
    page.drawText(String(cantidad), { x: xInicial + 250, y: yInicial, font, size: 10 });
    page.drawText(String(precioUnitario), { x: xInicial + 350, y: yInicial, font, size: 10 });
    page.drawText(String(precioTotal), { x: xInicial + 430, y: yInicial, font, size: 10 });
  
    // Dibujar la línea separadora
    page.drawLine({
      start: { x: xInicial, y: yInicial - 5 },
      end: { x: xInicial + 475, y: yInicial - 5 },
      thickness: 0.5,
    });
  
    // Ajustar la posición para la siguiente fila
    yInicial -= 20; // Espaciado entre filas
  }

  yInicial = 310
  // Imprimir el resumen (Subtotal, IGV y Total)
  const subtotal = document.getElementById('subtotal').textContent || 0;
  const igv = document.getElementById('igv').textContent || 0;
  const total = document.getElementById('total').textContent || 0;

  yInicial -= 20;  // Ajustar la posición antes de imprimir el resumen

  page.drawText('Subtotal:', { x: xInicial + 300, y: yInicial, font, size: 10 });
  page.drawText(subtotal, { x: xInicial + 400, y: yInicial, font, size: 10 });

  yInicial -= 15; // Espacio entre las líneas del resumen

  page.drawText('IGV:', { x: xInicial + 300, y: yInicial, font, size: 10 });
  page.drawText(igv, { x: xInicial + 400, y: yInicial, font, size: 10 });

  yInicial -= 15; // Espacio entre las líneas del resumen

  page.drawText('Total:', { x: xInicial + 300, y: yInicial, font, size: 10 });
  page.drawText(total, { x: xInicial + 400, y: yInicial, font, size: 10 });

  // Guardar el documento PDF modificado (por ejemplo, descargarlo)
  const pdfBytes = await pdfDoc.save();
  const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
  const pdfUrlBlob = URL.createObjectURL(pdfBlob);

  const link = document.createElement('a');
  link.href = pdfUrlBlob;
  link.download = 'cotizacion_modificada.pdf';
  link.click();
});
