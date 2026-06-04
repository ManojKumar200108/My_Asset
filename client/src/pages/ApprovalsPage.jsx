import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAppData } from '../hooks/useAppData';
import { api } from '../contexts/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import DataTable from '../components/ui/DataTable';
import Dialog from '../components/ui/Dialog';
import { Field, TextArea, TextInput } from '../components/ui/FormFields';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StateViews';
import { formatDate, titleCase } from '../utils/formatters';

export default function ApprovalsPage() {
  const { data, loading, error, refresh } = useAppData();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  const requests = useMemo(() => data?.approvals?.pendingRequests || [], [data?.approvals?.pendingRequests]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return requests;
    return requests.filter((item) =>
      [item.transferId, item.assetName, item.assetId, item.requestedBy].some((value) =>
        (value || '').toLowerCase().includes(query)
      )
    );
  }, [requests, search]);

  const approve = async (row) => {
    setBusy(true);
    try {
      await api.post(`/data/transfers/${row.transferRecordId}/approve`);
      toast.success('Transfer approved and completed');
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve request');
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!selected) return;

    setBusy(true);
    try {
      await api.post(`/data/transfers/${selected.transferRecordId}/reject`, {
        reason: rejectReason,
      });
      toast.success('Transfer request rejected');
      setRejectOpen(false);
      setSelected(null);
      setRejectReason('');
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject request');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState message="Loading approvals..." />;
  if (error) return <ErrorState message={error} action={<button className="btn" onClick={refresh}>Retry</button>} />;

  return (
    <div>
      <PageHeader
        title="Approvals"
        subtitle={`${requests.length} pending transfer request${requests.length === 1 ? '' : 's'}`}
      />

      <section className="card" style={{ marginBottom: 12 }}>
        <Field label="Search requests" htmlFor="search-approvals">
          <TextInput
            id="search-approvals"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by transfer ID, asset, or requester"
          />
        </Field>
      </section>

      {filtered.length ? (
        <DataTable
          caption="Pending transfer approval requests"
          headers={['Request ID', 'Asset Name', 'Asset ID', 'Requested By', 'From User', 'To User', 'Requested Date', 'Status', 'Actions']}
        >
          {filtered.map((item) => (
            <tr key={item.id}>
              <td className="col-id">{item.transferId}</td>
              <td>{item.assetName}</td>
              <td>{item.assetId}</td>
              <td>{item.requestedBy}</td>
              <td>{item.fromUser}</td>
              <td>{item.toUser}</td>
              <td>{formatDate(item.requestedAt)}</td>
              <td>{titleCase(item.status || 'PENDING_APPROVAL')}</td>
              <td>
                <div className="row-actions">
                  <button type="button" className="btn btn-soft" onClick={() => setSelected(item)} disabled={busy}>
                    Details
                  </button>
                  {item.canAct !== false ? (
                    <>
                      <button type="button" className="btn btn-primary" onClick={() => approve(item)} disabled={busy}>
                        Approve
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => {
                          setSelected(item);
                          setRejectOpen(true);
                        }}
                        disabled={busy}
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-subtle)' }}>No action</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState title="No pending requests" message="New transfer requests awaiting approval will appear here." />
      )}

      <Dialog
        open={Boolean(selected) && !rejectOpen}
        onClose={() => setSelected(null)}
        title="Request Details"
        labelledBy="approval-request-details"
        footer={<button type="button" className="btn" onClick={() => setSelected(null)}>Close</button>}
      >
        {selected ? (
          <div className="form-grid-2">
            <div><strong>Transfer ID</strong><div>{selected.transferId}</div></div>
            <div><strong>Requested By</strong><div>{selected.requestedBy}</div></div>
            <div><strong>Asset</strong><div>{selected.assetName} ({selected.assetId})</div></div>
            <div><strong>Status</strong><div>{titleCase(selected.status)}</div></div>
            <div><strong>From User</strong><div>{selected.fromUser}</div></div>
            <div><strong>To User</strong><div>{selected.toUser}</div></div>
            <div><strong>From</strong><div>{selected.from}</div></div>
            <div><strong>To</strong><div>{selected.to}</div></div>
            <div><strong>Date & Time</strong><div>{formatDate(selected.requestedAt)}</div></div>
            <div><strong>Purpose</strong><div>{selected.purpose}</div></div>
            <div><strong>Remarks</strong><div>{selected.remarks}</div></div>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject Transfer Request"
        labelledBy="reject-transfer-request"
        footer={
          <>
            <button type="button" className="btn" onClick={() => setRejectOpen(false)} disabled={busy}>Cancel</button>
            <button type="button" className="btn btn-danger" onClick={reject} disabled={busy}>
              {busy ? 'Rejecting...' : 'Reject Request'}
            </button>
          </>
        }
      >
        <Field label="Reason (optional)" htmlFor="reject-reason">
          <TextArea
            id="reject-reason"
            rows={4}
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Provide rejection reason for requester"
          />
        </Field>
      </Dialog>
    </div>
  );
}
