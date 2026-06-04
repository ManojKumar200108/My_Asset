import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAppData } from '../hooks/useAppData';
import { api } from '../contexts/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import { Field, SelectInput, TextArea, TextInput } from '../components/ui/FormFields';
import { ErrorState, LoadingState } from '../components/ui/StateViews';

const emptyForm = {
  assetId: '',
  assetName: '',
  assetCode: '',
  serialNumber: '',
  modelNumber: '',
  brand: '',
  categoryId: '',
  subCategory: '',
  description: '',
  plantId: '',
  locationId: '',
  departmentId: '',
  custodianId: '',
  purchaseDate: '',
  purchaseCost: '',
  vendorId: '',
  invoiceNumber: '',
  warrantyExpiryDate: '',
  insurancePolicyNumber: '',
  insuranceExpiry: '',
  usefulLifeYears: '',
  depreciationMethod: 'SLM',
  salvageValue: '',
  remarks: '',
};

export default function AddAssetPage() {
  const { id } = useParams();
  const editMode = Boolean(id);
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useAppData();

  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(editMode);

  useEffect(() => {
    if (!editMode) return;

    const loadAsset = async () => {
      try {
        const response = await api.get(`/data/assets/${id}`);
        const asset = response.data.data;
        setFormData({
          ...emptyForm,
          ...asset,
          assetId: asset.assetId || '',
          purchaseDate: asset.purchaseDate?.slice(0, 10) || '',
          warrantyExpiryDate: asset.warrantyExpiryDate?.slice(0, 10) || '',
          insuranceExpiry: asset.insuranceExpiry?.slice(0, 10) || '',
          purchaseCost: asset.purchaseCost || '',
          usefulLifeYears: asset.usefulLifeYears || '',
          salvageValue: asset.salvageValue || '',
        });
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load asset');
      } finally {
        setDetailLoading(false);
      }
    };

    loadAsset();
  }, [id, editMode]);

  const settings = data?.settings || {};
  const filteredLocations = useMemo(
    () => (settings.locations || []).filter((item) => !formData.plantId || item.plantId === formData.plantId),
    [settings.locations, formData.plantId]
  );
  const filteredDepartments = useMemo(
    () => (settings.departments || []).filter((item) => !formData.plantId || item.plantId === formData.plantId),
    [settings.departments, formData.plantId]
  );
  const filteredCustodians = useMemo(
    () => (settings.custodians || []).filter((item) => !formData.plantId || item.plantId === formData.plantId),
    [settings.custodians, formData.plantId]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => {
      if (name === 'plantId') {
        return { ...prev, plantId: value, locationId: '', departmentId: '', custodianId: '' };
      }
      return { ...prev, [name]: value };
    });
    setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errors = {};
    if (!formData.assetId.trim()) errors.assetId = 'Asset ID is required';
    if (!formData.assetName.trim()) errors.assetName = 'Asset name is required';
    if (!formData.categoryId) errors.categoryId = 'Category is required';
    if (!formData.plantId) errors.plantId = 'Plant is required';
    if (!formData.locationId) errors.locationId = 'Location is required';
    if (!formData.departmentId) errors.departmentId = 'Department is required';
    if (!formData.custodianId) errors.custodianId = 'Custodian is required';
    if (formData.purchaseCost && Number(formData.purchaseCost) < 0) errors.purchaseCost = 'Purchase cost cannot be negative';
    if (formData.salvageValue && Number(formData.salvageValue) < 0) errors.salvageValue = 'Salvage value cannot be negative';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (editMode) {
        await api.put(`/data/assets/${id}`, formData);
        toast.success('Asset updated successfully');
      } else {
        await api.post('/data/assets', formData);
        toast.success('Asset created successfully');
      }
      await refresh();
      navigate('/assets');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save asset');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || detailLoading) return <LoadingState message="Loading asset form..." />;
  if (error) return <ErrorState message={error} action={<button className="btn" onClick={refresh}>Retry</button>} />;

  return (
    <div>
      <PageHeader
        title={editMode ? 'Edit Asset' : 'Add Asset'}
        subtitle={editMode ? 'Update asset details and assignments.' : 'Create a new asset in the registry.'}
      />

      <form onSubmit={handleSubmit}>
        <section className="card" style={{ marginBottom: 12 }}>
          <div className="card-header"><h2 className="card-title">Basic Information</h2></div>
          <div className="form-grid-3">
            <Field label="Asset ID" required error={formErrors.assetId} htmlFor="assetId">
              <TextInput id="assetId" name="assetId" value={formData.assetId} onChange={handleChange} />
            </Field>
            <Field label="Asset Name" required error={formErrors.assetName} htmlFor="assetName">
              <TextInput id="assetName" name="assetName" value={formData.assetName} onChange={handleChange} />
            </Field>
            <Field label="Asset Code" htmlFor="assetCode">
              <TextInput id="assetCode" name="assetCode" value={formData.assetCode} onChange={handleChange} />
            </Field>
            <Field label="Category" required error={formErrors.categoryId} htmlFor="categoryId">
              <SelectInput id="categoryId" name="categoryId" value={formData.categoryId} onChange={handleChange}>
                <option value="">Select category</option>
                {(settings.categories || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Sub Category" htmlFor="subCategory">
              <TextInput id="subCategory" name="subCategory" value={formData.subCategory} onChange={handleChange} />
            </Field>
            <Field label="Serial Number" htmlFor="serialNumber">
              <TextInput id="serialNumber" name="serialNumber" value={formData.serialNumber} onChange={handleChange} />
            </Field>
            <Field label="Model Number" htmlFor="modelNumber">
              <TextInput id="modelNumber" name="modelNumber" value={formData.modelNumber} onChange={handleChange} />
            </Field>
            <Field label="Brand" htmlFor="brand">
              <TextInput id="brand" name="brand" value={formData.brand} onChange={handleChange} />
            </Field>
            <Field label="Description" htmlFor="description">
              <TextArea id="description" name="description" rows={3} value={formData.description} onChange={handleChange} />
            </Field>
          </div>
        </section>

        <section className="card" style={{ marginBottom: 12 }}>
          <div className="card-header"><h2 className="card-title">Location and Assignment</h2></div>
          <div className="form-grid-4">
            <Field label="Plant" required error={formErrors.plantId} htmlFor="plantId">
              <SelectInput id="plantId" name="plantId" value={formData.plantId} onChange={handleChange}>
                <option value="">Select plant</option>
                {(settings.plants || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Location" required error={formErrors.locationId} htmlFor="locationId">
              <SelectInput id="locationId" name="locationId" value={formData.locationId} onChange={handleChange} disabled={!formData.plantId}>
                <option value="">Select location</option>
                {filteredLocations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Department" required error={formErrors.departmentId} htmlFor="departmentId">
              <SelectInput id="departmentId" name="departmentId" value={formData.departmentId} onChange={handleChange} disabled={!formData.plantId}>
                <option value="">Select department</option>
                {filteredDepartments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Custodian" required error={formErrors.custodianId} htmlFor="custodianId">
              <SelectInput id="custodianId" name="custodianId" value={formData.custodianId} onChange={handleChange} disabled={!formData.plantId}>
                <option value="">Select custodian</option>
                {filteredCustodians.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </SelectInput>
            </Field>
          </div>
        </section>

        <section className="card" style={{ marginBottom: 12 }}>
          <div className="card-header"><h2 className="card-title">Financial and Warranty</h2></div>
          <div className="form-grid-4">
            <Field label="Purchase Date" htmlFor="purchaseDate">
              <TextInput id="purchaseDate" name="purchaseDate" type="date" value={formData.purchaseDate} onChange={handleChange} />
            </Field>
            <Field label="Purchase Cost" error={formErrors.purchaseCost} htmlFor="purchaseCost">
              <TextInput id="purchaseCost" name="purchaseCost" type="number" min="0" step="0.01" value={formData.purchaseCost} onChange={handleChange} />
            </Field>
            <Field label="Vendor" htmlFor="vendorId">
              <SelectInput id="vendorId" name="vendorId" value={formData.vendorId} onChange={handleChange}>
                <option value="">Select vendor</option>
                {(settings.vendors || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Invoice Number" htmlFor="invoiceNumber">
              <TextInput id="invoiceNumber" name="invoiceNumber" value={formData.invoiceNumber} onChange={handleChange} />
            </Field>
            <Field label="Useful Life (Years)" htmlFor="usefulLifeYears">
              <TextInput id="usefulLifeYears" name="usefulLifeYears" type="number" min="0" value={formData.usefulLifeYears} onChange={handleChange} />
            </Field>
            <Field label="Depreciation Method" htmlFor="depreciationMethod">
              <SelectInput id="depreciationMethod" name="depreciationMethod" value={formData.depreciationMethod} onChange={handleChange}>
                <option value="SLM">Straight Line (SLM)</option>
                <option value="WDV">Written Down Value (WDV)</option>
              </SelectInput>
            </Field>
            <Field label="Salvage Value" error={formErrors.salvageValue} htmlFor="salvageValue">
              <TextInput id="salvageValue" name="salvageValue" type="number" min="0" step="0.01" value={formData.salvageValue} onChange={handleChange} />
            </Field>
            <Field label="Warranty Expiry" htmlFor="warrantyExpiryDate">
              <TextInput id="warrantyExpiryDate" name="warrantyExpiryDate" type="date" value={formData.warrantyExpiryDate} onChange={handleChange} />
            </Field>
            <Field label="Insurance Policy" htmlFor="insurancePolicyNumber">
              <TextInput id="insurancePolicyNumber" name="insurancePolicyNumber" value={formData.insurancePolicyNumber} onChange={handleChange} />
            </Field>
            <Field label="Insurance Expiry" htmlFor="insuranceExpiry">
              <TextInput id="insuranceExpiry" name="insuranceExpiry" type="date" value={formData.insuranceExpiry} onChange={handleChange} />
            </Field>
            <Field label="Remarks" htmlFor="remarks">
              <TextArea id="remarks" name="remarks" rows={3} value={formData.remarks} onChange={handleChange} />
            </Field>
          </div>
        </section>

        <div className="page-actions" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={() => navigate('/assets')} disabled={submitting}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : editMode ? 'Update Asset' : 'Create Asset'}
          </button>
        </div>
      </form>
    </div>
  );
}
