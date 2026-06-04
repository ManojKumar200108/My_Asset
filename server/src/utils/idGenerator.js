// Generate sequential asset IDs like AST-2024-00001
const generateAssetId = async (prisma) => {
  const currentYear = new Date().getFullYear();
  const prefix = `AST-${currentYear}`;

  // Find the last asset ID for this year
  const lastAsset = await prisma.asset.findMany({
    where: {
      assetId: {
        startsWith: prefix,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { assetId: true },
  });

  let nextNumber = 1;
  if (lastAsset.length > 0) {
    const lastId = lastAsset[0].assetId;
    const numberPart = parseInt(lastId.split('-')[2], 10);
    nextNumber = numberPart + 1;
  }

  return `${prefix}-${String(nextNumber).padStart(5, '0')}`;
};

// Generate sequential transfer IDs like TRF-2024-00001
const generateTransferId = async (prisma) => {
  const currentYear = new Date().getFullYear();
  const prefix = `TRF-${currentYear}`;

  const lastTransfer = await prisma.transfer.findMany({
    where: {
      transferId: {
        startsWith: prefix,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { transferId: true },
  });

  let nextNumber = 1;
  if (lastTransfer.length > 0) {
    const lastId = lastTransfer[0].transferId;
    const numberPart = parseInt(lastId.split('-')[2], 10);
    nextNumber = numberPart + 1;
  }

  return `${prefix}-${String(nextNumber).padStart(5, '0')}`;
};

// Generate sequential disposal IDs like DSP-2024-00001
const generateDisposalId = async (prisma) => {
  const currentYear = new Date().getFullYear();
  const prefix = `DSP-${currentYear}`;

  const lastDisposal = await prisma.disposal.findMany({
    where: {
      disposalId: {
        startsWith: prefix,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { disposalId: true },
  });

  let nextNumber = 1;
  if (lastDisposal.length > 0) {
    const lastId = lastDisposal[0].disposalId;
    const numberPart = parseInt(lastId.split('-')[2], 10);
    nextNumber = numberPart + 1;
  }

  return `${prefix}-${String(nextNumber).padStart(5, '0')}`;
};

// Generate sequential challan IDs like CHL-2024-00001
const generateChallanId = async (prisma) => {
  const currentYear = new Date().getFullYear();
  const prefix = `CHL-${currentYear}`;

  const lastTransfer = await prisma.transfer.findMany({
    where: {
      challanNumber: {
        not: null,
        contains: prefix,
      },
    },
    orderBy: { challanGeneratedAt: 'desc' },
    take: 1,
    select: { challanNumber: true },
  });

  let nextNumber = 1;
  if (lastTransfer.length > 0) {
    const lastId = lastTransfer[0].challanNumber;
    const numberPart = parseInt(lastId.split('-')[2], 10);
    nextNumber = numberPart + 1;
  }

  return `${prefix}-${String(nextNumber).padStart(5, '0')}`;
};

module.exports = {
  generateAssetId,
  generateTransferId,
  generateDisposalId,
  generateChallanId,
};
