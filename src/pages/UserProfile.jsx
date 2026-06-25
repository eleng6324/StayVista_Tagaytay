import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "../firebase";
import { loadBookings } from "../utils/bookingStorage";
import { getListingById } from "../mockData";

const connections = [];

const bookings = [];

const getFavoritesKey = (uid) => `stayvista-favorites-${uid}`;
const getWishlistKey = (uid) => `stayvista-wishlist-${uid}`;

function getInitialSection() {
  const section = new URLSearchParams(window.location.search).get("section");

  if (["about", "trips", "connections", "wishlist", "favorites"].includes(section)) {
    return section;
  }

  return "about";
}

function getStoredAvatarKey(uid) {
  return `stayvista-profile-photo-${uid}`;
}

function SavedItemsGrid({ items, onItemClick }) {
  return (
    <div className="profile-favorites-grid">
      {items.map((item) => (
        <article key={item.id} className="profile-favorite-card clickable-card" onClick={() => onItemClick?.(item)}>
          <div className="profile-favorite-image">
            <img src={item.image} alt={item.title} />
          </div>
          <div className="profile-favorite-card-body">
            <span>{item.category}</span>
            <h3>{item.title}</h3>
            <p>{item.location || item.type}</p>
            <strong>{item.price}</strong>
          </div>
        </article>
      ))}
    </div>
  );
}

function getBookingRecommendations(guestBookings) {
  const hasBookings = Array.isArray(guestBookings) && guestBookings.length > 0;
  const lastBooking = hasBookings ? guestBookings[0] : null;
  const reference = lastBooking?.listingTitle || "your recent booking";

  if (!hasBookings) {
    return [
      {
        title: "Discover recommended stays",
        description: "Browse curated homes and experiences tailored for your next Tagaytay weekend.",
        image: "/stayvista_logo.png",
        path: "/guest"
      },
      {
        title: "Try local experiences",
        description: "See activities and services designed to complement your future bookings.",
        image: "/stayvista_logo.png",
        path: "/guest"
      },
      {
        title: "Plan a better next trip",
        description: "Get suggestions that help you relax, dine, and explore around Tagaytay.",
        image: "/stayvista_logo.png",
        path: "/guest"
      }
    ];
  }

  return [
    {
      title: `More experiences near ${reference}`,
      description: `This recommendation is based on your booking at ${reference}. Explore a related stay or activity for a smoother follow-up trip.`, 
      image: lastBooking.coverImage || "/stayvista_logo.png",
      path: "/guest"
    },
    {
      title: `Enhance your next stay`,
      description: `Guests who booked ${reference} often add a local service or arrange a dining experience nearby.`, 
      image: "/stayvista_logo.png",
      path: "/guest"
    },
    {
      title: `Similar bookings to ${reference}`,
      description: `Find other stays and activities with the same comfortable feel and easy planning.`, 
      image: "/stayvista_logo.png",
      path: "/guest"
    }
  ];
}

