const prisma = require('../utils/prisma');
const bcryptjs = require('bcryptjs');

const currency = (value) => {
  const numeric = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(numeric);
};

const dateOnly = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const fallbackOnMissingTable = (query, fallbackValue, tableName) =>
  query.catch((error) => {
    if (error?.code === 'P2021') {
      console.warn(`Skipping ${tableName}: table is missing in current database`);
      return fallbackValue;
    }
    throw error;
  });

const fetchAllData = async (req) => {
  const canApproveTransfers = ['ADMIN', 'MANAGER'].includes(req.user?.role);
  const [
    assets,
    transfers,
    maintenanceSchedules,
    maintenanceLogs,
    disposals,
    users,
    loginHistory,
    auditLogs,
    plants,
    departments,
    locations,
    categories,
    statuses,
    vendors,
    custodians,
    roles,
    approvalChains,
    pendingApprovalTransfers,
    notifications,
  ] = await Promise.all([
    prisma.asset.findMany({
      where: { deletedAt: null },
      include: {
        category: true,
        status: true,
        plant: true,
        location: true,
        department: true,
        custodian: true,
        vendor: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.transfer.findMany({
      where: canApproveTransfers ? undefined : { initiatedById: req.user.id },
      include: {
        asset: { include: { custodian: true } },
        initiatedBy: true,
        fromLocation: true,
        toLocation: true,
        fromPlant: true,
        toPlant: true,
        fromDepartment: true,
        toDepartment: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.maintenanceSchedule.findMany({
      include: { asset: true, vendor: true },
      orderBy: { nextDueDate: 'asc' },
    }),
    prisma.maintenanceLog.findMany({
      include: { asset: true, performedBy: true },
      orderBy: { logDate: 'desc' },
      take: 100,
    }),
    prisma.disposal.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.user.findMany({
      where: { deletedAt: null },
      include: { department: true, plant: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.loginHistory.findMany({
      include: { user: true },
      orderBy: { timestamp: 'desc' },
      take: 200,
    }),
    prisma.auditLog.findMany({
      include: { user: true },
      orderBy: { timestamp: 'desc' },
      take: 200,
    }),
    prisma.plant.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } }),
    prisma.department.findMany({
      where: { deletedAt: null },
      include: { plant: true },
      orderBy: { name: 'asc' },
    }),
    prisma.location.findMany({
      where: { deletedAt: null },
      include: { plant: true },
      orderBy: { name: 'asc' },
    }),
    prisma.assetCategory.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    }),
    prisma.assetStatus.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    }),
    prisma.vendor.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    }),
    prisma.custodian.findMany({
      where: { deletedAt: null },
      include: { department: true, plant: true },
      orderBy: { name: 'asc' },
    }),
    fallbackOnMissingTable(
      prisma.role.findMany({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
      }),
      [],
      'Role'
    ),
    prisma.approvalChain.findMany({
      where: { deletedAt: null },
      include: { category: true, plant: true },
      orderBy: [{ category: { name: 'asc' } }, { level: 'asc' }],
    }),
    prisma.transfer.findMany({
      where: {
        status: 'PENDING_APPROVAL',
      },
      include: {
        asset: { include: { custodian: true } },
        initiatedBy: true,
        fromPlant: true,
        toPlant: true,
        fromDepartment: true,
        toDepartment: true,
        approvals: {
          where: { isApproved: null },
          select: { approverId: true },
        },
      },
      orderBy: { initiatedAt: 'desc' },
    }),
    prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  const statusCounts = assets.reduce((acc, asset) => {
    const key = asset.status?.name || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const categoryCounts = assets.reduce((acc, asset) => {
    const key = asset.category?.name || 'Uncategorized';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const totalAssetValue = assets.reduce((sum, asset) => sum + Number(asset.currentBookValue || 0), 0);
  const pendingTransfers = transfers.filter((t) =>
    ['PENDING_APPROVAL', 'APPROVED', 'IN_TRANSIT'].includes(t.status)
  );
  const overdueMaintenance = maintenanceSchedules.filter((m) => new Date(m.nextDueDate) < new Date());
  const warrantiesExpiring = assets.filter((a) => {
    if (!a.warrantyExpiryDate) return false;
    const diff = new Date(a.warrantyExpiryDate).getTime() - Date.now();
    return diff >= 0 && diff <= 30 * 24 * 60 * 60 * 1000;
  });

  return {
    dashboard: {
      totals: {
        totalAssets: assets.length,
        activeTransfers: pendingTransfers.length,
        pendingApprovals: pendingApprovalTransfers.length,
        maintenanceDue: maintenanceSchedules.length,
        maintenanceOverdue: overdueMaintenance.length,
        totalAssetValue,
        warrantiesExpiring30d: warrantiesExpiring.length,
      },
      statusBreakdown: statusCounts,
      categoryBreakdown: categoryCounts,
      latestTransfers: transfers.slice(0, 10).map((t) => ({
        id: t.transferId,
        asset: t.asset?.assetName || '-',
        type: t.transferType,
        status: t.status,
        from: t.fromLocation?.name || '-',
        to: t.toLocation?.name || '-',
        initiatedAt: t.initiatedAt,
      })),
      alerts: [
        ...overdueMaintenance.slice(0, 5).map((m) => ({
          type: 'MAINTENANCE_OVERDUE',
          title: `${m.asset?.assetName || 'Asset'} maintenance overdue`,
          subtitle: `Due ${dateOnly(m.nextDueDate)}`,
        })),
        ...warrantiesExpiring.slice(0, 5).map((a) => ({
          type: 'WARRANTY_EXPIRING',
          title: `${a.assetName} warranty expiring`,
          subtitle: `Expires ${dateOnly(a.warrantyExpiryDate)}`,
        })),
      ],
    },
    assets: assets.map((a) => ({
      id: a.id,
      assetId: a.assetId,
      assetName: a.assetName,
      assetCode: a.assetCode,
      serialNumber: a.serialNumber,
      modelNumber: a.modelNumber,
      brand: a.brand,
      categoryId: a.categoryId,
      subCategory: a.subCategory,
      description: a.description,
      plantId: a.plantId,
      locationId: a.locationId,
      departmentId: a.departmentId,
      custodianId: a.custodianId,
      vendorId: a.vendorId,
      invoiceNumber: a.invoiceNumber,
      warrantyExpiryDate: a.warrantyExpiryDate,
      insurancePolicyNumber: a.insurancePolicyNumber,
      insuranceExpiry: a.insuranceExpiry,
      usefulLifeYears: a.usefulLifeYears,
      depreciationMethod: a.depreciationMethod,
      salvageValue: a.salvageValue,
      statusId: a.statusId,
      category: a.category?.name || '-',
      location: a.location?.name || '-',
      department: a.department?.name || '-',
      plant: a.plant?.name || '-',
      status: a.status?.name || '-',
      condition: a.condition,
      purchaseDate: a.purchaseDate,
      currentBookValue: a.currentBookValue,
      purchaseCost: a.purchaseCost,
    })),
    transfers: transfers.map((t) => ({
      id: t.id,
      transferId: t.transferId,
      assetId: t.asset?.assetId || '-',
      assetName: t.asset?.assetName || '-',
      transferType: t.transferType,
      from: `${t.fromPlant?.name || '-'} / ${t.fromLocation?.name || '-'}`,
      to: `${t.toPlant?.name || '-'} / ${t.toLocation?.name || '-'}`,
      initiatedBy: t.initiatedBy?.name || '-',
      initiatedAt: t.initiatedAt,
      expectedReturnDate: t.expectedReturnDate,
      status: t.status,
      requestedBy: t.initiatedBy?.name || '-',
      fromUser: t.asset?.custodian?.name || t.fromDepartment?.name || '-',
      toUser: t.toDepartment?.name || '-',
    })),
    approvals: canApproveTransfers
      ? {
        pendingRequests: pendingApprovalTransfers.map((item) => ({
          id: item.id,
          transferId: item.transferId,
          transferRecordId: item.id,
          requestedBy: item.initiatedBy?.name || '-',
          assetName: item.asset?.assetName || '-',
          assetId: item.asset?.assetId || '-',
          fromUser: item.asset?.custodian?.name || item.fromDepartment?.name || '-',
          toUser: item.toDepartment?.name || '-',
          requestedAt: item.initiatedAt,
          status: item.status,
          from: `${item.fromPlant?.name || '-'} / ${item.fromDepartment?.name || '-'}`,
          to: `${item.toPlant?.name || '-'} / ${item.toDepartment?.name || '-'}`,
          purpose: item.purpose || '-',
          remarks: item.remarks || '-',
          canAct: true,
        })),
      }
      : { pendingRequests: [] },
    maintenance: {
      schedules: maintenanceSchedules.map((m) => ({
        id: m.id,
        assetId: m.asset?.assetId || '-',
        assetName: m.asset?.assetName || '-',
        type: m.type,
        frequency: m.frequency,
        nextDueDate: m.nextDueDate,
        vendor: m.vendor?.name || '-',
      })),
      logs: maintenanceLogs.map((m) => ({
        id: m.id,
        assetId: m.asset?.assetId || '-',
        assetName: m.asset?.assetName || '-',
        type: m.type,
        logDate: m.logDate,
        cost: m.cost,
        performedBy: m.performedBy?.name || '-',
        nextDueDate: m.nextDueDate,
      })),
    },
    disposals: disposals.map((d) => ({
      id: d.id,
      disposalId: d.disposalId,
      assetId: d.assetId,
      disposalType: d.disposalType,
      reason: d.reason,
      disposalValue: d.disposalValue,
      disposalDate: d.disposalDate,
      status: d.status,
    })),
    audit: {
      activity: auditLogs.map((l) => ({
        id: l.id,
        entityType: l.entityType,
        entityId: l.entityId,
        action: l.action,
        changedBy: l.user?.name || '-',
        timestamp: l.timestamp,
      })),
      departmentSummary: departments.map((department) => {
        const departmentAssets = assets.filter((a) => a.departmentId === department.id);
        const active = departmentAssets.filter((a) => (a.status?.name || '').toLowerCase() === 'active').length;
        const maintenance = departmentAssets.filter((a) =>
          (a.status?.name || '').toLowerCase().includes('maintenance')
        ).length;
        const idle = departmentAssets.filter((a) => (a.status?.name || '').toLowerCase() === 'idle').length;
        const disposed = departmentAssets.filter((a) => (a.status?.name || '').toLowerCase() === 'disposed').length;
        const value = departmentAssets.reduce((sum, a) => sum + Number(a.currentBookValue || 0), 0);

        return {
          department: department.name,
          total: departmentAssets.length,
          active,
          maintenance,
          idle,
          disposed,
          value,
        };
      }),
    },
    reports: {
      depreciation: assets.map((a) => ({
        assetId: a.assetId,
        assetName: a.assetName,
        method: a.depreciationMethod,
        purchaseCost: a.purchaseCost,
        currentBookValue: a.currentBookValue,
        usefulLifeYears: a.usefulLifeYears,
        purchaseDate: a.purchaseDate,
      })),
      locationSummary: locations.map((location) => {
        const locationAssets = assets.filter((a) => a.locationId === location.id);
        return {
          location: location.name,
          totalAssets: locationAssets.length,
          totalValue: locationAssets.reduce((sum, a) => sum + Number(a.currentBookValue || 0), 0),
        };
      }),
    },
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department?.name || '-',
      plant: u.plant?.name || '-',
      isActive: u.isActive,
      createdAt: u.createdAt,
    })),
    roles: roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions || [],
      isActive: role.isActive,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    })),
    loginHistory: loginHistory.map((h) => ({
      id: h.id,
      user: h.user?.name || '-',
      email: h.user?.email || '-',
      ipAddress: h.ipAddress,
      success: h.success,
      timestamp: h.timestamp,
    })),
    notifications: notifications.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      message: item.message,
      relatedTransferId: item.relatedTransferId,
      isRead: item.isRead,
      createdAt: item.createdAt,
    })),
    settings: {
      plants,
      departments,
      locations,
      categories,
      statuses,
      vendors,
      custodians,
      approvalChains,
    },
    meta: {
      generatedAt: new Date().toISOString(),
      totals: {
        assets: assets.length,
        transfers: transfers.length,
        users: users.length,
        roles: roles.length,
      },
      format: {
        totalAssetValue: currency(totalAssetValue),
      },
    },
  };
};

