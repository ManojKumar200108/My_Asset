const { PrismaClient } = require('@prisma/client');
const bcryptjs = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create default plant
  const plant = await prisma.plant.create({
    data: {
      name: 'Corporate Headquarters',
      location: 'New York',
      isActive: true,
    },
  });
  console.log('✓ Plant created:', plant.name);

  // Create departments
  const itDept = await prisma.department.create({
    data: {
      name: 'IT',
      plantId: plant.id,
      isActive: true,
    },
  });

  const opsDept = await prisma.department.create({
    data: {
      name: 'Operations',
      plantId: plant.id,
      isActive: true,
    },
  });
  console.log('✓ Departments created');

  // Create locations
  const mainLoc = await prisma.location.create({
    data: {
      name: 'Main Building',
      plantId: plant.id,
      isActive: true,
    },
  });

  const warehouseLoc = await prisma.location.create({
    data: {
      name: 'Warehouse',
      plantId: plant.id,
      isActive: true,
    },
  });
  console.log('✓ Locations created');

  // Create asset categories
  const computerCat = await prisma.assetCategory.create({
    data: {
      name: 'Computers',
      code: 'CMP',
      isActive: true,
    },
  });

  const machineCat = await prisma.assetCategory.create({
    data: {
      name: 'Machinery',
      code: 'MCH',
      isActive: true,
    },
  });

  const furnitureCat = await prisma.assetCategory.create({
    data: {
      name: 'Furniture',
      code: 'FRN',
      isActive: true,
    },
  });
  console.log('✓ Asset categories created');

  // Create asset statuses
  const activeStatus = await prisma.assetStatus.create({
    data: {
      name: 'Active',
      isActive: true,
    },
  });

  const idleStatus = await prisma.assetStatus.create({
    data: {
      name: 'Idle',
      isActive: true,
    },
  });

  const maintenanceStatus = await prisma.assetStatus.create({
    data: {
      name: 'Under Maintenance',
      isActive: true,
    },
  });

  const disposedStatus = await prisma.assetStatus.create({
    data: {
      name: 'Disposed',
      isActive: true,
    },
  });
  console.log('✓ Asset statuses created');

  // Create vendors
  const vendor1 = await prisma.vendor.create({
    data: {
      name: 'TechSupplies Inc.',
      email: 'contact@techsupplies.com',
      phone: '+1-800-123-4567',
      isActive: true,
    },
  });

  const vendor2 = await prisma.vendor.create({
    data: {
      name: 'Industrial Equipment Co.',
      email: 'sales@ieqcorp.com',
      phone: '+1-800-987-6543',
      isActive: true,
    },
  });
  console.log('✓ Vendors created');

  // Create custodians
  const custodian1 = await prisma.custodian.create({
    data: {
      name: 'John Smith',
      email: 'john.smith@company.com',
      phone: '+1-555-0101',
      departmentId: itDept.id,
      plantId: plant.id,
      isActive: true,
    },
  });

  const custodian2 = await prisma.custodian.create({
    data: {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@company.com',
      phone: '+1-555-0102',
      departmentId: opsDept.id,
      plantId: plant.id,
      isActive: true,
    },
  });
  console.log('✓ Custodians created');

  // Create approval chains
  await prisma.approvalChain.create({
    data: {
      categoryId: computerCat.id,
      plantId: plant.id,
      level: 1,
      roleRequired: 'MANAGER',
      amountThreshold: 0,
      isActive: true,
    },
  });

  await prisma.approvalChain.create({
    data: {
      categoryId: computerCat.id,
      plantId: plant.id,
      level: 2,
      roleRequired: 'ADMIN',
      amountThreshold: 50000,
      isActive: true,
    },
  });

  await prisma.approvalChain.create({
    data: {
      categoryId: machineCat.id,
      plantId: plant.id,
      level: 1,
      roleRequired: 'MANAGER',
      amountThreshold: 0,
      isActive: true,
    },
  });

  await prisma.approvalChain.create({
    data: {
      categoryId: machineCat.id,
      plantId: plant.id,
      level: 2,
      roleRequired: 'ADMIN',
      amountThreshold: 100000,
      isActive: true,
    },
  });
  console.log('✓ Approval chains created');

  // Create default roles
  await prisma.role.createMany({
    data: [
      {
        name: 'ADMIN',
        description: 'Full administrative access to all system areas and settings.',
        permissions: [
          'VIEW_ASSETS',
          'MANAGE_ASSETS',
          'VIEW_TRANSFERS',
          'MANAGE_TRANSFERS',
          'MANAGE_USERS',
          'MANAGE_ROLES',
          'VIEW_REPORTS',
          'MANAGE_SETTINGS',
        ],
        isActive: true,
        isSystem: true,
      },
      {
        name: 'MANAGER',
        description: 'Approve transfers, manage team assets, and review reports.',
        permissions: [
          'VIEW_ASSETS',
          'MANAGE_ASSETS',
          'VIEW_TRANSFERS',
          'MANAGE_TRANSFERS',
          'VIEW_REPORTS',
        ],
        isActive: true,
        isSystem: true,
      },
      {
        name: 'CUSTODIAN',
        description: 'Manage assigned assets and update asset status for field custodians.',
        permissions: ['VIEW_ASSETS', 'MANAGE_ASSETS'],
        isActive: true,
      },
      {
        name: 'AUDITOR',
        description: 'View asset records and audit history without edit permissions.',
        permissions: ['VIEW_ASSETS', 'VIEW_TRANSFERS', 'VIEW_REPORTS'],
        isActive: true,
      },
      {
        name: 'VIEWER',
        description: 'Read-only access to asset and transfer information.',
        permissions: ['VIEW_ASSETS', 'VIEW_TRANSFERS'],
        isActive: true,
      },
    ],
  });
  console.log('✓ Default roles created');

  // Create default admin user
  const hashedPassword = await bcryptjs.hash('Admin@123', 10);
  const adminUser = await prisma.user.create({
    data: {
      name: 'Administrator',
      email: 'admin@industrialassets.com',
      passwordHash: hashedPassword,
      role: 'ADMIN',
      plantId: plant.id,
      departmentId: itDept.id,
      isActive: true,
    },
  });
  console.log('✓ Admin user created (email: admin@industrialassets.com, password: Admin@123)');

  // Create sample manager user
  const managerPassword = await bcryptjs.hash('Manager@123', 10);
  const managerUser = await prisma.user.create({
    data: {
      name: 'Manager User',
      email: 'manager@industrialassets.com',
      passwordHash: managerPassword,
      role: 'MANAGER',
      plantId: plant.id,
      departmentId: opsDept.id,
      isActive: true,
    },
  });
  console.log('✓ Manager user created (email: manager@industrialassets.com, password: Manager@123)');

  // Create sample custodian user
  const custodianPassword = await bcryptjs.hash('Custodian@123', 10);
  const custodianUser = await prisma.user.create({
    data: {
      name: 'Custodian User',
      email: 'custodian@industrialassets.com',
      passwordHash: custodianPassword,
      role: 'CUSTODIAN',
      plantId: plant.id,
      departmentId: itDept.id,
      isActive: true,
    },
  });
  console.log('✓ Custodian user created (email: custodian@industrialassets.com, password: Custodian@123)');

  // Create sample auditor user
  const auditorPassword = await bcryptjs.hash('Auditor@123', 10);
  const auditorUser = await prisma.user.create({
    data: {
      name: 'Auditor User',
      email: 'auditor@industrialassets.com',
      passwordHash: auditorPassword,
      role: 'AUDITOR',
      plantId: plant.id,
      departmentId: itDept.id,
      isActive: true,
    },
  });
  console.log('✓ Auditor user created (email: auditor@industrialassets.com, password: Auditor@123)');

  // Create sample assets
  const asset1 = await prisma.asset.create({
    data: {
      assetId: 'AST-2024-00001',
      assetName: 'Dell Laptop',
      serialNumber: 'DL123456789',
      modelNumber: 'XPS-13',
      brand: 'Dell',
      categoryId: computerCat.id,
      description: 'High-performance laptop for development',
      plantId: plant.id,
      locationId: mainLoc.id,
      departmentId: itDept.id,
      custodianId: custodian1.id,
      purchaseDate: new Date('2023-01-15'),
      purchaseCost: 1200.00,
      vendorId: vendor1.id,
      invoiceNumber: 'INV-2023-001',
      warrantyExpiryDate: new Date('2025-01-15'),
      usefulLifeYears: 5,
      depreciationMethod: 'SLM',
      salvageValue: 100.00,
      currentBookValue: 960.00,
      statusId: activeStatus.id,
      condition: 'GOOD',
      isItAsset: true,
      createdById: adminUser.id,
    },
  });
  console.log('✓ Sample asset created:', asset1.assetId);

  console.log('✅ Database seed completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
