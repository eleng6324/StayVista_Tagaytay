import {
  addDoc,
  collection,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  updateDoc,
  doc
} from "firebase/firestore";
import { db } from "../firebase";

const RESERVATIONS_COLLECTION = "reservations";

function normalizeBookingRecord(booking) {
  return {
    ...booking,
    bookingId: booking.bookingId || booking.id || booking.reservationId,
    reservationId: booking.reservationId || booking.bookingId || booking.id,
    guestId: booking.guestId || "",
    hostId: booking.hostId || "",
    guestEmail: booking.guestEmail || "",
    hostEmail: booking.hostEmail || "",
    createdAt: booking.createdAt ? booking.createdAt : serverTimestamp(),
    updatedAt: serverTimestamp()
  };
}

export async function saveBookingToFirestore(booking) {
  try {
    const normalizedBooking = normalizeBookingRecord(booking);
    const bookingsRef = collection(db, RESERVATIONS_COLLECTION);
    const docRef = await addDoc(bookingsRef, normalizedBooking);
    return { id: docRef.id, ...normalizedBooking };
  } catch (error) {
    console.error("Failed to save booking to Firestore:", error);
    throw error;
  }
}

export async function getGuestBookings(guestId) {
  if (!guestId) return [];
  try {
    const reservationsRef = collection(db, RESERVATIONS_COLLECTION);
    const q = query(reservationsRef, where("guestId", "==", guestId), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (error) {
    console.error("Failed to fetch guest reservations from Firestore:", error);
    return [];
  }
}

export async function getHostBookingApprovals(hostId, isAdmin = false) {
  try {
    const reservationsRef = collection(db, RESERVATIONS_COLLECTION);
    const q = isAdmin
      ? query(reservationsRef, orderBy("createdAt", "desc"))
      : hostId
      ? query(reservationsRef, where("hostId", "==", hostId), orderBy("createdAt", "desc"))
      : query(reservationsRef, orderBy("createdAt", "desc"));

    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (error) {
    console.error("Failed to fetch host reservation approvals from Firestore:", error);
    return [];
  }
}

export async function updateBookingStatusInFirestore(bookingId, status) {
  try {
    const reservationsRef = collection(db, RESERVATIONS_COLLECTION);
    const directRef = doc(db, RESERVATIONS_COLLECTION, bookingId);
    const directSnap = await getDoc(directRef);

    if (directSnap.exists()) {
      await updateDoc(directRef, {
        status,
        updatedAt: serverTimestamp()
      });
      return { id: directSnap.id, ...directSnap.data(), status };
    }

    let q = query(reservationsRef, where("reservationId", "==", bookingId));
    let snapshot = await getDocs(q);
    if (snapshot.empty) {
      q = query(reservationsRef, where("bookingId", "==", bookingId));
      snapshot = await getDocs(q);
    }

    if (snapshot.empty) {
      console.warn(`No reservation found for bookingId=${bookingId}`);
      return null;
    }

    const updatedBookings = [];
    for (const docSnap of snapshot.docs) {
      const reservationRef = doc(db, RESERVATIONS_COLLECTION, docSnap.id);
      await updateDoc(reservationRef, {
        status,
        updatedAt: serverTimestamp()
      });
      updatedBookings.push({ id: docSnap.id, ...docSnap.data(), status });
    }

    return updatedBookings[0] || null;
  } catch (error) {
    console.error("Failed to update reservation status in Firestore:", error);
    return null;
  }
}
