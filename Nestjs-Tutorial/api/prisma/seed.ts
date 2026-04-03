import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // Clear existing data (preserve order due to foreign keys)
  console.log('🗑️  Clearing existing data...');
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
  await prisma.test.deleteMany();
  console.log('✅ Data cleared\n');

  // Hash passwords for demo users
  const hashedPassword1 = await bcrypt.hash('password123', 12);
  const hashedPassword2 = await bcrypt.hash('securepass456', 12);
  const hashedPassword3 = await bcrypt.hash('testpass789', 12);

  // Create demo users
  console.log('👥 Creating demo users...');
  const user1 = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      passwordHash: hashedPassword1,
    },
  });
  console.log(`   ✅ Created user: ${user1.email}`);

  const user2 = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      passwordHash: hashedPassword2,
    },
  });
  console.log(`   ✅ Created user: ${user2.email}`);

  const user3 = await prisma.user.create({
    data: {
      email: 'charlie@example.com',
      passwordHash: hashedPassword3,
    },
  });
  console.log(`   ✅ Created user: ${user3.email}\n`);

  // Create tasks for user1 (Alice)
  console.log('📝 Creating tasks for Alice...');
  const aliceTasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Learn NestJS fundamentals',
        done: true,
        userId: user1.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Build REST API with Prisma',
        done: true,
        userId: user1.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Implement JWT authentication',
        done: false,
        userId: user1.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Write unit tests',
        done: false,
        userId: user1.id,
      },
    }),
  ]);
  console.log(`   ✅ Created ${aliceTasks.length} tasks\n`);

  // Create tasks for user2 (Bob)
  console.log('📝 Creating tasks for Bob...');
  const bobTasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Set up Docker environment',
        done: true,
        userId: user2.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Configure PostgreSQL database',
        done: true,
        userId: user2.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Deploy to production',
        done: false,
        userId: user2.id,
      },
    }),
  ]);
  console.log(`   ✅ Created ${bobTasks.length} tasks\n`);

  // Create tasks for user3 (Charlie)
  console.log('📝 Creating tasks for Charlie...');
  const charlieTasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Review code quality',
        done: false,
        userId: user3.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Optimize database queries',
        done: false,
        userId: user3.id,
      },
    }),
  ]);
  console.log(`   ✅ Created ${charlieTasks.length} tasks\n`);

  // Create test records
  console.log('🧪 Creating test records...');
  const testRecords = await Promise.all([
    prisma.test.create({
      data: {
        name: 'Test Record 1',
      },
    }),
    prisma.test.create({
      data: {
        name: 'Test Record 2',
      },
    }),
  ]);
  console.log(`   ✅ Created ${testRecords.length} test records\n`);

  console.log('========================================');
  console.log('✨ Database seeding completed successfully!\n');

  console.log('📋 Seeded Data Summary:');
  console.log(`   Users: 3`);
  console.log(`   Tasks: ${aliceTasks.length + bobTasks.length + charlieTasks.length}`);
  console.log(`   Test Records: ${testRecords.length}\n`);

  console.log('🔐 Demo Credentials:');
  console.log('   User 1: alice@example.com / password123');
  console.log('   User 2: bob@example.com / securepass456');
  console.log('   User 3: charlie@example.com / testpass789\n');

  console.log('📚 API Examples:');
  console.log('   POST /auth/register - Create new account');
  console.log('   POST /auth/login - Get JWT token');
  console.log('   GET /users/me - Get current user profile');
  console.log('   GET /tasks - List user tasks');
  console.log('   POST /tasks - Create new task');
  console.log('   PATCH /tasks/:id - Update task');
  console.log('   DELETE /tasks/:id - Delete task\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
