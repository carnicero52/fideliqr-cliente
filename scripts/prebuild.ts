import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Solo ejecutar en producción (Vercel)
if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
  console.log('🚀 Configurando para producción (PostgreSQL)...');
  
  // Copiar schema de PostgreSQL
  const schemaProd = path.join(process.cwd(), 'prisma', 'schema.prod.prisma');
  const schema = path.join(process.cwd(), 'prisma', 'schema.prisma');
  
  if (fs.existsSync(schemaProd)) {
    fs.copyFileSync(schemaProd, schema);
    console.log('✅ Schema PostgreSQL copiado');
  }
  
  // Generar cliente Prisma
  execSync('npx prisma generate', { stdio: 'inherit' });
}

console.log('✅ Prebuild completado');
