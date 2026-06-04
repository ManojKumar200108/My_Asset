import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppData } from '../hooks/useAppData';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import { ErrorState, LoadingState, EmptyState } from '../components/ui/StateViews';
import { formatCurrency, formatDate, titleCase } from '../utils/formatters';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, refresh } = useAppData();

  if (loading) return <LoadingState message="Loading dashboard data..." />;
  if (error) return <ErrorState message={error} action={<button className="btn" onClick={refresh}>Retry</button>} />;

  const dashboard = data?.dashboard;
  const totals = dashboard?.totals || {};
  const latest = dashboard?.latestTransfers || [];
  const alerts = dashboard?.alerts || [];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name || 'User'}`}
        subtitle="Here is a live snapshot of your asset operations."
        actions={
          <>
            <Link to="/assets/new" className="btn btn-primary">Add Asset</Link>
            <Link to="/transfers/new" className="btn">New Transfer</Link>
          </>
        }
      />

      <section className="kpi-grid" aria-label="Key performance indicators">
        <article className="kpi-card">
          <strong>{totals.totalAssets || 0}</strong>
          <span>Total Assets</span>
        </article>
        <article className="kpi-card">
          <strong>{totals.activeTransfers || 0}</strong>
          <span>Active Transfers</span>
        </article>
        <article className="kpi-card">
          <strong>{totals.maintenanceDue || 0}</strong>
          <span>Maintenance Due</span>
        </article>
        <article className="kpi-card">
          <strong>{formatCurrency(totals.totalAssetValue || 0)}</strong>
          <span>Total Asset Value</span>
        </article>
      </section>

      <section className="card" style={{ marginBottom: 14 }}>
        <div className="card-header">
          <h2 className="card-title">Latest Transfers</h2>
          <Link to="/transfers" className="btn btn-soft">View All</Link>
        </div>
        {latest.length ? (
          <DataTable
            caption="Latest transfer records"
            headers={['Transfer', 'Asset', 'Type', 'From', 'To', 'Status', 'Date']}
          >
            {latest.map((item) => (
              <tr key={item.id}>
                <td className="col-id">{item.id}</td>
                <td className="col-primary">{item.asset}</td>
                <td>{titleCase(item.type)}</td>
                <td>{item.from}</td>
                <td>{item.to}</td>
                <td>{titleCase(item.status)}</td>
                <td>{formatDate(item.initiatedAt)}</td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState title="No transfers available" message="Newly initiated transfers will appear here." />
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h2 className="card-title">Alerts</h2>
        </div>
        {alerts.length ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {alerts.map((alert, idx) => (
              <div key={`${alert.title}-${idx}`} className="alert-banner">
                <strong>{alert.title}</strong>
                <div>{alert.subtitle}</div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="All clear" message="No urgent maintenance or warranty alerts right now." />
        )}
      </section>
    </div>
  );
}
