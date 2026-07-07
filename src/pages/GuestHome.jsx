import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { auth, db } from "../firebase";
import * as hostRewards from "../utils/hostRewards";
import { categories, homeSections, experienceSections, serviceCategories, serviceCategoryDetails, categoryMoments } from "../mockData";
import Navbar from "../components/Navbar";

const getStoredAvatarKey = (uid) => `stayvista-profile-photo-${uid}`;
const getFavoritesKey = (uid) => `stayvista-favorites-${uid}`;
const getWishlistKey = (uid) => `stayvista-wishlist-${uid}`;

function getFavoriteId(category, item) {
  return `${category}:${item.title}`;
}

function getShareUrl(category, item) {
  const params = new URLSearchParams({
    category,
    title: item.title
  });

  return `${window.location.origin}/guest?${params.toString()}`;
}

function ShareMenu({ item, category }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = getShareUrl(category, item);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch (error) {
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const shareOnFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(facebookUrl, "_blank", "noopener,noreferrer,width=720,height=560");
    setOpen(false);
  };

  return (
    <div className="share-menu-shell">
      <button type="button" className="share-button" onClick={() => setOpen((value) => !value)}>
        Share
      </button>
      {open && (
        <div className="share-menu">
          <button type="button" onClick={copyLink}>{copied ? "Link copied" : "Copy link"}</button>
          <button type="button" onClick={shareOnFacebook}>Share on Facebook</button>
        </div>
      )}
    </div>
  );
}

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"];

function formatDateValue(date) {
  return date.toISOString().slice(0, 10);
}

function formatReadableDate(dateValue) {
  if (!dateValue) return "Add dates";

  const date = new Date(`${dateValue}T00:00:00`);
  return `${monthNames[date.getMonth()].slice(0, 3)} ${date.getDate()}, ${date.getFullYear()}`;
}

function CalendarMonth({ monthDate, selectedDate, onSelectDate }) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const cells = [
    ...Array.from({ length: firstDay }, (_, index) => ({ key: `blank-${index}`, blank: true })),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const value = formatDateValue(new Date(year, month, day));
      return { key: value, day, value };
    })
  ];

  return (
    <div className="calendar-month">
      <h3>{monthNames[month]} {year}</h3>
      <div className="calendar-weekdays">
        {weekdayLabels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((cell) => (
          cell.blank ? (
            <span key={cell.key} />
          ) : (
            <button
              key={cell.key}
              type="button"
              className={selectedDate === cell.value ? "selected" : ""}
              onClick={() => onSelectDate(cell.value)}
            >
              {cell.day}
            </button>
          )
        ))}
      </div>
    </div>
  );
}

function DatePickerPopover({ selectedDate, onSelectDate }) {
  const today = new Date();
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  return (
    <div className="date-picker-popover">
      <div className="date-picker-tabs">
        <button type="button" className="active">Dates</button>
        <button type="button">Flexible</button>
      </div>
      <div className="date-picker-months">
        <CalendarMonth monthDate={currentMonth} selectedDate={selectedDate} onSelectDate={onSelectDate} />
        <CalendarMonth monthDate={nextMonth} selectedDate={selectedDate} onSelectDate={onSelectDate} />
      </div>
      <div className="date-picker-flex-options">
        {["Exact dates", "+ 1 day", "+ 2 days", "+ 3 days", "+ 7 days", "+ 14 days"].map((option) => (
          <span key={option}>{option}</span>
        ))}
      </div>
    </div>
  );
}

function ListingCard({ item, activeCategory, isFavorite, isWishlisted, onToggleFavorite, onToggleWishlist }) {
  const navigate = useNavigate();
  const handleCardClick = (e) => {
    // Prevent navigation if clicking on buttons
    if (e.target.closest("button")) return;
    navigate(`/listing/${activeCategory}/${encodeURIComponent(item.title)}`);
  };

  return (
    <article className="listing-card clickable-card" onClick={handleCardClick}>
      <div className="listing-photo">
        <img src={item.image} alt={item.title} />
        <button
          type="button"
          className={`listing-badge listing-wishlist-button ${isWishlisted ? "active" : ""}`}
          onClick={(e) => { e.stopPropagation(); onToggleWishlist(activeCategory, item); }}
        >
          {isWishlisted ? "Wishlisted" : "Add to wishlist"}
        </button>
        <button
          type="button"
          className={`listing-favorite ${isFavorite ? "active" : ""}`}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(activeCategory, item); }}
        >
          {isFavorite ? "\u2665" : "\u2661"}
        </button>
      </div>
      <div className="listing-content">
        <div className="listing-heading">
          <div>
            <p>{item.type}</p>
            <h3>{item.title}</h3>
          </div>
          <span className="listing-rating">{item.rating}</span>
        </div>
        <p className="listing-location">{item.location}</p>
        <p className="listing-review">{item.review}</p>
        <div className="amenity-list">
          {item.amenities.map((amenity) => (
            <span key={amenity}>{amenity}</span>
          ))}
        </div>
        <div className="listing-footer">
          <div>
            <span className="listing-price">{item.price}</span>
            {item.availability && item.availability !== "Available soon" ? (
              <span>{item.availability}</span>
            ) : null}
          </div>
          <ShareMenu item={item} category={activeCategory} />
        </div>
      </div>
    </article>
  );
}

