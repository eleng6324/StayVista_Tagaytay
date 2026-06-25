import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { auth } from "../firebase";
import PaymentModal from "../components/PaymentModal";
import { saveBooking } from "../utils/bookingStorage";
import { sendGuestPaymentPendingEmail, sendHostNewBookingEmail } from "../utils/emailService";
import { createPayment } from "../utils/paymentUtils";
import { createServiceFee } from "../utils/serviceFeeUtils";

function formatReadableDate(dateValue) {
  if (!dateValue) return "";
  const date = new Date(`${dateValue}T00:00:00`);
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
  return formatter.format(date);
}

function ConfirmAndPay() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const state = location.state || {};
  const {
    listingTitle = "Your reservation",
    checkInDate,
    checkOutDate,
    guestCount = 1,
    price = "",
    coverImage = "",
    hostEmail: stateHostEmail = null,
    hostId: stateHostId = null,
    listingId: stateListingId = null,
    isPublished = false
  } = state;
  const { origin = null, totalPrice: stateTotalPrice = null } = state;

  function parseDateValue(dateValue) {
    return new Date(`${dateValue}T00:00:00`);
  }

  function getNights(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 0;
    const diffMs = parseDateValue(checkOut) - parseDateValue(checkIn);
    return Math.max(0, Math.round(diffMs / 86400000));
  }

  function parseListingPrice(priceText) {
    const cleaned = (priceText || "").replace(/,/g, "");
    const amountMatch = cleaned.match(/(\d[\d]*)/);
    const amount = amountMatch ? Number(amountMatch[1]) : 0;
    const totalMatch = /for\s+(\d+)\s+nights?/i.exec(cleaned);
    if (totalMatch) {
      return { amount, mode: "total", nights: Number(totalMatch[1]) };
    }

    if (/\/\s*night|per night|nightly/i.test(cleaned)) {
      return { amount, mode: "night" };
    }

    return { amount, mode: "other" };
  }

  function formatAmount(amount) {
    return `PHP ${amount.toLocaleString("en-US")}`;
  }

  const nights = getNights(checkInDate, checkOutDate);
  const parsedPrice = parseListingPrice(price);
  let calculatedTotal = null;
  if (nights > 0 && parsedPrice.amount) {
    if (parsedPrice.mode === "total" && parsedPrice.nights > 0) {
      calculatedTotal = Math.round((parsedPrice.amount / parsedPrice.nights) * nights);
    } else if (parsedPrice.mode === "night") {
      calculatedTotal = Math.round(parsedPrice.amount * nights);
    } else {
      calculatedTotal = parsedPrice.amount;
    }
  }

  const [activeStep, setActiveStep] = useState(1);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("paypal");
  const [paymentTiming, setPaymentTiming] = useState(null); // 'now' | 'later'
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [phoneCountry, setPhoneCountry] = useState("Philippines (+63)");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMessage, setCouponMessage] = useState("");

  function getHostCoupons(hostId) {
    if (hostId) {
      try {
        const raw = localStorage.getItem(`host-coupons-${hostId}`) || "[]";
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return [];
      }
    }

    try {
      const allCoupons = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (typeof key === "string" && key.startsWith("host-coupons-")) {
          const parsed = JSON.parse(localStorage.getItem(key) || "[]");
          if (Array.isArray(parsed)) {
            allCoupons.push(...parsed);
          }
        }
      }
      return allCoupons;
    } catch (error) {
      return [];
    }
  }

  function findCouponByCode(code, hostId) {
    const normalizedCode = (code || "").trim().toUpperCase();
    const hostCoupons = getHostCoupons(hostId);
    const matchedCoupon = hostCoupons.find((coupon) => coupon.code?.toUpperCase() === normalizedCode);
    if (matchedCoupon) {
      return matchedCoupon;
    }

    if (hostId) {
      const allCoupons = getHostCoupons(null);
      return allCoupons.find((coupon) => coupon.code?.toUpperCase() === normalizedCode) || null;
    }

    return null;
  }

  function isCouponValid(coupon) {
    if (!coupon) return false;
    if (!coupon.expiryDate) return true;
    const today = new Date();
    const expiry = new Date(`${coupon.expiryDate}T23:59:59`);
    return expiry >= today;
  }

  const SERVICE_FEE_PERCENTAGE = 10;

  function calculateDiscountedTotal(baseTotal, coupon) {
    const amount = Number(baseTotal) || 0;
    const discount = coupon && Number(coupon.discount) > 0 ? Number(coupon.discount) : 0;
    const discountAmount = Math.round((amount * discount) / 100);
    return {
      total: Math.max(0, amount - discountAmount),
      discountAmount,
      discountPercent: discount
    };
  }

  function calculateServiceFee(amount) {
    const total = Number(amount) || 0;
    const serviceFeeAmount = Math.round((total * SERVICE_FEE_PERCENTAGE) / 100);
    return {
      serviceFeePercent: SERVICE_FEE_PERCENTAGE,
      serviceFeeAmount,
      hostPayoutAmount: Math.max(0, total - serviceFeeAmount)
    };
  }

  function handleApplyCoupon() {
    const code = (couponCode || "").trim().toUpperCase();
    if (!code) {
      setCouponMessage("Enter a coupon code to apply.");
      setAppliedCoupon(null);
      return;
    }

    const matchedCoupon = findCouponByCode(code, stateHostId);

    if (!matchedCoupon) {
      setCouponMessage("Coupon code not found for this host.");
      setAppliedCoupon(null);
      return;
    }

    if (!isCouponValid(matchedCoupon)) {
      setCouponMessage("This coupon has expired. Please choose a different code.");
      setAppliedCoupon(null);
      return;
    }

    setAppliedCoupon(matchedCoupon);
    setCouponMessage(`Applied ${matchedCoupon.discount}% off with ${matchedCoupon.code}.`);
  }

  function handleRemoveCoupon() {
    setCouponCode("");
    setAppliedCoupon(null);
    setCouponMessage("Coupon removed.");
  }

  function handleStartCheckout() {
    setPhoneError("");
    setShowPhoneModal(true);
  }

  function handleConfirmPhone() {
    if (!phoneNumber.trim()) {
      setPhoneError("Please enter a valid phone number to continue.");
      return;
    }

    setPhoneError("");
    setShowPhoneModal(false);
    setShowPaymentModal(true);
  }

  async function handlePaymentSuccess(tx) {
    const guestName = auth.currentUser?.displayName || tx.payerName || "Guest";
    const guestEmail = auth.currentUser?.email || tx.payer?.email_address || "";
    const runtimeEnv = {
      ...(typeof process !== "undefined" && process.env ? process.env : {}),
      ...(typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {})
    };
    const hostEmail =
      stateHostEmail ||
      (isPublished ? "host@stayvista-tagaytay.com" : "mariaellainechangarcia@gmal.com") ||
      runtimeEnv.VITE_HOST_EMAIL ||
      runtimeEnv.REACT_APP_HOST_EMAIL ||
      "host@stayvista-tagaytay.com";

    const feeSummary = calculateServiceFee(discounted.total);
    const bookingRecord = {
      id: tx.id,
      bookingId: tx.bookingId || tx.id,
      reservationId: tx.reservationId || tx.bookingId || tx.id,
      guestId: auth.currentUser?.uid || "",
      guestName,
      guestEmail,
      phoneNumber,
      listingTitle: tx.booking?.listingTitle || listingTitle || "Your reservation",
      coverImage: tx.booking?.coverImage || coverImage || "",
      listingId: tx.booking?.listingId || stateListingId || null,
      listingCategory: tx.booking?.listingCategory || state.listingCategory || state.selectedType || "Home",
      checkInDate: tx.booking?.checkInDate || checkInDate || "",
      checkOutDate: tx.booking?.checkOutDate || checkOutDate || "",
      guestCount: tx.booking?.guestCount || guestCount || 1,
      amount: tx.amount || 0,
      couponCode: appliedCoupon?.code || null,
      couponDiscount: appliedCoupon?.discount ? Number(appliedCoupon.discount) : 0,
      couponAmount: discounted.discountAmount || 0,
      originalTotal: totalToShow,
      totalAfterDiscount: discounted.total,
      serviceFeePercent: feeSummary.serviceFeePercent,
      serviceFeeAmount: feeSummary.serviceFeeAmount,
      hostPayoutAmount: feeSummary.hostPayoutAmount,
      paymentStatus: tx.paymentStatus || "Completed",
      paymentDate: tx.paymentDate || new Date().toISOString(),
      status: "PENDING APPROVAL",
      createdAt: new Date().toISOString(),
      hostEmail,
      hostId: stateHostId || ""
    };

    saveBooking(bookingRecord);

    try {
      await Promise.all([
        sendGuestPaymentPendingEmail(bookingRecord),
        sendHostNewBookingEmail(bookingRecord)
      ]);
    } catch (emailError) {
      console.error("Booking emails could not be sent:", emailError);
    }

    try {
      await createPayment({
        bookingId: bookingRecord.bookingId,
        type: "guest_payment",
        userId: bookingRecord.guestId,
        userName: bookingRecord.guestName,
        userEmail: bookingRecord.guestEmail,
        hostId: bookingRecord.hostId,
        amount: bookingRecord.totalAfterDiscount,
        currency: "PHP",
        status: "pending",
        paymentMethod: selectedPaymentMethod,
        serviceFeeAmount: bookingRecord.serviceFeeAmount,
        hostPayoutAmount: bookingRecord.hostPayoutAmount,
      });
    } catch (paymentError) {
      console.error("Error recording payment:", paymentError);
    }

    try {
      await createServiceFee({
        bookingId: bookingRecord.bookingId,
        hostId: bookingRecord.hostId,
        approverHostId: bookingRecord.approverHostId || bookingRecord.hostId,
        hostEmail: bookingRecord.hostEmail,
        hostName: bookingRecord.hostEmail || "Host",
        bookingAmount: bookingRecord.totalAfterDiscount,
        amount: bookingRecord.serviceFeeAmount,
        percentage: feeSummary.serviceFeePercent,
        status: "pending",
        paymentStatus: bookingRecord.paymentStatus
      });
    } catch (feeError) {
      console.error("Error creating service fee record:", feeError);
    }

    setShowPaymentModal(false);
    navigate("/payment-success", { state: { txId: tx.id } });
  }

  const profileLabel = auth.currentUser?.displayName || auth.currentUser?.email || "Profile";
  const profileInitial = profileLabel.trim().charAt(0).toUpperCase() || "P";
  const storedAvatar = auth.currentUser ? localStorage.getItem(`stayvista-profile-photo-${auth.currentUser.uid}`) : "";
  const profilePhotoURL = storedAvatar || auth.currentUser?.photoURL || "";

  const totalToShow = Number(stateTotalPrice ?? calculatedTotal) || 0;
  const discounted = calculateDiscountedTotal(totalToShow, appliedCoupon);

  const isStep1Open = activeStep === 1;
  const isStep2Open = activeStep === 2;
  const isStep3Open = activeStep === 3;

  const formattedTotal = totalToShow ? formatAmount(totalToShow) : (price || "₱3,705.98");
  const formattedDiscountedTotal = formatAmount(discounted.total);

  return (
    <div className="confirm-pay-page" style={{ minHeight: "100vh", padding: "32px", background: "#f6f9f4" }}>
      <Navbar
        profilePhotoURL={profilePhotoURL}
        profileInitial={profileInitial}
        onMenuToggle={() => setMenuOpen((value) => !value)}
        menuOpen={menuOpen}
      />
      {menuOpen && (
        <div className="guest-menu-dropdown guest-menu-dropdown-fixed profile-menu-dropdown">
          <button type="button" className="menu-item menu-item-icon" onClick={() => navigate("/profile?section=wishlist")}> 
            <i className="menu-line-icon fa-solid fa-bookmark" aria-hidden="true" />
            <span>Wishlists</span>
          </button>
          <button type="button" className="menu-item menu-item-icon" onClick={() => navigate("/profile?section=favorites")}> 
            <i className="menu-line-icon fa-solid fa-star" aria-hidden="true" />
            <span>Favorites</span>
          </button>
          <button type="button" className="menu-item menu-item-icon"> 
            <i className="menu-line-icon fa-solid fa-comment-dots" aria-hidden="true" />
            <span>Messages</span>
          </button>
          <button type="button" className="menu-item menu-item-icon" onClick={() => navigate("/profile")}> 
            <i className="menu-line-icon fa-solid fa-user" aria-hidden="true" />
            <span>Profile</span>
          </button>
          <div className="menu-divider" />
          <button type="button" className="menu-item menu-item-icon" onClick={() => navigate("/account-settings")}> 
            <i className="menu-line-icon fa-solid fa-gear" aria-hidden="true" />
            <span>Account settings</span>
          </button>
          <button type="button" className="menu-item menu-item-icon"> 
            <i className="menu-line-icon fa-solid fa-globe" aria-hidden="true" />
            <span>Languages & currency</span>
          </button>
          <button type="button" className="menu-item menu-item-icon"> 
            <span className="menu-help-icon">?</span>
            <span>Help Center</span>
          </button>
          <div className="menu-divider" />
          <button type="button" className="menu-item" onClick={() => auth.signOut()}>Log out</button>
        </div>
      )}

      <div style={{ height: "88px" }} />
      <button
        type="button"
        onClick={() => {
          if (origin) navigate(origin, { state: { checkInDate, checkOutDate, guestCount } }); else navigate(-1);
        }}
        style={{
          border: "none",
          background: "transparent",
          color: "#224a2b",
          fontSize: "16px",
          cursor: "pointer",
          marginBottom: "24px"
        }}
      >
        ← Back
      </button>

      <div style={{ maxWidth: "1040px", margin: "0 auto", display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px" }}>
        <section style={{ background: "#fff", borderRadius: "24px", boxShadow: "0 16px 40px rgba(0,0,0,0.08)", padding: "32px" }}>
          <h1 style={{ margin: 0, fontSize: "32px", color: "#1f2f21" }}>Confirm and pay</h1>
          <p style={{ marginTop: "12px", color: "#5f6f63" }}>Review your reservation and complete payment for your stay.</p>

          <div style={{ marginTop: "32px", display: "grid", gap: "24px" }}>
            <div style={{ background: "#fff", borderRadius: "24px", boxShadow: "0 16px 40px rgba(0,0,0,0.08)", border: "1px solid #e5e8df", overflow: "hidden" }}>
              <div style={{ padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "20px", color: "#1f2f21" }}>1. Choose when to pay</h2>
                  {!isStep1Open && paymentTiming && (
                    <div style={{ marginTop: "8px", color: "#5f6f63" }}>Pay {formattedTotal} {paymentTiming === "now" ? "now" : "later"}</div>
                  )}
                </div>
                {!isStep1Open && (
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "999px",
                      border: "1px solid #d1d5db",
                      background: "#ffffff",
                      color: "#1f2f21",
                      cursor: "pointer"
                    }}
                  >
                    Change
                  </button>
                )}
              </div>
              {isStep1Open && (
                <div style={{ padding: "0 24px 24px 24px", background: "#ffffff" }}>
                  <div style={{ display: "grid", gap: "16px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "16px", padding: "18px", borderRadius: "18px", background: "#ffffff" }}>
                      <input type="radio" name="paymentChoice" checked={paymentTiming === "now"} onChange={() => setPaymentTiming("now")} style={{ accentColor: "#224a2b" }} />
                      <div>
                        <strong>Pay now</strong>
                        <div style={{ color: "#6b7769" }}>Complete payment immediately for a faster booking.</div>
                      </div>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "16px", padding: "18px", borderRadius: "18px", background: "#ffffff" }}>
                      <input type="radio" name="paymentChoice" checked={paymentTiming === "later"} onChange={() => setPaymentTiming("later")} style={{ accentColor: "#224a2b" }} />
                      <div>
                        <strong>Pay later</strong>
                        <div style={{ color: "#6b7769" }}>Pay the full amount on your arrival date.</div>
                      </div>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => paymentTiming && setActiveStep(2)}
                    disabled={!paymentTiming}
                    style={{
                      marginTop: "24px",
                      padding: "16px 28px",
                      borderRadius: "14px",
                      border: "none",
                      background: paymentTiming ? "#1f4729" : "#cfd9cf",
                      color: "white",
                      fontSize: "16px",
                      cursor: paymentTiming ? "pointer" : "not-allowed"
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            <div style={{ background: "#fff", borderRadius: "24px", boxShadow: "0 16px 40px rgba(0,0,0,0.08)", border: "1px solid #e5e8df", overflow: "hidden" }}>
              <div style={{ padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <h2 style={{ margin: 0, fontSize: "20px", color: "#1f2f21" }}>2. Add a payment method</h2>
                  {isStep3Open && (
                    <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "12px" }}>
                      <img src="https://www.pngall.com/wp-content/uploads/5/PayPal-Logo-PNG-Free-Image.png" alt="PayPal logo" style={{ width: "50px", height: "auto", objectFit: "contain" }} />
                      <div style={{ fontWeight: 700, color: "#1f2f21" }}>PayPal</div>
                    </div>
                  )}
                </div>
                {isStep3Open && (
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "999px",
                      border: "1px solid #d1d5db",
                      background: "#ffffff",
                      color: "#1f2f21",
                      cursor: "pointer"
                    }}
                  >
                    Change
                  </button>
                )}
              </div>
              {isStep2Open && (
                <div style={{ padding: "0 24px 24px 24px", background: "#ffffff" }}>
                  <div style={{ display: "grid", gap: "16px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "16px", padding: "18px", borderRadius: "18px", background: "#ffffff", border: selectedPaymentMethod === "paypal" ? "1px solid #1f4729" : "1px solid #e5e8df" }}>
                      <input type="radio" name="paymentMethod" value="paypal" checked={selectedPaymentMethod === "paypal"} onChange={() => setSelectedPaymentMethod("paypal")} style={{ accentColor: "#224a2b" }} />
                      <img src="https://www.pngall.com/wp-content/uploads/5/PayPal-Logo-PNG-Free-Image.png" alt="PayPal logo" style={{ width: "70px", height: "auto", objectFit: "contain" }} />
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{ fontWeight: 700 }}>PayPal</span>
                          <span style={{ background: "#f1f5f9", color: "#475569", borderRadius: "999px", padding: "2px 10px", fontSize: "12px" }}>Recommended</span>
                        </div>
                      </div>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    style={{
                      marginTop: "24px",
                      padding: "16px 28px",
                      borderRadius: "14px",
                      border: "none",
                      background: "#1f4729",
                      color: "white",
                      fontSize: "16px",
                      cursor: "pointer"
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
              
            </div>

            <div style={{ background: "#fff", borderRadius: "24px", border: "1px solid #e5e8df", overflow: "hidden", boxShadow: "0 16px 40px rgba(0,0,0,0.08)" }}>
              <div style={{ padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "20px", color: "#1f2f21" }}>3. Review your reservation</h2>
                  <div style={{ marginTop: "8px", color: "#5f6f63" }}>Review and confirm your booking.</div>
                </div>
              </div>
              {activeStep === 3 && (
                <div style={{ padding: "0 24px 24px 24px", background: "#ffffff" }}>
                  <div style={{ padding: "24px", borderRadius: "20px", background: "#ffffff", border: "1px solid #e5e8df", display: "grid", gap: "16px" }}>
                    <p style={{ margin: 0, color: "#5f6f63" }}>By selecting the button, I agree to the <a href="#" style={{ color: "#1f4729", textDecoration: "underline" }}>booking terms</a>.</p>
                    <button
                      type="button"
                      onClick={handleStartCheckout}
                      style={{
                        width: "100%",
                        padding: "16px 28px",
                        borderRadius: "14px",
                        border: "none",
                        background: "#1f4729",
                        color: "white",
                        fontSize: "16px",
                        cursor: "pointer"
                      }}
                    >
                      Confirm and pay
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <aside style={{ background: "#fff", borderRadius: "24px", boxShadow: "0 16px 40px rgba(0,0,0,0.08)", padding: "24px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "18px", overflow: "hidden", background: "#eaf2e8", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {coverImage ? (
                <img src={coverImage} alt={listingTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ color: "#1f4729", fontWeight: 700 }}>IMG</div>
              )}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "18px", color: "#1f2f21" }}>{listingTitle}</h3>
              <p style={{ margin: "8px 0 0", color: "#5f6f63" }}>Free cancellation before your stay.</p>
            </div>
          </div>
                      <div style={{ display: "grid", gap: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ color: "#5f6f63" }}>Dates</div>
                    <div style={{ color: "#1f2f21", fontWeight: 600 }}>{checkInDate ? formatReadableDate(checkInDate) : "---"} - {checkOutDate ? formatReadableDate(checkOutDate) : "---"}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (origin) navigate(origin, { state: { checkInDate, checkOutDate, guestCount } }); else navigate(-1);
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "999px",
                      border: "1px solid #d1d5db",
                      background: "#ffffff",
                      color: "#1f2f21",
                      cursor: "pointer",
                      fontSize: "14px"
                    }}
                  >
                    Change
                  </button>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ color: "#5f6f63" }}>Guests</div>
                    <div style={{ color: "#1f2f21", fontWeight: 600 }}>{guestCount} adult{guestCount > 1 ? "s" : ""}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (origin) navigate(origin, { state: { checkInDate, checkOutDate, guestCount } }); else navigate(-1);
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "999px",
                      border: "1px solid #d1d5db",
                      background: "#ffffff",
                      color: "#1f2f21",
                      cursor: "pointer",
                      fontSize: "14px"
                    }}
                  >
                    Change
                  </button>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#5f6f63" }}>Price details</span>
                  <span style={{ color: "#1f2f21", fontWeight: 600 }}>{formattedTotal}</span>
                </div>
                <div style={{ padding: "18px 20px", borderRadius: "18px", border: "1px solid #e5e8df", background: "#f7faf4" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", color: "#4f6d4b" }}>
                    <span>Coupon</span>
                    <span>{appliedCoupon ? `${appliedCoupon.discount}% off` : "Not applied"}</span>
                  </div>
                  <div style={{ display: "grid", gap: "12px" }}>
                    <div style={{ display: "grid", gap: "10px" }}>
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Enter coupon code"
                        style={{ width: "100%", padding: "14px 16px", borderRadius: "14px", border: "1px solid #d1d5db", background: "#fff", textTransform: "uppercase" }}
                      />
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          style={{ padding: "12px 18px", borderRadius: "14px", border: "none", background: "#1f4729", color: "#fff", cursor: "pointer" }}
                        >
                          Apply
                        </button>
                        {appliedCoupon && (
                          <button
                            type="button"
                            onClick={handleRemoveCoupon}
                            style={{ padding: "12px 18px", borderRadius: "14px", border: "1px solid #d1d5db", background: "#fff", color: "#1f4729", cursor: "pointer" }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                    {couponMessage && (
                      <div style={{ color: appliedCoupon ? "#1f4729" : "#b91c1c", fontSize: "0.95rem" }}>{couponMessage}</div>
                    )}
                  </div>
                </div>
                {appliedCoupon && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#1f4729", fontWeight: 700 }}>
                    <span>Discount</span>
                    <span>-{formatAmount(discounted.discountAmount)}</span>
                  </div>
                )}
                <hr style={{ borderColor: "#e5e8df" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 700 }}>
                  <span>Total PHP</span>
                  <span>{appliedCoupon ? formattedDiscountedTotal : formattedTotal}</span>
                </div>
              </div>
        </aside>
      </div>
      {showPhoneModal && (
        <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }} onClick={() => setShowPhoneModal(false)} />
          <div style={{ width: "520px", background: "#fff", borderRadius: "18px", boxShadow: "0 28px 90px rgba(0,0,0,0.22)", padding: "32px", zIndex: 80 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "24px", color: "#111827" }}>Confirm your phone number</h2>
                <p style={{ margin: "8px 0 0", color: "#4b5563" }}>We use this to send booking updates, payment confirmation, and check-in details.</p>
              </div>
              <button type="button" onClick={() => setShowPhoneModal(false)} style={{ background: "transparent", border: "none", fontSize: "22px", cursor: "pointer", color: "#6b7280" }}>✕</button>
            </div>
            <div style={{ display: "grid", gap: "16px" }}>
              <label style={{ display: "block" }}>
                <div style={{ marginBottom: "8px", color: "#374151", fontWeight: 600 }}>Country / Region</div>
                <select value={phoneCountry} onChange={(e) => setPhoneCountry(e.target.value)} style={{ width: "100%", padding: "14px 16px", borderRadius: "14px", border: "1px solid #d1d5db", background: "#f9fafb" }}>
                  <option>Philippines (+63)</option>
                  <option>United States (+1)</option>
                  <option>United Kingdom (+44)</option>
                  <option>Australia (+61)</option>
                </select>
              </label>
              <label style={{ display: "block" }}>
                <div style={{ marginBottom: "8px", color: "#374151", fontWeight: 600 }}>Phone number</div>
                <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Enter your phone number" style={{ width: "100%", padding: "14px 16px", borderRadius: "14px", border: "1px solid #d1d5db", background: "#fff" }} />
              </label>
              {phoneError && <div style={{ color: "#dc2626", fontSize: "14px" }}>{phoneError}</div>}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
                <button type="button" onClick={() => setShowPhoneModal(false)} style={{ padding: "12px 16px", borderRadius: "12px", border: "1px solid #d1d5db", background: "#fff", color: "#111827", cursor: "pointer" }}>Cancel</button>
                <button type="button" onClick={handleConfirmPhone} style={{ padding: "12px 18px", borderRadius: "12px", border: "none", background: "#1f4729", color: "#fff", cursor: "pointer" }}>Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <PaymentModal
          booking={{
            listingTitle,
            checkInDate,
            checkOutDate,
            guestCount,
            price: appliedCoupon ? discounted.total : totalToShow || price,
            coverImage,
            originalTotal: totalToShow,
            couponCode: appliedCoupon?.code || null,
            couponDiscount: appliedCoupon?.discount ? Number(appliedCoupon.discount) : 0,
            couponAmount: discounted.discountAmount || 0
          }}
          phoneNumber={phoneNumber}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

export default ConfirmAndPay;

