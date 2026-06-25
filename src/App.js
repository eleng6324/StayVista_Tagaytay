import { useEffect, useState } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import Register from "./pages/Register";
import Login from "./pages/Login";
import GuestHome from "./pages/GuestHome";
import HostHome from "./pages/HostHome";
import CreateListing from "./pages/CreateListing";
import CoHostSearch from "./pages/CoHostSearch";
import UserProfile from "./pages/UserProfile";
import ProfileEditor from "./pages/ProfileEditor";
import ListingDetails from "./pages/ListingDetails";
import ConfirmAndPay from "./pages/ConfirmAndPay";
import MessageHost from "./pages/MessageHost";
import GuestMessages from "./pages/GuestMessages";
import EmailVerification from "./pages/EmailVerification";
import AdminHome from "./pages/AdminHome";
import AccountSettings from "./pages/AccountSettings";
import AboutYourPlace from "./pages/AboutYourPlace";
import StructureSelection from "./pages/StructureSelection";
import MapLocationSelection from "./pages/MapLocationSelection";
import PlaceBasics from "./pages/PlaceBasics";
import MakePlaceStandOut from "./pages/MakePlaceStandOut";
import AmenitiesSelection from "./pages/AmenitiesSelection";
import PhotoUpload from "./pages/PhotoUpload";
import TitlePage from "./pages/TitlePage";
import ListingHighlights from "./pages/ListingHighlights";
import DescriptionPage from "./pages/DescriptionPage";
import FinishPublish from "./pages/FinishPublish";
import PricePage from "./pages/PricePage";
import WeekendPrice from "./pages/WeekendPrice";
import DiscountsPage from "./pages/DiscountsPage";
import LegalPage from "./pages/LegalPage";
import FinalDetailsPage from "./pages/FinalDetailsPage";
import ListingEditor from "./pages/ListingEditor";
import VerifyListing from "./pages/VerifyListing";
import PaymentSuccess from "./pages/PaymentSuccess";
import TransactionReceipt from "./pages/TransactionReceipt";
import BookingApproval from "./pages/BookingApproval";
import "./App.css";

function rolePath(role) {
  const normalizedRole = String(role || "").toLowerCase();
  if (normalizedRole === "guest" || normalizedRole === "user") {
    return "/guest";
  }

  if (normalizedRole === "host") {
    return "/host";
  }

  if (normalizedRole === "admin") {
    return "/admin";
  }

  return "/login";
}

function getCachedRole(uid) {
  if (!uid || typeof window === "undefined") return null;
  const cached = localStorage.getItem(`stayvista-role-view-${uid}`);
  return cached ? String(cached).toLowerCase() : null;
}

function FullscreenLoader() {
  return (
    <div className="route-loader">
      <div className="route-loader-card">
        <div className="route-loader-dot" />
        <p>Loading StayVista Tagaytay...</p>
      </div>
    </div>
  );
}

function RoleRedirect() {
  const [state, setState] = useState({ loading: true, role: null });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ loading: false, role: null });
        return;
      }

      const cachedRole = getCachedRole(user.uid);
      if (cachedRole) {
        setState({ loading: false, role: cachedRole });
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, "users", user.uid));
        const role = snapshot.exists() ? snapshot.data().role : null;
        setState({ loading: false, role });
      } catch (error) {
        setState({ loading: false, role: null });
      }
    });

    return unsubscribe;
  }, []);

  if (state.loading) {
    return <FullscreenLoader />;
  }

  return <Navigate to={state.role ? rolePath(state.role) : "/login"} replace />;
}

function normalizeRole(role) {
  return String(role || "").toLowerCase();
}

function ProtectedRoute({ allowedRoles, children }) {
  const [state, setState] = useState({ loading: true, user: null, role: null });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ loading: false, user: null, role: null });
        return;
      }

      const cachedRole = getCachedRole(user.uid);
      if (cachedRole) {
        setState({ loading: false, user, role: cachedRole });
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, "users", user.uid));
        const role = snapshot.exists() ? normalizeRole(snapshot.data().role) : null;
        setState({ loading: false, user, role });
      } catch (error) {
        setState({ loading: false, user, role: null });
      }
    });

    return unsubscribe;
  }, []);

  if (state.loading) {
    return <FullscreenLoader />;
  }

  if (!state.user) {
    return <Navigate to="/login" replace />;
  }

  const normalizedRole = normalizeRole(state.role);
  const normalizedAllowedRoles = allowedRoles.map(normalizeRole);
  if (!normalizedAllowedRoles.includes(normalizedRole)) {
    return <Navigate to={rolePath(normalizedRole)} replace />;
  }

  return children;
}

function App() {
  return (
    <PayPalScriptProvider options={{ "client-id": "ARhQI9bRVQgQhR-JAjSSRG-uEPgHur_pv-334cDZ_eYAi3htkLMpVZV_b1ctkDQNQKlrLwOi1nFtmZKq", currency: "PHP" }}>
      <Router>
      <Routes>
        <Route path="/" element={<RoleRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<EmailVerification />} />
        <Route
          path="/guest"
          element={
            <ProtectedRoute allowedRoles={["guest", "user"]}>
              <GuestHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={["guest", "user", "host", "admin"]}>
              <UserProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/edit"
          element={
            <ProtectedRoute allowedRoles={["guest", "user", "host", "admin"]}>
              <ProfileEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account-settings"
          element={
            <ProtectedRoute allowedRoles={["guest", "user", "host", "admin"]}>
              <AccountSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/listing/:category/:title"
          element={
            <ProtectedRoute allowedRoles={["guest", "user"]}>
              <ListingDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/confirm-and-pay"
          element={
            <ProtectedRoute allowedRoles={["guest", "user"]}>
              <ConfirmAndPay />
            </ProtectedRoute>
          }
        />
        <Route
          path="/message-host"
          element={
            <ProtectedRoute allowedRoles={["guest", "user"]}>
              <MessageHost />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute allowedRoles={["guest", "user"]}>
              <GuestMessages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <HostHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/bookings"
          element={
            <ProtectedRoute allowedRoles={["host", "admin"]}>
              <BookingApproval />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/bookings"
          element={
            <ProtectedRoute allowedRoles={["host", "admin"]}>
              <BookingApproval />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/create-listing"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <CreateListing />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/create-listing/about-your-place"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <AboutYourPlace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/create-listing/structure"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <StructureSelection />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/create-listing/map-location"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <MapLocationSelection />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/create-listing/place-basics"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <PlaceBasics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/create-listing/stand-out"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <MakePlaceStandOut />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/create-listing/amenities"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <AmenitiesSelection />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/create-listing/photos"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <PhotoUpload />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/create-listing/title"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <TitlePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/create-listing/highlights"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <ListingHighlights />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/create-listing/description"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <DescriptionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/create-listing/publish"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <FinishPublish />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/create-listing/price"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <PricePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/create-listing/weekend-price"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <WeekendPrice />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/create-listing/discounts"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <DiscountsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/create-listing/legal"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <LegalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/create-listing/final-details"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <FinalDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/verify-listing/:id"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <VerifyListing />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/listing-editor/:id"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <ListingEditor />
            </ProtectedRoute>
          }
        />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/transaction/:id" element={<TransactionReceipt />} />
        <Route
          path="/host/cohosts"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <CoHostSearch />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminHome />
            </ProtectedRoute>
          }
        />
      </Routes>
      </Router>
    </PayPalScriptProvider>
  );
}

export default App;