function ServiceCard({ item, isFavorite, isWishlisted, onToggleFavorite, onToggleWishlist }) {
  const navigate = useNavigate();
  const handleCardClick = (e) => {
    if (e.target.closest("button")) return;
    navigate(`/listing/services/${encodeURIComponent(item.title)}`);
  };

  return (
    <article className="service-card clickable-card" onClick={handleCardClick}>
      <div className="service-photo">
        <img src={item.image} alt={item.title} />
        <button
          type="button"
          className={`listing-badge listing-wishlist-button ${isWishlisted ? "active" : ""}`}
          onClick={(e) => { e.stopPropagation(); onToggleWishlist("services", item); }}
        >
          {isWishlisted ? "Wishlisted" : "Add to wishlist"}
        </button>
        <button
          type="button"
          className={`listing-favorite service-favorite ${isFavorite ? "active" : ""}`}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite("services", item); }}
        >
          {isFavorite ? "\u2665" : "\u2661"}
        </button>
      </div>
      <div className="service-card-body">
        <h3>{item.title}</h3>
        <p>{item.type}</p>
        <strong>{item.price}</strong>
        <ShareMenu item={item} category="services" />
      </div>
    </article>
  );
}

function GuestHome() {
  const [activeCategory, setActiveCategory] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeServiceCategory, setActiveServiceCategory] = useState("photography");
  const [favorites, setFavorites] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [whereQuery, setWhereQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [guestCount, setGuestCount] = useState(0);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState({ where: "", date: "", guests: 0 });
  const [profile, setProfile] = useState({
    uid: "",
    fullName: "",
    displayName: "",
    photoURL: "",
    email: ""
  });
  const [publishedHomeListings, setPublishedHomeListings] = useState([]);
  const [publishedExperienceListings, setPublishedExperienceListings] = useState([]);
  const [publishedServiceListings, setPublishedServiceListings] = useState([]);

  const activeMoment = categoryMoments[activeCategory] ?? categoryMoments.home;

  const getPublishedListingImage = (listingData) => {
    const sourceImage = listingData.coverPhotoUrl || listingData.photoUrls?.[0] || listingData.image;
    if (sourceImage) return sourceImage;

    const typeLabel = `${listingData.listingType || ""} ${listingData.selectedType || ""} ${listingData.type || ""}`.toLowerCase();
    const category = /experience|tour|activity/.test(typeLabel)
      ? "experience"
      : /service|photography|chef|massage|meal|training|makeup|hair|spa|catering/.test(typeLabel)
        ? "services"
        : "homes";
    const fallbackName = (listingData.listingTitle || listingData.title || "default")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/(^-|-$)/g, "")
      .toLowerCase() || "default";

    return `/images/${category}/${fallbackName}.jpg`;
  };

  const normalizeServiceCategory = useCallback((value) => (value || "").toString().trim().toLowerCase(), []);

  const isServiceListing = useCallback((listingData) => {
    const check = (
      listingData.selectedType || listingData.listingType || listingData.propertyCategory || listingData.type || ""
    ).toString().toLowerCase();

    return check.includes("service") || normalizeServiceCategory(listingData.selectedOption).length > 0;
  }, [normalizeServiceCategory]);

  const mapPublishedListing = useCallback((listingData) => {
    const priceSuffix = listingData.pricingModel === "perGroup"
      ? "/ group"
      : listingData.pricingModel === "perGuest"
        ? "/ guest"
        : "/ night";

    const formattedPrice = listingData.basePrice != null
      ? `PHP ${Math.round(listingData.basePrice).toLocaleString()} ${priceSuffix}`
      : listingData.price || `PHP 0 ${priceSuffix}`;

    const publishedServiceCategory = normalizeServiceCategory(listingData.selectedOption || listingData.serviceCategory || "");
    const isService = isServiceListing(listingData);
    const serviceType = isService ? (listingData.selectedOption || listingData.listingType || listingData.selectedType || "Service") : (listingData.listingType || listingData.selectedType || "Home");

    return {
      title: listingData.listingTitle || listingData.title || "Untitled listing",
      type: serviceType,
      serviceCategory: isService ? publishedServiceCategory : undefined,
      location: listingData.addressDetails?.city || listingData.address || "Tagaytay",
      price: formattedPrice,
      rating: listingData.rating || "New",
      review: listingData.description ? listingData.description.slice(0, 40) : listingData.review || "New listing",
      description: listingData.description || "",
      amenities: listingData.amenities || [],
      availability: listingData.availability || "",
      image: getPublishedListingImage(listingData),
      coverPhotoUrl: listingData.coverPhotoUrl || "",
      photoUrls: listingData.photoUrls || [],
      images: listingData.photoUrls || [],
      addressDetails: listingData.addressDetails,
      hostId: listingData.hostId,
      hostName: listingData.hostName,
      hostEmail: listingData.hostEmail,
      hostPhotoURL: listingData.hostPhotoURL
    };
  }, [isServiceListing, normalizeServiceCategory]);

  const homeSectionsWithPublished = useMemo(() => {
    if (!publishedHomeListings.length) return homeSections;
    return homeSections.map((section) => {
      if (section.title === "Places to stay in Tagaytay") {
        return {
          ...section,
          items: [...publishedHomeListings, ...section.items]
        };
      }
      return section;
    });
  }, [publishedHomeListings]);

  const experienceSectionsWithPublished = useMemo(() => {
    if (!publishedExperienceListings.length) return experienceSections;
    return [
      ...experienceSections,
      {
        title: "Places to experience in Tagaytay",
        items: publishedExperienceListings
      }
    ];
  }, [publishedExperienceListings]);

  const activeSections = useMemo(() => {
    if (activeCategory === "home") return homeSectionsWithPublished;
    if (activeCategory === "experiences") return experienceSectionsWithPublished;
    return [];
  }, [activeCategory, homeSectionsWithPublished, experienceSectionsWithPublished]);

  const activeServiceItems = useMemo(() => (
    publishedServiceListings.filter((item) => item.serviceCategory === activeServiceCategory)
  ), [activeServiceCategory, publishedServiceListings]);

  const serviceCounts = useMemo(() => {
    const counts = publishedServiceListings.reduce((acc, item) => {
      acc[item.serviceCategory] = (acc[item.serviceCategory] || 0) + 1;
      return acc;
    }, {});

    return serviceCategories.reduce((acc, service) => {
      acc[service.id] = counts[service.id] || 0;
      return acc;
    }, {});
  }, [publishedServiceListings]);

  const activeServiceTitle = serviceCategories.find((service) => service.id === activeServiceCategory)?.title ?? "Photography";
  const activeServiceDetails = serviceCategoryDetails[activeServiceCategory] ?? serviceCategoryDetails.photography;

  const matchesSearch = useCallback((item) => {
    const query = searchFilters.where.trim().toLowerCase();
    if (!query) return true;

    return [item.title, item.type, item.location, item.review, item.price]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  }, [searchFilters.where]);

  const filteredSections = useMemo(() => (
    activeSections
      .map((section) => ({
        ...section,
        items: section.items.filter(matchesSearch)
      }))
      .filter((section) => section.items.length > 0)
  ), [activeSections, matchesSearch]);

  const filteredServiceItems = useMemo(() => (
    activeServiceItems.filter(matchesSearch)
  ), [activeServiceItems, matchesSearch]);

  useEffect(() => {
    if (activeCategory !== "services") {
      return;
    }

    setActiveServiceCategory("photography");
  }, [activeCategory]);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      const user = auth.currentUser;
      if (!user) return;

      let fullName = "";

      try {
        const snapshot = await getDoc(doc(db, "users", user.uid));
        if (snapshot.exists()) {
          fullName = snapshot.data().fullName ?? "";
        }
      } catch (error) {
        fullName = "";
      }

      if (!isMounted) return;

      const savedPhoto = localStorage.getItem(getStoredAvatarKey(user.uid));

      setProfile({
        uid: user.uid,
        fullName,
        displayName: user.displayName ?? "",
        photoURL: savedPhoto || user.photoURL || "",
        email: user.email ?? ""
      });

      try {
        const savedFavorites = JSON.parse(localStorage.getItem(getFavoritesKey(user.uid)) || "[]");
        setFavorites(Array.isArray(savedFavorites) ? savedFavorites : []);
      } catch (error) {
        setFavorites([]);
      }

      try {
        const savedWishlist = JSON.parse(localStorage.getItem(getWishlistKey(user.uid)) || "[]");
        setWishlist(Array.isArray(savedWishlist) ? savedWishlist : []);
      } catch (error) {
        setWishlist([]);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const isHomeListing = (listingData) => {
      const check = (
        listingData.selectedType || listingData.listingType || listingData.propertyCategory || listingData.type || ""
      ).toString().toLowerCase();

      // Accept common variants: home, house, property
      return check.includes("home") || check.includes("house") || check.includes("property");
    };

    const isExperienceListing = (listingData) => {
      const check = (
        listingData.selectedType || listingData.listingType || listingData.propertyCategory || listingData.type || ""
      ).toString().toLowerCase();

      return check.includes("experience") || check.includes("tour") || check.includes("activity");
    };

    const loadPublishedHomeListings = async () => {
      try {
        const listingsRef = collection(db, "listings");
        const publishedQuery = query(listingsRef, where("published", "==", true));
        const snapshot = await getDocs(publishedQuery);
        if (!isMounted) return;
        const publishedItems = snapshot.docs.map((docSnap) => docSnap.data());

        const homeItems = publishedItems
          .filter(isHomeListing)
          .map((listingData) => ({
            ...mapPublishedListing(listingData),
            promoted: !!hostRewards.getActivePromotionForListing(listingData.id)
          }))
          .sort((a, b) => (b.promoted === a.promoted ? 0 : b.promoted ? -1 : 1));

        const experienceItems = publishedItems
          .filter(isExperienceListing)
          .map((listingData) => ({
            ...mapPublishedListing(listingData),
            promoted: !!hostRewards.getActivePromotionForListing(listingData.id)
          }))
          .sort((a, b) => (b.promoted === a.promoted ? 0 : b.promoted ? -1 : 1));

        const serviceItems = publishedItems
          .filter(isServiceListing)
          .map(mapPublishedListing);

        setPublishedHomeListings(homeItems);
        setPublishedExperienceListings(experienceItems);
        setPublishedServiceListings(serviceItems);
      } catch (error) {
        console.error("Unable to load published home listings:", error);
      }
    };

    loadPublishedHomeListings();

    return () => {
      isMounted = false;
    };
  }, [isServiceListing, mapPublishedListing]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const openSameTab = (path) => {
    window.location.href = path;
  };

  const toggleFavorite = (category, item) => {
    if (!profile.uid) return;

    const favorite = {
      id: getFavoriteId(category, item),
      category,
      title: item.title,
      type: item.type,
      location: item.location ?? "",
      price: item.price,
      rating: item.rating ?? "",
      image: item.image
    };

    setFavorites((current) => {
      const exists = current.some((entry) => entry.id === favorite.id);
      const nextFavorites = exists
        ? current.filter((entry) => entry.id !== favorite.id)
        : [favorite, ...current];

      localStorage.setItem(getFavoritesKey(profile.uid), JSON.stringify(nextFavorites));
      return nextFavorites;
    });
  };

  const toggleWishlist = (category, item) => {
    if (!profile.uid) return;

    const wishlistItem = {
      id: getFavoriteId(category, item),
      category,
      title: item.title,
      type: item.type,
      location: item.location ?? "",
      price: item.price,
      rating: item.rating ?? "",
      image: item.image
    };

    setWishlist((current) => {
      const exists = current.some((entry) => entry.id === wishlistItem.id);
      const nextWishlist = exists
        ? current.filter((entry) => entry.id !== wishlistItem.id)
        : [wishlistItem, ...current];

      localStorage.setItem(getWishlistKey(profile.uid), JSON.stringify(nextWishlist));
      return nextWishlist;
    });
  };

  const isFavorite = (category, item) => (
    favorites.some((favorite) => favorite.id === getFavoriteId(category, item))
  );

  const isWishlisted = (category, item) => (
    wishlist.some((entry) => entry.id === getFavoriteId(category, item))
  );

  const handleSearch = () => {
    setSearchFilters({
      where: whereQuery,
      date: selectedDate,
      guests: guestCount
    });
    setDatePickerOpen(false);
  };

  const getSectionHeading = (sectionTitle) => ({
    kicker: sectionTitle,
    title: ""
  });

  const navigate = useNavigate();
  const profileLabel = profile.fullName || profile.displayName || profile.email || "Profile";
  const profileInitial = profileLabel.trim().charAt(0).toUpperCase() || "P";
  const currentUser = auth.currentUser;
  const currentUid = currentUser?.uid || profile.uid;
  const roleKey = currentUid ? `stayvista-role-view-${currentUid}` : null;
  const [roleView, setRoleView] = useState(() => {
    if (!currentUid || typeof window === "undefined") return null;
    return String(localStorage.getItem(`stayvista-role-view-${currentUid}`) || "").toLowerCase();
  });

  useEffect(() => {
    if (!currentUid) return;
    const storedRole = String(localStorage.getItem(`stayvista-role-view-${currentUid}`) || "").toLowerCase();
    if (storedRole && storedRole !== roleView) {
      setRoleView(storedRole);
    }
  }, [currentUid, roleView]);

  const handleBecomeHost = async () => {
    if (!currentUid) {
      navigate("/login");
      return;
    }

    const userRoleDoc = doc(db, "users", currentUid);
    try {
      await setDoc(userRoleDoc, { role: "host" }, { merge: true });
      if (roleKey) {
        localStorage.setItem(roleKey, "host");
      }
      if (typeof window !== "undefined") {
        sessionStorage.setItem("stayvista-switched-to-host", "true");
      }
      setRoleView("host");
      setMenuOpen(false);
      window.location.href = "/host";
    } catch (error) {
      console.error("Failed to update user role to host:", error);
      alert("Unable to switch to host mode right now. Please try again.");
    }
  };

  return (
    <main className="guest-shell">
      <Navbar
        profilePhotoURL={profile.photoURL}
        profileInitial={profileInitial}
        onMenuToggle={() => setMenuOpen((value) => !value)}
        menuOpen={menuOpen}
      />

      {menuOpen && (
        <div className="guest-menu-dropdown guest-menu-dropdown-fixed">
          <button type="button" className="menu-item menu-item-icon" onClick={() => openSameTab("/profile?section=wishlist")}>
            <i className="menu-line-icon fa-solid fa-bookmark" aria-hidden="true" />
            <span>Wishlists</span>
          </button>
          <button type="button" className="menu-item menu-item-icon" onClick={() => openSameTab("/profile?section=favorites")}> 
            <i className="menu-line-icon fa-solid fa-star" aria-hidden="true" />
            <span>Favorites</span>
          </button>
          <button type="button" className="menu-item menu-item-icon" onClick={() => openSameTab("/messages") }>
            <i className="menu-line-icon fa-solid fa-comment-dots" aria-hidden="true" />
            <span>Messages</span>
          </button>
          <button type="button" className="menu-item menu-item-icon" onClick={() => openSameTab("/profile")}> 
            <i className="menu-line-icon fa-solid fa-user" aria-hidden="true" />
            <span>Profile</span>
          </button>

          {currentUid && roleView === 'host' && (
            <button type="button" className="menu-item menu-item-icon" onClick={() => { localStorage.setItem(roleKey, 'host'); setMenuOpen(false); navigate('/host'); }}> 
              <i className="menu-line-icon fa-solid fa-house" aria-hidden="true" />
              <span>Back to host</span>
            </button>
          )}

          <div className="menu-divider" />

          <button type="button" className="menu-item menu-item-icon" onClick={() => openSameTab("/account-settings")}> 
            <i className="menu-line-icon fa-solid fa-gear" aria-hidden="true" />
            <span>Account settings</span>
          </button>
          <button type="button" className="menu-item menu-item-icon">
            <span className="menu-help-icon"><i className="fa-solid fa-circle-question" aria-hidden="true" /></span>
            <span>Help Center</span>
          </button>

          <div className="menu-divider" />

          <button type="button" className="menu-host-card" onClick={handleBecomeHost}>
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
        </div>
      )}

      <section className="guest-hero">
        <div className="guest-hero-copy">
          <p className="section-kicker">{activeMoment.eyebrow}</p>
          <h1>{activeMoment.title}</h1>
          <p>{activeMoment.copy}</p>

          <div className="guest-hero-tags">
            {activeMoment.highlights.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="guest-search-section">
        <div className="search-card hero-search-card">
          <label className="search-field">
            <span>Where</span>
            <input
              type="text"
              value={whereQuery}
              placeholder="Search destinations"
              onChange={(event) => setWhereQuery(event.target.value)}
            />
          </label>
          <div className="search-field date-search-field">
            <button type="button" onClick={() => setDatePickerOpen((value) => !value)}>
              <span>When</span>
              <strong>{formatReadableDate(selectedDate)}</strong>
            </button>
            {datePickerOpen && (
              <DatePickerPopover
                selectedDate={selectedDate}
                onSelectDate={(dateValue) => {
                  setSelectedDate(dateValue);
                  setDatePickerOpen(false);
                }}
              />
            )}
          </div>
          <div className="search-field guest-search-field">
            <span>Who</span>
            <div className="guest-stepper">
              <button type="button" onClick={() => setGuestCount((count) => Math.max(0, count - 1))}>-</button>
              <strong>{guestCount ? `${guestCount} guest${guestCount > 1 ? "s" : ""}` : "Add guests"}</strong>
              <button type="button" onClick={() => setGuestCount((count) => count + 1)}>+</button>
            </div>
          </div>
          <button type="button" className="search-action" onClick={handleSearch}>Search</button>
        </div>
      </section>

      <section className="guest-category-bar">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`category-tab ${activeCategory === category.id ? "active" : ""}`}
            onClick={() => {
              setActiveCategory(category.id);
              if (category.id === "services") {
                setActiveServiceCategory("photography");
              }
            }}
          >
            <span className="category-icon">{category.icon}</span>
            <span>
              <strong>{category.label}</strong>
              <small>{category.description}</small>
            </span>
          </button>
        ))}
      </section>

      {activeCategory === "services" ? (
        <section className="services-shell">
          <div className="section-heading service-heading">
            <h2>Services in Tagaytay</h2>
          </div>

          <div className="service-category-row">
            {serviceCategories.map((service) => (
              <button
                key={service.title}
                type="button"
                className={`service-category-card ${activeServiceCategory === service.id ? "active" : ""}`}
                onClick={() => setActiveServiceCategory(service.id)}
              >
                <div className="service-category-photo">
                  <img src={service.image} alt={service.title} />
                </div>
                <h3>{service.title}</h3>
                <p>{`${serviceCounts[service.id] ?? 0} available`}</p>
              </button>
            ))}
          </div>

          <section className="service-spotlight-card">
            <div className="service-spotlight-copy">
              <p className="section-kicker">{activeServiceDetails.eyebrow}</p>
              <h2>{activeServiceTitle}</h2>
              <p>{activeServiceDetails.copy}</p>
            </div>
            <div className="service-spotlight-meta">
              <strong>{filteredServiceItems.length}</strong>
              <span>Available services</span>
            </div>
          </section>

          <section className="service-section-block">
            <div className="section-heading">
              <h2>{`Explore ${activeServiceTitle.toLowerCase()} services`}</h2>
            </div>
            <div className="service-grid">
              {filteredServiceItems.length ? (
                filteredServiceItems.map((item) => (
                  <ServiceCard
                    key={item.title}
                    item={item}
                    isFavorite={isFavorite("services", item)}
                    isWishlisted={isWishlisted("services", item)}
                    onToggleFavorite={toggleFavorite}
                    onToggleWishlist={toggleWishlist}
                  />
                ))
              ) : (
                <div className="search-empty-state">No results found.</div>
              )}
            </div>
          </section>
        </section>
      ) : (
        <section className="guest-main-grid guest-main-grid-single">
          <div className="guest-listing-area">
            {filteredSections.length ? filteredSections.map((section) => (
              <section key={section.title} className="listing-section-block">
                {(() => {
                  const heading = getSectionHeading(section.title);

                  return (
                    <div className="section-heading">
                      <div>
                        <p className="section-kicker">{heading.kicker}</p>
                        {heading.title ? <h2>{heading.title}</h2> : null}
                      </div>
                    </div>
                  );
                })()}

                <div className="listing-grid">
                  {section.items.map((item) => (
                    <ListingCard
                      key={`${section.title}-${item.title}`}
                      item={item}
                      activeCategory={activeCategory}
                      isFavorite={isFavorite(activeCategory, item)}
                      isWishlisted={isWishlisted(activeCategory, item)}
                      onToggleFavorite={toggleFavorite}
                      onToggleWishlist={toggleWishlist}
                    />
                  ))}
                </div>
              </section>
            )) : (
              <div className="search-empty-state">No results found.</div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

export default GuestHome;

