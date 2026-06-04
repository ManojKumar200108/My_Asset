import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAppData } from '../hooks/useAppData';
import { api } from '../contexts/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import { Field, SelectInput, TextArea, TextInput } from '../components/ui/FormFields';
import { ErrorState, LoadingState } from '../components/ui/StateViews';

const initialForm = {
  assetId: '',
  transferType: 'RETURNABLE',
  fromLocationId: '',
  toLocationId: '',
  fromDepartmentId: '',
  toDepartmentId: '',
  fromPlantId: '',
  toPlantId: '',
  expectedReturnDate: '',
  purpose: '',
  remarks: '',
};

export default function NewTransferPage() {
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useAppData();
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const assets = data?.assets || [];
  const settings = data?.settings || {};

  const selectedAsset = assets.find((item) => item.id === formData.assetId);

  const destinationLocations = (settings.locations || []).filter(
    (item) => !formData.toPlantId || item.plantId === formData.toPlantId
  );

  const destinationDepartments = (settings.departments || []).filter(
    (item) => !formData.toPlantId || item.plantId === formData.toPlantId
  );

  const resolveSourceFields = (asset) => {
    if (!asset) {
      return {
        fromPlantId: '',
        fromLocationId: '',
        fromDepartmentId: '',
      };
    }

    const plantId =
      asset.plantId ||
      (settings.plants || []).find((item) => item.name === asset.plant)?.id ||
      '';

    const locationId =
      asset.locationId ||
      (settings.locations || []).find((item) => item.name === asset.location && (!plantId || item.plantId === plantId))?.id ||
      '';

    const departmentId =
      asset.departmentId ||
      (settings.departments || []).find((item) => item.name === asset.department && (!plantId || item.plantId === plantId))?.id ||
      '';

    return {
      fromPlantId: plantId,
      fromLocationId: locationId,
      fromDepartmentId: departmentId,
    };
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      if (name === 'assetId') {
        const asset = assets.find((entry) => entry.id === value);
        const source = resolveSourceFields(asset);
        next.fromLocationId = source.fromLocationId;
        next.fromDepartmentId = source.fromDepartmentId;
        next.fromPlantId = source.fromPlantId;
      }

      if (name === 'toPlantId') {
        next.toLocationId = '';
        next.toDepartmentId = '';
      }

      return next;
    });
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const nextErrors = {};
    const source = resolveSourceFields(selectedAsset);

    if (!formData.fromPlantId && source.fromPlantId) {
      setFormData((prev) => ({
        ...prev,
        fromPlantId: source.fromPlantId,
        fromLocationId: prev.fromLocationId || source.fromLocationId,
        fromDepartmentId: prev.fromDepartmentId || source.fromDepartmentId,
      }));
    }

    if (!formData.assetId) nextErrors.assetId = 'Asset is required';
    if (!formData.transferType) nextErrors.transferType = 'Transfer type is required';
    if (!(formData.fromPlantId || source.fromPlantId)) nextErrors.assetId = 'Selected asset is missing source plant details';
    if (!(formData.fromLocationId || source.fromLocationId)) nextErrors.assetId = 'Selected asset is missing source location details';
    if (!formData.toPlantId) nextErrors.toPlantId = 'Destination plant is required';
    if (!formData.toLocationId) nextErrors.toLocationId = 'Destination location is required';
    if (!formData.toDepartmentId) nextErrors.toDepartmentId = 'Destination department is required';
    if (formData.transferType === 'RETURNABLE' && !formData.expectedReturnDate) {
      nextErrors.expectedReturnDate = 'Expected return date is required for returnable transfers';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const source = resolveSourceFields(selectedAsset);
      const payload = {
        ...formData,
        fromLocationId: formData.fromLocationId || source.fromLocationId || null,
        fromDepartmentId: formData.fromDepartmentId || source.fromDepartmentId || null,
        fromPlantId: formData.fromPlantId || source.fromPlantId || null,
        toDepartmentId: formData.toDepartmentId || null,
        toPlantId: formData.toPlantId || null,
        expectedReturnDate: formData.transferType === 'RETURNABLE' ? formData.expectedReturnDate : null,
      };

      await api.post('/data/transfers', payload);
      toast.success('Transfer request submitted for approval');
      await refresh();
      navigate('/transfers');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create transfer');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState message="Loading transfer form..." />;
  if (error) return <ErrorState message={error} action={<button className="btn" onClick={refresh}>Retry</button>} />;

  return (
    <div>
      <PageHeader title="Initiate Transfer" subtitle="Move assets between plants, locations, and departments." />

      <form onSubmit={handleSubmit}>
        <section className="card" style={{ marginBottom: 12 }}>
          <div className="card-header"><h2 className="card-title">Asset Selection</h2></div>
          <div className="form-grid-2">
            <Field label="Asset" required error={errors.assetId} htmlFor="assetId">
              <SelectInput id="assetId" name="assetId" value={formData.assetId} onChange={handleChange}>
                <option value="">Select asset</option>
                {assets.map((item) => (
                  <option key={item.id} value={item.id}>{item.assetName} ({item.assetId})</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Transfer Type" required error={errors.transferType} htmlFor="transferType">
              <SelectInput id="transferType" name="transferType" value={formData.transferType} onChange={handleChange}>
                <option value="RETURNABLE">Returnable</option>
                <option value="NON_RETURNABLE">Non-returnable</option>
              </SelectInput>
            </Field>
          </div>
          {selectedAsset ? (
            <div className="alert-banner" style={{ marginTop: 10 }}>
              Current placement: {selectedAsset.plant} / {selectedAsset.location} / {selectedAsset.department}
            </div>
          ) : null}
        </section>

        <section className="card" style={{ marginBottom: 12 }}>
          <div className="card-header"><h2 className="card-title">Destination</h2></div>
          <div className="form-grid-4">
            <Field label="To Plant" required error={errors.toPlantId} htmlFor="toPlantId">
              <SelectInput id="toPlantId" name="toPlantId" value={formData.toPlantId} onChange={handleChange}>
                <option value="">Select plant</option>
                {(settings.plants || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="To Location" required error={errors.toLocationId} htmlFor="toLocationId">
              <SelectInput id="toLocationId" name="toLocationId" value={formData.toLocationId} onChange={handleChange} disabled={!formData.toPlantId}>
                <option value="">Select location</option>
                {destinationLocations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="To Department" required error={errors.toDepartmentId} htmlFor="toDepartmentId">
              <SelectInput id="toDepartmentId" name="toDepartmentId" value={formData.toDepartmentId} onChange={handleChange} disabled={!formData.toPlantId}>
                <option value="">Select department</option>
                {destinationDepartments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </SelectInput>
            </Field>
            {formData.transferType === 'RETURNABLE' ? (
              <Field label="Expected Return Date" required error={errors.expectedReturnDate} htmlFor="expectedReturnDate">
                <TextInput id="expectedReturnDate" name="expectedReturnDate" type="date" value={formData.expectedReturnDate} onChange={handleChange} />
              </Field>
            ) : null}
          </div>
        </section>

        <section className="card" style={{ marginBottom: 12 }}>
          <div className="card-header"><h2 className="card-title">Purpose and Notes</h2></div>
          <div className="form-grid-2">
            <Field label="Purpose" htmlFor="purpose">
              <TextArea id="purpose" name="purpose" rows={3} value={formData.purpose} onChange={handleChange} placeholder="Reason for transfer" />
            </Field>
            <Field label="Remarks" htmlFor="remarks">
              <TextArea id="remarks" name="remarks" rows={3} value={formData.remarks} onChange={handleChange} placeholder="Additional notes" />
            </Field>
          </div>
        </section>

        <div className="page-actions" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={() => navigate('/transfers')} disabled={submitting}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Submitting...' : 'Initiate Transfer'}</button>
        </div>
      </form>
    </div>
  );
}
