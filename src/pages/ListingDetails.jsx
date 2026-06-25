import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { loadBookings } from "../utils/bookingStorage";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import Navbar from "../components/Navbar";
import { getListingById, themedPhoto } from "../mockData";

const FontAwesomeIcon = ({ icon, size = 24 }) => (
  <i
    className={`fa-solid fa-${icon}`}
    style={{
      display: 'inline-block',
      fontSize: size,
      width: size,
      height: size,
      lineHeight: 1,
      color: 'currentColor',
      textAlign: 'center'
    }}
    aria-hidden="true"
  />
);

const StarIcon = ({ size = 14 }) => <FontAwesomeIcon icon="star" size={size} />;
const KeyIcon = ({ size = 24 }) => <FontAwesomeIcon icon="key" size={size} />;
const MapPinIcon = ({ size = 24 }) => <FontAwesomeIcon icon="map-pin" size={size} />;
const ShieldIcon = ({ size = 24 }) => <FontAwesomeIcon icon="shield" size={size} />;
const SchoolIcon = ({ size = 24 }) => <FontAwesomeIcon icon="school" size={size} />;
const BriefcaseIcon = ({ size = 24 }) => <FontAwesomeIcon icon="briefcase" size={size} />;
const KitchenIcon = ({ size = 24 }) => <FontAwesomeIcon icon="utensils" size={size} />;
const WifiIcon = ({ size = 24 }) => <FontAwesomeIcon icon="wifi" size={size} />;
const TvIcon = ({ size = 24 }) => <FontAwesomeIcon icon="tv" size={size} />;
const SnowflakeIcon = ({ size = 24 }) => <FontAwesomeIcon icon="snowflake" size={size} />;
const BathIcon = ({ size = 24 }) => <FontAwesomeIcon icon="bath" size={size} />;
const AlarmIcon = ({ size = 24 }) => <FontAwesomeIcon icon="bell" size={size} />;

function getAmenityIcon(name) {
  const label = name.toLowerCase();
  const iconMap = [
    { test: (text) => text.includes('kitchen'), icon: 'utensils' },
    { test: (text) => text.includes('wifi') || text.includes('internet'), icon: 'wifi' },
    { test: (text) => text.includes('air conditioning') || text.includes('ceiling fan'), icon: 'snowflake' },
    { test: (text) => text.includes('tv') || text.includes('movie') || text.includes('theme room'), icon: 'tv' },
    { test: (text) => text.includes('bathtub') || text.includes('shampoo') || text.includes('conditioner') || text.includes('soap') || text.includes('shower'), icon: 'bath' },
    { test: (text) => text.includes('hair dryer'), icon: 'bell' },
    { test: (text) => text.includes('self check-in'), icon: 'key' },
    { test: (text) => text.includes('refrigerator') || text.includes('freezer'), icon: 'snowflake' },
    { test: (text) => text.includes('bed') || text.includes('pillows') || text.includes('blankets'), icon: 'bed' },
    { test: (text) => text.includes('workspace') || text.includes('office'), icon: 'briefcase' },
    { test: (text) => text.includes('book') || text.includes('reading'), icon: 'book' },
    { test: (text) => text.includes('pool') || text.includes('table') || text.includes('dining'), icon: 'person-swimming' },
    { test: (text) => text.includes('wine'), icon: 'wine-glass' },
    { test: (text) => text.includes('trash'), icon: 'trash' },
    { test: (text) => text.includes('bidet') || text.includes('toilet'), icon: 'toilet' },
    { test: (text) => text.includes('heating'), icon: 'fire' }
  ];

  const found = iconMap.find((entry) => entry.test(label));
  const icon = found ? found.icon : 'utensils';

  return <FontAwesomeIcon icon={icon} size={18} />;
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

function parseDateValue(dateValue) {
  return new Date(`${dateValue}T00:00:00`);
}

function formatReadableDate(dateValue) {
  if (!dateValue) return "Add date";
  const date = parseDateValue(dateValue);
  return `${monthNames[date.getMonth()].slice(0, 3)} ${date.getDate()}, ${date.getFullYear()}`;
}

function getNights(checkInDate, checkOutDate) {
  if (!checkInDate || !checkOutDate) return 0;
  const diffMs = parseDateValue(checkOutDate) - parseDateValue(checkInDate);
  return Math.max(0, Math.round(diffMs / 86400000));
}

function parseListingPrice(priceText) {
  const cleaned = priceText.replace(/,/g, "");
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

function isDateInRange(value, startDate, endDate) {
  return startDate && endDate && value > startDate && value < endDate;
}

function CalendarMonth({ monthDate, checkInDate, checkOutDate, onSelectDate, onPrevMonth, onNextMonth, bookedDates = [] }) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const todayValue = formatDateValue(new Date());

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
      <div className="calendar-month-header">
        <button type="button" onClick={onPrevMonth} className="calendar-nav-button" aria-label="Previous month">‹</button>
        <h3>{monthNames[month]} {year}</h3>
        <button type="button" onClick={onNextMonth} className="calendar-nav-button" aria-label="Next month">›</button>
      </div>
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
            (() => {
              const isBooked = bookedDates.includes(cell.value);
              const classes = [
                checkInDate === cell.value ? "check-in" : "",
                checkOutDate === cell.value ? "check-out" : "",
                isDateInRange(cell.value, checkInDate, checkOutDate) ? "range" : "",
                isBooked ? "booked" : ""
              ].filter(Boolean).join(" ");

              return (
                <button
                  key={cell.key}
                  type="button"
                  className={classes}
                  onClick={() => !isBooked && onSelectDate(cell.value)}
                  disabled={cell.value < todayValue || isBooked}
                  title={isBooked ? "Date unavailable (booked)" : undefined}
                  style={isBooked ? { background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed', borderRadius: 8 } : undefined}
                >
                  {cell.day}
                </button>
              );
            })()
          )
        ))}
      </div>
    </div>
  );
}

