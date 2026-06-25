import { useEffect, useState } from "react";
import { signOut, deleteUser, sendPasswordResetEmail } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc, deleteDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { loadBookings, filterBookingsByHost } from "../utils/bookingStorage";
import {
  checkInHostDaily,
  getHostPromotions,
  getPointsRewardData,
  redeemHostPromotion
} from "../utils/hostRewards";

const dailyRewardSchedule = [0.6, 1.2, 0.6, 0.3, 0.3, 0.3, 0.3];
const PROMOTION_COST = 50;

function getStoredAvatarKey(uid) {
  return `stayvista-profile-photo-${uid}`;
}

function getPointsDataKey(uid) {
  return `host-points-data-${uid}`;
}

const settingsSections = [
  { key: "personal-information", label: "Personal information" },
  { key: "login-security", label: "Login & security" },
  { key: "notifications", label: "Notifications" },
  { key: "payments", label: "Payments" },
  { key: "discount-coupons", label: "Discount coupons", hostOnly: true },
  { key: "points-rewards", label: "Points & rewards", hostOnly: true },
  { key: "booking-history", label: "Booking history", hostOnly: true }
];

function AccountSettings() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("personal-information");
  const [paymentsTab, setPaymentsTab] = useState("payments");
  const [menuOpen, setMenuOpen] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [newCoupon, setNewCoupon] = useState({ code: "", discount: "", expiryDate: "" });
  const [bookingRecords, setBookingRecords] = useState([]);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [pointsExpiring, setPointsExpiring] = useState([]);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [dailyStatus, setDailyStatus] = useState({ checkedInToday: false, nextDay: 1, rewardAmount: 0 });
  const [promotionListings, setPromotionListings] = useState([]);
  const [selectedPromotionListing, setSelectedPromotionListing] = useState("");
  const [promotionMessage, setPromotionMessage] = useState("");
  const [pointsStatusMessage, setPointsStatusMessage] = useState("");
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [deactivationStage, setDeactivationStage] = useState(null);
  const [selectedReason, setSelectedReason] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetError, setResetError] = useState("");
  const [profile, setProfile] = useState({
    fullName: "",
    displayName: "",
    email: "",
    photoURL: "",
    role: "Guest",
    phone: "",
    location: "Tagaytay traveler"
  });

  useEffect(() => {
    if (activeSection === "payments") {
      setPaymentsTab("payments");
    }
  }, [activeSection]);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/login");
        return;
      }

      let documentProfile = {};

      try {
        const snapshot = await getDoc(doc(db, "users", user.uid));
        if (snapshot.exists()) {
          documentProfile = snapshot.data();
        }
      } catch (error) {
        documentProfile = {};
      }

      if (!isMounted) return;

      const savedPhoto = localStorage.getItem(getStoredAvatarKey(user.uid));
      const storedCoupons = JSON.parse(localStorage.getItem(`host-coupons-${user.uid}`) || "[]");

      const rewardData = getPointsRewardData(user.uid);
      const promotions = getHostPromotions(user.uid);

      const loadPromotionListings = async () => {
        try {
          const listingsQuery = query(collection(db, "listings"), where("hostId", "==", user.uid));
          const snapshot = await getDocs(listingsQuery);
          if (!isMounted) return;
          setPromotionListings(snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            title: docSnap.data().listingTitle || docSnap.data().title || "Untitled listing",
            published: docSnap.data().published || docSnap.data().status === "published"
          })));
        } catch (loadError) {
          console.warn("Unable to load host listings for promotions:", loadError);
        }
      };

      setProfile({
        fullName: documentProfile.fullName ?? "",
        displayName: user.displayName ?? "",
        email: user.email ?? "",
        photoURL: savedPhoto || user.photoURL || "",
        role: documentProfile.role ?? "Guest",
        phone: documentProfile.phone ?? "",
        location: documentProfile.location ?? "Tagaytay traveler"
      });
      setCoupons(storedCoupons);
      setBookingRecords(filterBookingsByHost(loadBookings(), user.uid, user.email || ""));
      setPointsBalance(rewardData.balance);
      setPointsExpiring(rewardData.expiring);
      setPointsHistory(rewardData.history);
      setDailyStatus(rewardData.daily);
      setActivePromotions(promotions);
      loadPromotionListings();
    };

    loadProfile();

    const refreshRewardData = (userId) => {
      const rewardData = getPointsRewardData(userId);
      setPointsBalance(rewardData.balance);
      setPointsExpiring(rewardData.expiring);
      setPointsHistory(rewardData.history);
      setDailyStatus(rewardData.daily);
      setActivePromotions(getHostPromotions(userId));
    };

    const handleStorage = (event) => {
      const user = auth.currentUser;
      if (!user) return;

      if (event.key === `host-coupons-${user.uid}`) {
        setCoupons(JSON.parse(event.newValue || "[]"));
      }

      if (event.key === getStoredAvatarKey(user.uid)) {
        setProfile((current) => ({ ...current, photoURL: event.newValue || current.photoURL }));
      }

      if (event.key === getPointsDataKey(user.uid) || event.key === "host-points-promotions") {
        refreshRewardData(user.uid);
      }

      if (event.key === `host-listings-${user.uid}`) {
        const parsed = JSON.parse(event.newValue || "[]");
        setPromotionListings(Array.isArray(parsed) ? parsed : []);
      }
      if (event.key === "stayvista_bookings") {
        setBookingRecords(filterBookingsByHost(loadBookings(), user.uid, user.email || ""));
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", handleStorage);
    };
  }, [navigate]);

  const profileName = profile.fullName || profile.displayName || "Maria Ellaine";
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || "M";

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const handleResetPassword = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) {
      setResetError("No signed-in email available.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetEmailSent(true);
      setResetError("");
    } catch (error) {
      console.error("Password reset failed:", error);
      setResetError("Unable to send reset email. Please try again.");
    }
  };

  const openDeactivationReason = () => {
    setSelectedReason("");
    setDeactivationStage("reason");
    setMenuOpen(false);
  };

  const goBackFromDeactivation = () => {
    setDeactivationStage(null);
    setSelectedReason("");
  };

  const handleConfirmDeactivation = () => {
    setDeactivationStage("confirm");
  };

  const isHost = profile.role?.toLowerCase() === "host";
  const visibleSettingsSections = settingsSections.filter((item) => !item.hostOnly || isHost);
  const hostBookingRecords = filterBookingsByHost(bookingRecords, auth.currentUser?.uid || "", auth.currentUser?.email || "");

  const handleAddCoupon = () => {
    const user = auth.currentUser;
    if (!user || !newCoupon.code || !newCoupon.discount) return;

    const coupon = { ...newCoupon, id: Date.now() };
    const updatedCoupons = [...coupons, coupon];
    setCoupons(updatedCoupons);
    localStorage.setItem(`host-coupons-${user.uid}`, JSON.stringify(updatedCoupons));
    setNewCoupon({ code: "", discount: "", expiryDate: "" });
  };

  const handleRemoveCoupon = (couponId) => {
    const user = auth.currentUser;
    if (!user) return;

    const updatedCoupons = coupons.filter((coupon) => coupon.id !== couponId);
    setCoupons(updatedCoupons);
    localStorage.setItem(`host-coupons-${user.uid}`, JSON.stringify(updatedCoupons));
  };

  const refreshRewardData = (userId) => {
    const rewardData = getPointsRewardData(userId);
    setPointsBalance(rewardData.balance);
    setPointsExpiring(rewardData.expiring);
    setPointsHistory(rewardData.history);
    setDailyStatus(rewardData.daily);
    setActivePromotions(getHostPromotions(userId));
  };

  const handleDailyCheckIn = () => {
    const user = auth.currentUser;
    if (!user) {
      navigate("/login");
      return;
    }

    const result = checkInHostDaily(user.uid);
    refreshRewardData(user.uid);
    setPointsStatusMessage(result.message || (result.success ? "Check-in recorded." : "Unable to check in."));
  };

  const handleRedeemPromotion = () => {
    const user = auth.currentUser;
    if (!user) {
      navigate("/login");
      return;
    }

    if (!selectedPromotionListing) {
      setPromotionMessage("Select a listing to redeem the promotion.");
      return;
    }

    const result = redeemHostPromotion(user.uid, selectedPromotionListing);
    refreshRewardData(user.uid);
    setPromotionMessage(result.message || "Promotion redemption completed.");
  };

  const closeHistoryModal = () => {
    setShowHistoryModal(false);
  };

  const renderDeactivationFlow = () => {
    if (deactivationStage === "reason") {
      const reasons = [
        "I no longer use StayVista Tagaytay.",
        "I use a different StayVista Tagaytay account.",
        "Other"
      ];

      return (
        <div className="profile-settings-list" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 26 }}>
            <button
              type="button"
              onClick={goBackFromDeactivation}
              style={{ border: "none", background: "transparent", fontSize: 16, cursor: "pointer", color: "#1f2937" }}
            >
              ← Back
            </button>
            <div>
              <h1 style={{ margin: "8px 0 0", fontSize: 32, color: "#111827" }}>Choose a reason</h1>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {reasons.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => setSelectedReason(reason)}
                className={`profile-setting-row${selectedReason === reason ? " active" : ""}`}
                style={{
                  textAlign: "left",
                  padding: 22,
                  borderRadius: 18,
                  border: selectedReason === reason ? "2px solid #111827" : "1px solid #d1d5db",
                  background: selectedReason === reason ? "#f9fafb" : "#ffffff",
                  cursor: "pointer"
                }}
              >
                <div>
                  <strong style={{ display: "block", marginBottom: 6, color: "#111827" }}>{reason}</strong>
                </div>
              </button>
            ))}
          </div>

          <div style={{ marginTop: 32, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={!selectedReason}
              onClick={handleConfirmDeactivation}
              style={{
                padding: "16px 24px",
                borderRadius: 14,
                border: "none",
                background: selectedReason ? "#111827" : "#d1d5db",
                color: selectedReason ? "#ffffff" : "#6b7280",
                cursor: selectedReason ? "pointer" : "not-allowed"
              }}
            >
              Continue
            </button>
          </div>
        </div>
      );
    }

    if (deactivationStage === "confirm") {
      return (
        <div className="profile-settings-list" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 26 }}>
            <button
              type="button"
              onClick={() => setDeactivationStage("reason")}
              style={{ border: "none", background: "transparent", fontSize: 16, cursor: "pointer", color: "#1f2937" }}
            >
              ← Back
            </button>
            <div>
              <p style={{ margin: 0, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 13 }}>Deactivate account?</p>
              <h1 style={{ margin: "8px 0 0", fontSize: 32, color: "#111827" }}>Confirm account deactivation</h1>
            </div>
          </div>

          <div style={{ padding: 28, borderRadius: 24, background: "#ffffff", border: "1px solid #e5e7eb", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)" }}>
            <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#c7d2fe", display: "flex", alignItems: "center", justifyContent: "center", color: "#4338ca", fontWeight: 700, fontSize: 24 }}>
                  {profileInitial}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22, color: "#111827" }}>{profileName}</h2>
                  <p style={{ margin: "4px 0 0", color: "#6b7280" }}>{profile.location}</p>
                </div>
              </div>
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ width: 36, height: 36, borderRadius: 12, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#111827" }}>👤</span>
                  <div>
                    <strong>Profile and listings will no longer be visible.</strong>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ width: 36, height: 36, borderRadius: 12, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#111827" }}>🚫</span>
                  <div>
                    <strong>You won't be able to access your account or past reservations.</strong>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ width: 36, height: 36, borderRadius: 12, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#111827" }}>⭐</span>
                  <div>
                    <strong>Any reviews you've left or received will stay on other people's profiles.</strong>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={async () => {
                  const user = auth.currentUser;
                  if (!user) {
                    navigate("/login");
                    return;
                  }

                  try {
                    await deleteDoc(doc(db, "users", user.uid));
                  } catch (error) {
                    console.error("Failed to delete user profile document:", error);
                  }

                  try {
                    await deleteUser(user);
                  } catch (error) {
                    console.error("Failed to delete user account:", error);
                    return;
                  }

                  navigate("/login");
                }}
                style={{
                  flex: 1,
                  minWidth: 160,
                  padding: "16px 24px",
                  borderRadius: 14,
                  border: "none",
                  background: "#111827",
                  color: "#ffffff",
                  cursor: "pointer"
                }}
              >
                Yes, deactivate
              </button>
              <button
                type="button"
                onClick={goBackFromDeactivation}
                style={{
                  flex: 1,
                  minWidth: 160,
                  padding: "16px 24px",
                  borderRadius: 14,
                  border: "1px solid #d1d5db",
                  background: "#ffffff",
                  color: "#111827",
                  cursor: "pointer"
                }}
              >
                No, go back
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const profileMenu = (
    <>
      <button type="button" className="menu-item menu-item-icon" onClick={() => { navigate("/account-settings"); setMenuOpen(false); }}>
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
      {isHost && (
        <button type="button" className="menu-item menu-item-icon" onClick={() => { navigate("/host/cohosts"); setMenuOpen(false); }}>
          <i className="fa-solid fa-users" aria-hidden="true" />
          <span>Find a co-host</span>
        </button>
      )}
      <div className="menu-divider" />
      <button type="button" className="menu-item" onClick={handleLogout}>Log out</button>
    </>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case "login-security":
        return (
          <div className="security-section-card">
            <div className="security-section-header">
              <h3>Login</h3>
            </div>
            <div className="profile-settings-list">
              <div className="profile-setting-row">
                <div>
                  <strong>Reset Password</strong>
                  <span>Send a password reset email to your registered address.</span>
                </div>
                <button type="button" onClick={handleResetPassword}>Reset Password</button>
              </div>
              {resetEmailSent && (
                <div className="profile-setting-row" style={{ paddingTop: 0 }}>
                  <span style={{ color: "#16a34a" }}>Password reset email sent.</span>
                </div>
              )}
              {resetError && (
                <div className="profile-setting-row" style={{ paddingTop: 0 }}>
                  <span style={{ color: "#dc2626" }}>{resetError}</span>
                </div>
              )}
            </div>

            <div className="security-section-header security-section-subheader">
              <h3>Social accounts</h3>
            </div>
            <div className="profile-settings-list">
              <div className="profile-setting-row">
                <div>
                  <strong>Google</strong>
                  <span>Connected</span>
                </div>
                <button type="button">Disconnect</button>
              </div>
            </div>

            <div className="security-section-header security-section-subheader">
              <h3>Account</h3>
            </div>
            <div className="profile-settings-list profile-settings-list-no-gap">
              <div className="profile-setting-row">
                <div>
                  <strong>Account deactivation</strong>
                  <span>This action cannot be undone</span>
                </div>
                <button type="button" onClick={openDeactivationReason}>Deactivate</button>
              </div>
            </div>
          </div>
        );
      case "privacy":
        return (
          <div className="profile-settings-list">
            <div className="profile-setting-row">
              <div>
                <strong>Profile visibility</strong>
                <span>Only guests with a booking can see your profile</span>
              </div>
              <button type="button">Edit</button>
            </div>
            <div className="profile-setting-row">
              <div>
                <strong>Search visibility</strong>
                <span>Your listing is visible to everyone</span>
              </div>
              <button type="button">Edit</button>
            </div>
            <div className="profile-setting-row">
              <div>
                <strong>Ad preferences</strong>
                <span>Personalized ads turned on</span>
              </div>
              <button type="button">Manage</button>
            </div>
          </div>
        );
      case "notifications":
        return (
          <div className="profile-settings-list">
            <div className="profile-setting-row">
              <div>
                <strong>Email notifications</strong>
                <span>On for account updates</span>
              </div>
              <button type="button">Manage</button>
            </div>
            <div className="profile-setting-row">
              <div>
                <strong>SMS alerts</strong>
                <span>Off</span>
              </div>
              <button type="button">Turn on</button>
            </div>
            <div className="profile-setting-row">
              <div>
                <strong>Marketing emails</strong>
                <span>Off</span>
              </div>
              <button type="button">Change</button>
            </div>
          </div>
        );
      case "payments":
        return (
          <>
            <div className="profile-settings-tabs">
              <button
                type="button"
                className={paymentsTab === "payments" ? "active" : ""}
                onClick={() => setPaymentsTab("payments")}
              >
                Payments
              </button>
              <button
                type="button"
                className={paymentsTab === "payouts" ? "active" : ""}
                onClick={() => setPaymentsTab("payouts")}
              >
                Payouts
              </button>
            </div>
            <div className="profile-settings-list">
              {paymentsTab === "payments" ? (
                <>
                  <div className="profile-setting-row profile-payment-row">
                    <div>
                      <strong>Your payments</strong>
                      <span>Keep track of all your payments and refunds.</span>
                    </div>
                    <button type="button">Manage payments</button>
                  </div>
                  <div className="profile-setting-row profile-payment-row">
                    <div>
                      <strong>Payment methods</strong>
                      <span>Add a payment method using our secure payment system.</span>
                    </div>
                    <button type="button">Add payment method</button>
                  </div>
                  <div className="profile-setting-row profile-payment-row">
                    <div>
                      <strong>Gift credit</strong>
                      <span>Add gift cards to your account.</span>
                    </div>
                    <button type="button">Add gift card</button>
                  </div>
                  <div className="profile-setting-row profile-payment-row">
                    <div>
                      <strong>Coupons</strong>
                      <span>Your coupons and credits.</span>
                    </div>
                    <button type="button">Add coupon</button>
                  </div>
                </>
              ) : (
                <div className="profile-payouts-card" style={{ padding: 22, borderRadius: 18, background: '#f6faf3' }}>
                  <h3>How you’ll get paid</h3>
                  <p style={{ color: '#4f6d4b', marginTop: 8 }}>
                    Add at least one payout method so we know where to send your money.
                  </p>
                  <div style={{ marginTop: 18 }}>
                    <button type="button" className="profile-action-button">Set up payouts</button>
                  </div>
                </div>
              )}
            </div>
          </>
        );
      case "points-rewards":
        return (
          <div className="profile-settings-list">
            <div className="profile-settings-card" style={{ padding: 24, borderRadius: 22, background: "#eef6ff", border: "1px solid #c7d2fe", marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <p style={{ margin: 0, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 12 }}>Available Points</p>
                  <h2 style={{ margin: "8px 0 0", fontSize: 36, color: "#1f2937" }}>{pointsBalance.toFixed(2)} Points</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(true)}
                  style={{ padding: "14px 20px", borderRadius: 14, border: "1px solid #c7d2fe", background: "#ffffff", color: "#1d4ed8", cursor: "pointer" }}
                >
                  View points history
                </button>
              </div>
            </div>
            <div className="profile-settings-card" style={{ padding: 24, borderRadius: 22, background: "#ffffff", border: "1px solid #e5e7eb", marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#111827" }}>Expiring points</h3>
                  <p style={{ margin: "8px 0 0", color: "#4b5563" }}>Points expiring soon will be shown here.</p>
                </div>
              </div>
              {pointsExpiring.length > 0 ? pointsExpiring.map((item) => (
                <div key={item.expiresAt} className="profile-setting-row" style={{ padding: 18, marginTop: 16, borderRadius: 18, border: "1px solid #e5e7eb", background: "#f8fafc" }}>
                  <div>
                    <strong>{Number(item.amount).toFixed(2)} points</strong>
                    <span>expiring on {new Date(item.expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>
              )) : (
                <div className="profile-setting-row" style={{ padding: 18, marginTop: 16, borderRadius: 18, border: "1px solid #e5e7eb", background: "#f8fafc" }}>
                  <div>
                    <span style={{ color: "#4b5563" }}>No points are expiring soon.</span>
                  </div>
                </div>
              )}
            </div>
            <div className="profile-settings-card" style={{ padding: 24, borderRadius: 22, background: "#ffffff", border: "1px solid #e5e7eb", marginBottom: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#111827" }}>Daily Check-In</h3>
                  <p style={{ margin: "8px 0 0", color: "#4b5563" }}>Check in daily to earn bonus points.</p>
                </div>
                <button
                  type="button"
                  onClick={handleDailyCheckIn}
                  disabled={dailyStatus?.checkedInToday}
                  style={{
                    padding: "14px 20px",
                    borderRadius: 14,
                    border: "none",
                    background: dailyStatus?.checkedInToday ? "#d1d5db" : "#2563eb",
                    color: dailyStatus?.checkedInToday ? "#6b7280" : "#ffffff",
                    cursor: dailyStatus?.checkedInToday ? "not-allowed" : "pointer"
                  }}
                >
                  {dailyStatus?.checkedInToday ? "✓ Checked In Today" : `Check In to Get ${dailyStatus?.rewardAmount.toFixed(2)} Points`}
                </button>
              </div>
              {pointsStatusMessage && (
                <div style={{ marginTop: 18, color: "#1f2937" }}>{pointsStatusMessage}</div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginTop: 24 }}>
                {[1,2,3,4,5,6,7].map((day) => {
                  const reward = dailyRewardSchedule[day - 1];
                  const isCurrent = day === dailyStatus?.nextDay && !dailyStatus?.checkedInToday;
                  const isCompleted = dailyStatus?.checkedInToday && day <= dailyStatus?.streakDay;
                  return (
                    <div key={day} style={{ padding: 16, borderRadius: 18, border: isCurrent ? "2px solid #2563eb" : "1px solid #e5e7eb", background: isCurrent ? "#eff6ff" : "#ffffff" }}>
                      <p style={{ margin: 0, fontSize: 14, color: "#4b5563" }}>Day {day}</p>
                      <p style={{ margin: "8px 0 0", fontSize: 18, fontWeight: 700, color: "#111827" }}>+{reward.toFixed(2)}</p>
                      {isCompleted && <span style={{ color: "#16a34a", fontSize: 12 }}>Completed</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="profile-settings-card" style={{ padding: 24, borderRadius: 22, background: "#f9fafb", border: "1px solid #d9f2e6", marginBottom: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#111827" }}>7-Day Listing Promotion</h3>
                  <p style={{ margin: "8px 0 0", color: "#4b5563", maxWidth: 560 }}>Your listing will appear higher on browsing pages for 7 days.</p>
                </div>
                <span style={{ padding: "10px 14px", borderRadius: 999, background: "#fef3c7", color: "#92400e", fontWeight: 700, fontSize: 14 }}>50 Points</span>
              </div>
              <div style={{ display: "grid", gap: 16, marginTop: 18 }}>
                <label style={{ display: "grid", gap: 10 }}>
                  <span style={{ color: "#374151", fontWeight: 700 }}>Select listing</span>
                  <select
                    value={selectedPromotionListing}
                    onChange={(event) => setSelectedPromotionListing(event.target.value)}
                    style={{ width: "100%", padding: 14, borderRadius: 14, border: "1px solid #d1d5db" }}
                  >
                    <option value="">Choose a listing</option>
                    {promotionListings.map((listing) => (
                      <option key={listing.id} value={listing.id}>{listing.title}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={handleRedeemPromotion}
                  style={{ padding: "14px 20px", borderRadius: 14, border: "none", background: pointsBalance >= PROMOTION_COST ? "#1f2937" : "#9ca3af", color: "#ffffff", cursor: pointsBalance >= PROMOTION_COST ? "pointer" : "not-allowed" }}
                  disabled={pointsBalance < PROMOTION_COST}
                >
                  Redeem for promotion
                </button>
                {promotionMessage && (
                  <div style={{ color: "#1f2937" }}>{promotionMessage}</div>
                )}
              </div>
            </div>
          </div>
        );
      case "discount-coupons":
        return (
          <div className="profile-settings-list">
            <div className="profile-settings-card" style={{ padding: 24, borderRadius: 22, background: "#f5faf2", border: "1px solid #d8e5d4", marginBottom: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#1f3d24" }}>Create a host coupon</h3>
                  <p style={{ margin: "10px 0 0", color: "#546e55", maxWidth: 520 }}>Guests will be able to apply this code during checkout to receive a percentage discount for your listing.</p>
                </div>
                <button type="button" onClick={handleAddCoupon} style={{ padding: "14px 20px", borderRadius: 14, border: "none", background: "#1f4729", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save coupon</button>
              </div>
              <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
                <div style={{ display: "grid", gap: 10 }}>
                  <label style={{ color: "#374151", fontWeight: 700 }}>Coupon code</label>
                  <input
                    type="text"
                    placeholder="SUMMER20"
                    value={newCoupon.code}
                    onChange={(event) => setNewCoupon((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                    style={{ width: "100%", padding: 14, border: "1px solid #d1d5db", borderRadius: 14, background: "#fff", textTransform: "uppercase" }}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ display: "grid", gap: 10 }}>
                    <label style={{ color: "#374151", fontWeight: 700 }}>Discount</label>
                    <input
                      type="number"
                      placeholder="20"
                      min="0"
                      max="100"
                      value={newCoupon.discount}
                      onChange={(event) => setNewCoupon((current) => ({ ...current, discount: event.target.value }))}
                      style={{ width: "100%", padding: 14, border: "1px solid #d1d5db", borderRadius: 14, background: "#fff" }}
                    />
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    <label style={{ color: "#374151", fontWeight: 700 }}>Expiry date</label>
                    <input
                      type="date"
                      value={newCoupon.expiryDate}
                      onChange={(event) => setNewCoupon((current) => ({ ...current, expiryDate: event.target.value }))}
                      style={{ width: "100%", padding: 14, border: "1px solid #d1d5db", borderRadius: 14, background: "#fff" }}
                    />
                  </div>
                </div>
              </div>
            </div>
            {coupons.length ? coupons.map((coupon) => (
              <div className="profile-setting-row profile-payment-row" key={coupon.id} style={{ padding: 22, borderRadius: 20, background: "#ffffff", border: "1px solid rgba(69, 123, 75, 0.14)", marginBottom: 12 }}>
                <div>
                  <strong style={{ display: "block", marginBottom: 6, fontSize: "1rem", color: "#1d3f24" }}>{coupon.code}</strong>
                  <span style={{ color: "#4f6251" }}>{coupon.discount}% off{coupon.expiryDate ? ` · Expires: ${coupon.expiryDate}` : ""}</span>
                </div>
                <button type="button" onClick={() => handleRemoveCoupon(coupon.id)} style={{ padding: "10px 16px", borderRadius: 14, border: "1px solid #d1d5db", background: "#fff", color: "#1f4729", cursor: "pointer" }}>Remove</button>
              </div>
            )) : (
              <div className="profile-setting-row profile-payment-row" style={{ padding: 22, borderRadius: 20, background: "#f7faf4", border: "1px solid #d8e5d4" }}>
                <div>
                  <strong>No coupons yet</strong>
                  <span>Create one to offer discounts to guests.</span>
                </div>
              </div>
            )}
          </div>
        );
      case "booking-history":
        return (
          <div className="profile-settings-list">
            {hostBookingRecords.slice(0, 10).map((booking) => (
              <div className="profile-setting-row profile-payment-row" key={booking.id}>
                <div>
                  <strong>{booking.listingTitle || "Reservation"}</strong>
                  <span>
                    {booking.guestName || "Guest"} - {booking.checkInDate || "No check-in"} to {booking.checkOutDate || "No check-out"}
                  </span>
                  <span>Booking ID: {booking.bookingId || booking.id}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <strong>PHP {Number(booking.amount || 0).toLocaleString()}</strong>
                  <span>{booking.status || "PENDING"}</span>
                </div>
              </div>
            ))}
            {hostBookingRecords.length === 0 && (
              <div className="profile-setting-row profile-payment-row">
                <div>
                  <strong>No bookings yet</strong>
                  <span>Your booking history will appear here once guests reserve your listings.</span>
                </div>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="profile-settings-list">
            <div className="profile-setting-row">
              <div>
                <strong>Legal name</strong>
                <span>{profileName}</span>
              </div>
              <button type="button">Edit</button>
            </div>
            <div className="profile-setting-row">
              <div>
                <strong>Preferred first name</strong>
                <span>{profile.displayName || "Not provided"}</span>
              </div>
              <button type="button">Edit</button>
            </div>
            <div className="profile-setting-row">
              <div>
                <strong>Email address</strong>
                <span>{profile.email || "No email added"}</span>
              </div>
              <button type="button">Edit</button>
            </div>
            <div className="profile-setting-row">
              <div>
                <strong>Phone numbers</strong>
                <span>{profile.phone || "Add a phone number"}</span>
              </div>
              <button type="button">Add</button>
            </div>
            <div className="profile-setting-row">
              <div>
                <strong>Identity verification</strong>
                <span>Not started</span>
              </div>
              <button type="button">Start</button>
            </div>
            <div className="profile-setting-row">
              <div>
                <strong>Residential address</strong>
                <span>{profile.location || "Not provided"}</span>
              </div>
              <button type="button">Edit</button>
            </div>
            <div className="profile-setting-row">
              <div>
                <strong>Mailing address</strong>
                <span>Not provided</span>
              </div>
              <button type="button">Add</button>
            </div>
            <div className="profile-setting-row">
              <div>
                <strong>Emergency contact</strong>
                <span>Not provided</span>
              </div>
              <button type="button">Add</button>
            </div>
          </div>
        );
    }
  };

  return (
    <main className="user-profile-shell">
      <header className="profile-page-topbar">
        <button type="button" className="profile-brand profile-brand-button" onClick={() => navigate("/guest")}> 
          <img src="/stayvista_logo.png" alt="StayVista Tagaytay" className="profile-logo" />
          StayVista Tagaytay
        </button>

        <div className="profile-navbar-actions">
          <button type="button" className="profile-chip-button" aria-label={profileName} onClick={() => navigate("/profile") }>
            {profile.photoURL ? (
              <img src={profile.photoURL} alt={profileName} className="profile-chip-image" />
            ) : (
              <span className="profile-chip-letter">{profileInitial}</span>
            )}
          </button>
          <div className="menu-shell">
            <button
              type="button"
              className="icon-circle-button"
              aria-label={isHost ? "Open host menu" : "Open menu"}
              title={isHost ? "Open host menu" : "Open menu"}
              onClick={() => setMenuOpen((value) => !value)}
            >
              <span className="navbar-menu-icon" aria-hidden="true" />
            </button>
            {menuOpen && (
              <div className={`guest-menu-dropdown profile-menu-dropdown${isHost ? " guest-menu-dropdown-fixed" : ""}`}>
                {profileMenu}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="user-profile-layout">
        <aside className="profile-sidebar">
          <h1>Account Settings</h1>
          {visibleSettingsSections.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`profile-sidebar-item${activeSection === item.key ? " active" : ""}`}
              onClick={() => setActiveSection(item.key)}
            >
              <span>{item.label.charAt(0)}</span>
              {item.label}
            </button>
          ))}
        </aside>

        <section className="profile-content-panel">
          <div className="profile-content-heading">
            <div>
              <h2>{deactivationStage ? "Deactivate account" : visibleSettingsSections.find((item) => item.key === activeSection)?.label || "Account settings"}</h2>
            </div>
          </div>

          <article className="profile-settings-card">
            {deactivationStage ? renderDeactivationFlow() : renderSectionContent()}
          </article>
          {showHistoryModal && (
            <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(15, 23, 42, 0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
              <div style={{ width: "100%", maxWidth: 720, maxHeight: "90vh", overflowY: "auto", borderRadius: 24, background: "#ffffff", padding: 24, boxShadow: "0 32px 80px rgba(15, 23, 42, 0.2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 24, color: "#111827" }}>Points history</h2>
                    <p style={{ margin: "8px 0 0", color: "#4b5563" }}>Your recent point transactions and expiry entries.</p>
                  </div>
                  <button type="button" onClick={closeHistoryModal} style={{ padding: "10px 14px", borderRadius: 14, border: "1px solid #e5e7eb", background: "#f9fafb", cursor: "pointer" }}>
                    Close
                  </button>
                </div>
                <div style={{ display: "grid", gap: 12 }}>
                  {pointsHistory.length ? pointsHistory.map((entry) => (
                    <div key={entry.id} style={{ padding: 18, borderRadius: 18, border: "1px solid #e5e7eb", background: "#f8fafc" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <strong style={{ display: "block", marginBottom: 6, color: "#111827" }}>{entry.description || entry.category}</strong>
                          <span style={{ color: "#4b5563" }}>{new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                        <div style={{ color: entry.amount >= 0 ? "#16a34a" : "#dc2626", fontWeight: 700 }}>
                          {entry.amount >= 0 ? "+" : ""}{Number(entry.amount).toFixed(2)}
                        </div>
                      </div>
                      {entry.expiryDate && (
                        <div style={{ marginTop: 8, color: "#6b7280", fontSize: 13 }}>
                          Expires {new Date(entry.expiryDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </div>
                      )}
                    </div>
                  )) : (
                    <div style={{ padding: 18, borderRadius: 18, border: "1px solid #e5e7eb", background: "#f8fafc", color: "#4b5563" }}>
                      No points history available yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default AccountSettings;

