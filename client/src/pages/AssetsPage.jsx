import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useAppData } from '../hooks/useAppData';
import { api } from '../contexts/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import RowActions from '../components/ui/RowActions';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Dialog from '../components/ui/Dialog';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StateViews';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function AssetsPage() {
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useAppData();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [bulkReport, setBulkReport] = useState(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const assets = data?.assets || [];
  const filtered = (() => {
    const query = search.trim().toLowerCase();
    if (!query) return assets;
    return assets.filter(
      (item) =>
        item.assetName?.toLowerCase().includes(query) ||
        item.assetId?.toLowerCase().includes(query) ||
        item.location?.toLowerCase().includes(query)
    );
  })();

  const downloadAssets = (format) => {
    const exportRows = filtered.map((asset) => ({
      assetId: asset.assetId,
      assetName: asset.assetName,
      assetCode: asset.assetCode || '',
      serialNumber: asset.serialNumber || '',
      modelNumber: asset.modelNumber || '',
      brand: asset.brand || '',
      categoryId: asset.categoryId || '',
      subCategory: asset.subCategory || '',
      description: asset.description || '',
      plantId: asset.plantId || '',
      locationId: asset.locationId || '',
      departmentId: asset.departmentId || '',
      custodianId: asset.custodianId || '',
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.slice(0, 10) : '',
      purchaseCost: asset.purchaseCost ?? '',
      vendorId: asset.vendorId || '',
      invoiceNumber: asset.invoiceNumber || '',
      warrantyExpiryDate: asset.warrantyExpiryDate ? asset.warrantyExpiryDate.slice(0, 10) : '',
      statusId: asset.statusId || '',
      remarks: asset.remarks || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets');
    const fileName = `assets-${new Date().toISOString().slice(0, 10)}.${format}`;
    XLSX.writeFile(workbook, fileName, { bookType: format });
  };

  const downloadTemplate = () => {
    const sample = [
      {
        assetId: 'ASSET-001',
        assetName: 'Generator Unit',
        assetCode: 'GEN-100',
        serialNumber: 'SN12345',
        modelNumber: 'G-500',
        brand: 'PowerLine',
        categoryId: 'CATEGORY_ID',
        subCategory: 'Electrical',
        description: 'Primary site generator',
        plantId: 'PLANT_ID',
        locationId: 'LOCATION_ID',
        departmentId: 'DEPARTMENT_ID',
        custodianId: 'CUSTODIAN_ID',
        purchaseDate: '2026-01-15',
        purchaseCost: 120000,
        vendorId: 'VENDOR_ID',
        invoiceNumber: 'INV-789',
        warrantyExpiryDate: '2029-01-15',
        statusId: 'STATUS_ID',
        remarks: 'Sample import template',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sample);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'asset-import-template.xlsx');
  };

  const handleBulkUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleBulkFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = null;
    if (!file) return;

    setBulkProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      if (!rows.length) {
        toast.error('No rows found in the uploaded file');
        setBulkProcessing(false);
        return;
      }

      const normalizeKey = (key) => key?.toString().trim().toLowerCase().replace(/[_\s]+/g, '') || '';
      const normalizeRow = (row) => Object.entries(row).reduce((acc, [key, value]) => {
        acc[normalizeKey(key)] = value;
        return acc;
      }, {});

      const requiredFields = ['assetId', 'assetName', 'categoryId', 'plantId', 'locationId', 'departmentId', 'custodianId', 'statusId'];
      const existingIds = new Set(assets.map((asset) => asset.assetId?.toString().trim().toUpperCase()));
      const seenIds = new Set();
      const reportRows = [];
      const importRows = [];

      rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const normalized = normalizeRow(row);
        const record = {
          assetId: normalized.assetid?.toString().trim() || '',
          assetName: normalized.assetname?.toString().trim() || '',
          assetCode: normalized.assetcode?.toString().trim() || '',
          serialNumber: normalized.serialnumber?.toString().trim() || '',
          modelNumber: normalized.modelnumber?.toString().trim() || '',
          brand: normalized.brand?.toString().trim() || '',
          categoryId: normalized.categoryid?.toString().trim() || '',
          subCategory: normalized.subcategory?.toString().trim() || '',
          description: normalized.description?.toString().trim() || '',
          plantId: normalized.plantid?.toString().trim() || '',
          locationId: normalized.locationid?.toString().trim() || '',
          departmentId: normalized.departmentid?.toString().trim() || '',
          custodianId: normalized.custodianid?.toString().trim() || '',
          purchaseDate: normalized.purchasedate?.toString().trim() || '',
          purchaseCost: normalized.purchasecost !== undefined && normalized.purchasecost !== null ? normalized.purchasecost : '',
          vendorId: normalized.vendorid?.toString().trim() || '',
          invoiceNumber: normalized.invoicenumber?.toString().trim() || '',
          warrantyExpiryDate: normalized.warrantyexpirydate?.toString().trim() || '',
          statusId: normalized.statusid?.toString().trim() || '',
          remarks: normalized.remarks?.toString().trim() || '',
        };

        const missingFields = requiredFields.filter((field) => !record[field]);
        if (missingFields.length) {
          reportRows.push({
            row: rowNumber,
            assetId: record.assetId,
            assetName: record.assetName,
            status: 'Failed',
            error: `Missing required fields: ${missingFields.join(', ')}`,
          });
          return;
        }

        if (existingIds.has(record.assetId.toUpperCase())) {
          reportRows.push({
            row: rowNumber,
            assetId: record.assetId,
            assetName: record.assetName,
            status: 'Failed',
            error: 'Asset ID already exists in the system',
          });
          return;
        }

        if (seenIds.has(record.assetId.toUpperCase())) {
          reportRows.push({
            row: rowNumber,
            assetId: record.assetId,
            assetName: record.assetName,
            status: 'Failed',
            error: 'Duplicate Asset ID in upload file',
          });
          return;
        }

        seenIds.add(record.assetId.toUpperCase());
        importRows.push({ record, row: rowNumber });
      });

      const results = [];
      const batchSize = 50;
      for (let batchStart = 0; batchStart < importRows.length; batchStart += batchSize) {
        const batch = importRows.slice(batchStart, batchStart + batchSize);
        const batchResults = await Promise.all(batch.map(({ record, row }) =>
          api.post('/data/assets', record)
            .then(() => ({ row, assetId: record.assetId, assetName: record.assetName, status: 'Success', error: 'Imported' }))
            .catch((err) => ({
              row,
              assetId: record.assetId,
              assetName: record.assetName,
              status: 'Failed',
              error: err.response?.data?.message || err.message || 'Failed to create asset',
            }))
        ));
        results.push(...batchResults);
      }

      const report = [...reportRows, ...results].sort((a, b) => a.row - b.row);
      const successCount = report.filter((item) => item.status === 'Success').length;
      const failedCount = report.filter((item) => item.status === 'Failed').length;

      setBulkReport({
        fileName: file.name,
        totalRows: rows.length,
        successCount,
        failedCount,
        rows: report,
      });

      if (successCount > 0) await refresh();
    } catch (err) {
      console.error('Bulk asset upload failed', err);
      toast.error('Failed to read the uploaded file');
    } finally {
      setBulkProcessing(false);
    }
  };

  const downloadBulkErrorReport = () => {
    if (!bulkReport?.rows?.length) return;
    const worksheet = XLSX.utils.json_to_sheet(bulkReport.rows.map((item) => ({
      Row: item.row,
      AssetID: item.assetId,
      AssetName: item.assetName,
      Status: item.status,
      Error: item.error,
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BulkUploadReport');
    XLSX.writeFile(workbook, `bulk-upload-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const closeBulkReport = () => {
    setBulkReport(null);
  };

  const onDelete = async () => {
    if (!deleteTarget) return;

    setBusy(true);
    try {
      await api.delete(`/data/assets/${deleteTarget.id}`);
      toast.success(`Deleted ${deleteTarget.assetName}`);
      setDeleteTarget(null);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete asset');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState message="Loading assets..." />;
  if (error) return <ErrorState message={error} action={<button className="btn" onClick={refresh}>Retry</button>} />;

  return (
    <div>
      <PageHeader
        title="Asset Registry"
        subtitle={`${assets.length} assets available`}
        actions={(
          <div className="button-group" style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/assets/new" className="btn btn-primary">Add Asset</Link>
            <button type="button" className="btn" onClick={handleBulkUploadClick} disabled={bulkProcessing}>
              {bulkProcessing ? 'Uploading…' : 'Bulk Upload'}
            </button>
            <button type="button" className="btn" onClick={() => downloadAssets('xlsx')}>Download Excel</button>
            <button type="button" className="btn" onClick={() => downloadAssets('csv')}>Download CSV</button>
            <button type="button" className="btn" onClick={downloadTemplate}>Download Template</button>
          </div>
        )}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={handleBulkFile}
      />

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="filter-bar">
          <label className="form-field" style={{ width: 'min(480px, 100%)' }}>
            <span className="form-label">Search Assets</span>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-subtle)' }} />
              <input
                className="form-control"
                style={{ paddingLeft: 34 }}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, ID, or location"
                aria-label="Search assets"
              />
            </div>
          </label>
          <button type="button" className="btn" onClick={refresh}>
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {filtered.length ? (
        <DataTable
          caption="Asset registry list"
          headers={['Asset ID', 'Name', 'Category', 'Plant', 'Location', 'Department', 'Status', 'Book Value', 'Purchase Date', 'Actions']}
        >
          {filtered.map((asset) => (
            <tr key={asset.id}>
              <td className="col-id">
                <Link to={`/assets/${asset.id}`}>{asset.assetId}</Link>
              </td>
              <td className="col-primary">{asset.assetName}</td>
              <td>{asset.category}</td>
              <td>{asset.plant}</td>
              <td>{asset.location}</td>
              <td>{asset.department}</td>
              <td>{asset.status}</td>
              <td>{formatCurrency(asset.currentBookValue)}</td>
              <td>{formatDate(asset.purchaseDate)}</td>
              <td>
                <RowActions
                  onEdit={() => navigate(`/assets/${asset.id}`)}
                  onDelete={() => setDeleteTarget(asset)}
                />
              </td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState title="No assets found" message="Try another search, or add a new asset." />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Asset"
        description={`This will delete ${deleteTarget?.assetName || 'this asset'} from active records. This action cannot be undone.`}
        confirmText="Delete Asset"
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={onDelete}
      />

      <Dialog
        open={Boolean(bulkReport)}
        onClose={closeBulkReport}
        title="Bulk Upload Results"
        labelledBy="bulk-upload-report-title"
        footer={(
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn" onClick={downloadBulkErrorReport} disabled={!bulkReport?.rows?.length || bulkProcessing}>
              Download Error Report
            </button>
            <button type="button" className="btn btn-primary" onClick={closeBulkReport} disabled={bulkProcessing}>
              Close
            </button>
          </div>
        )}
      >
        {bulkReport && (
          <>
            <p>{`File: ${bulkReport.fileName}`}</p>
            <p>{`Total rows: ${bulkReport.totalRows}`}</p>
            <p>{`Imported successfully: ${bulkReport.successCount}`}</p>
            <p>{`Failed rows: ${bulkReport.failedCount}`}</p>
            <div className="table-wrap" style={{ maxHeight: 360, overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Row Number</th>
                    <th>Asset ID</th>
                    <th>Asset Name</th>
                    <th>Status</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkReport.rows.map((item) => (
                    <tr key={`bulk-report-${item.row}-${item.assetId}`}>
                      <td>{item.row}</td>
                      <td>{item.assetId || '-'}</td>
                      <td>{item.assetName || '-'}</td>
                      <td>{item.status}</td>
                      <td>{item.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}
