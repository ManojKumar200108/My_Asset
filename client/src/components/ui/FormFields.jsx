import React from 'react';

export const Field = ({ label, required, error, children, htmlFor }) => (
  <label className="form-field" htmlFor={htmlFor}>
    <span className="form-label">
      {label}
      {required ? <span aria-hidden="true"> *</span> : null}
    </span>
    {children}
    {error ? <span className="form-error">{error}</span> : null}
  </label>
);

export const TextInput = ({ id, name, value, onChange, placeholder, type = 'text', ...props }) => (
  <input
    id={id}
    name={name}
    className="form-control"
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    {...props}
  />
);

export const SelectInput = ({ id, name, value, onChange, children, ...props }) => (
  <select id={id} name={name} className="form-control" value={value} onChange={onChange} {...props}>
    {children}
  </select>
);

export const TextArea = ({ id, name, value, onChange, rows = 3, placeholder, ...props }) => (
  <textarea
    id={id}
    name={name}
    className="form-control"
    value={value}
    onChange={onChange}
    rows={rows}
    placeholder={placeholder}
    {...props}
  />
);
