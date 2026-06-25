import { db } from "../firebase";
import { collection, addDoc, updateDoc, doc, getDocs, query, orderBy, serverTimestamp } from "firebase/firestore";

// Create a new service fee record
export const createServiceFee = async (feeData) => {
  try {
    const feesRef = collection(db, "serviceFees");
    const docRef = await addDoc(feesRef, {
      ...feeData,
      createdAt: serverTimestamp(),
      status: feeData.status || "pending",
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating service fee:", error);
    throw error;
  }
};

// Update service fee status
export const updateServiceFeeStatus = async (feeId, status) => {
  try {
    const feeRef = doc(db, "serviceFees", feeId);
    await updateDoc(feeRef, {
      status: status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating service fee status:", error);
    throw error;
  }
};

// Get all service fees
export const getAllServiceFees = async () => {
  try {
    const feesRef = collection(db, "serviceFees");
    const q = query(feesRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching service fees:", error);
    throw error;
  }
};

// Calculate host earnings summary
export const calculateHostEarnings = async (hostId) => {
  try {
    const fees = await getAllServiceFees();
    // Credit fees to either the approver host or the listing host
    const hostFees = fees.filter(fee => (fee.approverHostId || fee.hostId) === hostId);

    const totalBookingAmount = hostFees.reduce((sum, fee) => sum + (fee.bookingAmount || 0), 0);
    const totalPlatformFees = hostFees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
    const totalPaidFees = hostFees
      .filter(fee => fee.status === "settled")
      .reduce((sum, fee) => sum + (fee.amount || 0), 0);
    const pendingSettlement = Math.max(0, totalPlatformFees - totalPaidFees);
    const totalHostPayout = Math.max(0, totalBookingAmount - totalPlatformFees);

    return {
      hostId,
      totalBookingAmount,
      totalPlatformFees,
      totalHostPayout,
      totalPaidFees,
      pendingSettlement,
      feeCount: hostFees.length,
    };
  } catch (error) {
    console.error("Error calculating host earnings:", error);
    throw error;
  }
};

// Settle pending fees
export const settleServiceFee = async (feeId) => {
  return updateServiceFeeStatus(feeId, "settled");
};

// Update service fee approver info
export const updateServiceFeeApprover = async (feeId, approverHostId) => {
  try {
    const feeRef = doc(db, "serviceFees", feeId);
    await updateDoc(feeRef, {
      approverHostId: approverHostId,
      approvalDate: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating service fee approver:", error);
    throw error;
  }
};