const getAllData = async (req, res) => {
  try {
    const data = await fetchAllData(req);
    res.json({ status: 'success', data });
  } catch (error) {
    console.error('getAllData error', error);
    res.status(500).json({ status: 'error', message: 'Failed to load app data' });
  }
};

const getRoles = async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
    res.json({ status: 'success', data: roles });
  } catch (error) {
    console.error('getRoles error', error);
    if (error?.code === 'P2021') {
      return res.status(500).json({
        status: 'error',
        message: 'Role table is missing. Run database migration to enable role management.',
      });
    }
    res.status(500).json({ status: 'error', message: 'Failed to load roles' });
  }
};

const createRole = async (req, res) => {
  try {
    const { name, description, permissions, isActive } = req.body;
    const normalizedName = name?.toString().trim().toUpperCase();
    const normalizedPermissions = Array.isArray(permissions)
      ? permissions.map((item) => item.toString().trim()).filter(Boolean)
      : permissions?.toString().split(',').map((item) => item.trim()).filter(Boolean);

    if (!normalizedName) {
      return res.status(400).json({ status: 'error', message: 'Role name is required' });
    }

    if (!normalizedPermissions || !normalizedPermissions.length) {
      return res.status(400).json({ status: 'error', message: 'At least one permission is required' });
    }

    const existing = await prisma.role.findFirst({
      where: {
        name: normalizedName,
        deletedAt: null,
      },
    });

    if (existing) {
      return res.status(409).json({ status: 'error', message: 'A role with this name already exists' });
    }

    const role = await prisma.role.create({
      data: {
        name: normalizedName,
        description: description?.toString().trim() || null,
        permissions: normalizedPermissions,
        isActive: isActive !== false,
      },
    });

    res.json({ status: 'success', data: role });
  } catch (error) {
    console.error('createRole error', error);
    if (error?.code === 'P2021') {
      return res.status(500).json({
        status: 'error',
        message: 'Role table is missing. Run database migration to enable role management.',
      });
    }
    if (error?.code === 'P2002') {
      return res.status(409).json({ status: 'error', message: 'Role name already exists' });
    }
    res.status(500).json({ status: 'error', message: 'Failed to create role' });
  }
};

