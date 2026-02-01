const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    select: { displayName: true, phone: true, email: true }
  });
  console.log('All users:');
  users.forEach(u => {
    console.log(`- ${u.displayName}: phone=${u.phone || 'NONE'}`);
  });
}

check().finally(() => prisma.$disconnect());
