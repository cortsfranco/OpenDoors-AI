/**
 * Script para testing de responsividad móvil
 * Ejecutar con: node mobile-audit.cjs
 */

const fs = require('fs');
const path = require('path');

// Patrones problemáticos comunes en móvil
const MOBILE_ANTI_PATTERNS = [
  { pattern: /text-xs(?!\s)/g, issue: 'Texto muy pequeño en móvil', severity: 'high' },
  { pattern: /p-[6-9]|px-[6-9]|py-[6-9]/g, issue: 'Padding excesivo en móvil', severity: 'medium' },
  { pattern: /grid-cols-[3-9](?!\s)/g, issue: 'Grid no responsivo', severity: 'high' },
  { pattern: /h-8(?!\s)/g, issue: 'Altura de botón muy pequeña', severity: 'medium' },
  { pattern: /flex-row(?!\s)/g, issue: 'Flex row puede causar overflow', severity: 'medium' },
  { pattern: /w-\[[0-9]+px\]/g, issue: 'Ancho fijo en píxeles', severity: 'high' },
  { pattern: /text-[2-9]xl(?!\s)/g, issue: 'Texto muy grande en móvil', severity: 'medium' },
  { pattern: /gap-[6-9]/g, issue: 'Gap excesivo en móvil', severity: 'medium' },
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

function scanDirectory(dirPath) {
  const issues = [];
  
  function scanRecursive(currentPath) {
    try {
      const items = fs.readdirSync(currentPath);
      
      items.forEach(item => {
        const itemPath = path.join(currentPath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanRecursive(itemPath);
        } else if (stat.isFile()) {
          const ext = path.extname(item);
          if (['.tsx', '.ts', '.jsx', '.js'].includes(ext)) {
            const fileIssues = scanFile(itemPath);
            issues.push(...fileIssues);
          }
        }
      });
    } catch (error) {
      console.error(`Error scanning directory ${currentPath}:`, error.message);
    }
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
    return false;
  } else {
    console.log('\n✅ No se encontraron problemas críticos de responsividad móvil');
    return true;
  }
}

// Ejecutar
main();
