import { useEffect, useState } from "react";
import { auth } from "../firebase";
import { loadBookings, filterBookingsByHost } from "../utils/bookingStorage";

const BASE_PAYOUT_BALANCE = 233286.39;
const HOST_SANDBOX_EMAIL = "hostpaypal@gmail.com";

function formatCurrency(value) {
  return `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatTimestamp(value) {
  const date = new Date(value || value?.seconds?.toString() || "");
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function HostWallet() {
  const [balance, setBalance] = useState(BASE_PAYOUT_BALANCE);
  const [recentPayments, setRecentPayments] = useState([]);

  const loadWalletData = () => {
    const user = auth.currentUser;
    const currentHostEmail = (user?.email || HOST_SANDBOX_EMAIL).toLowerCase();
    const currentHostId = String(user?.uid || "");

    const bookings = filterBookingsByHost(loadBookings(), currentHostId, currentHostEmail);
    const bookingPayments = bookings
      .filter((booking) => {
        const status = String(booking.paymentStatus || "").toLowerCase();
        return status === "completed" || status === "paid";
      })
      .map((booking) => ({
        id: booking.bookingId || booking.id || `${booking.guestEmail || "guest"}-${Date.now()}`,
        guestName: booking.guestName || "Guest",
        amount: Number(booking.totalAfterDiscount || booking.amount || 0),
        paymentDate: booking.paymentDate || booking.createdAt || booking.checkInDate || "",
        paymentStatus: booking.paymentStatus || "Completed",
        listingTitle: booking.listingTitle || "Booking payment",
      }))
      .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

    if (bookingPayments.length > 0) {
      const paymentTotal = bookingPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      setBalance(BASE_PAYOUT_BALANCE + paymentTotal);
      setRecentPayments(bookingPayments);
      return;
    }

    const storedTx = JSON.parse(localStorage.getItem("stayvista_transactions") || "[]");
    const hostTransactions = storedTx
      .filter((tx) => {
        const txHostEmail = String(tx.booking?.hostEmail || tx.hostEmail || "").toLowerCase();
        const txHostId = String(tx.booking?.hostId || tx.hostId || "");
        return txHostEmail === currentHostEmail || (currentHostId && txHostId === currentHostId);
      })
      .filter((tx) => {
        const status = String(tx.paymentStatus || "").toLowerCase();
        return status === "completed" || status === "approved" || status === "paid";
      });

    const history = hostTransactions
      .map((tx) => ({
        id: tx.id || `${tx.booking?.bookingId || tx.booking?.id || tx.paymentId || Date.now()}`,
        guestName: tx.payerName || tx.booking?.guestName || "Guest",
        amount: Number(tx.amount || tx.booking?.amount || 0),
        paymentDate: tx.paymentDate || tx.booking?.paymentDate || tx.createdAt || tx.booking?.createdAt || "",
        paymentStatus: tx.paymentStatus || "Completed",
        listingTitle: tx.booking?.listingTitle || "Booking payment",
      }))
      .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

    const paymentTotal = history.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    setBalance(BASE_PAYOUT_BALANCE + paymentTotal);
    setRecentPayments(history);
  };

  useEffect(() => {
    loadWalletData();
    const handleStorage = (ev) => {
      if (ev.key === "stayvista_transactions" || ev.key === "stayvista_bookings") {
        loadWalletData();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return (
    <main className="host-shell host-home-simple" style={{ padding: "24px", minHeight: "100vh" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <section className="wallet-header-card" style={{ marginBottom: 24, padding: 28, borderRadius: 20, background: "#ffffff", boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700 }}>My wallet balance</h1>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>Available balance</p>
              <p style={{ margin: "8px 0 0", fontSize: 40, fontWeight: 800, color: "#111827" }}>{formatCurrency(balance)}</p>
            </div>
          </div>
        </section>

        <section className="wallet-activity-card" style={{ padding: 24, borderRadius: 20, background: "#ffffff", boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Recent activity</h2>
              <p style={{ margin: "8px 0 0", color: "#4b5563" }}>Payments received from bookings.</p>
            </div>
          </div>

          {recentPayments.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#6b7280" }}>
              No recent PayPal payments found yet.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {recentPayments.map((payment) => (
                <div key={payment.id} style={{ borderRadius: 20, padding: 20, border: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", background: "#f9fafb" }}>
                  <div style={{ flex: "1 1 320px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: "#d1fae5", color: "#047857", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                        ₱
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 18 }}>{payment.listingTitle}</h3>
                        <p style={{ margin: "4px 0 0", color: "#4b5563" }}>From {payment.guestName}</p>
                      </div>
                    </div>
                    <p style={{ margin: 0, color: "#6b7280" }}>Booking ID: {payment.id}</p>
                  </div>

                  <div style={{ textAlign: "right", minWidth: 140 }}>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>{formatCurrency(payment.amount)}</p>
                    <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: 14 }}>{formatTimestamp(payment.paymentDate)}</p>
                    <span style={{ display: "inline-block", marginTop: 8, padding: "6px 12px", borderRadius: 9999, background: "#e6fffa", color: "#0f766e", fontSize: 12, fontWeight: 700 }}>
                      {payment.paymentStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default HostWallet;
