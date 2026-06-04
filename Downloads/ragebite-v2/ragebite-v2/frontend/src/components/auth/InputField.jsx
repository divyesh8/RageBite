import { useState } from 'react';

export default function InputField({ label, name, type='text', value, onChange, onBlur, error, valid, placeholder, helper, rightEl, autoComplete, disabled }) {
  const [show, setShow] = useState(false);
  const isPw = type === 'password';
  const inputType = isPw ? (show ? 'text' : 'password') : type;
  const cls = error ? 'err' : valid ? 'ok' : '';

  return (
    <div className="flex flex-col">
      {label && <label className="label" htmlFor={name}>{label}</label>}
      <div className="relative">
        <input
          id={name} name={name} type={inputType}
          value={value} onChange={onChange} onBlur={onBlur}
          placeholder={placeholder} autoComplete={autoComplete}
          disabled={disabled}
          className={`rb-input ${cls} ${isPw || rightEl ? 'pr-11' : ''}`}
          aria-invalid={!!error}
        />
        {isPw && (
          <button type="button" onClick={() => setShow(s=>!s)} tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-rb-muted hover:text-rb-text transition-colors text-base">
            {show ? '🙈' : '👁'}
          </button>
        )}
        {!isPw && rightEl && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {rightEl}
          </div>
        )}
        {!isPw && !rightEl && valid && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-rb-plus text-sm">✓</span>
        )}
      </div>
      {error  && <p className="err-msg">⚠ {error}</p>}
      {!error && helper && <p className="helper">{helper}</p>}
    </div>
  );
}
