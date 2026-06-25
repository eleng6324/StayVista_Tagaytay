import React, { useState } from "react";
import { PayPalButtons } from "@paypal/react-paypal-js";

// PaymentModal: opens centered modal with PayPalButtons to complete payment
export default function PaymentModal({ booking = {}, phoneNumber = "", onClose, onSuccess }) {
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const total = booking.price || 0;
  const amountValue = Number(total) || 0;

  function saveTransaction(orderID, details) {
    const payer = details.payer || {};
    const payerName = payer.name ? `${payer.name.given_name || ""} ${payer.name.surname || ""}`.trim() : payer.email_address || "Guest";
    const bookingRecord = {
      ...booking,
      status: "PENDING APPROVAL"
    };

    const tx = {
      id: `${orderID}-${Date.now()}`,
      bookingId: `${booking.listingTitle || "booking"}-${Date.now()}`,
      paymentId: orderID,
      orderID,
      paymentStatus: details.status || "COMPLETED",
      payerName,
      amount: amountValue,
      phoneNumber,
      paymentDate: new Date().toISOString(),
      currency: "PHP",
      booking: bookingRecord,
      payer,
      status: details.status || "COMPLETED"
    };

    const all = JSON.parse(localStorage.getItem("stayvista_transactions") || "[]");
    all.unshift(tx);
    localStorage.setItem("stayvista_transactions", JSON.stringify(all));
    localStorage.setItem("stayvista_last_payment", JSON.stringify(tx));

    return tx;
  }

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} onClick={onClose} />
      <div style={{ width: "560px", background: "#fff", borderRadius: "14px", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", padding: "24px", zIndex: 70 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img src="https://www.paypalobjects.com/webstatic/icon/pp258.png" alt="PayPal" style={{ width: "44px", height: "44px" }} />
            <div>
              <div style={{ fontSize: "18px", fontWeight: 700 }}>Complete your payment securely using PayPal</div>
              <div style={{ color: "#6b6b6b", fontSize: "13px" }}>You're paying for: <strong>{booking.listingTitle}</strong></div>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "18px" }}>✕</button>
        </div>

        <div style={{ marginTop: "8px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "#4b5563" }}>Total</div>
          <div style={{ fontSize: "20px", fontWeight: 800 }}>PHP {amountValue.toLocaleString()}</div>
        </div>

        <div style={{ padding: "12px", borderRadius: "10px", border: "1px solid #e6e6e6" }}>
          <PayPalButtons
            forceReRender={[amountValue, phoneNumber]}
            style={{ layout: "vertical", color: "blue", shape: "rect", label: "paypal" }}
            createOrder={(data, actions) => {
              setErrorMessage("");
              setProcessing(true);
              return actions.order.create({
                purchase_units: [
                  {
                    amount: {
                      currency_code: "PHP",
                      value: String(amountValue)
                    },
                    description: booking.listingTitle || "StayVista Tagaytay booking"
                  }
                ]
              });
            }}
            onApprove={async (data, actions) => {
              try {
                const capture = await actions.order.capture();
                const tx = saveTransaction(data.orderID || capture.id || "", capture);
                setProcessing(false);
                onClose && onClose();
                onSuccess && onSuccess(tx);
              } catch (err) {
                console.error("Capture failed", err);
                setProcessing(false);
                setErrorMessage("Payment capture failed. Please try again.");
              }
            }}
            onError={(err) => {
              console.error("PayPal error", err);
              setProcessing(false);
              setErrorMessage("A payment error occurred. Please refresh and try again.");
            }}
            onCancel={() => {
              setProcessing(false);
              setErrorMessage("Payment was cancelled. You can try again.");
            }}
          />
        </div>

        {processing && <div style={{ marginTop: 12, color: "#6b7280" }}>Processing payment...</div>}
        {errorMessage && <div style={{ marginTop: 12, color: "#dc2626" }}>{errorMessage}</div>}
      </div>
    </div>
  );
}
