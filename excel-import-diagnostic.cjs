/**
 * Script de diagnóstico para problemas de importación de Excel
 * Ejecutar con: node excel-import-diagnostic.js
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Función para crear un archivo Excel de prueba
function createTestExcelFile() {
  const testData = [
    {
      'Fecha': '2024-01-15',
      'Tipo': 'Ingreso',
      'Cliente': 'Cliente Test',
      'CUIT': '20-12345678-9',
      'Número': 'FAC-001',
      'Subtotal': 1000.00,
      'IVA': 210.00,
      'Total': 1210.00,
      'Clase': 'A',
      'IIBB': 0,
      'Ganancias': 0,
      'Otros': 0,
      'Estado': 'pending'
    },
    {
      'Fecha': '2024-01-16',
      'Tipo': 'Egreso',
      'Proveedor': 'Proveedor Test',
      'CUIT': '20-87654321-0',
      'Número': 'FAC-002',
      'Subtotal': 500.00,
      'IVA': 105.00,
      'Total': 605.00,
      'Clase': 'A',
      'IIBB': 0,
      'Ganancias': 0,
      'Otros': 0,
      'Estado': 'paid'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(testData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Facturas');

  const testFilePath = path.join(__dirname, 'test-import.xlsx');
  XLSX.writeFile(workbook, testFilePath);
  
  console.log(`✅ Archivo Excel de prueba creado: ${testFilePath}`);
  return testFilePath;
}

// Función para probar la lectura de Excel
function testExcelReading(filePath) {
  try {
    console.log(`\n🔍 Probando lectura de Excel: ${filePath}`);
    
    const workbook = XLSX.readFile(filePath);
    console.log(`✅ Archivo leído exitosamente`);
    console.log(`📊 Hojas disponibles: ${workbook.SheetNames.join(', ')}`);
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convertir a JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
    console.log(`✅ Datos convertidos a JSON: ${rawData.length} filas`);
    
    // Mostrar las primeras 2 filas
    console.log('\n📋 Primeras 2 filas de datos:');
    rawData.slice(0, 2).forEach((row, index) => {
      console.log(`   Fila ${index + 1}:`, JSON.stringify(row, null, 2));
    });
    
    // Mapear datos como lo hace el servidor
    const mappedData = rawData.map((row) => {
      return {
        date: row['Fecha'] || row['fecha'] || row['Date'] || row['date'],
        type: row['Tipo'] || row['tipo'] || row['Type'] || row['type'],
        issuer: row['Emisor'] || row['emisor'] || row['Socio'] || row['socio'] || row['Owner'] || row['owner'],
        clientName: row['Cliente'] || row['cliente'] || row['Proveedor'] || row['proveedor'] || row['Cliente/Proveedor'],
        cuit: row['CUIT'] || row['cuit'] || row['Cuit'],
        invoiceNumber: row['Número'] || row['numero'] || row['Numero'] || row['Nro'] || row['Invoice Number'],
        subtotal: parseFloat(row['Subtotal'] || row['subtotal'] || '0'),
        ivaAmount: parseFloat(row['IVA'] || row['iva'] || row['Iva'] || '0'),
        totalAmount: parseFloat(row['Total'] || row['total'] || '0'),
        invoiceClass: row['Clase'] || row['clase'] || row['Tipo Factura'] || row['Class'] || 'A',
        iibbAmount: parseFloat(row['IIBB'] || row['iibb'] || row['Ingresos Brutos'] || '0'),
        gananciasAmount: parseFloat(row['Ganancias'] || row['ganancias'] || '0'),
        otherTaxes: parseFloat(row['Otros'] || row['otros'] || row['Otros Impuestos'] || '0'),
        paymentStatus: row['Estado'] || row['estado'] || row['Estado Pago'] || row['Payment Status'] || 'pending',
      };
    });
    
    console.log('\n🔄 Datos mapeados:');
    mappedData.forEach((row, index) => {
      console.log(`   Fila ${index + 1}:`, JSON.stringify(row, null, 2));
    });
    
    return { success: true, data: mappedData };
  } catch (error) {
    console.error(`❌ Error leyendo Excel:`, error.message);
    return { success: false, error: error.message };
  }
}

// Función para verificar dependencias
function checkDependencies() {
  console.log('🔍 Verificando dependencias...\n');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const requiredDeps = ['xlsx', 'multer', 'express'];
  const missingDeps = [];
  
  requiredDeps.forEach(dep => {
    if (dependencies[dep]) {
      console.log(`✅ ${dep}: ${dependencies[dep]}`);
    } else {
      console.log(`❌ ${dep}: NO ENCONTRADO`);
      missingDeps.push(dep);
    }
  });
  
  if (missingDeps.length > 0) {
    console.log(`\n🚨 Dependencias faltantes: ${missingDeps.join(', ')}`);
    console.log(`💡 Instalar con: npm install ${missingDeps.join(' ')}`);
  }
  
  return missingDeps.length === 0;
}

// Función para verificar configuración de multer
function checkMulterConfig() {
  console.log('\n🔍 Verificando configuración de multer...\n');
  
  const routesPath = path.join(__dirname, 'server', 'routes.ts');
  const routesContent = fs.readFileSync(routesPath, 'utf8');
  
  // Buscar configuración de excelUpload
  const excelUploadMatch = routesContent.match(/const excelUpload = multer\({([^}]+)}\);/s);
  
  if (excelUploadMatch) {
    console.log('✅ Configuración de excelUpload encontrada:');
    console.log(excelUploadMatch[0]);
  } else {
    console.log('❌ Configuración de excelUpload no encontrada');
  }
  
  // Buscar endpoints de importación
  const importEndpoints = [
    '/api/import/preview',
    '/api/import/commit',
    '/api/import/excel'
  ];
  
  importEndpoints.forEach(endpoint => {
    if (routesContent.includes(endpoint)) {
      console.log(`✅ Endpoint ${endpoint} encontrado`);
    } else {
      console.log(`❌ Endpoint ${endpoint} NO encontrado`);
    }
  });
}

// Función para verificar directorio de uploads
function checkUploadsDirectory() {
  console.log('\n🔍 Verificando directorio de uploads...\n');
  
  const uploadsDir = path.join(__dirname, 'uploads');
  
  if (fs.existsSync(uploadsDir)) {
    console.log(`✅ Directorio uploads existe: ${uploadsDir}`);
    
    const files = fs.readdirSync(uploadsDir);
    console.log(`📁 Archivos en uploads: ${files.length}`);
    
    if (files.length > 0) {
      console.log(`   Archivos: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);
    }
  } else {
    console.log(`❌ Directorio uploads NO existe: ${uploadsDir}`);
    console.log('💡 Creando directorio...');
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Directorio creado');
  }
}

// Función para simular el proceso de importación
function simulateImportProcess() {
  console.log('\n🔍 Simulando proceso de importación...\n');
  
  try {
    // Crear archivo de prueba
    const testFile = createTestExcelFile();
    
    // Leer y mapear datos
    const result = testExcelReading(testFile);
    
    if (result.success) {
      console.log('\n✅ Simulación exitosa');
      console.log(`📊 ${result.data.length} registros procesados`);
      
      // Validar datos
      const validationErrors = [];
      result.data.forEach((row, index) => {
        if (!row.date) validationErrors.push(`Fila ${index + 1}: Fecha faltante`);
        if (!row.type) validationErrors.push(`Fila ${index + 1}: Tipo faltante`);
        if (!row.clientName) validationErrors.push(`Fila ${index + 1}: Cliente/Proveedor faltante`);
        if (isNaN(row.totalAmount)) validationErrors.push(`Fila ${index + 1}: Total inválido`);
      });
      
      if (validationErrors.length > 0) {
        console.log('\n⚠️ Errores de validación:');
        validationErrors.forEach(error => console.log(`   ${error}`));
      } else {
        console.log('\n✅ Todos los datos son válidos');
      }
    } else {
      console.log('\n❌ Simulación falló:', result.error);
    }
    
    // Limpiar archivo de prueba
    try {
      fs.unlinkSync(testFile);
      console.log('\n🧹 Archivo de prueba eliminado');
    } catch (e) {
      console.log('\n⚠️ No se pudo eliminar archivo de prueba:', e.message);
    }
    
  } catch (error) {
    console.error('\n❌ Error en simulación:', error.message);
  }
}

// Función principal
function main() {
  console.log('🔍 DIAGNÓSTICO DE IMPORTACIÓN DE EXCEL\n');
  console.log('='.repeat(50));
  
  // Verificar dependencias
  const depsOk = checkDependencies();
  
  // Verificar configuración
  checkMulterConfig();
  
  // Verificar directorio
  checkUploadsDirectory();
  
  // Simular proceso
  simulateImportProcess();
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 RESUMEN DEL DIAGNÓSTICO:');
  
  if (depsOk) {
    console.log('✅ Dependencias: OK');
  } else {
    console.log('❌ Dependencias: FALTANTES');
  }
  
  console.log('\n💡 PRÓXIMOS PASOS:');
  console.log('1. Verificar que el servidor esté ejecutándose');
  console.log('2. Probar con el archivo Excel de prueba');
  console.log('3. Revisar logs del servidor en tiempo real');
  console.log('4. Verificar permisos de usuario para importación');
}

// Ejecutar diagnóstico
main();
