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

  const stats = [
    { label: 'Total Assets', value: totals.totalAssets || 0, icon: '📦', color: '#f97316' },
    { label: 'Active Transfers', value: totals.activeTransfers || 0, icon: '🔄', color: '#ea580c' },
    { label: 'Maintenance Due', value: totals.maintenanceDue || 0, icon: '🔧', color: '#fb923c' },
    { label: 'Asset Value', value: formatCurrency(totals.totalAssetValue || 0), icon: '💰', color: '#f97316' },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name || 'User'}! 👋`}
        subtitle="Here is a live snapshot of your asset operations."
        actions={
          <>
            <Link to="/assets/new" className="btn btn-primary">+ Add Asset</Link>
            <Link to="/transfers/new" className="btn">New Transfer</Link>
          </>
        }
      />

      {/* Enhanced KPI Grid */}
      <section className="kpi-grid" aria-label="Key performance indicators">
        {stats.map((stat, idx) => (
          <article key={idx} className="kpi-card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '80px',
              height: '80px',
              background: `rgba(249, 115, 22, 0.05)`,
              borderRadius: '50%',
              transform: 'translate(20px, -20px)'
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{stat.icon}</div>
              <strong style={{ color: stat.color }}>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          </article>
        ))}
      </section>

      {/* Latest Transfers Section */}
      <section className="card" style={{ marginBottom: 14 }}>
        <div className="card-header">
          <h2 className="card-title">📋 Latest Transfers</h2>
          <Link to="/transfers" className="btn btn-soft">View All →</Link>
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
                <td>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: item.status === 'completed' ? '#d1fae5' : '#fed7aa',
                    color: item.status === 'completed' ? '#059669' : '#ea580c',
                    fontSize: '0.8rem',
                    fontWeight: '600'
                  }}>
                    {titleCase(item.status)}
                  </span>
                </td>
                <td>{formatDate(item.initiatedAt)}</td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState title="No transfers available" message="Newly initiated transfers will appear here." />
        )}
      </section>

      {/* Alerts Section */}
      <section className="card">
        <div className="card-header">
          <h2 className="card-title">⚠️ Alerts & Notifications</h2>
        </div>
        {alerts.length ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {alerts.map((alert, idx) => (
              <div
                key={`${alert.title}-${idx}`}
                className="alert-banner"
                style={{
                  borderLeft: '4px solid #f97316',
                  paddingLeft: '12px',
                  background: '#fffaf5'
                }}
              >
                <strong style={{ color: '#ea580c' }}>⚡ {alert.title}</strong>
                <div style={{ color: '#666', marginTop: '4px' }}>{alert.subtitle}</div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="All clear! ✅" message="No urgent maintenance or warranty alerts right now." />
        )}
      </section>
    </div>
  );
}
