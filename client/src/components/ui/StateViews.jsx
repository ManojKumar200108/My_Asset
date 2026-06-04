import React from 'react';

const StateView = ({ type = 'info', title, message, action }) => (
  <div className={`state-view state-${type}`} role={type === 'error' ? 'alert' : 'status'}>
    <h3>{title}</h3>
    {message ? <p>{message}</p> : null}
    {action ? <div className="state-actions">{action}</div> : null}
  </div>
);

export const LoadingState = ({ message = 'Loading...' }) => (
  <StateView type="loading" title="Please wait" message={message} />
);

export const ErrorState = ({ message = 'Something went wrong', action }) => (
  <StateView type="error" title="Unable to load data" message={message} action={action} />
);

export const EmptyState = ({ title = 'No records found', message = 'Try adjusting filters or adding a new record.' }) => (
  <StateView type="empty" title={title} message={message} />
);