const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions, isActive } = req.body;

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role || role.deletedAt) {
      return res.status(404).json({ status: 'error', message: 'Role not found' });
    }

    const updateData = {};

    if (name !== undefined) {
      const normalizedName = name?.toString().trim().toUpperCase();
      if (!normalizedName) {
        return res.status(400).json({ status: 'error', message: 'Role name is required' });
      }
      if (role.isSystem && normalizedName !== role.name) {
        return res.status(403).json({ status: 'error', message: 'System roles cannot be renamed' });
      }

      const existing = await prisma.role.findFirst({
        where: {
          name: normalizedName,
          deletedAt: null,
          NOT: { id },
        },
      });
      if (existing) {
        return res.status(409).json({ status: 'error', message: 'A role with this name already exists' });
      }
      updateData.name = normalizedName;
    }

    if (description !== undefined) {
      updateData.description = description?.toString().trim() || null;
    }

    if (permissions !== undefined) {
      const normalizedPermissions = Array.isArray(permissions)
        ? permissions.map((item) => item.toString().trim()).filter(Boolean)
        : permissions?.toString().split(',').map((item) => item.trim()).filter(Boolean);

      if (!normalizedPermissions || !normalizedPermissions.length) {
        return res.status(400).json({ status: 'error', message: 'At least one permission is required' });
      }
      updateData.permissions = normalizedPermissions;
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    const updatedRole = await prisma.role.update({
      where: { id },
      data: updateData,
    });

    res.json({ status: 'success', data: updatedRole });
  } catch (error) {
    console.error('updateRole error', error);
    if (error?.code === 'P2021') {
      return res.status(500).json({
        status: 'error',
        message: 'Role table is missing. Run database migration to enable role management.',
      });
    }
    if (error?.code === 'P2002') {
      return res.status(409).json({ status: 'error', message: 'Role name already exists' });
    }
    res.status(500).json({ status: 'error', message: 'Failed to update role' });
  }
};

const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role || role.deletedAt) {
      return res.status(404).json({ status: 'error', message: 'Role not found' });
    }

    if (role.isSystem) {
      return res.status(400).json({ status: 'error', message: 'System roles cannot be deleted' });
    }

    const assignedUsers = await prisma.user.count({ where: { role: role.name } });
    if (assignedUsers > 0) {
      return res.status(400).json({
        status: 'error',
        message: `This role is assigned to ${assignedUsers} user${assignedUsers === 1 ? '' : 's'}. Reassign users before deleting.`,
      });
    }

    await prisma.role.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({ status: 'success', message: 'Role deleted' });
  } catch (error) {
    console.error('deleteRole error', error);
    if (error?.code === 'P2021') {
      return res.status(500).json({
        status: 'error',
        message: 'Role table is missing. Run database migration to enable role management.',
      });
    }
    res.status(500).json({ status: 'error', message: 'Failed to delete role' });
  }
};

const getAssetDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await prisma.asset.findFirst({
      where: {
        OR: [{ id }, { assetId: id }],
      },
      include: {
        category: true,
        status: true,
        plant: true,
        location: true,
        department: true,
        custodian: true,
        vendor: true,
        history: { include: { changedBy: true }, orderBy: { changedAt: 'desc' } },
        transfers: {
          include: { fromLocation: true, toLocation: true, initiatedBy: true },
          orderBy: { initiatedAt: 'desc' },
        },
        maintenanceLogs: { include: { performedBy: true }, orderBy: { logDate: 'desc' } },
      },
    });

    if (!asset) {
      return res.status(404).json({ status: 'error', message: 'Asset not found' });
    }

    res.json({ status: 'success', data: asset });
  } catch (error) {
    console.error('getAssetDetail error', error);
    res.status(500).json({ status: 'error', message: 'Failed to load asset detail' });
  }
};

const getTransferDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const transfer = await prisma.transfer.findFirst({
      where: {
        OR: [{ id }, { transferId: id }],
      },
      include: {
        asset: true,
        fromLocation: true,
        toLocation: true,
        fromPlant: true,
        toPlant: true,
        fromDepartment: true,
        toDepartment: true,
        initiatedBy: true,
        approvals: {
          include: { approver: true },
          orderBy: { level: 'asc' },
        },
      },
    });

    if (!transfer) {
      return res.status(404).json({ status: 'error', message: 'Transfer not found' });
    }

    res.json({ status: 'success', data: transfer });
  } catch (error) {
    console.error('getTransferDetail error', error);
    res.status(500).json({ status: 'error', message: 'Failed to load transfer detail' });
  }
};

// ===== CRUD Operations =====

// Assets
const createAsset = async (req, res) => {
  try {
    const {
      assetId,
      assetName,
      assetCode,
      serialNumber,
      modelNumber,
      brand,
      categoryId,
      subCategory,
      description,
      plantId,
      locationId,
      departmentId,
      custodianId,
      purchaseDate,
      purchaseCost,
      vendorId,
      invoiceNumber,
      warrantyExpiryDate,
      insurancePolicyNumber,
      insuranceExpiry,
      usefulLifeYears,
      depreciationMethod,
      salvageValue,
      remarks,
      statusId,
    } = req.body;

    const normalizedAssetId = assetId?.toString().trim();
    if (!normalizedAssetId) {
      return res.status(400).json({ status: 'error', message: 'Asset ID is required' });
    }

    if (!assetName?.toString().trim() || !categoryId || !plantId || !locationId || !departmentId || !custodianId) {
      return res.status(400).json({
        status: 'error',
        message: 'Asset ID, name, category, plant, location, department, and custodian are required',
      });
    }

    const existingAsset = await prisma.asset.findFirst({
      where: {
        assetId: normalizedAssetId,
        deletedAt: null,
      },
    });

    if (existingAsset) {
      return res.status(409).json({ status: 'error', message: 'Asset ID already exists' });
    }

    if (serialNumber?.toString().trim()) {
      const duplicateSerial = await prisma.asset.findFirst({
        where: {
          serialNumber: serialNumber.toString().trim(),
          deletedAt: null,
        },
      });
      if (duplicateSerial) {
        return res.status(409).json({ status: 'error', message: 'Duplicate serial number already exists in the system' });
      }
    }

    const [category, plant, location, department, custodian, status] = await Promise.all([
      prisma.assetCategory.findFirst({ where: { id: categoryId, deletedAt: null } }),
      prisma.plant.findFirst({ where: { id: plantId, deletedAt: null } }),
      prisma.location.findFirst({ where: { id: locationId, deletedAt: null } }),
      prisma.department.findFirst({ where: { id: departmentId, deletedAt: null } }),
      prisma.custodian.findFirst({ where: { id: custodianId, deletedAt: null } }),
      statusId
        ? prisma.assetStatus.findFirst({ where: { id: statusId, deletedAt: null } })
        : null,
    ]);

    if (!category) {
      return res.status(400).json({ status: 'error', message: 'Asset category not found' });
    }
    if (!plant) {
      return res.status(400).json({ status: 'error', message: 'Plant not found' });
    }
    if (!location) {
      return res.status(400).json({ status: 'error', message: 'Location not found' });
    }
    if (!department) {
      return res.status(400).json({ status: 'error', message: 'Department not found' });
    }
    if (!custodian) {
      return res.status(400).json({ status: 'error', message: 'Custodian not found' });
    }

    if (statusId && !status) {
      return res.status(400).json({ status: 'error', message: 'Status not found' });
    }

    const parseDateValue = (value, label) => {
      if (!value) return null;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        throw new Error(`${label} is not a valid date`);
      }
      return date;
    };

    const asset = await prisma.asset.create({
      data: {
        assetId: normalizedAssetId,
        assetName: assetName.toString().trim(),
        assetCode: assetCode?.toString().trim() || null,
        serialNumber: serialNumber?.toString().trim() || null,
        modelNumber: modelNumber?.toString().trim() || null,
        brand: brand?.toString().trim() || null,
        categoryId,
        subCategory: subCategory?.toString().trim() || null,
        description: description?.toString().trim() || null,
        plantId,
        locationId,
        departmentId,
        custodianId,
        purchaseDate: parseDateValue(purchaseDate, 'Purchase date'),
        purchaseCost: purchaseCost ? parseFloat(purchaseCost) : null,
        vendorId: vendorId || null,
        invoiceNumber: invoiceNumber?.toString().trim() || null,
        warrantyExpiryDate: parseDateValue(warrantyExpiryDate, 'Warranty expiry date'),
        insurancePolicyNumber: insurancePolicyNumber?.toString().trim() || null,
        insuranceExpiry: parseDateValue(insuranceExpiry, 'Insurance expiry date'),
        usefulLifeYears: usefulLifeYears ? parseInt(usefulLifeYears, 10) : null,
        depreciationMethod: depreciationMethod || 'SLM',
        salvageValue: salvageValue ? parseFloat(salvageValue) : 0,
        statusId: statusId || (await prisma.assetStatus.findFirst({ where: { name: 'Active', isActive: true } })).id,
        remarks: remarks?.toString().trim() || null,
        createdById: req.user.id,
      },
    });

    res.json({ status: 'success', data: asset });
  } catch (error) {
    console.error('createAsset error', error);
    if (error?.code === 'P2002') {
      return res.status(409).json({ status: 'error', message: 'Asset ID already exists' });
    }
    if (error?.message?.includes('valid date')) {
      return res.status(400).json({ status: 'error', message: error.message });
    }
    res.status(500).json({ status: 'error', message: error?.message || 'Failed to create asset' });
  }
};

const updateAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.assetId !== undefined) {
      updateData.assetId = updateData.assetId?.toString().trim();
      if (!updateData.assetId) {
        return res.status(400).json({ status: 'error', message: 'Asset ID is required' });
      }

      const existingAsset = await prisma.asset.findFirst({
        where: {
          assetId: updateData.assetId,
          deletedAt: null,
          NOT: { id },
        },
      });
      if (existingAsset) {
        return res.status(409).json({ status: 'error', message: 'Asset ID already exists' });
      }
    }

    // Convert dates
    if (updateData.purchaseDate) updateData.purchaseDate = new Date(updateData.purchaseDate);
    if (updateData.warrantyExpiryDate) updateData.warrantyExpiryDate = new Date(updateData.warrantyExpiryDate);
    if (updateData.insuranceExpiry) updateData.insuranceExpiry = new Date(updateData.insuranceExpiry);

    // Convert numbers
    if (updateData.purchaseCost) updateData.purchaseCost = parseFloat(updateData.purchaseCost);
    if (updateData.usefulLifeYears) updateData.usefulLifeYears = parseInt(updateData.usefulLifeYears);
    if (updateData.salvageValue) updateData.salvageValue = parseFloat(updateData.salvageValue);

    updateData.updatedById = req.user.id;
    updateData.updatedAt = new Date();

    const asset = await prisma.asset.update({
      where: { id },
      data: updateData,
    });

    res.json({ status: 'success', data: asset });
  } catch (error) {
    console.error('updateAsset error', error);
    if (error?.code === 'P2002') {
      return res.status(409).json({ status: 'error', message: 'Asset ID already exists' });
    }
    res.status(500).json({ status: 'error', message: 'Failed to update asset' });
  }
};

const deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.asset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    res.json({ status: 'success', message: 'Asset deleted' });
  } catch (error) {
    console.error('deleteAsset error', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete asset' });
  }
};

// Transfers
const createTransfer = async (req, res) => {
  try {
    const {
      assetId,
      transferType,
      fromLocationId,
      toLocationId,
      fromDepartmentId,
      toDepartmentId,
      fromPlantId,
      toPlantId,
      expectedReturnDate,
      purpose,
      remarks,
    } = req.body;

    if (!assetId || !transferType || !fromLocationId || !toLocationId) {
      return res.status(400).json({
        status: 'error',
        message: 'Asset, transfer type, source location, and destination location are required',
      });
    }

    if (!['RETURNABLE', 'NON_RETURNABLE'].includes(transferType)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid transfer type',
      });
    }

    if (transferType === 'RETURNABLE' && !expectedReturnDate) {
      return res.status(400).json({
        status: 'error',
        message: 'Expected return date is required for returnable transfers',
      });
    }

    const transferId = `TRF-${Date.now()}`;

    const approvers = await prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        role: { in: ['ADMIN', 'MANAGER'] },
      },
      select: { id: true, name: true },
    });

    if (!approvers.length) {
      return res.status(400).json({
        status: 'error',
        message: 'No approvers found. Please assign an Admin or Manager before creating transfers.',
      });
    }

    const transfer = await prisma.transfer.create({
      data: {
        transferId,
        assetId,
        transferType,
        fromLocationId,
        toLocationId,
        fromDepartmentId: fromDepartmentId || null,
        toDepartmentId: toDepartmentId || null,
        fromPlantId: fromPlantId || null,
        toPlantId: toPlantId || null,
        initiatedById: req.user.id,
        expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
        purpose,
        remarks,
        status: 'PENDING_APPROVAL',
        approvalLevelRequired: 1,
        currentApprovalLevel: 0,
      },
    });

    await prisma.transferApproval.createMany({
      data: approvers.map((approver) => ({
        transferId: transfer.id,
        level: 1,
        approverId: approver.id,
      })),
    });

    await prisma.notification.createMany({
      data: approvers.map((approver) => ({
        userId: approver.id,
        type: 'TRANSFER_APPROVAL_REQUEST',
        title: `Transfer approval requested (${transfer.transferId})`,
        message: `${req.user.name} requested transfer approval for ${transfer.transferId}.`,
        relatedTransferId: transfer.id,
      })),
    });

    res.json({ status: 'success', data: transfer });
  } catch (error) {
    console.error('createTransfer error', error);
    if (error?.code === 'P2003') {
      return res.status(400).json({ status: 'error', message: 'Invalid transfer source or destination selection' });
    }
    if (error?.code === 'P2025') {
      return res.status(404).json({ status: 'error', message: 'Asset or transfer references not found' });
    }
    res.status(500).json({ status: 'error', message: 'Failed to create transfer' });
  }
};

const approveTransferRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        approvals: true,
      },
    });

    if (!transfer) {
      return res.status(404).json({ status: 'error', message: 'Transfer not found' });
    }

    if (transfer.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({
        status: 'error',
        message: 'Transfer is not in pending approval state',
      });
    }

    const approverRecord = transfer.approvals.find((item) => item.approverId === req.user.id);
    if (!approverRecord) {
      await prisma.transferApproval.create({
        data: {
          transferId: id,
          approverId: req.user.id,
          level: 1,
          isApproved: true,
          approvedAt: new Date(),
        },
      });
    } else if (approverRecord.isApproved === null) {
      await prisma.transferApproval.update({
        where: { id: approverRecord.id },
        data: {
          isApproved: true,
          approvedAt: new Date(),
        },
      });
    }

    await prisma.transferApproval.updateMany({
      where: {
        transferId: id,
        isApproved: null,
      },
      data: {
        isApproved: true,
        approvedAt: new Date(),
      },
    });

    const updatedTransfer = await prisma.transfer.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        currentApprovalLevel: 1,
      },
    });

    const updatedAsset = await prisma.asset.update({
      where: { id: updatedTransfer.assetId },
      data: {
        plantId: updatedTransfer.toPlantId || undefined,
        locationId: updatedTransfer.toLocationId,
        departmentId: updatedTransfer.toDepartmentId || undefined,
        updatedById: req.user.id,
      },
    });

    await prisma.notification.create({
      data: {
        userId: updatedTransfer.initiatedById,
        type: 'TRANSFER_APPROVED',
        title: `Transfer approved (${updatedTransfer.transferId})`,
        message: `Your transfer request ${updatedTransfer.transferId} has been approved and completed.`,
        relatedAssetId: updatedAsset.id,
        relatedTransferId: updatedTransfer.id,
      },
    });

    res.json({ status: 'success', message: 'Transfer approved and completed', data: updatedTransfer });
  } catch (error) {
    console.error('approveTransferRequest error', error);
    res.status(500).json({ status: 'error', message: 'Failed to approve transfer request' });
  }
};

const rejectTransferRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        approvals: true,
      },
    });

    if (!transfer) {
      return res.status(404).json({ status: 'error', message: 'Transfer not found' });
    }

    if (transfer.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({
        status: 'error',
        message: 'Transfer is not in pending approval state',
      });
    }

    const approverRecord = transfer.approvals.find((item) => item.approverId === req.user.id);
    if (!approverRecord) {
      await prisma.transferApproval.create({
        data: {
          transferId: id,
          approverId: req.user.id,
          level: 1,
          isApproved: false,
          approvedAt: new Date(),
          rejectedReason: reason || null,
        },
      });
    } else if (approverRecord.isApproved === null) {
      await prisma.transferApproval.update({
        where: { id: approverRecord.id },
        data: {
          isApproved: false,
          approvedAt: new Date(),
          rejectedReason: reason || null,
        },
      });
    }

    await prisma.transferApproval.updateMany({
      where: {
        transferId: id,
        isApproved: null,
      },
      data: {
        isApproved: false,
        approvedAt: new Date(),
        rejectedReason: 'Rejected by approver',
      },
    });

    const updatedTransfer = await prisma.transfer.update({
      where: { id },
      data: {
        status: 'REJECTED',
      },
    });

    await prisma.notification.create({
      data: {
        userId: updatedTransfer.initiatedById,
        type: 'TRANSFER_REJECTED',
        title: `Transfer rejected (${updatedTransfer.transferId})`,
        message: `Your transfer request ${updatedTransfer.transferId} was rejected${reason ? `: ${reason}` : '.'}`,
        relatedTransferId: updatedTransfer.id,
      },
    });

    res.json({ status: 'success', message: 'Transfer request rejected', data: updatedTransfer });
  } catch (error) {
    console.error('rejectTransferRequest error', error);
    res.status(500).json({ status: 'error', message: 'Failed to reject transfer request' });
  }
};

const updateTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, expectedReturnDate, actualReturnDate, remarks } = req.body;

    if (status !== undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Transfer status is controlled by approval actions. Use approve/reject workflow.',
      });
    }

    const transfer = await prisma.transfer.findUnique({ where: { id }, select: { status: true } });
    if (!transfer) {
      return res.status(404).json({ status: 'error', message: 'Transfer not found' });
    }

    if (['COMPLETED', 'REJECTED'].includes(transfer.status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Completed or rejected transfers cannot be modified',
      });
    }

    const updateData = {
      remarks: remarks ?? undefined,
      expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : expectedReturnDate === '' ? null : undefined,
      actualReturnDate: actualReturnDate ? new Date(actualReturnDate) : actualReturnDate === '' ? null : undefined,
    };

    const updated = await prisma.transfer.update({
      where: { id },
      data: updateData,
    });

    res.json({ status: 'success', data: updated });
  } catch (error) {
    console.error('updateTransfer error', error);
    res.status(500).json({ status: 'error', message: 'Failed to update transfer' });
  }
};

const deleteTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.transfer.delete({
      where: { id },
    });
    res.json({ status: 'success', message: 'Transfer deleted' });
  } catch (error) {
    console.error('deleteTransfer error', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete transfer' });
  }
};

// Maintenance
const createMaintenanceSchedule = async (req, res) => {
  try {
    const { assetId, type, frequency, nextDueDate, vendorId } = req.body;

    const schedule = await prisma.maintenanceSchedule.create({
      data: {
        assetId,
        type,
        frequency,
        nextDueDate: new Date(nextDueDate),
        vendorId,
      },
    });

    res.json({ status: 'success', data: schedule });
  } catch (error) {
    console.error('createMaintenanceSchedule error', error);
    res.status(500).json({ status: 'error', message: 'Failed to create maintenance schedule' });
  }
};

const updateMaintenanceSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.nextDueDate) updateData.nextDueDate = new Date(updateData.nextDueDate);

    const schedule = await prisma.maintenanceSchedule.update({
      where: { id },
      data: updateData,
    });

    res.json({ status: 'success', data: schedule });
  } catch (error) {
    console.error('updateMaintenanceSchedule error', error);
    res.status(500).json({ status: 'error', message: 'Failed to update maintenance schedule' });
  }
};

const deleteMaintenanceSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.maintenanceSchedule.delete({
      where: { id },
    });
    res.json({ status: 'success', message: 'Maintenance schedule deleted' });
  } catch (error) {
    console.error('deleteMaintenanceSchedule error', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete maintenance schedule' });
  }
};

const createMaintenanceLog = async (req, res) => {
  try {
    const { assetId, logDate, type, description, cost, nextDueDate } = req.body;

    const log = await prisma.maintenanceLog.create({
      data: {
        assetId,
        logDate: new Date(logDate),
        type,
        description,
        cost: cost ? parseFloat(cost) : null,
        performedById: req.user.id,
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
      },
    });

    res.json({ status: 'success', data: log });
  } catch (error) {
    console.error('createMaintenanceLog error', error);
    res.status(500).json({ status: 'error', message: 'Failed to create maintenance log' });
  }
};

