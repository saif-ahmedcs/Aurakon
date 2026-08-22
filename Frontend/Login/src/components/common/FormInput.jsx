"use client";

const ICON_PATHS = {
  mail: (
    <>
      <path d="M3 6.5h14v9H3z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
      <path d="M3.4 6.8 10 12l6.6-5.2" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="8.5" width="11" height="8" rx="2.4" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M6.5 8.5V6a3.5 3.5 0 0 1 7 0v2.5" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </>
  ),
  user: (
    <>
      <circle cx="10" cy="7.2" r="3.1" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M3.8 16.3c1-3.1 3.4-4.7 6.2-4.7s5.2 1.6 6.2 4.7" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </>
  ),
};

export default function FormInput({ id, placeholder, type, eye, icon, value, onChange, showPassword, onToggle }) {
  const inputType = eye ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="iw">
      {icon && (
        <svg className="iic" viewBox="0 0 20 20" fill="none">
          {ICON_PATHS[icon]}
        </svg>
      )}
      <input
        className={`inp${eye ? ' pr' : ''}${icon ? ' pl' : ''}`}
        id={id}
        type={inputType}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck="false"
        value={value}
        onChange={onChange}
      />
      {eye && (
        <span
          className="eye"
          data-toggle={id}
          data-state={showPassword ? 'visible' : 'hidden'}
          onClick={onToggle}
        >
          <svg
            className="eye-icon eye-show"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            style={{ display: showPassword ? 'none' : '' }}
          >
            <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          <svg
            className="eye-icon eye-hide"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            style={{ display: showPassword ? '' : 'none' }}
          >
            <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M10.6 5.2C11.05 5.07 11.52 5 12 5c7 0 10.5 7 10.5 7-.6 1.2-1.86 3.14-3.86 4.68M6.6 6.6C3.98 8.3 1.5 12 1.5 12s3.5 7 10.5 7c1.35 0 2.57-.26 3.66-.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9.9 10.1a3.2 3.2 0 0 0 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
      )}
    </div>
  );
}
