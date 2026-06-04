const express = require('express');
const authMiddleware = require('../middleware/auth');
const rbacMiddleware = require('../middleware/rbac');
const dataController = require('../controllers/dataController');

const router = express.Router();

router.use(authMiddleware);
router.get('/all', dataController.getAllData);
router.get('/assets/:id', dataController.getAssetDetail);
router.get('/transfers/:id', dataController.getTransferDetail);

// CRUD for Assets
router.post('/assets', dataController.createAsset);
router.put('/assets/:id', dataController.updateAsset);
router.delete('/assets/:id', dataController.deleteAsset);

// CRUD for Transfers
router.post('/transfers', dataController.createTransfer);
router.post('/transfers/:id/approve', rbacMiddleware('ADMIN', 'MANAGER'), dataController.approveTransferRequest);
router.post('/transfers/:id/reject', rbacMiddleware('ADMIN', 'MANAGER'), dataController.rejectTransferRequest);
router.put('/transfers/:id', rbacMiddleware('ADMIN', 'MANAGER'), dataController.updateTransfer);
router.delete('/transfers/:id', rbacMiddleware('ADMIN', 'MANAGER'), dataController.deleteTransfer);

// CRUD for Maintenance
router.post('/maintenance/schedules', dataController.createMaintenanceSchedule);
router.put('/maintenance/schedules/:id', dataController.updateMaintenanceSchedule);
router.delete('/maintenance/schedules/:id', dataController.deleteMaintenanceSchedule);
router.post('/maintenance/logs', dataController.createMaintenanceLog);

// CRUD for Disposals
router.post('/disposals', dataController.createDisposal);
router.put('/disposals/:id', dataController.updateDisposal);

// CRUD for Users
router.post('/users', rbacMiddleware('ADMIN'), dataController.createUser);
router.put('/users/:id', rbacMiddleware('ADMIN'), dataController.updateUser);
router.delete('/users/:id', rbacMiddleware('ADMIN'), dataController.deleteUser);

// CRUD for Roles
router.get('/roles', rbacMiddleware('ADMIN'), dataController.getRoles);
router.post('/roles', rbacMiddleware('ADMIN'), dataController.createRole);
router.put('/roles/:id', rbacMiddleware('ADMIN'), dataController.updateRole);
router.delete('/roles/:id', rbacMiddleware('ADMIN'), dataController.deleteRole);

// CRUD for Master Data
router.post('/plants', dataController.createPlant);
router.put('/plants/:id', dataController.updatePlant);
router.delete('/plants/:id', dataController.deletePlant);

router.post('/departments', dataController.createDepartment);
router.put('/departments/:id', dataController.updateDepartment);
router.delete('/departments/:id', dataController.deleteDepartment);

router.post('/locations', dataController.createLocation);
router.put('/locations/:id', dataController.updateLocation);
router.delete('/locations/:id', dataController.deleteLocation);

router.post('/categories', dataController.createAssetCategory);
router.put('/categories/:id', dataController.updateAssetCategory);
router.delete('/categories/:id', dataController.deleteAssetCategory);

router.post('/statuses', dataController.createAssetStatus);
router.put('/statuses/:id', dataController.updateAssetStatus);
router.delete('/statuses/:id', dataController.deleteAssetStatus);

router.post('/vendors', dataController.createVendor);
router.put('/vendors/:id', dataController.updateVendor);
router.delete('/vendors/:id', dataController.deleteVendor);

router.post('/custodians', dataController.createCustodian);
router.put('/custodians/:id', dataController.updateCustodian);
router.delete('/custodians/:id', dataController.deleteCustodian);

module.exports = router;
