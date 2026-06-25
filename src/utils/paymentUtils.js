import { db } from "../firebase";
import { collection, addDoc, updateDoc, doc, getDocs, query, orderBy, serverTimestamp } from "firebase/firestore";

// Create a new payment record
export const createPayment = async (paymentData) => {
  try {
    const paymentsRef = collection(db, "payments");
    const docRef = await addDoc(paymentsRef, {
      ...paymentData,
      createdAt: serverTimestamp(),
      status: paymentData.status || "pending",
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating payment:", error);
    throw error;
  }
};

// Update payment status
export const updatePaymentStatus = async (paymentId, status) => {
  try {
    const paymentRef = doc(db, "payments", paymentId);
    await updateDoc(paymentRef, {
      status: status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    throw error;
  }
};

// Get all payments
export const getAllPayments = async () => {
  try {
    const paymentsRef = collection(db, "payments");
    const q = query(paymentsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching payments:", error);
    throw error;
  }
};

// Approve payout request
export const approvePayout = async (paymentId) => {
  return updatePaymentStatus(paymentId, "approved");
};

// Verify payment
export const verifyPayment = async (paymentId) => {
  return updatePaymentStatus(paymentId, "verified");
};