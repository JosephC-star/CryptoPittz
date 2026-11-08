import { useId, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './transaction-dialog.css';

export default function TransactionDialog({ title, children, onClose }) {
  const dialog = useRef(null);
  const titleId = useId();

  useLayoutEffect(() => {
    const node = dialog.current;
    node.showModal();
    return () => node.close();
  }, []);

  return createPortal(
    <dialog ref={dialog} className="pittz-transaction-dialog" aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }}>
      <header>
        <h2 id={titleId}>{title}</h2>
        <button className="btn" type="button" aria-label="Close transaction dialog" onClick={onClose}>×</button>
      </header>
      {children}
    </dialog>,
    document.body,
  );
}
