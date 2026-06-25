import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function TransactionReceipt() {
  const { id } = useParams();
  const navigate = useNavigate();

  const all = JSON.parse(localStorage.getItem("stayvista_transactions") || "[]");
  const tx = all.find((t) => t.id === id) || JSON.parse(localStorage.getItem("stayvista_last_payment") || "null");
  const paymentId = tx?.paymentId || tx?.orderID || "—";
  const paymentStatus = tx?.paymentStatus || tx?.status || "Completed";

  if (!tx) {
    return (
      <div style={{ padding: 40 }}>
        <Navbar />
        <div style={{ maxWidth: 800, margin: "40px auto", background: "#fff", padding: 24, borderRadius: 12 }}>
          <h2>Receipt not found</h2>
          <p>We couldn't find the requested receipt.</p>
          <button onClick={() => navigate('/guest')} style={{ padding: '8px 12px', background: '#1f4729', color: '#fff', border: 'none', borderRadius: 8 }}>Back to home</button>
        </div>
      </div>
    );
  }

  const booking = tx.booking || {};
  const bookingStatus = (booking.status || "PENDING APPROVAL").toUpperCase();
  const subtotal = Number(tx.amount) || Number(booking.totalAfterDiscount) || 0;
  const originalTotal = Number(booking.originalTotal || subtotal);
  const discountAmount = Number(tx.booking?.couponAmount || tx.couponAmount || 0);
  const couponCode = tx.booking?.couponCode || tx.couponCode || null;
  const serviceFee = Number(tx.serviceFeeAmount || booking.serviceFeeAmount || Math.round(subtotal * 0.1));
  const serviceFeePercent = Number(tx.serviceFeePercent || booking.serviceFeePercent || 10);
  const hostPayout = Number(tx.hostPayoutAmount || booking.hostPayoutAmount || Math.max(0, subtotal - serviceFee));
  const taxes = Math.round((subtotal + serviceFee) * 0.12 * 100) / 100; // 12% VAT
  const total = Math.round((subtotal + serviceFee + taxes) * 100) / 100;

  function handlePrint() {
    window.print();
  }

  function handleDownload() {
    const html = `Receipt - StayVista Tagaytay\n\nTransaction ID: ${tx.id}\nOrder ID: ${tx.orderID}\nStatus: ${tx.status}\nDate: ${new Date(tx.date).toLocaleString()}\n\nGuest: ${tx.payer?.name || 'Guest'}\nStay: ${booking.listingTitle || ''}\nDates: ${booking.checkInDate || ''} → ${booking.checkOutDate || ''}\nGuests: ${booking.guestCount || ''}\n\nPrice breakdown:\nSubtotal: PHP ${subtotal}\nService fee: PHP ${serviceFee}\nTaxes: PHP ${taxes}\n\nTotal Paid: PHP ${total}\n`;
    const blob = new Blob([html], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stayvista-receipt-${tx.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f6f9f4', paddingTop: 100 }}>
      <Navbar />
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ background: '#fff', padding: 28, borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.06)' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <img src="/stayvista_logo.png" alt="StayVista Tagaytay" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'contain' }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 24, color: '#1f4729' }}>StayVista Tagaytay</div>
                <div style={{ color: '#6b7769', fontSize: 13 }}>Official receipt</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#6b7769' }}>Receipt</div>
              <div style={{ fontWeight: 800 }}>{tx.id}</div>
            </div>
          </header>

          <section style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
            <div>
              <h3 style={{ marginTop: 0 }}>Booking details</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                <div>
                  <div style={{ color: '#6b7769' }}>Room</div>
                  <div style={{ fontWeight: 700 }}>{booking.listingTitle || 'Room booking'}</div>
                </div>
                <div>
                  <div style={{ color: '#6b7769' }}>Guests</div>
                  <div style={{ fontWeight: 700 }}>{booking.guestCount || 1}</div>
                </div>
                <div>
                  <div style={{ color: '#6b7769' }}>Dates</div>
                  <div style={{ fontWeight: 700 }}>{booking.checkInDate || '—'} → {booking.checkOutDate || '—'}</div>
                </div>
                <div>
                  <div style={{ color: '#6b7769' }}>Phone number</div>
                  <div style={{ fontWeight: 700 }}>{tx.phoneNumber || '—'}</div>
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <h4 style={{ margin: '8px 0' }}>Payment summary</h4>
                <div style={{ background: '#fafaf9', padding: 12, borderRadius: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>Original total</div>
                    <div>PHP {originalTotal.toLocaleString()}</div>
                  </div>
                  {discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      <div>Discount{couponCode ? ` (${couponCode})` : ''}</div>
                      <div>- PHP {discountAmount.toLocaleString()}</div>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <div>Subtotal</div>
                    <div>PHP {subtotal.toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <div>Service fee ({serviceFeePercent}%)</div>
                    <div>PHP {serviceFee.toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <div>Host receives</div>
                    <div>PHP {hostPayout.toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <div>Taxes (12%)</div>
                    <div>PHP {taxes.toLocaleString()}</div>
                  </div>
                  <hr style={{ margin: '8px 0', borderColor: '#eef2ea' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                    <div>Total Paid</div>
                    <div>PHP {total.toLocaleString()}</div>
                  </div>
                </div>
              </div>

            </div>

            <aside style={{ background: '#fff', border: '1px solid #eef2ea', padding: 16, borderRadius: 8 }}>
              <div>
                <div style={{ color: '#6b7769' }}>Transaction ID</div>
                <div style={{ fontWeight: 700 }}>{tx.id}</div>
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ color: '#6b7769' }}>PayPal Order ID</div>
                <div style={{ fontWeight: 700 }}>{paymentId}</div>
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ color: '#6b7769' }}>Payment status</div>
                <div style={{ fontWeight: 700 }}>{paymentStatus}</div>
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ color: '#6b7769' }}>Booking status</div>
                <div style={{ fontWeight: 700 }}>{bookingStatus}</div>
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ color: '#6b7769' }}>Date paid</div>
                <div style={{ fontWeight: 700 }}>{new Date(tx.paymentDate || tx.date).toLocaleString()}</div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button onClick={handlePrint} style={{ flex: 1, padding: 10, background: '#1f4729', color: '#fff', border: 'none', borderRadius: 8 }}>Print Receipt</button>
                <button onClick={handleDownload} style={{ flex: 1, padding: 10, background: '#fff', color: '#1f4729', border: '1px solid #e6efe6', borderRadius: 8 }}>Download</button>
              </div>

              <div style={{ marginTop: 12 }}>
                <button onClick={() => navigate('/guest')} style={{ width: '100%', padding: 10, background: '#fff', color: '#1f4729', border: '1px solid #e6efe6', borderRadius: 8 }}>Back to home</button>
              </div>
            </aside>
          </section>
        </div>
      </div>
    </div>
  );
}
