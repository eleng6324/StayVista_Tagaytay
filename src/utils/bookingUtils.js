import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Create a new booking in Firestore
 * @param {Object} bookingData - The booking information
 * @returns {Promise<string>} - The booking ID
 */
export const createBooking = async (bookingData) => {
  try {
    const bookingsRef = collection(db, "bookings");
    const docRef = await addDoc(bookingsRef, {
      ...bookingData,
      createdAt: serverTimestamp(),
      status: bookingData.status || "confirmed",
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating booking:", error);
    throw error;
  }
};

/**
 * Format booking data for saving
 * @param {Object} params - Booking parameters
 * @returns {Object} - Formatted booking data
 */
export const formatBookingData = ({
  listingTitle,
  listingCategory,
  guestEmail,
  guestName,
  checkInDate,
  checkOutDate,
  nights,
  totalPrice,
  property,
}) => {
  return {
    listingTitle: listingTitle || property,
    listingCategory,
    guestEmail,
    guestName,
    checkInDate,
    checkOutDate,
    nights,
    totalPrice,
    property: property || listingTitle,
    status: "confirmed",
  };
};
