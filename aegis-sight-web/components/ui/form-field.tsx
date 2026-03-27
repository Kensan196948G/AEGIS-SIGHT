'use client';

import { clsx } from 'clsx';

type FieldType = 'text' | 'email' | 'password' | 'number' | 'date' | 'select' | 'textarea';

interface SelectOption {
  value: string;
  label: string;
}

interface FormFieldProps {
  label: string;
  name: string;
  type?: FieldType;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  options?: SelectOption[];
  rows?: number;
  className?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
}

const inputStyles = clsx(
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors',
  'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
  'dark:border-aegis-border dark:bg-aegis-surface dark:text-white dark:placeholder-gray-500',
  'dark:focus:border-primary-500 dark:focus:ring-primary-500/20'
);

const errorInputStyles = clsx(
  'border-red-500 focus:border-red-500 focus:ring-red-500/20',
  'dark:border-red-500 dark:focus:border-red-500 dark:focus:ring-red-500/20'
);

export function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  options = [],
  rows = 3,
  className,
  hint,
  min,
  max,
  step,
}: FormFieldProps) {
  const fieldId = `field-${name}`;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;

  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(' ') || undefined;

  function renderInput() {
    const commonProps = {
      id: fieldId,
      name,
      disabled,
      'aria-invalid': !!error as boolean,
      'aria-describedby': describedBy,
    };

    if (type === 'select') {
      return (
        <select
          {...commonProps}
          value={value}
          onChange={onChange}
          className={clsx(inputStyles, error && errorInputStyles, disabled && 'cursor-not-allowed opacity-50')}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    if (type === 'textarea') {
      return (
        <textarea
          {...commonProps}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          required={required}
          className={clsx(
            inputStyles,
            'resize-y',
            error && errorInputStyles,
            disabled && 'cursor-not-allowed opacity-50'
          )}
        />
      );
    }

    return (
      <input
        {...commonProps}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        step={step}
        className={clsx(inputStyles, error && errorInputStyles, disabled && 'cursor-not-allowed opacity-50')}
      />
    );
  }

  return (
    <div className={clsx('space-y-1.5', className)}>
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>

      {renderInput()}

      {hint && !error && (
        <p id={hintId} className="text-xs text-gray-500 dark:text-gray-400">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
