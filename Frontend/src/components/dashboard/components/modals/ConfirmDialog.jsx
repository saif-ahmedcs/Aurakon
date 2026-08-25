/* ---------------------------------------------------------------- */
/* Shared confirmation dialog - dark overlay + centered confirm      */
/* card. Used for destructive/irreversible confirmations across the  */
/* dashboard (delete habit, log out, log out all devices) and the    */
/* account screens (delete-account warnings, password reset hop).    */
/* ---------------------------------------------------------------- */

export function ConfirmDialog({
  ariaLabel,
  icon,
  title,
  body,
  confirmLabel,
  confirmClassName = "btn-danger",
  onCancel,
  onConfirm,
}) {
  return (
    <div className="overlay overlay-center" onClick={onCancel}>
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
      >
        {icon || null}
        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-body">{body}</p>
        <div className="confirm-actions">
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className={"btn " + confirmClassName} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
