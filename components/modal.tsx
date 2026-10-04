"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
export function Modal({
  children,
  onClose,
  title,
  className = "",
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      d?.close();
      document.body.style.overflow = old;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <span className="eyebrow">{title}</span>
        <button
          className="icon-button"
          aria-label="Cerrar diálogo"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