// Disposals
const createDisposal = async (req, res) => {
  try {
    const { assetId, disposalType, reason, disposalValue, disposalDate } = req.body;

    const disposalId = `DSP-${Date.now()}`;

    const disposal = await prisma.disposal.create({
      data: {
        disposalId,
        assetId,
        disposalType,
        reason,
        disposalValue: disposalValue ? parseFloat(disposalValue) : null,
        disposalDate: new Date(disposalDate),
      },
    });

    res.json({ status: 'success', data: disposal });
  } catch (error) {
    console.error('createDisposal error', error);
    res.status(500).json({ status: 'error', message: 'Failed to create disposal' });
  }
};

const updateDisposal = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.disposalValue) updateData.disposalValue = parseFloat(updateData.disposalValue);
    if (updateData.disposalDate) updateData.disposalDate = new Date(updateData.disposalDate);

    const disposal = await prisma.disposal.update({
      where: { id },
      data: updateData,
    });

    res.json({ status: 'success', data: disposal });
  } catch (error) {
    console.error('updateDisposal error', error);
    res.status(500).json({ status: 'error', message: 'Failed to update disposal' });
  }
};

// Users
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, plantId, departmentId, isActive } = req.body;

    const normalizedName = name?.trim();
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedRole = role?.toString().trim().toUpperCase();

    if (!normalizedName || !normalizedEmail || !password || !normalizedRole) {
      return res.status(400).json({ status: 'error', message: 'Name, email, password, and role are required' });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
    });

    if (existingUser) {
      return res.status(409).json({ status: 'error', message: 'User with this email already exists' });
    }

    const passwordHash = await bcryptjs.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        passwordHash,
        role: normalizedRole,
        plantId: plantId || null,
        departmentId: departmentId || null,
        isActive: isActive ?? true,
      },
    });

    res.json({ status: 'success', data: user });
  } catch (error) {
    console.error('createUser error', error);
    if (error?.code === 'P2002') {
      return res.status(409).json({ status: 'error', message: 'User with this email already exists' });
    }
    if (error?.code === 'P2003') {
      return res.status(400).json({ status: 'error', message: 'Invalid plant or department selection' });
    }
    res.status(500).json({ status: 'error', message: 'Failed to create user' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.email) {
      updateData.email = updateData.email.toString().trim().toLowerCase();
    }

    if (updateData.role) {
      updateData.role = updateData.role.toString().trim().toUpperCase();
    }

    if (updateData.password) {
      updateData.passwordHash = await bcryptjs.hash(updateData.password, 10);
    }
    delete updateData.password;

    if (updateData.plantId === '') updateData.plantId = null;
    if (updateData.departmentId === '') updateData.departmentId = null;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    res.json({ status: 'success', data: user });
  } catch (error) {
    console.error('updateUser error', error);
    if (error?.code === 'P2002') {
      return res.status(409).json({ status: 'error', message: 'User with this email already exists' });
    }
    if (error?.code === 'P2003') {
      return res.status(400).json({ status: 'error', message: 'Invalid plant or department selection' });
    }
    res.status(500).json({ status: 'error', message: 'Failed to update user' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    res.json({ status: 'success', message: 'User deleted' });
  } catch (error) {
    console.error('deleteUser error', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete user' });
  }
};

// Master Data
const createPlant = async (req, res) => {
  try {
    const { name, location } = req.body;
    const plant = await prisma.plant.create({ data: { name, location } });
    res.json({ status: 'success', data: plant });
  } catch (error) {
    console.error('createPlant error', error);
    res.status(500).json({ status: 'error', message: 'Failed to create plant' });
  }
};

const updatePlant = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const plant = await prisma.plant.update({ where: { id }, data: updateData });
    res.json({ status: 'success', data: plant });
  } catch (error) {
    console.error('updatePlant error', error);
    res.status(500).json({ status: 'error', message: 'Failed to update plant' });
  }
};

const deletePlant = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.plant.update({ where: { id }, data: { deletedAt: new Date() } });
    res.json({ status: 'success', message: 'Plant deleted' });
  } catch (error) {
    console.error('deletePlant error', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete plant' });
  }
};

const createDepartment = async (req, res) => {
  try {
    const { name, plantId } = req.body;
    const department = await prisma.department.create({ data: { name, plantId } });
    res.json({ status: 'success', data: department });
  } catch (error) {
    console.error('createDepartment error', error);
    res.status(500).json({ status: 'error', message: 'Failed to create department' });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const department = await prisma.department.update({ where: { id }, data: updateData });
    res.json({ status: 'success', data: department });
  } catch (error) {
    console.error('updateDepartment error', error);
    res.status(500).json({ status: 'error', message: 'Failed to update department' });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.department.update({ where: { id }, data: { deletedAt: new Date() } });
    res.json({ status: 'success', message: 'Department deleted' });
  } catch (error) {
    console.error('deleteDepartment error', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete department' });
  }
};

const createLocation = async (req, res) => {
  try {
    const { name, plantId } = req.body;
    const location = await prisma.location.create({ data: { name, plantId } });
    res.json({ status: 'success', data: location });
  } catch (error) {
    console.error('createLocation error', error);
    res.status(500).json({ status: 'error', message: 'Failed to create location' });
  }
};

const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const location = await prisma.location.update({ where: { id }, data: updateData });
    res.json({ status: 'success', data: location });
  } catch (error) {
    console.error('updateLocation error', error);
    res.status(500).json({ status: 'error', message: 'Failed to update location' });
  }
};

const deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.location.update({ where: { id }, data: { deletedAt: new Date() } });
    res.json({ status: 'success', message: 'Location deleted' });
  } catch (error) {
    console.error('deleteLocation error', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete location' });
  }
};