export default function ListingDetails() {
  const { category, title } = useParams();
  const navigate = useNavigate();
  let item = getListingById(category, title);
  const [dynamicListing, setDynamicListing] = useState(null);
  const [dynamicListingLoading, setDynamicListingLoading] = useState(false);

  if (dynamicListing) {
    item = dynamicListing;
  }

  const amenityGroups = [
    {
      title: 'Bathroom',
      items: [
        { label: 'Bathtub' },
        { label: 'Hair dryer' },
        { label: 'Cleaning products' },
        { label: 'Shampoo' },
        { label: 'Conditioner' },
        { label: 'Body soap' },
        { label: 'Bidet' },
        { label: 'Hot water' },
        { label: 'Shower gel' }
      ]
    },
    {
      title: 'Bedroom and laundry',
      items: [
        { label: 'Essentials', description: 'Towels, bed sheets, soap, and toilet paper' },
        { label: 'Bed linens' },
        { label: 'Extra pillows and blankets' },
        { label: 'Room-darkening shades' },
        { label: 'Clothing storage' }
      ]
    },
    {
      title: 'Entertainment',
      items: [
        { label: 'TV' },
        { label: 'Exercise equipment' },
        { label: 'Pool table' },
        { label: 'Books and reading material' },
        { label: 'Movie theater' },
        { label: 'Theme room', description: 'A room or multiple spaces that are designed to follow the same theme' }
      ]
    },
    {
      title: 'Heating and cooling',
      items: [
        { label: 'Air conditioning' },
        { label: 'Ceiling fan' }
      ]
    },
    {
      title: 'Internet and office',
      items: [
        { label: 'Wifi' },
        { label: 'Dedicated workspace' }
      ]
    },
    {
      title: 'Kitchen and dining',
      items: [
        { label: 'Kitchen', description: 'Space where guests can cook their own meals' },
        { label: 'Refrigerator' },
        { label: 'Dishes and silverware', description: 'Bowls, chopsticks, plates, cups, etc.' },
        { label: 'Freezer' },
        { label: 'Wine glasses' },
        { label: 'Trash compactor' },
        { label: 'Dining table' }
      ]
    },
    {
      title: 'Services',
      items: [
        { label: 'Self check-in', description: 'Check yourself into the home with a door code' }
      ]
    },
    {
      title: 'Not included',
      items: [
        { label: 'Exterior security cameras on property', description: 'Security cameras are installed in common areas of the building, including hallways, elevators, and the lobby. There are no cameras inside the unit to ensure your privacy.' },
        { label: 'Washer', description: 'A machine for washing clothes' },
        { label: 'Dryer', description: 'A machine for drying clothes' },
        { label: 'Smoke alarm', description: 'There is no smoke alarm on the property.' },
        { label: 'Heating', description: 'Heating system for the property' }
      ],
      isUnavailable: true
    }
  ];

  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState({
    uid: "",
    fullName: "",
    displayName: "",
    photoURL: "",
    email: ""
  });
  const [hostProfile, setHostProfile] = useState(null);
  const [checkInDate, setCheckInDate] = useState(() => location.state?.checkInDate || "");
  const [checkOutDate, setCheckOutDate] = useState(() => location.state?.checkOutDate || "");
  const [guestCount, setGuestCount] = useState(() => location.state?.guestCount || 1);
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [bookedDates, setBookedDates] = useState([]);
  const canReserve = Boolean(checkInDate && checkOutDate);

  const handleBookingAction = () => {
    if (checkInDate && checkOutDate) {
      navigate("/confirm-and-pay", {
        state: {
          listingTitle: item.title,
          checkInDate,
          checkOutDate,
          guestCount,
          price: item.price,
          coverImage: galleryImages[0] || item.image || "",
          hostEmail: item.hostEmail,
          hostId: item.hostId,
          listingId: item.id,
          listingCategory: item.type || item.selectedType || item.listingType || "Home",
          isPublished: !!item.hostId,
          origin: location.pathname,
          totalPrice: bookingSummary.total
        }
      });
      return;
    }

    document.getElementById("check-in-calendar")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handlePrevMonth = () => {
    setCalendarMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1));
  };

  const bookingSummary = (() => {
    const nights = getNights(checkInDate, checkOutDate);
    const parsedPrice = parseListingPrice(item?.price || "");
    let total = null;
    if (nights > 0 && parsedPrice.amount) {
      if (parsedPrice.mode === "total" && parsedPrice.nights > 0) {
        total = Math.round((parsedPrice.amount / parsedPrice.nights) * nights);
      } else if (parsedPrice.mode === "night") {
        total = Math.round(parsedPrice.amount * nights);
      } else {
        total = parsedPrice.amount;
      }
    }

    if (checkInDate && !checkOutDate) {
      return {
        label: "Select checkout for exact price",
        nights,
        total
      };
    }

    if (checkInDate && checkOutDate && nights > 0 && total) {
      return {
        label: `${formatAmount(total)} for ${nights} night${nights > 1 ? "s" : ""}`,
        nights,
        total
      };
    }

    return {
      label: "Add dates for prices",
      nights,
      total
    };
  })();

  const handleSelectDate = (value) => {
    if (!checkInDate || (checkInDate && checkOutDate)) {
      setCheckInDate(value);
      setCheckOutDate("");
      return;
    }

    if (!checkOutDate) {
      if (value <= checkInDate) {
        setCheckInDate(value);
      } else {
        setCheckOutDate(value);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const snapshot = await getDoc(doc(db, "users", user.uid));
        const data = snapshot.exists() ? snapshot.data() : {};
        const profilePhotoKey = `stayvista-profile-photo-${user.uid}`;
        const storedPhoto = localStorage.getItem(profilePhotoKey);

        setProfile({
          uid: user.uid,
          fullName: data.fullName || "",
          displayName: user.displayName || "",
          photoURL: storedPhoto || user.photoURL || "",
          email: user.email || ""
        });
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!title) return;

    let isMounted = true;

    const loadPublishedListing = async () => {
      setDynamicListingLoading(true);
      try {
        const listingsRef = collection(db, "listings");
        const listingQuery = query(
          listingsRef,
          where("published", "==", true),
          where("listingTitle", "==", decodeURIComponent(title))
        );
        const snapshot = await getDocs(listingQuery);
        if (!isMounted) return;

        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setDynamicListing({
            title: data.listingTitle || data.title || "Untitled listing",
            type: data.listingType || data.selectedType || "Home",
            location: data.addressDetails?.city || data.address || "Tagaytay",
            price: data.basePrice ? `PHP ${Math.round(data.basePrice).toLocaleString()} / night` : data.price || "PHP 0 / night",
            rating: data.rating || "New",
            review: data.description ? data.description.slice(0, 40) : data.review || "New listing",
            description: data.description || "",
            amenities: data.amenities || [],
            availability: data.availability || "Available soon",
            image: data.coverPhotoUrl || data.photoUrls?.[0] || data.image || themedPhoto(["home", "tagaytay"], 72),
            images: data.images || data.photoUrls || [],
            addressDetails: data.addressDetails,
            hostId: data.hostId,
            hostName: data.hostName,
            hostPhotoURL: data.hostPhotoURL || data.hostInfo?.photoUrl || "",
            hostInfo: data.hostInfo || {},
            listingTitle: data.listingTitle || data.title
          });
        }
      } catch (error) {
        console.error("Failed to load published listing details:", error);
      } finally {
        if (isMounted) setDynamicListingLoading(false);
      }
    };

    loadPublishedListing();

    return () => {
      isMounted = false;
    };
  }, [title]);

  useEffect(() => {
    if (!item?.hostId) return;
    let isMounted = true;

    const loadHostProfile = async () => {
      try {
        const hostSnapshot = await getDoc(doc(db, "users", item.hostId));
        if (!isMounted || !hostSnapshot.exists()) return;
        setHostProfile(hostSnapshot.data());
      } catch (error) {
        console.error("Failed to load host profile:", error);
      }
    };

    loadHostProfile();

    return () => {
      isMounted = false;
    };
  }, [item?.hostId]);

  useEffect(() => {
    // compute booked dates for this listing from local bookings
    try {
      const all = loadBookings();
      const relevant = all.filter((b) => (b.listingId === item.id || b.listingTitle === item.title) && b.status === "CONFIRMED");
      const dates = new Set();
      relevant.forEach((b) => {
        const start = b.checkInDate;
        const end = b.checkOutDate;
        if (!start || !end) return;
        let cur = new Date(`${start}T00:00:00`);
        const last = new Date(`${end}T00:00:00`);
        while (cur <= last) {
          const iso = cur.toISOString().slice(0, 10);
          dates.add(iso);
          cur.setDate(cur.getDate() + 1);
        }
      });
      setBookedDates(Array.from(dates));
    } catch (err) {
      console.warn("Failed to compute booked dates", err);
      setBookedDates([]);
    }
  }, [item]);

  if (!item) {
    if (dynamicListingLoading) {
      return (
        <div className="listing-details-page">
          <div className="listing-not-found">
            <h2>Loading listing…</h2>
          </div>
        </div>
      );
    }

    return (
      <div className="listing-details-page">
        <div className="listing-not-found">
          <h2>Listing not found</h2>
          <button onClick={() => navigate("/guest")} className="button">Back to home</button>
        </div>
      </div>
    );
  }

  const profileLabel = profile.fullName || profile.displayName || profile.email || "Profile";
  const profileInitial = profileLabel.trim().charAt(0).toUpperCase() || "P";

  // For published listings, use photoUrls. For mock listings, use images or item.image + themed photos
  const availablePhotos = item.photoUrls?.length > 0 
    ? item.photoUrls 
    : item.images?.length >= 5 
      ? item.images 
      : [];
  
  const galleryImages = availablePhotos.length >= 5 
    ? availablePhotos 
    : [
        item.image || availablePhotos[0] || "",
        availablePhotos[1] || themedPhoto(["interior", "room"], 1),
        availablePhotos[2] || themedPhoto(["interior", "bed"], 2),
        availablePhotos[3] || themedPhoto(["view", "nature"], 3),
        availablePhotos[4] || themedPhoto(["bathroom", "clean"], 4),
      ].filter(Boolean);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const getHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };

  const hash = getHash(item.title);

  const hosts = [
    { name: "Lari", role: "Host", school: "De La Salle HSI", work: "Real Estate Broker", rating: "5.0 ★", reviews: 2, responseRate: "100%", bio: "Hi, I'm Lari! Just in my twenties, figuring life out one step at a time. I started in physical therapy but found my path in real estate and business. I may not have been the best in class, but I hold on to something greater, my faith. I believe God is writing a story for me, and I'm trusting His timing every step of the way. 'For I know the plans I have for you, plans to prosper you and not to harm you, plans to give you hope and a future' - Jeremiah 29:11" },
    { name: "Mark", role: "Superhost", school: "Ateneo de Manila", work: "Architect", rating: "4.9 ★", reviews: 45, responseRate: "98%", bio: "I'm Mark, an architect passionate about interior design. I've designed this space to be a comfortable retreat for anyone visiting Tagaytay. I love meeting new people and sharing local food recommendations!" },
    { name: "Sofia", role: "Superhost", school: "UP Diliman", work: "Food Blogger", rating: "4.95 ★", reviews: 112, responseRate: "100%", bio: "Welcome to Tagaytay! I love food, coffee, and sharing my space. My property is close to all the best cafes. Let me know if you need recommendations, I'm always happy to help." },
    { name: "David", role: "Host", school: "UST", work: "Business Owner", rating: "4.8 ★", reviews: 18, responseRate: "95%", bio: "Hello, I'm David. I manage a few properties around Tagaytay. My goal is to provide a hassle-free and relaxing stay for my guests. I enjoy hiking and outdoor photography." }
  ];

  const descriptions = [
    "Relax in this stylish space with a calming view. Enjoy a bright, modern area with a cozy living room, balcony, and fully equipped essentials. Perfect for family, couples, friends, or small groups.",
    "Escape the city heat and enjoy the cool breeze. This property offers stunning ridge views, modern amenities, and a quiet neighborhood. A perfect getaway for weekenders.",
    "Experience rustic charm with modern comforts. Surrounded by pine trees and lush gardens, this place provides a tranquil retreat to unwind and reconnect with nature.",
    "A centrally located stay that makes exploring Tagaytay easy. Just minutes away from popular restaurants and cafes. It features high-speed internet, smart TV, and premium beddings for a comfortable night."
  ];

  const reviewNames = ["Gladys", "Flerida", "Juan", "Maria", "Carlo", "Bea", "Elena", "Mateo", "Sophia", "Luis", "Carlos", "Isabella"];
  const reviewTimes = ["2 days ago", "1 week ago", "3 weeks ago", "1 month ago", "2 months ago", "3 days ago", "4 days ago", "5 days ago", "2 weeks ago", "6 days ago", "2 months ago", "10 days ago"];
  const reviewTexts = [
    "We had a wonderful stay and truly loved the place! It was not only clean and comfortable, but also thoughtfully set up with so many things to enjoy. We really appreciated the variety of...",
    "Thank you to the host for letting us stay at their place. Our family had a great time. We really like the fact that it is accessible to all places we went to. We will definitely be bac...",
    "Amazing views and very accommodating host! Would highly recommend to anyone looking for a stay in Tagaytay. The place was spotless and the check-in process was very easy.",
    "The place is exactly as pictured. Very clean, fast wifi, and the location is perfect for food trips. We will definitely book this place again on our next trip to Tagaytay.",
    "Cozy and perfect for a quick weekend escape. The host was very responsive to our questions. The kitchen was well equipped which allowed us to cook our own meals.",
    "Beautiful interiors! We loved taking photos around the property. Check-in was smooth and easy. Highly recommended for staycations with friends or family.",
    "One of the best places we've stayed at! The attention to detail in the design made our vacation so much better. Everything was top-notch from the linens to the coffee provided.",
    "Superb experience. The weather was lovely and the balcony was the perfect spot to enjoy our morning coffee. We will definitely return.",
    "A very relaxing place. It was quiet and peaceful. Just what we needed to escape the busy city life.",
    "The host went above and beyond to make our stay comfortable. The space was beautiful, clean, and exactly what we were looking for."
  ];

  const review1 = {
    name: reviewNames[hash % reviewNames.length],
    time: reviewTimes[hash % reviewTimes.length],
    text: reviewTexts[hash % reviewTexts.length],
    image: themedPhoto(["portrait"], 101 + hash)
  };

  const review2 = {
    name: reviewNames[(hash + 3) % reviewNames.length],
    time: reviewTimes[(hash + 3) % reviewTimes.length],
    text: reviewTexts[(hash + 3) % reviewTexts.length],
    image: themedPhoto(["portrait"], 201 + hash)
  };

  const isNewListing = !item.rating || item.rating.toString().toLowerCase() === "new";

  const currentHost = (isNewListing && item.hostName)
    ? {
        name: item.hostName,
        role: "Host",
        school: "",
        work: "",
        rating: "New",
        reviews: 0,
        responseRate: "100%",
        bio: "Your host is committed to providing a welcoming stay.",
        photoURL: item.hostInfo?.photoUrl || item.hostPhotoURL || ""
      }
    : hostProfile
    ? {
        name: hostProfile.fullName || hostProfile.displayName || "Host",
        role: hostProfile.role === "host" ? "Host" : "Host",
        school: hostProfile.school || "",
        work: hostProfile.work || "",
        rating: hostProfile.rating || "New",
        reviews: hostProfile.reviews || 0,
        responseRate: hostProfile.responseRate || "100%",
        bio: hostProfile.bio || "Your host is committed to providing a welcoming stay.",
        photoURL: hostProfile.photoURL || item.hostInfo?.photoUrl || item.hostPhotoURL || ""
      }
    : item.hostName
    ? {
        name: item.hostName,
        role: "Host",
        school: "",
        work: "",
        rating: "New",
        reviews: 0,
        responseRate: "100%",
        bio: "Your host is committed to providing a welcoming stay.",
        photoURL: item.hostInfo?.photoUrl || item.hostPhotoURL || ""
      }
    : hosts[hash % hosts.length];

  const currentDescription = item.description || descriptions[hash % descriptions.length];
  const currentReviews = [review1, review2];

  const allAmenities = item?.amenities?.length ? item.amenities : amenityGroups.flatMap((group) => group.items.map((item) => item.label));
  const previewAmenities = allAmenities.slice(0, 5);
  const showAmenitiesButton = allAmenities.length > 5;

  const currentLocation = item.addressDetails
    ? [item.addressDetails.street, item.addressDetails.barangay, item.addressDetails.city, item.addressDetails.province, item.addressDetails.zip]
        .filter(Boolean)
        .join(", ")
    : item.location || "Tagaytay";

  return (
    <div className="listing-details-page guest-shell" style={{ padding: 0 }}>
      <Navbar
        profilePhotoURL={profile.photoURL}
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
            <span>Languages &amp; currency</span>
          </button>
          <button type="button" className="menu-item menu-item-icon">
            <span className="menu-help-icon">?</span>
            <span>Help Center</span>
          </button>

          <div className="menu-divider" />

          <button type="button" className="menu-item" onClick={handleLogout}>Log out</button>
        </div>
      )}

      <main className="listing-details-container" style={{ maxWidth: '1120px', margin: '0 auto', padding: '112px 24px 24px' }}>
        <div className="listing-title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '26px', margin: 0, color: '#222' }}>{item.title}</h1>
          <div className="listing-actions" style={{ display: 'flex', gap: '16px' }}>
            <button className="button-text">⭱ Share</button>
            <button className="button-text">♡ Save</button>
          </div>
        </div>

        <div className="listing-gallery-grid">
          <div className="listing-gallery-img-wrapper" style={{ gridRow: 'span 2' }}>
            <img src={galleryImages[0]} alt="Main" className="listing-gallery-img" />
          </div>
          <div className="listing-gallery-img-wrapper">
            <img src={galleryImages[1]} alt="Gallery 1" className="listing-gallery-img" />
          </div>
          <div className="listing-gallery-img-wrapper">
            <img src={galleryImages[2]} alt="Gallery 2" className="listing-gallery-img" />
          </div>
          <div className="listing-gallery-img-wrapper">
            <img src={galleryImages[3]} alt="Gallery 3" className="listing-gallery-img" />
          </div>
          <div className="listing-gallery-img-wrapper">
            <img src={galleryImages[4]} alt="Gallery 4" className="listing-gallery-img" />
            <button style={{ position: 'absolute', bottom: '16px', right: '16px', background: 'white', border: '1px solid black', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', transition: 'transform 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.transform='scale(1.05)'} onMouseOut={(e) => e.currentTarget.style.transform='scale(1)'}>Show all photos</button>
          </div>
        </div>

        <div className="listing-body-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '80px' }}>
          <div className="listing-main">
            <div style={{ paddingBottom: '24px', borderBottom: '1px solid #eaeaea', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '22px', margin: '0 0 4px', color: '#222' }}>{item.type}</h2>
              <p style={{ margin: 0, color: '#717171' }}>{item.review || "4 guests · 2 bedrooms · 2 beds · 1 bath"}</p>
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><StarIcon /> {item.rating || "New"}</span>
                {!isNewListing && (
                  <>
                    <span style={{ color: '#717171' }}>·</span>
                    <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>{currentHost.reviews} reviews</span>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '24px', borderBottom: '1px solid #eaeaea', marginBottom: '24px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', overflow: 'hidden' }}>
                {currentHost.photoURL ? (
                  <img src={currentHost.photoURL} alt={currentHost.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <img src={themedPhoto(["portrait"], 103 + hash)} alt={currentHost.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <div>
                <strong style={{ display: 'block' }}>Hosted by {currentHost.name}</strong>
                <span style={{ color: '#717171' }}>{currentHost.role}</span>
              </div>
            </div>

            <div style={{ paddingBottom: '24px', borderBottom: '1px solid #eaeaea', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                <KeyIcon />
                <div>
                  <strong style={{ display: 'block' }}>Self check-in</strong>
                  <span style={{ color: '#717171' }}>Check yourself in with the keypad.</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <MapPinIcon />
                <div>
                  <strong style={{ display: 'block' }}>Calm and convenient location</strong>
                  <span style={{ color: '#717171' }}>This area is easy to get around.</span>
                </div>
              </div>
            </div>

            <div style={{ paddingBottom: '32px', borderBottom: '1px solid #eaeaea', marginBottom: '32px' }}>
              <p style={{ color: '#222', lineHeight: '1.6' }}>
                {currentDescription}
              </p>
              <button className="button-text" style={{ textDecoration: 'underline', fontWeight: 600, padding: 0, marginTop: '16px' }}>Show more &gt;</button>
            </div>

            <div style={{ paddingBottom: '32px', borderBottom: '1px solid #eaeaea', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '22px', marginBottom: '24px' }}>What this place offers</h2>
              <div className="amenity-grid">
                {previewAmenities.map((amenity) => (
                  <div key={amenity} className="amenity-card">
                    <span className="amenity-icon">{getAmenityIcon(amenity)}</span>
                    <strong>{amenity}</strong>
                  </div>
                ))}
              </div>
              {showAmenitiesButton && (
                <button type="button" className="amenities-open-button" onClick={() => setShowAmenitiesModal(true)}>Show all amenities</button>
              )}
            </div>
            {showAmenitiesModal && (
              <div className="amenities-modal-backdrop" onClick={() => setShowAmenitiesModal(false)}>
                <div className="amenities-modal-content" onClick={(event) => event.stopPropagation()}>
                  <div className="amenities-modal-header">
                    <h2>What this place offers</h2>
                    <button type="button" className="close-modal-button" onClick={() => setShowAmenitiesModal(false)} aria-label="Close amenities modal">×</button>
                  </div>
                  <div className="amenities-modal-list">
                    {allAmenities.map((amenity) => (
                      <div key={amenity} className="amenity-detail-row">
                        <span className="amenity-icon">{getAmenityIcon(amenity)}</span>
                        <div>
                          <strong>{amenity}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div id="check-in-calendar" style={{ paddingBottom: '32px', borderBottom: '1px solid #eaeaea', marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '22px', marginBottom: '8px' }}>Select travel dates</h2>
                  <p style={{ color: '#717171' }}>Add your travel dates to get exact pricing and availability. </p>  
                </div>
                <button type="button" onClick={() => { setCheckInDate(""); setCheckOutDate(""); }} className="clear-dates-button">Clear dates</button>
              </div>
              <div className="calendar-card">
                <div className="date-picker-months">
                  <CalendarMonth
                    monthDate={calendarMonth}
                    checkInDate={checkInDate}
                    checkOutDate={checkOutDate}
                    onSelectDate={handleSelectDate}
                    onPrevMonth={handlePrevMonth}
                    onNextMonth={handleNextMonth}
                    bookedDates={bookedDates}
                  />
                </div>
                <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px' }}>
                  <div className="date-summary-pill">
                    <div className="date-summary-label">CHECK-IN</div>
                    <div>{checkInDate ? formatReadableDate(checkInDate) : "Add date"}</div>
                  </div>
                  <div className="date-summary-pill">
                    <div className="date-summary-label">CHECKOUT</div>
                    <div>{checkOutDate ? formatReadableDate(checkOutDate) : "Add date"}</div>
                  </div>
                  <div className="date-summary-pill">
                    <div className="date-summary-label">NIGHTS</div>
                    <div>{bookingSummary.nights || "-"}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            <div style={{ paddingBottom: '32px', borderBottom: '1px solid #eaeaea', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <StarIcon size={24} />
                <h2 style={{ fontSize: '22px', margin: 0 }}>
                  {isNewListing ? "New · No reviews yet" : `New · ${currentHost.reviews} reviews`}
                </h2>
              </div>
              <p style={{ color: '#717171', marginBottom: '4px' }}>
                {isNewListing ? "This listing is newly published and waiting for its first guest reviews." : "Average rating will appear after 3 reviews"}
              </p>
              {!isNewListing && (
                <>
                  <button className="button-text" style={{ textDecoration: 'underline', padding: 0, marginBottom: '32px', color: '#717171', fontWeight: 600 }}>How reviews work</button>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div className="review-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#ddd', overflow: 'hidden' }}>
                          <img src={currentReviews[0].image} alt={currentReviews[0].name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div>
                          <strong style={{ display: 'block', fontSize: '16px' }}>{currentReviews[0].name}</strong>
                          <span style={{ color: '#717171', fontSize: '14px' }}>2 years on StayVista</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px', fontSize: '12px' }}>
                        {[...Array(5)].map((_, i) => <StarIcon key={i} size={10} />)}
                        <span style={{ color: '#717171', marginLeft: '4px' }}>· {currentReviews[0].time}</span>
                      </div>
                      <p style={{ margin: 0, lineHeight: '1.6', color: '#484848' }}>
                        {currentReviews[0].text}
                      </p>
                      <button className="button-text" style={{ textDecoration: 'underline', fontWeight: 600, padding: 0, marginTop: '12px' }}>Show more</button>
                    </div>

                    <div className="review-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#ddd', overflow: 'hidden' }}>
                          <img src={currentReviews[1].image} alt={currentReviews[1].name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div>
                          <strong style={{ display: 'block', fontSize: '16px' }}>{currentReviews[1].name}</strong>
                          <span style={{ color: '#717171', fontSize: '14px' }}>4 years on StayVista</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px', fontSize: '12px' }}>
                        {[...Array(5)].map((_, i) => <StarIcon key={i} size={10} />)}
                        <span style={{ color: '#717171', marginLeft: '4px' }}>· {currentReviews[1].time}</span>
                      </div>
                      <p style={{ margin: 0, lineHeight: '1.6', color: '#484848' }}>
                        {currentReviews[1].text}
                      </p>
                      <button className="button-text" style={{ textDecoration: 'underline', fontWeight: 600, padding: 0, marginTop: '12px' }}>Show more</button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Location Section */}
            <div style={{ paddingBottom: '32px', borderBottom: '1px solid #eaeaea', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '22px', marginBottom: '16px' }}>Where you'll be</h2>
              <p style={{ marginBottom: '24px' }}>{currentLocation}</p>
              <div style={{ height: '400px', backgroundColor: '#e5e3df', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
                <iframe
                  title="Property Location Map"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(currentLocation)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                ></iframe>
              </div>
              <button className="button-text" style={{ fontWeight: 600, padding: 0, marginTop: '24px' }}>Show more &gt;</button>
            </div>

            {/* Host Section */}
            <div style={{ paddingBottom: '32px', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '22px', marginBottom: '24px' }}>Meet your host</h2>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '48px' }}>
                <div style={{ flex: '1 1 300px' }}>
                  <div className="host-card-enhanced">
                    <div style={{ width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', marginBottom: '16px', position: 'relative' }}>
                      {currentHost.photoURL ? (
                        <img src={currentHost.photoURL} alt={currentHost.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <img src={themedPhoto(["portrait"], 103 + hash)} alt={currentHost.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                      <div style={{ position: 'absolute', bottom: '0', right: '0', backgroundColor: '#1d7a5d', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid white', fontWeight: 'bold' }}>✓</div>
                    </div>
                    <h3 style={{ fontSize: '28px', margin: '0 0 4px', fontWeight: 700 }}>{currentHost.name}</h3>
                    <p style={{ color: '#717171', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '6px' }}><ShieldIcon size={16} /> Identity verified</p>
                    <div style={{ display: 'flex', gap: '32px', borderTop: '1px solid #eaeaea', paddingTop: '20px', width: '100%', justifyContent: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <strong style={{ display: 'block', fontSize: '20px' }}>{currentHost.reviews}</strong>
                        <span style={{ fontSize: '12px', color: '#717171', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reviews</span>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <strong style={{ display: 'block', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>{currentHost.rating} <StarIcon size={14} /></strong>
                        <span style={{ fontSize: '12px', color: '#717171', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rating</span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '24px' }}>
                    <div className="amenity-item-enhanced">
                      <div className="amenity-icon-box"><SchoolIcon size={18} /></div>
                      <span>Where I went to school: {currentHost.school}</span>
                    </div>
                    <div className="amenity-item-enhanced">
                      <div className="amenity-icon-box"><BriefcaseIcon size={18} /></div>
                      <span>My work: {currentHost.work}</span>
                    </div>
                  </div>
                  
                  <p style={{ lineHeight: '1.7', color: '#484848', fontSize: '16px' }}>
                    {currentHost.bio}
                  </p>
                </div>
                
                <div style={{ flex: '1 1 300px' }}>
                  <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>Host details</h3>
                  <p style={{ margin: '0 0 8px', color: '#484848' }}>Response rate: {currentHost.responseRate}</p>
                  <p style={{ margin: '0 0 32px', color: '#484848' }}>Responds within an hour</p>
                  
                  <button
                    type="button"
                    className="btn-primary-gradient"
                    style={{ marginBottom: '32px' }}
                    onClick={() => navigate('/message-host', { state: { host: currentHost, listingTitle: item.title } })}
                  >
                    Message host
                  </button>
                  
                  <div style={{ display: 'flex', gap: '16px', paddingTop: '24px', borderTop: '1px solid #eaeaea', alignItems: 'center' }}>
                    <ShieldIcon size={24} />
                    <span style={{ fontSize: '12px', color: '#717171', lineHeight: '1.5' }}>To help protect your payment, always use StayVista to send money and communicate with hosts.</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="listing-sidebar">
            <div className="booking-sidebar-card">
              <h3 style={{ fontSize: '24px', margin: '0 0 24px', fontWeight: 600 }}>{bookingSummary.label}</h3>
              
              <div style={{ border: '1px solid #b0b0b0', borderRadius: '12px', marginBottom: '20px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #b0b0b0' }}>
                  <button type="button" style={{ flex: 1, padding: '12px 16px', border: 0, borderRight: '1px solid #b0b0b0', textAlign: 'left', background: 'transparent', cursor: 'pointer' }} onClick={() => document.getElementById('check-in-calendar')?.scrollIntoView({ behavior: 'smooth' })} onMouseOver={(e) => e.currentTarget.style.backgroundColor='#f7f7f7'} onMouseOut={(e) => e.currentTarget.style.backgroundColor='transparent'}>
                    <div style={{ fontSize: '10px', fontWeight: 800 }}>CHECK-IN</div>
                    <div style={{ color: '#111827', marginTop: '2px', fontWeight: 700 }}>{formatReadableDate(checkInDate)}</div>
                  </button>
                  <button type="button" style={{ flex: 1, padding: '12px 16px', border: 0, textAlign: 'left', background: 'transparent', cursor: 'pointer' }} onClick={() => document.getElementById('check-in-calendar')?.scrollIntoView({ behavior: 'smooth' })} onMouseOver={(e) => e.currentTarget.style.backgroundColor='#f7f7f7'} onMouseOut={(e) => e.currentTarget.style.backgroundColor='transparent'}>
                    <div style={{ fontSize: '10px', fontWeight: 800 }}>CHECKOUT</div>
                    <div style={{ color: '#111827', marginTop: '2px', fontWeight: 700 }}>{formatReadableDate(checkOutDate)}</div>
                  </button>
                </div>
                <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 800 }}>GUESTS</div>
                    <div style={{ marginTop: '2px', color: '#111827', fontWeight: 700 }}>{guestCount} guest{guestCount > 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #b0b0b0', background: 'transparent', fontWeight: 700, cursor: 'pointer' }} onClick={() => setGuestCount((count) => Math.max(1, count - 1))}>-</button>
                    <button type="button" style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #b0b0b0', background: 'transparent', fontWeight: 700, cursor: 'pointer' }} onClick={() => setGuestCount((count) => count + 1)}>+</button>
                  </div>
                </div>
              </div>

              <button type="button" className="btn-primary-gradient" onClick={handleBookingAction}>
                {canReserve ? "Reserve" : "Check availability"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

