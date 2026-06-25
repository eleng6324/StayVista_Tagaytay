import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import Navbar from "../components/Navbar";
import Toast from "../components/Toast";
import { updateBookingStatus, loadBookings, filterBookingsByHost } from "../utils/bookingStorage";
import { updateBookingStatusInFirestore } from "../utils/bookingDb";
import { awardPointsForBookingCompletion } from "../utils/hostRewards";
import {
  sendGuestBookingConfirmedEmail,
  sendGuestBookingRejectedEmail
} from "../utils/emailService";

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function statusBadgeStyle(status) {
  if (status === "CONFIRMED") return { background: "#def7ec", color: "#047857" };
  if (status === "REJECTED") return { background: "#fee2e2", color: "#b91c1c" };
  return { background: "#f0fdf4", color: "#166534" };
}

export default function BookingApproval() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("PENDING APPROVAL");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const allBookings = loadBookings();
    const hostBookings = filterBookingsByHost(allBookings, auth.currentUser?.uid || "", auth.currentUser?.email || "");
    setBookings(hostBookings);
    setLoading(false);
  }, []);

  const filteredBookings = useMemo(() => {
    return bookings
      .filter((booking) => (filter === "all" ? true : booking.status === filter))
      .filter((booking) => (categoryFilter === "all" ? true : booking.listingCategory === categoryFilter))
      .filter((booking) => {
        if (!searchTerm.trim()) return true;
        const query = searchTerm.toLowerCase();
        return [
          booking.guestName,
          booking.guestEmail,
          booking.phoneNumber,
          booking.listingTitle,
          booking.id,
          booking.bookingId
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query));
      });
  }, [bookings, filter, categoryFilter, searchTerm]);

  const counts = useMemo(() => {
    const filtered = categoryFilter === "all" ? bookings : bookings.filter((b) => b.listingCategory === categoryFilter);
    return {
      all: filtered.length,
      pending: filtered.filter((b) => b.status === "PENDING APPROVAL").length,
      confirmed: filtered.filter((b) => b.status === "CONFIRMED").length,
      rejected: filtered.filter((b) => b.status === "REJECTED").length
    };
  }, [bookings, categoryFilter]);

  async function handleStatusAction(booking, newStatus) {
    try {
      setActionLoadingId(booking.id);
      const approverHostId = auth.currentUser?.uid || "";
      const approverHostEmail = auth.currentUser?.email || "";
      const updatedBooking = {
        ...booking,
        status: newStatus,
        updatedAt: new Date().toISOString(),
        approverHostId: newStatus === "CONFIRMED" ? approverHostId : booking.approverHostId,
        approverHostEmail: newStatus === "CONFIRMED" ? approverHostEmail : booking.approverHostEmail,
        approvalDate: newStatus === "CONFIRMED" ? new Date().toISOString() : booking.approvalDate
      };

      // Update in localStorage
      updateBookingStatus(booking.id, newStatus);
      // Also update the full booking record with approver info
      const all = JSON.parse(localStorage.getItem('stayvista_bookings') || '[]');
      const updated = all.map(b => b.id === booking.id ? updatedBooking : b);
      localStorage.setItem('stayvista_bookings', JSON.stringify(updated));

      // Update in Firestore
      try {
        await updateBookingStatusInFirestore(booking.bookingId || booking.id, newStatus);
      } catch (firestoreError) {
        console.warn("Firestore update failed, but localStorage was updated:", firestoreError);
      }

      // Update local state
      setBookings((current) =>
        current.map((item) =>
          item.id === booking.id ? updatedBooking : item
        )
      );

      // Trigger storage event to notify guest page
      window.dispatchEvent(new StorageEvent("storage", {
        key: "stayvista_bookings",
        newValue: JSON.stringify(JSON.parse(localStorage.getItem('stayvista_bookings') || '[]')),
        oldValue: null,
        storageArea: localStorage
      }));

      if (newStatus === "CONFIRMED") {
        if (approverHostId) {
          awardPointsForBookingCompletion(approverHostId, booking.id);
        }
        await sendGuestBookingConfirmedEmail(updatedBooking);
        setToast({ type: "success", message: "✅ Booking approved! Guest has been notified." });
      } else {
        await sendGuestBookingRejectedEmail(updatedBooking);
        setToast({ type: "success", message: "❌ Booking rejected. Guest has been notified." });
      }
    } catch (error) {
      console.error(error);
      setToast({ type: "error", message: "An error occurred while updating the booking. Please try again." });
    } finally {
      setActionLoadingId(null);
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Logout failed', err);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f6f9f4", paddingBottom: 80 }}>
      <Navbar onMenuToggle={() => setMenuOpen((value) => !value)} menuOpen={menuOpen} isHost />
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "120px 24px 24px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 32, color: "#1f2f21" }}>Booking approval dashboard</h1>
            <p style={{ margin: "10px 0 0", color: "#586058", maxWidth: 640 }}>
              Review pending bookings, confirm reservations, or reject requests after payment has completed.
            </p>
          </div>
          
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
          {[
            { label: "All bookings", value: "all", count: counts.all },
            { label: "Pending approval", value: "pending", count: counts.pending },
            { label: "Confirmed", value: "confirmed", count: counts.confirmed },
            { label: "Rejected", value: "rejected", count: counts.rejected }
          ].map((item) => (
            <div key={item.value} style={{ background: "#fff", borderRadius: 20, padding: 20, boxShadow: "0 18px 50px rgba(15, 23, 42, .06)", border: filter === item.value ? "1px solid #1f4729" : "1px solid #e5e8df" }}>
              <div style={{ color: "#6b7769", fontSize: 14, marginBottom: 8 }}>{item.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#1f2f21" }}>{item.count}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "All", value: "all" },
              { label: "Pending", value: "PENDING APPROVAL" },
              { label: "Confirmed", value: "CONFIRMED" },
              { label: "Rejected", value: "REJECTED" }
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilter(tab.value === "all" ? "all" : tab.value)}
                className={filter === (tab.value === "all" ? "all" : tab.value) ? "filter-button active" : "filter-button"}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ color: '#6b7769', fontSize: 14 }}>Category:</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ padding: 10, borderRadius: 10, border: '1px solid #d1d5db' }}>
              <option value="all">All</option>
              <option value="Home">Homes</option>
              <option value="Experience">Experiences</option>
              <option value="Service">Services</option>
            </select>
          </div>
          <input
            type="search"
            placeholder="Search guest, email, booking id or room"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            style={{ flex: 1, minWidth: 240, padding: 14, borderRadius: 14, border: "1px solid #d1d5db", fontSize: 15, color: "#1f2f21" }}
          />
        </div>

        {loading ? (
          <div style={{ padding: 24, background: "#fff", borderRadius: 20, border: "1px solid #e5e8df" }}>
            Loading bookings...
          </div>
        ) : filteredBookings.length === 0 ? (
          <div style={{ padding: 32, background: "#fff", borderRadius: 20, border: "1px solid #e5e8df", textAlign: "center", color: "#4b5563" }}>
            <h2 style={{ marginBottom: 8 }}>No bookings found</h2>
            <p style={{ margin: 0 }}>Try resetting the filter or updating your search keywords.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 18 }}>
            {filteredBookings.map((booking) => (
              <div key={booking.id} style={{ background: "#fff", borderRadius: 24, padding: 24, boxShadow: "0 20px 60px rgba(15, 23, 42, .06)", border: "1px solid #e5e8df" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{booking.listingTitle || "StayVista reservation"}</div>
                    <div style={{ marginTop: 6, color: "#4b5563" }}>{booking.checkInDate || "—"} → {booking.checkOutDate || "—"}</div>
                  </div>
                  <span style={{ ...statusBadgeStyle(booking.status), borderRadius: 999, padding: "8px 14px", fontWeight: 700, fontSize: 13 }}>
                    {booking.status}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 22 }}>
                  <div>
                    <div style={{ color: "#6b7769", fontSize: 14 }}>Guest</div>
                    <div style={{ fontWeight: 700, color: "#1f2f21" }}>{booking.guestName}</div>
                    <div style={{ marginTop: 4, color: "#4b5563" }}>{booking.guestEmail}</div>
                    <div style={{ marginTop: 4, color: "#4b5563" }}>{booking.phoneNumber}</div>
                  </div>
                  <div>
                    <div style={{ color: "#6b7769", fontSize: 14 }}>Booking info</div>
                    <div style={{ display: "grid", gap: 8, marginTop: 8, color: "#1f2f21" }}>
                      <span><strong>Amount:</strong> PHP {Number(booking.amount).toLocaleString()}</span>
                      <span><strong>Payment:</strong> {booking.paymentStatus || "Completed"}</span>
                      <span><strong>Booking ticket:</strong> {booking.bookingId || booking.id}</span>
                      <span><strong>Booking ID:</strong> {booking.id}</span>
                      <span><strong>Date:</strong> {formatDate(booking.paymentDate || booking.createdAt)}</span>
                    </div>
                  </div>
                </div>
                {booking.status === "PENDING APPROVAL" ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
                    <button
                      type="button"
                      disabled={actionLoadingId === booking.id}
                      onClick={() => handleStatusAction(booking, "CONFIRMED")}
                      className="action-button"
                    >
                      {actionLoadingId === booking.id ? "Updating…" : "Approve"}
                    </button>
                    <button
                      type="button"
                      disabled={actionLoadingId === booking.id}
                      onClick={() => handleStatusAction(booking, "REJECTED")}
                      className="action-button secondary"
                      style={{ background: "#fff", color: "#b91c1c", borderColor: "#fca5a5" }}
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {menuOpen && (
        <div className="guest-menu-dropdown guest-menu-dropdown-fixed">
          <button type="button" className="menu-item menu-item-icon" onClick={() => navigate("/account-settings")}> 
            <i className="fa-solid fa-gear" aria-hidden="true" />
            <span>Account settings</span>
          </button>
          <button type="button" className="menu-item menu-item-icon"> 
            <i className="fa-solid fa-book-open" aria-hidden="true" />
            <span>Hosting resources</span>
          </button>
          <button type="button" className="menu-item menu-item-icon"> 
            <i className="fa-solid fa-circle-question" aria-hidden="true" />
            <span>Get help</span>
          </button>
          <button type="button" className="menu-item menu-item-icon" onClick={() => navigate("/host/cohosts")}> 
            <i className="fa-solid fa-users" aria-hidden="true" />
            <span>Find a co-host</span>
          </button>
          <button type="button" className="menu-item menu-item-icon" onClick={() => navigate("/host/create-listing")}> 
            <i className="fa-solid fa-square-plus" aria-hidden="true" />
            <span>Create a new listing</span>
          </button>
          <button type="button" className="menu-item menu-item-icon"> 
            <i className="fa-solid fa-user-plus" aria-hidden="true" />
            <span>Refer a host</span>
          </button>

          <div className="menu-divider" />

          <button type="button" className="menu-item menu-item-icon" onClick={handleLogout}> 
            <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}

