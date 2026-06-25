import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import Navbar from "../components/Navbar";
import { homeSections, experienceSections } from "../mockData";
import { getAllPayments, updatePaymentStatus } from "../utils/paymentUtils";
import { getAllServiceFees, updateServiceFeeStatus, calculateHostEarnings } from "../utils/serviceFeeUtils";
import {
  generateSalesReport,
  generateGuestFeedbackReport,
  generateCancellationsReport,
  generateHostPerformanceReport,
  generateFinancialSummaryReport,
  getAllReports,
  saveReport
} from "../utils/reportsUtils";
import {
  generateBookingReport,
  generateRevenueReport,
  generateGuestReport,
  generatePaymentReport,
  exportReportToCSV
} from "../utils/reportExport";

function AdminHome() {
  const navigate = useNavigate();
  const [profilePhotoURL, setProfilePhotoURL] = useState("");
  const [profileInitial, setProfileInitial] = useState("A");
  const [bestReviews, setBestReviews] = useState([]);
  const [lowestReviews, setLowestReviews] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [serviceFees, setServiceFees] = useState([]);
  const [loadingServiceFees, setLoadingServiceFees] = useState(true);
  const [hostEarnings, setHostEarnings] = useState([]);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportPeriod, setReportPeriod] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0], // today
  });
  const [currentReportData, setCurrentReportData] = useState(null);
  const [currentReportType, setCurrentReportType] = useState(null);
  const [cancellationRules, setCancellationRules] = useState([
    "Flexible cancellation windows",
    "Refund policy enforcement",
    "Late cancellation review",
  ]);
  const [rulesAndRegulations, setRulesAndRegulations] = useState([
    "Host onboarding compliance",
    "Guest conduct guidelines",
    "Property standards and safety checks",
  ]);
  const [editingSection, setEditingSection] = useState(null);
  const [policyDraft, setPolicyDraft] = useState("");
  const [policySaveMessage, setPolicySaveMessage] = useState("");

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setProfilePhotoURL(user.photoURL || "");
      const initial = user.displayName?.trim().charAt(0) || user.email?.trim().charAt(0) || "A";
      setProfileInitial(initial.toUpperCase());
    }
  }, []);

  useEffect(() => {
    // Extract all listings from homeSections and experienceSections
    const allListings = [];

    homeSections.forEach((section) => {
      section.items.forEach((item) => {
        allListings.push({
          name: item.title,
          rating: item.rating,
          reviews: Math.floor(Math.random() * 100) + 10,
          host: "Host Name",
          type: "Home",
        });
      });
    });

    experienceSections.forEach((section) => {
      section.items.forEach((item) => {
        allListings.push({
          name: item.title,
          rating: item.rating,
          reviews: Math.floor(Math.random() * 80) + 5,
          host: "Host Name",
          type: "Experience",
        });
      });
    });

    // Filter out "New" ratings
    const ratedListings = allListings.filter((item) => item.rating !== "New");

    // Convert ratings to numbers for sorting
    const numericListings = ratedListings.map((item) => ({
      ...item,
      ratingNum: parseFloat(item.rating),
    }));

    // Sort by rating descending for best reviews
    const best = numericListings
      .sort((a, b) => b.ratingNum - a.ratingNum)
      .slice(0, 3);

    // Sort by rating ascending for lowest reviews
    const lowest = numericListings
      .sort((a, b) => a.ratingNum - b.ratingNum)
      .slice(0, 3)
      .map((item) => ({
        ...item,
        issue: "Review concerns flagged",
      }));

    setBestReviews(best);
    setLowestReviews(lowest);
  }, []);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoadingBookings(true);
        const bookingsRef = collection(db, "bookings");
        const q = query(bookingsRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        
        const bookingsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        setBookings(bookingsData);
      } catch (error) {
        console.error("Error fetching bookings:", error);
        setBookings([]);
      } finally {
        setLoadingBookings(false);
      }
    };

    fetchBookings();
  }, []);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoadingPayments(true);
        const paymentsData = await getAllPayments();
        setPayments(paymentsData);
      } catch (error) {
        console.error("Error fetching payments:", error);
        setPayments([]);
      } finally {
        setLoadingPayments(false);
      }
    };

    fetchPayments();
  }, []);

  useEffect(() => {
    const fetchServiceFees = async () => {
      try {
        setLoadingServiceFees(true);
        const feesData = await getAllServiceFees();
        setServiceFees(feesData);

        // Calculate earnings for each unique host
        const hostIds = [...new Set(feesData.map(fee => fee.hostId).filter(Boolean))];
        const earningsPromises = hostIds.map(hostId => calculateHostEarnings(hostId));
        const earningsData = await Promise.all(earningsPromises);
        setHostEarnings(earningsData);
      } catch (error) {
        console.error("Error fetching service fees:", error);
        setServiceFees([]);
        setHostEarnings([]);
      } finally {
        setLoadingServiceFees(false);
      }
    };

    fetchServiceFees();
  }, []);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoadingReports(true);
        const reportsData = await getAllReports();
        setReports(reportsData);
      } catch (error) {
        console.error("Error fetching reports:", error);
        setReports([]);
      } finally {
        setLoadingReports(false);
      }
    };

    fetchReports();
  }, []);

  useEffect(() => {
    const storedCancellation = localStorage.getItem("adminCancellationRules");
    const storedRegulations = localStorage.getItem("adminRulesAndRegulations");
    if (storedCancellation) {
      try {
        const parsed = JSON.parse(storedCancellation);
        if (Array.isArray(parsed)) setCancellationRules(parsed);
      } catch (error) {
        console.error("Failed to parse stored cancellation rules", error);
      }
    }
    if (storedRegulations) {
      try {
        const parsed = JSON.parse(storedRegulations);
        if (Array.isArray(parsed)) setRulesAndRegulations(parsed);
      } catch (error) {
        console.error("Failed to parse stored rules and regulations", error);
      }
    }
  }, []);

  const formatDate = (date) => {
    if (!date) return "N/A";
    if (date.toDate) return date.toDate().toLocaleDateString();
    if (typeof date === "string") return new Date(date).toLocaleDateString();
    return "N/A";
  };

  const handleVerifyPayment = async (paymentId) => {
    try {
      await updatePaymentStatus(paymentId, "verified");
      // Update local state
      setPayments(payments.map(payment =>
        payment.id === paymentId ? { ...payment, status: "verified" } : payment
      ));
    } catch (error) {
      console.error("Error verifying payment:", error);
    }
  };

  const handleApprovePayout = async (paymentId) => {
    try {
      await updatePaymentStatus(paymentId, "approved");
      // Update local state
      setPayments(payments.map(payment =>
        payment.id === paymentId ? { ...payment, status: "approved" } : payment
      ));
    } catch (error) {
      console.error("Error approving payout:", error);
    }
  };

  const handleSettleServiceFee = async (feeId) => {
    try {
      await updateServiceFeeStatus(feeId, "settled");
      // Update local state
      setServiceFees(serviceFees.map(fee =>
        fee.id === feeId ? { ...fee, status: "settled" } : fee
      ));
    } catch (error) {
      console.error("Error settling service fee:", error);
    }
  };

  const handleGenerateReport = async (reportType) => {
    try {
      setGeneratingReport(true);
      let reportData;

      // Handle new report types from reportExport.js
      switch (reportType) {
        case "booking":
          reportData = generateBookingReport(bookings, reportPeriod.startDate, reportPeriod.endDate);
          break;
        case "revenue":
          reportData = generateRevenueReport(bookings, reportPeriod.startDate, reportPeriod.endDate);
          break;
        case "guest":
          reportData = generateGuestReport(bookings, reportPeriod.startDate, reportPeriod.endDate);
          break;
        case "payment":
          reportData = generatePaymentReport(payments, reportPeriod.startDate, reportPeriod.endDate);
          break;
        // Handle legacy report types
        case "sales":
          reportData = await generateSalesReport(reportPeriod.startDate, reportPeriod.endDate);
          break;
        case "guest_feedback":
          reportData = await generateGuestFeedbackReport(reportPeriod.startDate, reportPeriod.endDate);
          break;
        case "cancellations":
          reportData = await generateCancellationsReport(reportPeriod.startDate, reportPeriod.endDate);
          break;
        case "host_performance":
          reportData = await generateHostPerformanceReport(reportPeriod.startDate, reportPeriod.endDate);
          break;
        case "financial_summary":
          reportData = await generateFinancialSummaryReport(reportPeriod.startDate, reportPeriod.endDate);
          break;
        default:
          throw new Error("Unknown report type");
      }

      // Store current report data for display and export
      setCurrentReportData(reportData);
      setCurrentReportType(reportType);

      // Also save legacy reports
      if (["sales", "guest_feedback", "cancellations", "host_performance", "financial_summary"].includes(reportType)) {
        const reportId = await saveReport(reportData);
        const newReport = { id: reportId, ...reportData };
        setReports([newReport, ...reports]);
      }

      alert(`${reportType.replace('_', ' ').toUpperCase()} report generated successfully!`);
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Error generating report. Please try again.");
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleDownloadReport = (report) => {
    // Create a simple text representation of the report
    let reportContent = `${report.type.toUpperCase().replace('_', ' ')} REPORT\n`;
    reportContent += `Generated: ${new Date().toLocaleDateString()}\n`;
    reportContent += `Period: ${report.period.startDate} to ${report.period.endDate}\n\n`;

    // Add report data based on type
    switch (report.type) {
      case "sales":
        reportContent += `Total Bookings: ${report.data.totalBookings}\n`;
        reportContent += `Total Revenue: $${report.data.totalRevenue.toFixed(2)}\n`;
        reportContent += `Confirmed Bookings: ${report.data.confirmedBookings}\n`;
        reportContent += `Cancelled Bookings: ${report.data.cancelledBookings}\n`;
        reportContent += `Average Booking Value: $${report.data.averageBookingValue.toFixed(2)}\n`;
        break;
      case "guest_feedback":
        reportContent += `Total Reviews: ${report.data.totalReviews}\n`;
        reportContent += `Average Rating: ${report.data.averageRating}/5\n`;
        reportContent += `Total Listings: ${report.data.totalListings}\n`;
        break;
      case "financial_summary":
        reportContent += `Total Revenue: $${report.data.totalRevenue.toFixed(2)}\n`;
        reportContent += `Service Fees: $${report.data.totalServiceFees.toFixed(2)}\n`;
        reportContent += `Host Payouts: $${report.data.totalPayouts.toFixed(2)}\n`;
        reportContent += `Net Profit: $${report.data.netProfit.toFixed(2)}\n`;
        reportContent += `Profit Margin: ${report.data.profitMargin}%\n`;
        break;
      default:
        reportContent += JSON.stringify(report.data, null, 2);
    }

    // Create and download the file
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.type}_report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const startPolicyEdit = (section) => {
    setEditingSection(section);
    if (section === "cancellation") {
      setPolicyDraft(cancellationRules.join("\n"));
    } else {
      setPolicyDraft(rulesAndRegulations.join("\n"));
    }
    setPolicySaveMessage("");
  };

  const cancelPolicyEdit = () => {
    setEditingSection(null);
    setPolicyDraft("");
    setPolicySaveMessage("");
  };

  const savePolicyEdit = () => {
    const updatedList = policyDraft
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (editingSection === "cancellation") {
      setCancellationRules(updatedList);
      localStorage.setItem("adminCancellationRules", JSON.stringify(updatedList));
    } else if (editingSection === "regulations") {
      setRulesAndRegulations(updatedList);
      localStorage.setItem("adminRulesAndRegulations", JSON.stringify(updatedList));
    }

    setEditingSection(null);
    setPolicyDraft("");
    setPolicySaveMessage("Saved successfully.");
    window.setTimeout(() => setPolicySaveMessage(""), 3000);
  };

  const handlePolicyDraftChange = (event) => {
    setPolicyDraft(event.target.value);
  };

  const handleScroll = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <main className="admin-shell">
      <Navbar
        profilePhotoURL={profilePhotoURL}
        profileInitial={profileInitial}
        homePath="/admin"
        actionIcon="fa-right-from-bracket"
        actionLabel="Log out"
        actionCallback={handleLogout}
      />

      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-title">Dashboard Sections</div>
          <nav className="admin-sidebar-nav">
            <button type="button" className="admin-sidebar-link" onClick={() => handleScroll("analytics")}>Analytics</button>
            <button type="button" className="admin-sidebar-link" onClick={() => handleScroll("payments")}>Payment Methods</button>
            <button type="button" className="admin-sidebar-link" onClick={() => handleScroll("service-fee")}>Service Fees</button>
            <button type="button" className="admin-sidebar-link" onClick={() => handleScroll("reports")}>Reports</button>
            <button type="button" className="admin-sidebar-link" onClick={() => handleScroll("policy-compliance")}>Policy & Compliance</button>
          </nav>
        </aside>

        <div className="admin-main-content">
          <section className="admin-hero">
            <div className="admin-hero-header">
              <p className="eyebrow">Admin Dashboard</p>
              <h1>Platform Management</h1>
              <p>
                Monitor platform performance, review analytics, manage compliance, and oversee all operations.
              </p>
              <div style={{ marginTop: 20 }}>
                <button type="button" className="action-button" onClick={() => navigate("/admin/bookings")}>Manage booking approvals</button>
              </div>
            </div>
          </section>

      <section id="analytics" className="admin-analytics">
        <div className="admin-analytics-header">
          <h2>Analytics Dashboard</h2>
          <p>Real-time insights into platform performance and bookings</p>
        </div>

        <div className="admin-analytics-grid">
          <div className="admin-analytics-section">
            <h3>Best Reviews</h3>
            <p className="admin-analytics-subtitle">Top-rated stays and hosts</p>
            <div className="admin-analytics-list">
              {bestReviews.map((item, idx) => (
                <div key={idx} className="admin-analytics-item">
                  <div className="admin-analytics-item-header">
                    <strong>{item.name}</strong>
                    <span className="admin-rating">★ {item.rating}</span>
                  </div>
                  <div className="admin-analytics-item-details">
                    <span className="admin-host">{item.type}</span>
                    <span className="admin-count">{item.reviews} reviews</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-analytics-section">
            <h3>Lowest Reviews</h3>
            <p className="admin-analytics-subtitle">Flagged experiences requiring follow-up</p>
            <div className="admin-analytics-list">
              {lowestReviews.map((item, idx) => (
                <div key={idx} className="admin-analytics-item admin-analytics-item-warning">
                  <div className="admin-analytics-item-header">
                    <strong>{item.name}</strong>
                    <span className="admin-rating admin-rating-low">★ {item.rating}</span>
                  </div>
                  <div className="admin-analytics-item-details">
                    <span className="admin-host">{item.type}</span>
                    <span className="admin-issue">Issue: {item.issue}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="admin-bookings-section">
          <h3>List of Bookings</h3>
          <p className="admin-analytics-subtitle">Recent reservations and upcoming stays</p>
          
          {loadingBookings ? (
            <div className="admin-bookings-empty">
              <p>Loading bookings...</p>
            </div>
          ) : bookings.length > 0 ? (
            <div className="admin-bookings-table">
              <div className="admin-bookings-header">
                <div className="admin-bookings-col">Property</div>
                <div className="admin-bookings-col">Guest</div>
                <div className="admin-bookings-col">Check In</div>
                <div className="admin-bookings-col">Check Out</div>
                <div className="admin-bookings-col">Status</div>
              </div>
              {bookings.map((booking) => (
                <div key={booking.id} className="admin-bookings-row">
                  <div className="admin-bookings-col">{booking.property || booking.listingTitle || "N/A"}</div>
                  <div className="admin-bookings-col">{booking.guestName || booking.guestEmail || "Guest"}</div>
                  <div className="admin-bookings-col">{formatDate(booking.checkInDate)}</div>
                  <div className="admin-bookings-col">{formatDate(booking.checkOutDate)}</div>
                  <div className="admin-bookings-col">
                    <span className={`admin-status admin-status-${(booking.status || "pending").toLowerCase()}`}>
                      {booking.status || "Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-bookings-empty">
              <p>No bookings yet</p>
              <span>When guests make reservations, they will appear here.</span>
            </div>
          )}
        </div>
      </section>

      <section id="payments" className="admin-payments-section">
        <h3>Payment Methods</h3>
        <p className="admin-analytics-subtitle">Review pending payments and approve payout requests</p>
        
        {loadingPayments ? (
          <div className="admin-bookings-empty">
            <p>Loading payments...</p>
          </div>
        ) : payments.length > 0 ? (
          <div className="admin-bookings-table">
            <div className="admin-bookings-header">
              <div className="admin-bookings-col">Type</div>
              <div className="admin-bookings-col">Amount</div>
              <div className="admin-bookings-col">User</div>
              <div className="admin-bookings-col">Date</div>
              <div className="admin-bookings-col">Status</div>
              <div className="admin-bookings-col">Actions</div>
            </div>
            {payments.map((payment) => (
              <div key={payment.id} className="admin-bookings-row">
                <div className="admin-bookings-col">
                  {payment.type === "host_payout" ? "Host Payout" : "Guest Payment"}
                </div>
                <div className="admin-bookings-col">${payment.amount}</div>
                <div className="admin-bookings-col">{payment.userName || payment.userEmail || "User"}</div>
                <div className="admin-bookings-col">{formatDate(payment.createdAt)}</div>
                <div className="admin-bookings-col">
                  <span className={`admin-status admin-status-${(payment.status || "pending").toLowerCase()}`}>
                    {payment.status || "Pending"}
                  </span>
                </div>
                <div className="admin-bookings-col">
                  {payment.status === "pending" && (
                    <button
                      className="admin-action-btn admin-verify-btn"
                      onClick={() => handleVerifyPayment(payment.id)}
                    >
                      Verify
                    </button>
                  )}
                  {payment.status === "verified" && payment.type === "host_payout" && (
                    <button
                      className="admin-action-btn admin-approve-btn"
                      onClick={() => handleApprovePayout(payment.id)}
                    >
                      Approve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="admin-bookings-empty">
            <p>No payments yet</p>
            <span>When payments are processed, they will appear here for review.</span>
          </div>
        )}
      </section>

      <section id="service-fee" className="admin-service-fees-section">
        <h3>Service Fees from Hosts</h3>
        <p className="admin-analytics-subtitle">Monitor platform fees, settlements, and host earnings</p>

        {loadingServiceFees ? (
          <div className="admin-bookings-empty">
            <p>Loading service fees...</p>
          </div>
        ) : (
          <>
            {/* Host Earnings Summary */}
            <div className="admin-earnings-summary">
              <h4>Host Earnings Overview</h4>
              <div className="admin-earnings-grid">
                {hostEarnings.map((earning) => (
                  <div key={earning.hostId} className="admin-earnings-card">
                    <div className="admin-earnings-header">
                      <strong>{earning.hostId || "Unknown host"}</strong>
                      <span className="admin-fee-percentage">10% Platform Fee</span>
                    </div>
                    <div className="admin-earnings-stats">
                      <div className="admin-earnings-stat">
                        <span className="admin-stat-label">Booking Value</span>
                        <span className="admin-stat-value">${(earning.totalBookingAmount || 0).toFixed(2)}</span>
                      </div>
                      <div className="admin-earnings-stat">
                        <span className="admin-stat-label">Platform Fees</span>
                        <span className="admin-stat-value">${(earning.totalPlatformFees || 0).toFixed(2)}</span>
                      </div>
                      <div className="admin-earnings-stat">
                        <span className="admin-stat-label">Host Payout</span>
                        <span className="admin-stat-value">${(earning.totalHostPayout || 0).toFixed(2)}</span>
                      </div>
                      <div className="admin-earnings-stat">
                        <span className="admin-stat-label">Pending Fee Settlement</span>
                        <span className="admin-stat-value admin-stat-pending">${(earning.pendingSettlement || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Service Fees Table */}
            <div className="admin-fees-table-section">
              <h4>Fee Transactions</h4>
              {serviceFees.length > 0 ? (
                <div className="admin-bookings-table">
                  <div className="admin-bookings-header">
                    <div className="admin-bookings-col">Host</div>
                    <div className="admin-bookings-col">Amount</div>
                    <div className="admin-bookings-col">Percentage</div>
                    <div className="admin-bookings-col">Date</div>
                    <div className="admin-bookings-col">Status</div>
                    <div className="admin-bookings-col">Actions</div>
                  </div>
                  {serviceFees.map((fee) => (
                    <div key={fee.id} className="admin-bookings-row">
                      <div className="admin-bookings-col">{fee.hostName || fee.hostId || "Host"}</div>
                      <div className="admin-bookings-col">${fee.amount?.toFixed(2) || "0.00"}</div>
                      <div className="admin-bookings-col">{fee.percentage || 3}%</div>
                      <div className="admin-bookings-col">{formatDate(fee.createdAt)}</div>
                      <div className="admin-bookings-col">
                        <span className={`admin-status admin-status-${(fee.status || "pending").toLowerCase()}`}>
                          {fee.status || "Pending"}
                        </span>
                      </div>
                      <div className="admin-bookings-col">
                        {fee.status === "pending" && (
                          <button
                            className="admin-action-btn admin-settle-btn"
                            onClick={() => handleSettleServiceFee(fee.id)}
                          >
                            Settle
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="admin-bookings-empty">
                  <p>No service fees yet</p>
                  <span>When hosts earn money from bookings, platform fees will appear here.</span>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      <section id="reports" className="admin-reports-section">
        <h3>Generation of Reports</h3>
        <p className="admin-analytics-subtitle">Generate operational reports for platform analytics</p>

        {/* Report Generation Controls */}
        <div className="admin-report-controls">
          <div className="admin-report-period">
            <label>
              Start Date:
              <input
                type="date"
                value={reportPeriod.startDate}
                onChange={(e) => setReportPeriod(prev => ({ ...prev, startDate: e.target.value }))}
                className="admin-date-input"
              />
            </label>
            <label>
              End Date:
              <input
                type="date"
                value={reportPeriod.endDate}
                onChange={(e) => setReportPeriod(prev => ({ ...prev, endDate: e.target.value }))}
                className="admin-date-input"
              />
            </label>
          </div>

          <div className="admin-report-buttons">
            {/* New Report Types */}
            <button
              className="admin-report-btn"
              onClick={() => handleGenerateReport("booking")}
              disabled={generatingReport}
            >
              {generatingReport ? "Generating..." : "Booking Report"}
            </button>
            <button
              className="admin-report-btn"
              onClick={() => handleGenerateReport("revenue")}
              disabled={generatingReport}
            >
              {generatingReport ? "Generating..." : "Revenue Report"}
            </button>
            <button
              className="admin-report-btn"
              onClick={() => handleGenerateReport("guest")}
              disabled={generatingReport}
            >
              {generatingReport ? "Generating..." : "Guest Report"}
            </button>
            <button
              className="admin-report-btn"
              onClick={() => handleGenerateReport("payment")}
              disabled={generatingReport}
            >
              {generatingReport ? "Generating..." : "Payment Report"}
            </button>
            {/* Legacy Report Types */}
            <button
              className="admin-report-btn"
              onClick={() => handleGenerateReport("sales")}
              disabled={generatingReport}
            >
              {generatingReport ? "Generating..." : "Sales Report"}
            </button>
            <button
              className="admin-report-btn"
              onClick={() => handleGenerateReport("guest_feedback")}
              disabled={generatingReport}
            >
              {generatingReport ? "Generating..." : "Guest Feedback"}
            </button>
            <button
              className="admin-report-btn"
              onClick={() => handleGenerateReport("cancellations")}
              disabled={generatingReport}
            >
              {generatingReport ? "Generating..." : "Cancellations"}
            </button>
            <button
              className="admin-report-btn"
              onClick={() => handleGenerateReport("host_performance")}
              disabled={generatingReport}
            >
              {generatingReport ? "Generating..." : "Host Performance"}
            </button>
            <button
              className="admin-report-btn admin-report-btn-primary"
              onClick={() => handleGenerateReport("financial_summary")}
              disabled={generatingReport}
            >
              {generatingReport ? "Generating..." : "Financial Summary"}
            </button>
          </div>

          {/* Export Options */}
          {currentReportData && (
            <div className="admin-report-export">
              <button
                className="admin-report-btn admin-report-export-btn"
                onClick={() => exportReportToCSV(currentReportData, `${currentReportType}_report_${reportPeriod.startDate}_to_${reportPeriod.endDate}`)}
              >
                Export as CSV
              </button>
            </div>
          )}

        {/* Current Report Display */}
        {currentReportData && (
          <div className="admin-report-display">
            <h4>Report: {currentReportType?.replace('_', ' ').toUpperCase()}</h4>
            <div className="admin-report-data">
              {currentReportType === "booking" && (
                <div className="admin-report-details">
                  <div className="admin-report-item">
                    <span>Total Bookings:</span>
                    <strong>{currentReportData.totalBookings || 0}</strong>
                  </div>
                  <div className="admin-report-item">
                    <span>By Status:</span>
                    <div className="admin-report-nested">
                      {Object.entries(currentReportData.byStatus || {}).map(([status, count]) => (
                        <div key={status} className="admin-report-subitem">
                          <span>{status}:</span>
                          <strong>{count}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="admin-report-item">
                    <span>By Category:</span>
                    <div className="admin-report-nested">
                      {Object.entries(currentReportData.byCategory || {}).map(([category, count]) => (
                        <div key={category} className="admin-report-subitem">
                          <span>{category}:</span>
                          <strong>{count}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="admin-report-item">
                    <span>Total Value:</span>
                    <strong>₱{currentReportData.totalValue?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>
                  </div>
                </div>
              )}
              {currentReportType === "revenue" && (
                <div className="admin-report-details">
                  <div className="admin-report-item">
                    <span>Total Revenue:</span>
                    <strong>₱{currentReportData.totalRevenue?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="admin-report-item">
                    <span>Total Discounts:</span>
                    <strong>₱{currentReportData.totalDiscounts?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="admin-report-item">
                    <span>Service Fees Collected:</span>
                    <strong>₱{currentReportData.totalServiceFees?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="admin-report-item">
                    <span>Total Host Payouts:</span>
                    <strong>₱{currentReportData.totalPayouts?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="admin-report-item">
                    <span>Platform Profit:</span>
                    <strong>₱{currentReportData.platformProfit?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>
                  </div>
                </div>
              )}
              {currentReportType === "guest" && (
                <div className="admin-report-details">
                  <div className="admin-report-item">
                    <span>Unique Guests:</span>
                    <strong>{currentReportData.uniqueGuests || 0}</strong>
                  </div>
                  <div className="admin-report-item">
                    <span>Total Bookings:</span>
                    <strong>{currentReportData.totalBookings || 0}</strong>
                  </div>
                  <div className="admin-report-item">
                    <span>Top Spenders:</span>
                    <div className="admin-report-nested">
                      {(currentReportData.topSpenders || []).slice(0, 5).map((guest, idx) => (
                        <div key={idx} className="admin-report-subitem">
                          <span>{guest.name || 'Guest'}</span>
                          <strong>₱{guest.totalSpent?.toLocaleString('en-PH', { minimumFractionDigits: 2 })} ({guest.bookingCount} bookings)</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {currentReportType === "payment" && (
                <div className="admin-report-details">
                  <div className="admin-report-item">
                    <span>Total Transactions:</span>
                    <strong>{currentReportData.totalTransactions || 0}</strong>
                  </div>
                  <div className="admin-report-item">
                    <span>Total Amount:</span>
                    <strong>₱{currentReportData.totalAmount?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="admin-report-item">
                    <span>By Status:</span>
                    <div className="admin-report-nested">
                      {Object.entries(currentReportData.byStatus || {}).map(([status, data]) => (
                        <div key={status} className="admin-report-subitem">
                          <span>{status}: {data.count} transactions</span>
                          <strong>₱{data.amount?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
          <h4>Generated Reports</h4>
          {loadingReports ? (
            <div className="admin-bookings-empty">
              <p>Loading reports...</p>
            </div>
          ) : reports.length > 0 ? (
            <div className="admin-reports-table">
              <div className="admin-reports-header">
                <div className="admin-reports-col">Report Type</div>
                <div className="admin-reports-col">Period</div>
                <div className="admin-reports-col">Generated</div>
                <div className="admin-reports-col">Actions</div>
              </div>
              {reports.map((report) => (
                <div key={report.id} className="admin-reports-row">
                  <div className="admin-reports-col">
                    <span className={`admin-report-type admin-report-type-${report.type}`}>
                      {report.type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="admin-reports-col">
                    {report.period.startDate} to {report.period.endDate}
                  </div>
                  <div className="admin-reports-col">
                    {formatDate(report.generatedAt)}
                  </div>
                  <div className="admin-reports-col">
                    <button
                      className="admin-action-btn admin-download-btn"
                      onClick={() => handleDownloadReport(report)}
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-bookings-empty">
              <p>No reports generated yet</p>
              <span>Use the controls above to generate your first report.</span>
            </div>
          )}
        </div>
      </section>

      <section id="policy-compliance" className="admin-policy-section">
        <h3>Policy & compliance</h3>
        <p className="admin-analytics-subtitle">Manage platform policy, cancellation enforcement, and compliance documentation.</p>

        <div className="admin-policy-grid">
          <article className="admin-policy-card">
            <div className="admin-policy-card-header">
              <h4>Cancellation rules</h4>
              {editingSection !== "cancellation" ? (
                <button type="button" className="admin-policy-edit-btn" onClick={() => startPolicyEdit("cancellation")}>Edit</button>
              ) : null}
            </div>
            {editingSection === "cancellation" ? (
              <>
                <textarea
                  className="admin-policy-textarea"
                  value={policyDraft}
                  onChange={handlePolicyDraftChange}
                  rows={6}
                />
                <div className="admin-policy-card-actions">
                  <button type="button" className="admin-policy-cancel-btn" onClick={cancelPolicyEdit}>Cancel</button>
                  <button type="button" className="admin-policy-save-btn" onClick={savePolicyEdit}>Save</button>
                </div>
              </>
            ) : (
              <ul>
                {cancellationRules.map((rule, idx) => (
                  <li key={idx}>{rule}</li>
                ))}
              </ul>
            )}
          </article>
          <article className="admin-policy-card">
            <div className="admin-policy-card-header">
              <h4>Rules & regulations</h4>
              {editingSection !== "regulations" ? (
                <button type="button" className="admin-policy-edit-btn" onClick={() => startPolicyEdit("regulations")}>Edit</button>
              ) : null}
            </div>
            {editingSection === "regulations" ? (
              <>
                <textarea
                  className="admin-policy-textarea"
                  value={policyDraft}
                  onChange={handlePolicyDraftChange}
                  rows={6}
                />
                <div className="admin-policy-card-actions">
                  <button type="button" className="admin-policy-cancel-btn" onClick={cancelPolicyEdit}>Cancel</button>
                  <button type="button" className="admin-policy-save-btn" onClick={savePolicyEdit}>Save</button>
                </div>
              </>
            ) : (
              <ul>
                {rulesAndRegulations.map((rule, idx) => (
                  <li key={idx}>{rule}</li>
                ))}
              </ul>
            )}
          </article>
        </div>
        {policySaveMessage && <p className="editor-save-feedback" style={{ marginTop: 16 }}>{policySaveMessage}</p>}

        <article className="admin-policy-card admin-policy-log-card">
          <h4>Incident reports & compliance logs</h4>
          <p>Review flagged incidents, compliance alerts, and policy actions taken across the platform.</p>
          <ul>
            <li>Recent incident count: <strong>12</strong></li>
            <li>Open compliance reviews: <strong>4</strong></li>
            <li>Resolved policy actions: <strong>8</strong></li>
          </ul>
        </article>
      </section>
    </div>
  </div>
</main>
  );
}

export default AdminHome;
