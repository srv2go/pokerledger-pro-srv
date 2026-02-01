const { PrismaClient } = require('@prisma/client');

async function fixRoles() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://pokerledger_db_user:OmssfsWZpGozcBZ9XsZm7vRtTIk26cHy@dpg-d5tvrnh4tr6s739l2hu0-a.oregon-postgres.render.com/pokerledger_db'
      }
    }
  });

  try {
    console.log('Adding SUPER_ADMIN and ADMIN roles to UserRole enum...');
    
    // Add enum values using raw SQL
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type t 
                       JOIN pg_enum e ON t.oid = e.enumtypid  
                       WHERE t.typname = 'UserRole' AND e.enumlabel = 'SUPER_ADMIN') 
        THEN
          ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';
        END IF;
      END $$;
    `);
    
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type t 
                       JOIN pg_enum e ON t.oid = e.enumtypid  
                       WHERE t.typname = 'UserRole' AND e.enumlabel = 'ADMIN') 
        THEN
          ALTER TYPE "UserRole" ADD VALUE 'ADMIN';
        END IF;
      END $$;
    `);
    
    console.log('✅ Successfully added SUPER_ADMIN and ADMIN roles');
    
    // Verify
    const result = await prisma.$queryRaw`
      SELECT e.enumlabel as role 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname = 'UserRole'
      ORDER BY e.enumsortorder;
    `;
    
    console.log('\nCurrent UserRole enum values:');
    result.forEach(r => console.log(`  - ${r.role}`));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixRoles();