const createAssetCategory = async (req, res) => {
  try {
    const { name, code } = req.body;
    const category = await prisma.assetCategory.create({ data: { name, code } });
    res.json({ status: 'success', data: category });
  } catch (error) {
    console.error('createAssetCategory error', error);
    res.status(500).json({ status: 'error', message: 'Failed to create asset category' });
  }
};

const updateAssetCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const category = await prisma.assetCategory.update({ where: { id }, data: updateData });
    res.json({ status: 'success', data: category });
  } catch (error) {
    console.error('updateAssetCategory error', error);
    res.status(500).json({ status: 'error', message: 'Failed to update asset category' });
  }
};

const deleteAssetCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.assetCategory.update({ where: { id }, data: { deletedAt: new Date() } });
    res.json({ status: 'success', message: 'Asset category deleted' });
  } catch (error) {
    console.error('deleteAssetCategory error', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete asset category' });
  }
};

const createAssetStatus = async (req, res) => {
  try {
    const { name } = req.body;
    const status = await prisma.assetStatus.create({ data: { name } });
    res.json({ status: 'success', data: status });
  } catch (error) {
    console.error('createAssetStatus error', error);
    res.status(500).json({ status: 'error', message: 'Failed to create asset status' });
  }
};

const updateAssetStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const status = await prisma.assetStatus.update({ where: { id }, data: updateData });
    res.json({ status: 'success', data: status });
  } catch (error) {
    console.error('updateAssetStatus error', error);
    res.status(500).json({ status: 'error', message: 'Failed to update asset status' });
  }
};

const deleteAssetStatus = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.assetStatus.update({ where: { id }, data: { deletedAt: new Date() } });
    res.json({ status: 'success', message: 'Asset status deleted' });
  } catch (error) {
    console.error('deleteAssetStatus error', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete asset status' });
  }
};

const createVendor = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const vendor = await prisma.vendor.create({ data: { name, email, phone } });
    res.json({ status: 'success', data: vendor });
  } catch (error) {
    console.error('createVendor error', error);
    res.status(500).json({ status: 'error', message: 'Failed to create vendor' });
  }
};

const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const vendor = await prisma.vendor.update({ where: { id }, data: updateData });
    res.json({ status: 'success', data: vendor });
  } catch (error) {
    console.error('updateVendor error', error);
    res.status(500).json({ status: 'error', message: 'Failed to update vendor' });
  }
};

const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.vendor.update({ where: { id }, data: { deletedAt: new Date() } });
    res.json({ status: 'success', message: 'Vendor deleted' });
  } catch (error) {
    console.error('deleteVendor error', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete vendor' });
  }
};

const createCustodian = async (req, res) => {
  try {
    const { name, email, phone, plantId, departmentId } = req.body;

    const normalizedName = name?.trim();
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedName || !normalizedEmail || !plantId || !departmentId) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, email, plant, and department are required',
      });
    }

    const department = await prisma.department.findFirst({
      where: {
        id: departmentId,
        plantId,
        deletedAt: null,
      },
    });

    if (!department) {
      return res.status(400).json({
        status: 'error',
        message: 'Selected department does not belong to the selected plant',
      });
    }

    const custodian = await prisma.custodian.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        phone: phone?.trim() || null,
        plantId,
        departmentId,
      },
    });

    res.json({ status: 'success', data: custodian });
  } catch (error) {
    console.error('createCustodian error', error);
    if (error?.code === 'P2003') {
      return res.status(400).json({ status: 'error', message: 'Invalid plant or department selection' });
    }
    res.status(500).json({ status: 'error', message: 'Failed to create custodian' });
  }
};

const updateCustodian = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.name) updateData.name = updateData.name.toString().trim();
    if (updateData.email) updateData.email = updateData.email.toString().trim().toLowerCase();
    if (updateData.phone !== undefined) updateData.phone = updateData.phone?.toString().trim() || null;

    if (updateData.plantId || updateData.departmentId) {
      const current = await prisma.custodian.findUnique({ where: { id } });
      if (!current) {
        return res.status(404).json({ status: 'error', message: 'Custodian not found' });
      }

      const nextPlantId = updateData.plantId || current.plantId;
      const nextDepartmentId = updateData.departmentId || current.departmentId;

      const department = await prisma.department.findFirst({
        where: {
          id: nextDepartmentId,
          plantId: nextPlantId,
          deletedAt: null,
        },
      });

      if (!department) {
        return res.status(400).json({
          status: 'error',
          message: 'Selected department does not belong to the selected plant',
        });
      }
    }

    const custodian = await prisma.custodian.update({
      where: { id },
      data: updateData,
    });

    res.json({ status: 'success', data: custodian });
  } catch (error) {
    console.error('updateCustodian error', error);
    if (error?.code === 'P2003') {
      return res.status(400).json({ status: 'error', message: 'Invalid plant or department selection' });
    }
    res.status(500).json({ status: 'error', message: 'Failed to update custodian' });
  }
};

const deleteCustodian = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.custodian.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    res.json({ status: 'success', message: 'Custodian deleted' });
  } catch (error) {
    console.error('deleteCustodian error', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete custodian' });
  }
};

module.exports = {
  getAllData,
  getAssetDetail,
  getTransferDetail,
  createAsset,
  updateAsset,
  deleteAsset,
  createTransfer,
  approveTransferRequest,
  rejectTransferRequest,
  updateTransfer,
  deleteTransfer,
  createMaintenanceSchedule,
  updateMaintenanceSchedule,
  deleteMaintenanceSchedule,
  createMaintenanceLog,
  createDisposal,
  updateDisposal,
  createUser,
  updateUser,
  deleteUser,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  createPlant,
  updatePlant,
  deletePlant,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  createLocation,
  updateLocation,
  deleteLocation,
  createAssetCategory,
  updateAssetCategory,
  deleteAssetCategory,
  createAssetStatus,
  updateAssetStatus,
  deleteAssetStatus,
  createVendor,
  updateVendor,
  deleteVendor,
  createCustodian,
  updateCustodian,
  deleteCustodian,
};
