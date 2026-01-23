// Test database connection
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔍 Testing PostgreSQL connection...');
    console.log(`📌 DATABASE_URL: ${process.env.DATABASE_URL}`);
    
    // Test 1: Basic connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful!');
    console.log(`   Response: ${JSON.stringify(result)}`);
    
    // Test 2: Count users
    const userCount = await prisma.user.count();
    console.log(`✅ User table accessible. Users in database: ${userCount}`);
    
    // Test 3: Count products
    const productCount = await prisma.product.count();
    console.log(`✅ Product table accessible. Products in database: ${productCount}`);
    
    // Test 4: Get all data
    const users = await prisma.user.findMany();
    const products = await prisma.product.findMany({
      include: { supplier: true }
    });
    
    console.log('\n📊 Current Database Data:');
    console.log(`   Users: ${JSON.stringify(users, null, 2)}`);
    console.log(`   Products: ${JSON.stringify(products, null, 2)}`);
    
    console.log('\n✨ All database connections verified!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error(`Error: ${error.message}`);
    console.error(`Full error: ${JSON.stringify(error, null, 2)}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
