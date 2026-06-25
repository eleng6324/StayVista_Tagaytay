const BOOKING_STORAGE_KEY = "stayvista_bookings";
const TRANSACTION_STORAGE_KEY = "stayvista_transactions";

export function loadBookings() {
  try {
    const saved = localStorage.getItem(BOOKING_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Failed to load bookings from localStorage", error);
    return [];
  }
}

export function filterBookingsByHost(bookings, hostId = "", hostEmail = "") {
  const normalizedHostId = String(hostId || "").trim();
  const normalizedHostEmail = String(hostEmail || "").trim().toLowerCase();

  return bookings.filter((booking) => {
    const bookingHostId = String(booking.hostId || "").trim();
    const bookingHostEmail = String(booking.hostEmail || "").trim().toLowerCase();

    return Boolean(
      (normalizedHostId && bookingHostId === normalizedHostId) ||
      (normalizedHostEmail && bookingHostEmail && bookingHostEmail === normalizedHostEmail)
    );
  });
}

export function saveBookings(bookings) {
  try {
    localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(bookings));
    return bookings;
  } catch (error) {
    console.error("Failed to save bookings to localStorage", error);
    return bookings;
  }
}

export function saveBooking(booking) {
  const allBookings = loadBookings().filter((item) => item.id !== booking.id);
  return saveBookings([booking, ...allBookings]);
}

export function getBookingById(id) {
  return loadBookings().find((booking) => booking.id === id) || null;
}

export function updateBookingStatus(id, status) {
  const bookings = loadBookings();
  let updatedBooking = null;
  const updatedBookings = bookings.map((booking) => {
    if (booking.id === id) {
      updatedBooking = {
        ...booking,
        status,
        updatedAt: new Date().toISOString()
      };
      return updatedBooking;
    }
    return booking;
  });
  if (updatedBooking) {
    saveBookings(updatedBookings);
    updateTransactionStatusByBookingId(id, status);
  }
  return updatedBooking;
}

export function updateTransactionStatusByBookingId(bookingId, status) {
  try {
    const allTransactions = JSON.parse(localStorage.getItem(TRANSACTION_STORAGE_KEY) || "[]");
    const updatedTransactions = allTransactions.map((tx) => {
      if (tx.id === bookingId || tx.booking?.id === bookingId || tx.bookingId === bookingId) {
        return {
          ...tx,
          booking: {
            ...tx.booking,
            status
          }
        };
      }
      return tx;
    });
    localStorage.setItem(TRANSACTION_STORAGE_KEY, JSON.stringify(updatedTransactions));
    return updatedTransactions;
  } catch (error) {
    console.error("Failed to update transaction status for booking", error);
    return [];
  }
}

export function filterBookingsByStatus(status) {
  const bookings = loadBookings();
  if (!status || status.toLowerCase() === "all") {
    return bookings;
  }
  return bookings.filter((booking) => booking.status === status);
}

export function searchBookings(searchTerm) {
  const bookings = loadBookings();
  if (!searchTerm?.trim()) {
    return bookings;
  }
  const query = searchTerm.toLowerCase();
  return bookings.filter((booking) => {
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
}
