import React from 'react';
import { useAppData } from '../hooks/useAppData';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StateViews';
import { formatCurrency } from '../utils/formatters';

export default function ReportsPage() {
  const { data, loading, error, refresh } = useAppData();
  const depreciation = data?.reports?.depreciation || [];
  const locationSummary = data?.reports?.locationSummary || [];

  if (loading) return <LoadingState message="Loading reports..." />;
  if (error) return <ErrorState message={error} action={<button className="btn" onClick={refresh}>Retry</button>} />;

  return (
    <div>
      <PageHeader title="Reports" subtitle="Financial and location-based insights across all assets." />

      <section className="card" style={{ marginBottom: 12 }}>
        <div className="card-header"><h2 className="card-title">Depreciation Report</h2></div>
        {depreciation.length ? (
          <DataTable
            caption="Depreciation report"
            headers={['Asset ID', 'Name', 'Method', 'Purchase Cost', 'Book Value', 'Useful Life (Years)']}
          >
            {depreciation.map((item) => (
              <tr key={item.assetId}>
                <td className="col-id">{item.assetId}</td>
                <td>{item.assetName}</td>
                <td>{item.method}</td>
                <td>{formatCurrency(item.purchaseCost)}</td>
                <td>{formatCurrency(item.currentBookValue)}</td>
                <td>{item.usefulLifeYears || '-'}</td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState title="No depreciation records" />
        )}
      </section>

      <section className="card">
        <div className="card-header"><h2 className="card-title">Location Summary</h2></div>
        {locationSummary.length ? (
          <DataTable caption="Location summary" headers={['Location', 'Total Assets', 'Total Value']}>
            {locationSummary.map((item) => (
              <tr key={item.location}>
                <td>{item.location}</td>
                <td>{item.totalAssets}</td>
                <td>{formatCurrency(item.totalValue)}</td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState title="No location summary" />
        )}
      </section>
    </div>
  );
}
