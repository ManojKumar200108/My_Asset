import React from 'react';

const PageHeader = ({ title, subtitle, actions }) => (
  <header className="page-header">
    <div>
      <h1 className="page-title">{title}</h1>
      {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
    </div>
    {actions ? <div className="page-actions">{actions}</div> : null}
  </header>
);

export default PageHeader;
