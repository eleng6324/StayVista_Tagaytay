import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import Navbar from "../components/Navbar";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};
  const txId = state.txId || null;

  const last = JSON.parse(localStorage.getItem("stayvista_last_payment") || "null");
  const tx = last && (!txId || last.id === txId) ? last : (JSON.parse(localStorage.getItem("stayvista_transactions") || "[]").find(t => t.id === txId) || last);

  if (!tx) {
    return (
      <div style={{ padding: 40 }}>
        <Navbar />
        <div style={{ maxWidth: 800, margin: "40px auto", background: "#fff", padding: 24, borderRadius: 12 }}>
          <h2>No payment found</h2>
          <p>We couldn't find any recent payment details.</p>
          <button onClick={() => navigate('/guest')} style={{ padding: '8px 12px', background: '#1f4729', color: '#fff', border: 'none', borderRadius: 8 }}>Back to home</button>
        </div>
      </div>
    );
  }

  const booking = tx.booking || {};
  // Get logged-in user's name from Firebase
  const guestName = auth.currentUser?.displayName || auth.currentUser?.email || "Guest";
  const phoneNumber = tx.phoneNumber || "—";
  const paymentStatus = tx.paymentStatus || tx.status || "Completed";
  const bookingStatus = booking.status || "PENDING APPROVAL";
  const statusColor = bookingStatus === "CONFIRMED" ? "#047857" : bookingStatus === "REJECTED" ? "#b91c1c" : "#166534";
  const statusBackground = bookingStatus === "CONFIRMED" ? "#d1fae5" : bookingStatus === "REJECTED" ? "#fee2e2" : "#ecfdf5";
  const paymentId = tx.paymentId || tx.orderID || "—";
  const couponCode = booking.couponCode || tx.couponCode || null;
  const couponAmount = Number(booking.couponAmount || tx.couponAmount || 0);
  const serviceFeeAmount = Number(tx.serviceFeeAmount || booking.serviceFeeAmount || 0);
  const hostPayoutAmount = Number(tx.hostPayoutAmount || booking.hostPayoutAmount || 0);
  const todayDate = new Date().toLocaleString();
  const pageTitle = bookingStatus === "CONFIRMED" ? "Booking confirmed!" : bookingStatus === "REJECTED" ? "Booking not approved" : "Payment received";
  const pageSubtitle = bookingStatus === "CONFIRMED"
    ? "Your reservation is confirmed by the host."
    : bookingStatus === "REJECTED"
    ? "The host has declined this booking request."
    : "Your payment is successful and booking is pending host approval.";

  return (
    <div style={{ minHeight: '100vh', background: '#f6f9f4', paddingBottom: 80, paddingTop: 100 }}>
      <Navbar />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #eef2ea' }}>
            <img src="/stayvista_logo.png" alt="StayVista Tagaytay" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'contain' }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, color: '#1f4729' }}>StayVista Tagaytay</div>
              <div style={{ color: '#6b7769', fontSize: 12 }}>Booking confirmation</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
            <div style={{ width: 72, height: 72, borderRadius: 999, background: '#e6ffef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17l-5-5" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24 }}>{pageTitle}</h1>
              <div style={{ color: '#6b7769' }}>{pageSubtitle}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, marginTop: 20 }}>
            <div>
              <div style={{ background: '#fafaf9', padding: 16, borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ color: '#6b7769' }}>Booking ID</div>
                    <div style={{ fontWeight: 700 }}>{tx.id}</div>
                  </div>
                  <div>
                    <div style={{ color: '#6b7769' }}>Payment method</div>
                    <div style={{ fontWeight: 700 }}>PayPal</div>
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ color: '#6b7769' }}>Guest</div>
                  <div style={{ fontWeight: 700 }}>{guestName}</div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ color: '#6b7769' }}>Stay</div>
                  <div style={{ fontWeight: 700 }}>{booking.listingTitle || 'Your reservation'}</div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ color: '#6b7769' }}>Dates</div>
                  <div style={{ fontWeight: 700 }}>{booking.checkInDate || '—'} → {booking.checkOutDate || '—'}</div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ color: '#6b7769' }}>Phone number</div>
                  <div style={{ fontWeight: 700 }}>{phoneNumber}</div>
                </div>
              </div>

              <div style={{ marginTop: 18, background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #eef2ea' }}>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ color: '#6b7769' }}>Amount paid</div>
                    <div style={{ fontWeight: 800 }}>PHP {Number(tx.amount).toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ color: '#6b7769' }}>Payment ID</div>
                    <div style={{ fontWeight: 700 }}>{paymentId}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ color: '#6b7769' }}>Status</div>
                    <div style={{ fontWeight: 700 }}>{paymentStatus}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ color: '#6b7769' }}>Date</div>
                    <div style={{ fontWeight: 700 }}>{todayDate}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
                <button onClick={() => navigate(`/transaction/${tx.id}`)} style={{ padding: '12px 16px', background: '#1f4729', color: '#fff', border: 'none', borderRadius: 10 }}>View Receipt</button>
                <button onClick={() => navigate('/guest')} style={{ padding: '12px 16px', background: '#fff', color: '#1f4729', border: '1px solid #e6efe6', borderRadius: 10 }}>Back to Home</button>
              </div>
            </div>

            <aside style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #eef2ea' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#6b7769' }}>Payment status</div>
                  <div style={{ fontWeight: 800, color: '#059669' }}>{paymentStatus}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#6b7769' }}>Order ID</div>
                  <div style={{ fontWeight: 700 }}>{tx.orderID}</div>
                </div>
              </div>
              <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#6b7769' }}>Booking status</div>
                  <div style={{ fontWeight: 800, color: statusColor }}>{bookingStatus}</div>
                </div>
                <div style={{ borderRadius: 999, padding: '8px 14px', fontWeight: 700, color: statusColor, background: statusBackground }}>{bookingStatus}</div>
              </div>

              <hr style={{ margin: '12px 0', borderColor: '#eef2ea' }} />
              <div style={{ color: '#6b7769' }}>Paid with PayPal sandbox</div>
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: '#6b7769' }}>Paid by</div>
                  <div style={{ fontWeight: 700 }}>{guestName}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#6b7769' }}>Amount</div>
                  <div style={{ fontWeight: 800 }}>PHP {Number(tx.amount).toLocaleString()}</div>
                </div>
              </div>
              {couponCode && (
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ color: '#6b7769' }}>Discount code</div>
                  <div style={{ fontWeight: 700 }}>{couponCode}</div>
                </div>
              )}
              {couponAmount > 0 && (
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ color: '#6b7769' }}>Discount amount</div>
                  <div style={{ fontWeight: 700 }}>- PHP {couponAmount.toLocaleString()}</div>
                </div>
              )}
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ color: '#6b7769' }}>Service fee</div>
                <div style={{ fontWeight: 700 }}>PHP {serviceFeeAmount.toLocaleString()}</div>
              </div>
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ color: '#6b7769' }}>Host receives</div>
                <div style={{ fontWeight: 700 }}>PHP {hostPayoutAmount.toLocaleString()}</div>
              </div>

            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
