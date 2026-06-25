import { db } from "../firebase";
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from "firebase/firestore";

// Generate sales report
export const generateSalesReport = async (startDate, endDate) => {
  try {
    const bookingsRef = collection(db, "bookings");
    const q = query(
      bookingsRef,
      where("createdAt", ">=", new Date(startDate)),
      where("createdAt", "<=", new Date(endDate)),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
    const confirmedBookings = bookings.filter(booking => booking.status === "confirmed").length;
    const cancelledBookings = bookings.filter(booking => booking.status === "cancelled").length;

    return {
      type: "sales",
      period: { startDate, endDate },
      data: {
        totalBookings,
        totalRevenue,
        confirmedBookings,
        cancelledBookings,
        averageBookingValue: totalBookings > 0 ? totalRevenue / totalBookings : 0,
        bookingsByStatus: {
          confirmed: confirmedBookings,
          cancelled: cancelledBookings,
          pending: bookings.filter(b => b.status === "pending").length,
        }
      },
      generatedAt: serverTimestamp(),
    };
  } catch (error) {
    console.error("Error generating sales report:", error);
    throw error;
  }
};

// Generate guest feedback report
export const generateGuestFeedbackReport = async (startDate, endDate) => {
  try {
    // This would typically fetch from a reviews/feedback collection
    // For now, we'll use mock data based on existing listings
    const { homeSections, experienceSections } = await import("../mockData");

    const allListings = [];
    homeSections.forEach(section => {
      section.items.forEach(item => {
        allListings.push({
          ...item,
          type: "Home",
          reviews: Math.floor(Math.random() * 100) + 10,
        });
      });
    });

    experienceSections.forEach(section => {
      section.items.forEach(item => {
        allListings.push({
          ...item,
          type: "Experience",
          reviews: Math.floor(Math.random() * 80) + 5,
        });
      });
    });

    const ratedListings = allListings.filter(item => item.rating !== "New");
    const averageRating = ratedListings.reduce((sum, item) => sum + parseFloat(item.rating), 0) / ratedListings.length;
    const totalReviews = ratedListings.reduce((sum, item) => sum + item.reviews, 0);

    return {
      type: "guest_feedback",
      period: { startDate, endDate },
      data: {
        totalReviews,
        averageRating: averageRating.toFixed(1),
        totalListings: allListings.length,
        ratedListings: ratedListings.length,
        topRatedListings: ratedListings
          .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
          .slice(0, 5),
        lowestRatedListings: ratedListings
          .sort((a, b) => parseFloat(a.rating) - parseFloat(b.rating))
          .slice(0, 5),
      },
      generatedAt: serverTimestamp(),
    };
  } catch (error) {
    console.error("Error generating guest feedback report:", error);
    throw error;
  }
};

// Generate cancellations report
export const generateCancellationsReport = async (startDate, endDate) => {
  try {
    const bookingsRef = collection(db, "bookings");
    const q = query(
      bookingsRef,
      where("createdAt", ">=", new Date(startDate)),
      where("createdAt", "<=", new Date(endDate)),
      where("status", "==", "cancelled"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    const cancellations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const totalCancellations = cancellations.length;
    const cancellationRate = 0; // Would need total bookings for accurate rate
    const averageDaysToCancellation = cancellations.length > 0
      ? cancellations.reduce((sum, booking) => {
          const created = booking.createdAt?.toDate?.() || new Date(booking.createdAt);
          const cancelled = booking.cancelledAt?.toDate?.() || new Date();
          const days = Math.ceil((cancelled - created) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / cancellations.length
      : 0;

    return {
      type: "cancellations",
      period: { startDate, endDate },
      data: {
        totalCancellations,
        cancellationRate: `${(cancellationRate * 100).toFixed(1)}%`,
        averageDaysToCancellation: Math.round(averageDaysToCancellation),
        cancellationsByReason: {
          guest_request: Math.floor(totalCancellations * 0.6),
          host_cancellation: Math.floor(totalCancellations * 0.3),
          other: Math.floor(totalCancellations * 0.1),
        },
        recentCancellations: cancellations.slice(0, 10),
      },
      generatedAt: serverTimestamp(),
    };
  } catch (error) {
    console.error("Error generating cancellations report:", error);
    throw error;
  }
};

// Generate host performance report
export const generateHostPerformanceReport = async (startDate, endDate) => {
  try {
    const bookingsRef = collection(db, "bookings");
    const q = query(
      bookingsRef,
      where("createdAt", ">=", new Date(startDate)),
      where("createdAt", "<=", new Date(endDate)),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Group bookings by host
    const hostStats = {};
    bookings.forEach(booking => {
      const hostId = booking.hostId || "unknown";
      if (!hostStats[hostId]) {
        hostStats[hostId] = {
          hostId,
          totalBookings: 0,
          confirmedBookings: 0,
          cancelledBookings: 0,
          totalRevenue: 0,
          averageRating: 0,
        };
      }
      hostStats[hostId].totalBookings++;
      hostStats[hostId].totalRevenue += booking.totalAmount || 0;
      if (booking.status === "confirmed") hostStats[hostId].confirmedBookings++;
      if (booking.status === "cancelled") hostStats[hostId].cancelledBookings++;
    });

    const hostList = Object.values(hostStats);
    const topPerformingHosts = hostList
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    return {
      type: "host_performance",
      period: { startDate, endDate },
      data: {
        totalHosts: hostList.length,
        activeHosts: hostList.filter(h => h.totalBookings > 0).length,
        topPerformingHosts,
        averageBookingsPerHost: hostList.length > 0
          ? hostList.reduce((sum, h) => sum + h.totalBookings, 0) / hostList.length
          : 0,
        hostStats: hostList,
      },
      generatedAt: serverTimestamp(),
    };
  } catch (error) {
    console.error("Error generating host performance report:", error);
    throw error;
  }
};

// Generate financial summary report
export const generateFinancialSummaryReport = async (startDate, endDate) => {
  try {
    const bookingsRef = collection(db, "bookings");
    const paymentsRef = collection(db, "payments");
    const feesRef = collection(db, "serviceFees");

    // Get bookings data
    const bookingsQuery = query(
      bookingsRef,
      where("createdAt", ">=", new Date(startDate)),
      where("createdAt", "<=", new Date(endDate))
    );
    const bookingsSnapshot = await getDocs(bookingsQuery);
    const bookings = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Get payments data
    const paymentsQuery = query(
      paymentsRef,
      where("createdAt", ">=", new Date(startDate)),
      where("createdAt", "<=", new Date(endDate))
    );
    const paymentsSnapshot = await getDocs(paymentsQuery);
    const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Get service fees data
    const feesQuery = query(
      feesRef,
      where("createdAt", ">=", new Date(startDate)),
      where("createdAt", "<=", new Date(endDate))
    );
    const feesSnapshot = await getDocs(feesQuery);
    const fees = feesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
    const totalServiceFees = fees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
    const totalPayouts = payments
      .filter(payment => payment.type === "host_payout" && payment.status === "approved")
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);

    const netProfit = totalRevenue - totalServiceFees - totalPayouts;

    return {
      type: "financial_summary",
      period: { startDate, endDate },
      data: {
        totalRevenue,
        totalServiceFees,
        totalPayouts,
        netProfit,
        profitMargin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0,
        paymentMethods: {
          processed: payments.filter(p => p.status === "approved").length,
          pending: payments.filter(p => p.status === "pending").length,
        },
        feeSettlement: {
          collected: fees.filter(f => f.status === "settled").length,
          pending: fees.filter(f => f.status === "pending").length,
        },
      },
      generatedAt: serverTimestamp(),
    };
  } catch (error) {
    console.error("Error generating financial summary report:", error);
    throw error;
  }
};

// Save report to database
export const saveReport = async (reportData) => {
  try {
    const reportsRef = collection(db, "reports");
    const docRef = await addDoc(reportsRef, reportData);
    return docRef.id;
  } catch (error) {
    console.error("Error saving report:", error);
    throw error;
  }
};

// Get all saved reports
export const getAllReports = async () => {
  try {
    const reportsRef = collection(db, "reports");
    const q = query(reportsRef, orderBy("generatedAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching reports:", error);
    throw error;
  }
};