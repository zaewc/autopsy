"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import "./dialog.css";
export function Dialog({
  children,
  titleId,
  onClose,
  className,
  closeLabel,
}: {
  children: ReactNode;
  titleId: string;
  onClose: () => void;
  className?: string;
  closeLabel: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal-backdrop"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={className}>
        <button
          className="modal-close icon-button"
          aria-label={closeLabel}
          onClick={onClose}
        >
          <X size={19} />
        </button>
        {children}
      </div>
    </dialog>
  );
}
