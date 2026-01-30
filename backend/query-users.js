const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  const users = await prisma.user.findMany({
    select: { id: true, email: true, displayName: true, createdAt: true }
  });
  
  console.log(`\nTotal Users: ${userCount}\n`);
  console.log('Users:');
  users.forEach(user => {
    console.log(`- ${user.email} (${user.displayName}) - Created: ${user.createdAt}`);
  });

  const gameCount = await prisma.game.count();
  const playerCount = await prisma.player.count();
  
  console.log(`\nTotal Games: ${gameCount}`);
  console.log(`Total Players: ${playerCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
