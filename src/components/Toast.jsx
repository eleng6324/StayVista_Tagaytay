import React from "react";

export default function Toast({ message, type = "success", onClose }) {
  return (
    <div className={`toast toast-${type}`}>
      <div>{message}</div>
      <button type="button" onClick={onClose} aria-label="Dismiss notification">×</button>
    </div>
  );
}
