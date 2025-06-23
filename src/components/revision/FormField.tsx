import React from 'react';

interface Props {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  highlight?: boolean;
  icon?: React.ReactNode;
  fieldName?: string;
}

export default function FormField({ 
  label, 
  children, 
  required = false, 
  highlight = false, 
  icon,
  fieldName 
}: Props) {
  return (
    <div className="space-y-3">
      <label className="form-label">
        {icon}
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className={highlight ? 'form-field-highlight' : ''}>
        {children}
      </div>
    </div>
  );
} 