function UserProfile() {
  const initialSection = getInitialSection();
  const [activeSection, setActiveSection] = useState(initialSection);
  const [activeNotificationTab, setActiveNotificationTab] = useState("offers");
  const [activePaymentTab, setActivePaymentTab] = useState("payments");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [guestTrips, setGuestTrips] = useState([]);
  const [profile, setProfile] = useState({
    fullName: "",
    displayName: "",
    email: "",
    photoURL: "",
    role: "Guest",
    phone: "",
    location: "Tagaytay traveler"
  });

  const recommendations = getBookingRecommendations(guestTrips);

  const handleSavedItemClick = (item) => {
    if (!item?.category || !item?.title) {
      navigate("/guest");
      return;
    }

    navigate(`/listing/${encodeURIComponent(item.category)}/${encodeURIComponent(item.title)}`);
  };

  const handleFavoriteClick = handleSavedItemClick;

  const handleRecommendationClick = (recommendation) => {
    navigate(recommendation.path || "/guest");
  };

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      const user = auth.currentUser;
      if (!user) return;

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

      const storedAvatarKey = getStoredAvatarKey(user.uid);
      const savedPhoto = localStorage.getItem(storedAvatarKey);
      let savedFavorites = [];
      let savedWishlist = [];

      try {
        const parsedFavorites = JSON.parse(localStorage.getItem(getFavoritesKey(user.uid)) || "[]");
        savedFavorites = Array.isArray(parsedFavorites) ? parsedFavorites : [];
      } catch (error) {
        savedFavorites = [];
      }

      try {
        const parsedWishlist = JSON.parse(localStorage.getItem(getWishlistKey(user.uid)) || "[]");
        savedWishlist = Array.isArray(parsedWishlist) ? parsedWishlist : [];
      } catch (error) {
        savedWishlist = [];
      }

      setProfile({
        fullName: documentProfile.fullName ?? "",
        displayName: user.displayName ?? "",
        email: user.email ?? "",
        photoURL: savedPhoto || documentProfile.photoURL || user.photoURL || "",
        role: documentProfile.role ?? "Guest",
        phone: documentProfile.phone ?? "",
        location: documentProfile.location ?? "Tagaytay traveler"
      });
      setFavorites(savedFavorites);
      setWishlist(savedWishlist);

      const guestBookingRecords = loadBookings();
      setGuestTrips(getGuestTrips(user, guestBookingRecords));
    };

    loadProfile();

    const handleStorage = (event) => {
      if (event.key === "stayvista_bookings" || event.key === "stayvista_last_payment") {
        const user = auth.currentUser;
        if (user) {
          setGuestTrips(getGuestTrips(user, loadBookings()));
        }
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      isMounted = false;
      if (window.__guestBookingUnsubscribe) {
        window.__guestBookingUnsubscribe();
        window.__guestBookingUnsubscribe = null;
      }
    };
  }, []);

  const getGuestTrips = (user, allBookings) => {
    if (!user || !Array.isArray(allBookings)) return [];
    const email = user.email?.toLowerCase();
    return allBookings
      .filter((booking) => booking.guestId === user.uid || booking.guestEmail?.toLowerCase() === email)
      .sort((a, b) => new Date(b.checkInDate || b.paymentDate || b.createdAt) - new Date(a.checkInDate || a.paymentDate || a.createdAt));
  };


  useEffect(() => {
    const handleFocus = () => {
      const user = auth.currentUser;
      if (user) {
        getDoc(doc(db, "users", user.uid)).then((snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            const savedPhoto = localStorage.getItem(getStoredAvatarKey(user.uid));
            setProfile((current) => ({
              ...current,
              photoURL: savedPhoto || data.photoURL || current.photoURL,
            }));
          }
        });
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  useEffect(() => {
    if (activeSection === "notifications") {
      setActiveNotificationTab("offers");
    }
  }, [activeSection]);

  const profileName = profile.fullName || profile.displayName || "Maria Ellaine";
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || "M";
  const isHost = profile.role?.toLowerCase() === "host";

  const getTripCoverImage = (trip) => {
    const primaryCover =
      trip.coverImage ||
      trip.coverPhotoUrl ||
      trip.coverImageUrl ||
      trip.photoUrls?.[0] ||
      trip.image ||
      trip.booking?.coverImage ||
      trip.booking?.coverPhotoUrl ||
      trip.booking?.coverImageUrl ||
      trip.booking?.photoUrls?.[0] ||
      trip.booking?.image;

    if (primaryCover) {
      return primaryCover;
    }

    return (
      getListingById("home", trip.listingTitle)?.image ||
      getListingById("experiences", trip.listingTitle)?.image ||
      getListingById("services", trip.listingTitle)?.image ||
      ""
    );
  };

  const getTransactionIdByBooking = (trip) => {
    try {
      const transactions = JSON.parse(localStorage.getItem("stayvista_transactions") || "[]");
      const transaction = transactions.find(
        (tx) => tx.booking?.id === trip.id || tx.bookingId === trip.bookingId || tx.booking?.bookingId === trip.bookingId
      );
      return transaction?.id || null;
    } catch (error) {
      console.error("Failed to get transaction ID", error);
      return null;
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const openProfileSection = (section) => {
    setActiveSection(section);
    setMenuOpen(false);
  };

  const profileMenu = isHost ? (
    <>
      <button type="button" className="menu-item menu-item-icon" onClick={() => window.location.href = "/account-settings"}> 
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
      <button type="button" className="menu-item menu-item-icon" onClick={() => window.location.href = "/host/cohosts"}> 
        <i className="fa-solid fa-users" aria-hidden="true" />
        <span>Find a co-host</span>
      </button>
      <button type="button" className="menu-item menu-item-icon" onClick={() => window.location.href = "/host/create-listing"}> 
        <i className="fa-solid fa-square-plus" aria-hidden="true" />
        <span>Create a new listing</span>
      </button>
      <button type="button" className="menu-item menu-item-icon"> 
        <i className="fa-solid fa-user-plus" aria-hidden="true" />
        <span>Refer a host</span>
      </button>

      <div className="menu-divider" />

      <button type="button" className="menu-item menu-item-icon" onClick={handleLogout}> 
        <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
        <span>Log out</span>
      </button>
    </>
  ) : (
    <>
      <button type="button" className="menu-item menu-item-icon" onClick={() => openProfileSection("wishlist", "Wishlist")}> 
        <i className="menu-line-icon fa-solid fa-bookmark" aria-hidden="true" />
        <span>Wishlists</span>
      </button>
      <button type="button" className="menu-item menu-item-icon" onClick={() => openProfileSection("favorites", "Profile")}> 
        <i className="menu-line-icon fa-solid fa-star" aria-hidden="true" />
        <span>Favorites</span>
      </button>
      <button
        type="button"
        className="menu-item menu-item-icon"
        onClick={() => {
          navigate("/messages");
          setMenuOpen(false);
        }}
      > 
        <i className="menu-line-icon fa-solid fa-comment-dots" aria-hidden="true" />
        <span>Messages</span>
      </button>
      <button type="button" className="menu-item menu-item-icon" onClick={() => openProfileSection("about")}> 
        <i className="menu-line-icon fa-solid fa-user" aria-hidden="true" />
        <span>Profile</span>
      </button>

      <div className="menu-divider" />

      <button type="button" className="menu-item menu-item-icon" onClick={() => window.location.href = "/account-settings"}> 
        <span className="menu-line-icon menu-icon-settings" aria-hidden="true" />
        <span>Account settings</span>
      </button>
      <button type="button" className="menu-item menu-item-icon"> 
        <span className="menu-help-icon">?</span>
        <span>Help Center</span>
      </button>

      <div className="menu-divider" />

      <button type="button" className="menu-host-card"> 
        <div>
          <strong>Become a host</strong>
          <span>It&apos;s easy to start hosting and earn extra income.</span>
        </div>
        <div className="menu-host-figure">
          <img src="/images/host_icon.png" alt="Host icon" className="menu-host-icon" />
        </div>
      </button>

      <div className="menu-divider" />

      <button type="button" className="menu-item">Refer a Host</button>
      <button type="button" className="menu-item">Find a co-host</button>
      <button type="button" className="menu-item">Gift cards</button>

      <div className="menu-divider" />

      <button type="button" className="menu-item" onClick={handleLogout}>Log out</button>
    </>
  );

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    const user = auth.currentUser;
    if (!file || !user) return;

    const storedAvatarKey = getStoredAvatarKey(user.uid);
    const reader = new FileReader();

    reader.onload = async () => {
      const previewURL = reader.result;
      setProfile((current) => ({ ...current, photoURL: previewURL }));

      try {
        const photoPath = `profilePhotos/${user.uid}/${Date.now()}_${file.name}`;
        const photoRef = ref(storage, photoPath);
        const uploadResult = await uploadBytes(photoRef, file);
        const photoURL = await getDownloadURL(uploadResult.ref);

        await updateProfile(user, { photoURL });
        await user.reload();
        const updatedPhotoURL = auth.currentUser?.photoURL || photoURL;

        await setDoc(doc(db, "users", user.uid), { photoURL: updatedPhotoURL }, { merge: true });

        try {
          localStorage.setItem(storedAvatarKey, updatedPhotoURL);
        } catch (storageError) {
          console.warn("Unable to persist avatar in localStorage:", storageError);
        }

        setProfile((current) => ({ ...current, photoURL: updatedPhotoURL }));
      } catch (error) {
        console.error("Failed to upload profile photo:", error);
      }
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <main className="user-profile-shell">
      <header className="profile-page-topbar">
        <a href="/guest" className="profile-brand">
          <img src="/stayvista_logo.png" alt="StayVista Tagaytay" className="profile-logo" />
          StayVista Tagaytay
        </a>
        <div className="profile-navbar-actions">
          <button type="button" className="profile-chip-button" aria-label={profileName}>
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
              aria-label={isHost ? "Open host menu" : "Open guest menu"}
              title={isHost ? "Open host menu" : "Open guest menu"}
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
          <h1>Profile</h1>
          <button
            type="button"
            className={`profile-sidebar-item ${activeSection === "about" ? "active" : ""}`}
            onClick={() => setActiveSection("about")}
          >
            <span className="profile-sidebar-avatar">{profileInitial}</span>
            About me
          </button>
          <button
            type="button"
            className={`profile-sidebar-item ${activeSection === "trips" ? "active" : ""}`}
            onClick={() => setActiveSection("trips")}
          >
            <span>T</span>
            Bookings
          </button>
          <button
            type="button"
            className={`profile-sidebar-item ${activeSection === "connections" ? "active" : ""}`}
            onClick={() => setActiveSection("connections")}
          >
            <span>C</span>
            Connections
          </button>
          {isHost && (
            <>
              {/* Notifications and Payments are now managed in Account Settings */}
            </>
          )}
        </aside>

        <section className="profile-content-panel">
          <div className="profile-content-heading">
            <div>
              <p>Users profile</p>
              <h2>
                {activeSection === "about" && "About me"}
                {activeSection === "trips" && "Bookings"}
                {activeSection === "connections" && "Connections"}
                {activeSection === "notifications" && "Notifications"}
                {activeSection === "payments" && "Payments"}
                {activeSection === "wishlist" && "Wishlist"}
                {activeSection === "favorites" && "Favorites"}
              </h2>
            </div>
            <button type="button">Edit</button>
          </div>

          {activeSection === "about" && (
            <div className="profile-about-grid">
              <article className="profile-id-card">
                <label className="profile-photo-picker">
                  {profile.photoURL ? (
                    <img src={profile.photoURL} alt={profileName} />
                  ) : (
                    <span>{profileInitial}</span>
                  )}
                  <input type="file" accept="image/*" onChange={handlePhotoChange} />
                </label>
                <h3>{profileName}</h3>
                <p>{profile.role}</p>
              </article>

              <article className="profile-complete-card">
                <h3>Complete your profile</h3>
                <p>
                  Add a photo and keep your details updated so hosts and guests can get to know you.
                </p>
                <button type="button" className="profile-primary-action" onClick={() => navigate('/profile/edit')}>
                  Get started
                </button>
              </article>
            </div>
          )}

          {activeSection === "trips" && (
            <div className="profile-list-card">
              {guestTrips.length ? (
                <>
                  <div className="profile-trip-grid">
                    {guestTrips.map((trip) => {
                      const tripCoverImage = getTripCoverImage(trip);
                      return (
                        <article
                          key={trip.id || trip.bookingId || `${trip.listingTitle}-${trip.checkInDate}`}
                          className="profile-trip-card"
                        >
                          <div className="profile-trip-card-image-wrapper">
                            {tripCoverImage ? (
                              <img
                                src={tripCoverImage}
                                alt={trip.listingTitle || 'Booked stay'}
                                className="profile-trip-card-image"
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.onerror = null;
                                  event.currentTarget.src = "/stayvista_logo.png";
                                }}
                              />
                            ) : (
                              <div className="profile-trip-card-image-placeholder">
                                <span>{(trip.listingTitle || 'S').charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                          </div>
                          <div className="profile-trip-card-body">
                            <span className="profile-trip-card-tag">
                              {trip.guestCount ? `Guests: ${trip.guestCount}` : "Guest details"}
                            </span>
                            <h3>{trip.listingTitle || "Booked stay"}</h3>
                            <div className="profile-trip-card-meta">
                              <p>{trip.checkInDate || "—"} – {trip.checkOutDate || "—"}</p>
                              <p>Paid: PHP {Number(trip.amount || 0).toLocaleString()}</p>
                              {trip.status && (
                                <p style={{ color: trip.status === "CONFIRMED" ? "#047857" : trip.status === "REJECTED" ? "#b91c1c" : "#b45309" }}>
                                  Status: {trip.status}
                                </p>
                              )}
                              {trip.status === "CONFIRMED" && (
                                <button
                                  type="button"
                                  className="profile-trip-ticket"
                                  onClick={() => {
                                    const txId = getTransactionIdByBooking(trip);
                                    if (txId) {
                                      navigate(`/transaction/${txId}`);
                                    }
                                  }}
                                  style={{
                                    background: "linear-gradient(135deg, #047857, #065f46)",
                                    color: "#fff",
                                    border: "none",
                                    padding: "12px 16px",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "4px",
                                    transition: "all 0.2s ease"
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                    e.currentTarget.style.boxShadow = "0 8px 16px rgba(4, 120, 87, 0.3)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "none";
                                  }}
                                >
                                  <strong>📋 View Booking Ticket</strong>
                                  <p style={{ fontSize: "12px", margin: 0, opacity: 0.9 }}>{trip.bookingId || trip.id}</p>
                                </button>
                              )}
                              {trip.status && trip.status !== "CONFIRMED" && (
                                <div
                                  style={{
                                    padding: "12px 16px",
                                    borderRadius: "8px",
                                    background: trip.status === "REJECTED" ? "#fee2e2" : "#fef3c7",
                                    border: `1px solid ${trip.status === "REJECTED" ? "#fecaca" : "#fcd34d"}`,
                                    color: trip.status === "REJECTED" ? "#b91c1c" : "#b45309",
                                    fontSize: "13px"
                                  }}
                                >
                                  <strong>⏳ Awaiting approval</strong>
                                  <p style={{ margin: "4px 0 0 0", fontSize: "12px" }}>
                                    {trip.status === "REJECTED" 
                                      ? "This booking was not approved. Please contact the host for details."
                                      : "Your booking ticket will appear once the host approves."
                                    }
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  <div className="profile-recommendation-section">
                    <div className="recommendation-header">
                      <div>
                        <h3>Recommended stays and experiences</h3>
                        <p>We curated these ideas from your most recent booking — designed to help you plan your next Tagaytay escape with confidence.</p>
                      </div>
                      <button
                        type="button"
                        className="recommendation-action-button"
                        onClick={() => navigate('/guest')}
                      >
                        See all recommendations
                      </button>
                    </div>
                    <div className="recommendation-card-grid">
                      {recommendations.map((recommendation, index) => (
                        <article
                          key={index}
                          className="recommendation-card"
                          onClick={() => handleRecommendationClick(recommendation)}
                        >
                          <div className="recommendation-card-image">
                            <img src={recommendation.image} alt={recommendation.title} />
                            <div className="recommendation-card-image-overlay" />
                          </div>
                          <div className="recommendation-card-body">
                            <div>
                              <strong>{recommendation.title}</strong>
                              <p>{recommendation.description}</p>
                            </div>
                            <div className="recommendation-card-footer">
                              <span>Explore now</span>
                              <i className="fa-solid fa-arrow-right" />
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="profile-empty-state">
                    <h3>No past trips available.</h3>
                    <p>Once you complete a booking, your trip history will appear here.</p>
                  </div>
                </>
              )}
            </div>
          )}

          {activeSection === "connections" && (
            connections.length ? (
              <div className="profile-connection-grid">
                {connections.map((connection) => (
                  <article key={connection.name} className="profile-connection-card">
                    <span>{connection.name.charAt(0)}</span>
                    <h3>{connection.name}</h3>
                    <p>{connection.role}</p>
                    <small>{connection.detail}</small>
                  </article>
                ))}
              </div>
            ) : (
              <div className="profile-list-card">
                <div className="profile-empty-state">
                  <p>When you join an experience or invite someone on a trip, you’ll find the profiles of other guests here</p>
                </div>
              </div>
            )
          )}

          {activeSection === "wishlist" && (
            <article className="profile-settings-card">
              <div className="profile-settings-list">
                {wishlist.length ? (
                  <SavedItemsGrid items={wishlist} onItemClick={handleSavedItemClick} />
                ) : (
                  <div className="profile-empty-state profile-empty-favorites">
                    <h3>Nothing here yet {"\uD83D\uDC40"}</h3>
                    <h3>Nothing here yet 👀</h3>
                  </div>
                )}
              </div>
            </article>
          )}

          {activeSection === "favorites" && (
            <article className="profile-settings-card">
              <div className="profile-settings-list">
                {favorites.length ? (
                  <SavedItemsGrid items={favorites} onItemClick={handleFavoriteClick} />
                ) : (
                  <div className="profile-empty-state profile-empty-favorites">
                    <h3>Nothing here yet {"\uD83D\uDC40"}</h3>
                    <h3>Nothing here yet 👀</h3>
                  </div>
                )}
              </div>
            </article>
          )}


          {activeSection === "notifications" && (
            <article className="profile-settings-card">
              <div className="profile-settings-tabs">
                <button
                  type="button"
                  className={activeNotificationTab === "offers" ? "active" : ""}
                  onClick={() => setActiveNotificationTab("offers")}
                >
                  Offers and updates
                </button>
                <button
                  type="button"
                  className={activeNotificationTab === "account" ? "active" : ""}
                  onClick={() => setActiveNotificationTab("account")}
                >
                  Account
                </button>
              </div>
              <div className="profile-settings-list">
                {activeNotificationTab === "offers" ? (
                  <>
                    <div className="profile-setting-row">
                      <div>
                        <strong>Inspiration and offers</strong>
                        <span>On: Email</span>
                      </div>
                    </div>
                    <div className="profile-setting-row">
                      <div>
                        <strong>Trip planning</strong>
                        <span>On: Email</span>
                      </div>
                    </div>
                    <div className="profile-setting-row">
                      <div>
                        <strong>News and programs</strong>
                        <span>On: Email</span>
                      </div>
                    </div>
                    <div className="profile-setting-row">
                      <div>
                        <strong>Feedback</strong>
                        <span>On: Email</span>
                      </div>
                    </div>
                    <div className="profile-setting-row">
                      <div>
                        <strong>Travel regulations</strong>
                        <span>On: Email</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="profile-setting-row profile-notification-heading">
                      <div>
                        <strong>Account activity and policies</strong>
                        <span>Confirm your booking and account activity, and learn about important Airbnb policies.</span>
                      </div>
                    </div>
                    <div className="profile-setting-row">
                      <div>
                        <strong>Account activity</strong>
                        <span>On: Email</span>
                      </div>
                    </div>
                    <div className="profile-setting-row">
                      <div>
                        <strong>Guest policies</strong>
                        <span>On: Email</span>
                      </div>
                    </div>
                    <div className="profile-setting-row profile-notification-heading">
                      <div>
                        <strong>Reminders</strong>
                        <span>Get important reminders about your reservations, listings, and account activity.</span>
                      </div>
                    </div>
                    <div className="profile-setting-row">
                      <div>
                        <strong>Reminders</strong>
                        <span>On: Email</span>
                      </div>
                    </div>
                    <div className="profile-setting-row profile-notification-heading">
                      <div>
                        <strong>Guest and Host messages</strong>
                        <span>Keep in touch with hosts and guests before, during, and after your reservation.</span>
                      </div>
                    </div>
                    <div className="profile-setting-row">
                      <div>
                        <strong>Messages</strong>
                        <span>On: Email</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </article>
          )}

          {activeSection === "payments" && (
            <article className="profile-settings-card">
              <div className="profile-settings-tabs">
                <button
                  type="button"
                  className={activePaymentTab === "payments" ? "active" : ""}
                  onClick={() => setActivePaymentTab("payments")}
                >
                  Payments
                </button>
                <button
                  type="button"
                  className={activePaymentTab === "payouts" ? "active" : ""}
                  onClick={() => setActivePaymentTab("payouts")}
                >
                  Payouts
                </button>
              </div>

              <div className="profile-settings-list">
                {activePaymentTab === "payments" ? (
                  <>
                    <div className="profile-setting-row profile-payments-row">
                      <div>
                        <strong>Your payments</strong>
                        <span>Keep track of all your payments and refunds.</span>
                      </div>
                      <button type="button">Manage payments</button>
                    </div>
                    <div className="profile-setting-row">
                      <div>
                        <strong>Payment methods</strong>
                        <span>Add a payment method using our secure payment system, then start planning your next trip.</span>
                      </div>
                      <button type="button">Add payment method</button>
                    </div>
                    <div className="profile-setting-row">
                      <div>
                        <strong>Airbnb gift credit</strong>
                        <span>Add gift cards to your account.</span>
                      </div>
                      <button type="button">Add gift card</button>
                    </div>
                    <div className="profile-setting-row">
                      <div>
                        <strong>Coupons</strong>
                        <span>Your coupons</span>
                      </div>
                      <button type="button">Add coupon</button>
                    </div>
                  </>
                ) : (
                  <div className="profile-payouts-card" style={{ padding: 22, borderRadius: 18, background: '#f6faf3' }}>
                    <h3>How you'll get paid</h3>
                    <p style={{ color: '#4f6d4b', marginTop: 8 }}>Add at least one payout method so we know where to send your money.</p>
                    <div style={{ marginTop: 18 }}>
                      <button type="button" className="profile-primary-action">Set up payouts</button>
                    </div>
                  </div>
                )}
              </div>
            </article>
          )}
        </section>
      </div>
    </main>
  );
}

export default UserProfile;

