/**
 * Script para testing de responsividad móvil
 * Ejecutar con: node mobile-responsive-test.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de breakpoints móviles
const MOBILE_BREAKPOINTS = {
  xs: '320px',    // iPhone SE
  sm: '375px',    // iPhone 12
  md: '414px',    // iPhone 12 Pro Max
  lg: '768px',    // iPad
};

// Patrones problemáticos comunes en móvil
const MOBILE_ANTI_PATTERNS = [
  // Texto muy pequeño
  { pattern: /text-xs(?!\s)/g, issue: 'Texto muy pequeño en móvil', severity: 'high' },
  
  // Espaciado excesivo
  { pattern: /p-[6-9]|px-[6-9]|py-[6-9]/g, issue: 'Padding excesivo en móvil', severity: 'medium' },
  
  // Grids no responsivos
  { pattern: /grid-cols-[3-9](?!\s)/g, issue: 'Grid no responsivo', severity: 'high' },
  
  // Botones muy pequeños
  { pattern: /h-8(?!\s)/g, issue: 'Altura de botón muy pequeña', severity: 'medium' },
  
  // Flex no responsivo
  { pattern: /flex-row(?!\s)/g, issue: 'Flex row puede causar overflow', severity: 'medium' },
  
  // Anchos fijos problemáticos
  { pattern: /w-\[[0-9]+px\]/g, issue: 'Ancho fijo en píxeles', severity: 'high' },
  
  // Texto no responsivo
  { pattern: /text-[2-9]xl(?!\s)/g, issue: 'Texto muy grande en móvil', severity: 'medium' },
  
  // Gaps excesivos
  { pattern: /gap-[6-9]/g, issue: 'Gap excesivo en móvil', severity: 'medium' },
];

// Patrones recomendados para móvil
const MOBILE_BEST_PRACTICES = [
  { pattern: /sm:/g, description: 'Usa breakpoints responsivos' },
  { pattern: /md:/g, description: 'Usa breakpoints responsivos' },
  { pattern: /lg:/g, description: 'Usa breakpoints responsivos' },
  { pattern: /xl:/g, description: 'Usa breakpoints responsivos' },
  { pattern: /text-sm\s+sm:text-base/g, description: 'Texto responsivo' },
  { pattern: /flex-col\s+sm:flex-row/g, description: 'Layout responsivo' },
  { pattern: /grid-cols-1\s+sm:grid-cols-2/g, description: 'Grid responsivo' },
];

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const issues = [];
    
    lines.forEach((line, index) => {
      MOBILE_ANTI_PATTERNS.forEach(antiPattern => {
        const matches = line.match(antiPattern.pattern);
        if (matches) {
          issues.push({
            file: filePath,
            line: index + 1,
            content: line.trim(),
            issue: antiPattern.issue,
            severity: antiPattern.severity,
            matches: matches
          });
        }
      });
    });
    
    return issues;
  } catch (error) {
    console.error(`Error scanning ${filePath}:`, error.message);
    return [];
  }
}

function scanDirectory(dirPath, extensions = ['.tsx', '.ts', '.jsx', '.js']) {
  const issues = [];
  
  function scanRecursive(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    items.forEach(item => {
      const itemPath = path.join(currentPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        scanRecursive(itemPath);
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (extensions.includes(ext)) {
          const fileIssues = scanFile(itemPath);
          issues.push(...fileIssues);
        }
      }
    });
  }
  
  scanRecursive(dirPath);
  return issues;
}

function generateReport(issues) {
  const highPriority = issues.filter(i => i.severity === 'high');
  const mediumPriority = issues.filter(i => i.severity === 'medium');
  
  console.log('\n🔍 REPORTE DE RESPONSIVIDAD MÓVIL\n');
  console.log('='.repeat(50));
  
  console.log(`\n📊 RESUMEN:`);
  console.log(`   Total de problemas: ${issues.length}`);
  console.log(`   🔴 Alta prioridad: ${highPriority.length}`);
  console.log(`   🟡 Media prioridad: ${mediumPriority.length}`);
  
  if (highPriority.length > 0) {
    console.log(`\n🔴 PROBLEMAS DE ALTA PRIORIDAD:`);
    console.log('-'.repeat(50));
    
    const groupedByFile = highPriority.reduce((acc, issue) => {
      if (!acc[issue.file]) acc[issue.file] = [];
      acc[issue.file].push(issue);
      return acc;
    }, {});
    
    Object.entries(groupedByFile).forEach(([file, fileIssues]) => {
      console.log(`\n📄 ${file}:`);
      fileIssues.forEach(issue => {
        console.log(`   Línea ${issue.line}: ${issue.issue}`);
        console.log(`   Código: ${issue.content}`);
      });
    });
  }
  
  if (mediumPriority.length > 0) {
    console.log(`\n🟡 PROBLEMAS DE MEDIA PRIORIDAD:`);
    console.log('-'.repeat(50));
    
    const groupedByType = mediumPriority.reduce((acc, issue) => {
      if (!acc[issue.issue]) acc[issue.issue] = [];
      acc[issue.issue].push(issue);
      return acc;
    }, {});
    
    Object.entries(groupedByType).forEach(([issueType, issues]) => {
      console.log(`\n⚠️  ${issueType} (${issues.length} ocurrencias):`);
      issues.slice(0, 3).forEach(issue => {
        console.log(`   ${issue.file}:${issue.line}`);
      });
      if (issues.length > 3) {
        console.log(`   ... y ${issues.length - 3} más`);
      }
    });
  }
  
  console.log(`\n💡 RECOMENDACIONES:`);
  console.log('-'.repeat(50));
  console.log('1. Usa breakpoints responsivos: sm:, md:, lg:, xl:');
  console.log('2. Implementa flex-col sm:flex-row para layouts');
  console.log('3. Usa text-sm sm:text-base para tipografía');
  console.log('4. Implementa grid-cols-1 sm:grid-cols-2 para grids');
  console.log('5. Usa p-4 sm:p-6 para espaciado responsivo');
  console.log('6. Evita anchos fijos, usa w-full sm:w-auto');
  
  return {
    total: issues.length,
    high: highPriority.length,
    medium: mediumPriority.length
  };
}

// Función principal
function main() {
  console.log('🚀 Iniciando auditoría de responsividad móvil...\n');
  
  const clientDir = path.join(__dirname, 'client', 'src');
  const issues = scanDirectory(clientDir);
  
  const report = generateReport(issues);
  
  // Guardar reporte en archivo
  const reportPath = path.join(__dirname, 'mobile-responsive-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: report,
    issues: issues
  }, null, 2));
  
  console.log(`\n📋 Reporte guardado en: ${reportPath}`);
  
  if (report.high > 0) {
    console.log('\n❌ Se encontraron problemas críticos de responsividad móvil');
    process.exit(1);
  } else {
    console.log('\n✅ No se encontraron problemas críticos de responsividad móvil');
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  scanFile,
  scanDirectory,
  generateReport,
  MOBILE_ANTI_PATTERNS,
  MOBILE_BEST_PRACTICES
};
