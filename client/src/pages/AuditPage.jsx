import React from 'react';
import { useAppData } from '../hooks/useAppData';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StateViews';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function AuditPage() {
  const { data, loading, error, refresh } = useAppData();
  const dept = data?.audit?.departmentSummary || [];
  const activity = data?.audit?.activity || [];

  if (loading) return <LoadingState message="Loading audit data..." />;
  if (error) return <ErrorState message={error} action={<button className="btn" onClick={refresh}>Retry</button>} />;

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Track ownership, lifecycle changes, and operational history." />

      <section className="card" style={{ marginBottom: 12 }}>
        <div className="card-header"><h2 className="card-title">Department Summary</h2></div>
        {dept.length ? (
          <DataTable
            caption="Department audit summary"
            headers={['Department', 'Total', 'Active', 'Maintenance', 'Idle', 'Disposed', 'Value']}
          >
            {dept.map((item) => (
              <tr key={item.department}>
                <td>{item.department}</td>
                <td>{item.total}</td>
                <td>{item.active}</td>
                <td>{item.maintenance}</td>
                <td>{item.idle}</td>
                <td>{item.disposed}</td>
                <td>{formatCurrency(item.value)}</td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState title="No department summary" />
        )}
      </section>

      <section className="card">
        <div className="card-header"><h2 className="card-title">Recent Activity</h2></div>
        {activity.length ? (
          <DataTable caption="Recent audit activity" headers={['Entity', 'ID', 'Action', 'User', 'Timestamp']}>
            {activity.slice(0, 80).map((item) => (
              <tr key={item.id}>
                <td>{item.entityType}</td>
                <td className="col-id">{item.entityId}</td>
                <td>{item.action}</td>
                <td>{item.changedBy}</td>
                <td>{formatDate(item.timestamp, true)}</td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState title="No recent activity" />
        )}
      </section>
    </div>
  );
}
