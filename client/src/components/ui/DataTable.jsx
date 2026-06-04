import React from 'react';

const DataTable = ({ headers, children, caption }) => (
  <div className="table-wrap" role="region" aria-label={caption || 'Data table'}>
    <table className="data-table">
      {caption ? <caption className="sr-only">{caption}</caption> : null}
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

export default DataTable;
