export default function ShopFormDialog({dialogRef, id, title, busy, children}) {
 return (
  <dialog
   ref={dialogRef}
   id={id}
   className="ml-copy-dialog ml-shop-form-dialog"
   aria-labelledby={id + '-title'}
   onCancel={event => { if (busy) event.preventDefault(); }}
  >
   <div className="ml-copy-dialog-heading">
    <h2 id={id + '-title'}>{title}</h2>
    <button type="button" disabled={busy} onClick={() => dialogRef.current.close()} aria-label="Close form">×</button>
   </div>
   {children}
  </dialog>
 );
}
