import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { collection, query, where, getDocs, addDoc, serverTimestamp, getDoc, doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import Navbar from "../components/Navbar";
import { loadBookings, filterBookingsByHost } from "../utils/bookingStorage";

const hostMetrics = [
  { title: "Active Listings", value: "12", description: "Homes, experiences, services visible now." },
  { title: "Drafts", value: "5", description: "Saved hosting drafts waiting to publish." },
  { title: "Upcoming Bookings", value: "8", description: "Reserved stays and experiences this week." },
  { title: "Pending Payouts", value: "₱18,450", description: "Expected earnings arriving soon." }
];

const hostFeatures = [
  { title: "Account registration", description: "Allow users to register via email or SMS and manage host login details." },
  { title: "Hosting categories", description: "Manage hosting types: Home, Experience, Service." },
  { title: "Draft management", description: "Save listings as drafts and publish when ready." },
  { title: "Host listing editor", description: "Add images, location, description, pricing, discounts, and promos." },
  { title: "Messages & calendar", description: "View guest messages, listing activity, and booking calendar." },
  { title: "Dashboard overview", description: "See today, upcoming stays, and performance at a glance." },
  { title: "Payments", description: "Connect payment methods and track payouts." },
  { title: "Account settings", description: "Manage profile, bookings, coupons, and host preferences." },
  { title: "Points & rewards", description: "Reward loyal hosts with incentives and special benefits." }
];

function HostHome() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showBackToGuest, setShowBackToGuest] = useState(false);
  const [profilePhotoURL, setProfilePhotoURL] = useState("");
  const [profileInitial, setProfileInitial] = useState("H");
  const [navTab, setNavTab] = useState(location.state?.initialNavTab || "today");
  const [cardTab, setCardTab] = useState("today");
  const [hasListings, setHasListings] = useState(false);
  const [listings, setListings] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [reservationCategory, setReservationCategory] = useState('all');
  const [hostMessages, setHostMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [bookingRecords, setBookingRecords] = useState([]);
  const [messageFilter, setMessageFilter] = useState('all'); // 'all' | 'unread'
  const [replyMode, setReplyMode] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySuccess, setReplySuccess] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [creatingListing, setCreatingListing] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleSwitchToGuest = async () => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/guest');
      return;
    }

    const roleKey = `stayvista-role-view-${user.uid}`;
    try {
      await setDoc(doc(db, 'users', user.uid), { role: 'guest' }, { merge: true });
      localStorage.setItem(roleKey, 'guest');
    } catch (error) {
      console.error('Failed to update user role to guest:', error);
      localStorage.setItem(roleKey, 'guest');
    }

    sessionStorage.removeItem("stayvista-switched-to-host");
    setMenuOpen(false);
    window.location.href = '/guest';
  };

  // Clear reply success message after timeout
  useEffect(() => {
    if (!replySuccess) return;
    // Don't auto-clear, wait for the handleSendReply logic to handle it
    // This is just a safety net if there's an error
  }, [replySuccess]);

  const openSameTab = (path) => {
    window.location.href = path;
  };

  const handleCreateListingWithType = async (type) => {
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to create a listing.");
      setShowTypeModal(false);
      return;
    }

    setShowTypeModal(false);
    setCreatingListing(true);

    try {
      const draftRef = await addDoc(collection(db, "listings"), {
        selectedType: type,
        listingType: type,
        status: "draft",
        published: false,
        createdAt: serverTimestamp(),
        hostId: user.uid,
        hostEmail: user.email,
        hostName: user.displayName || user.email,
        photoUrls: [],
        coverPhotoUrl: "",
        description: "",
        listingTitle: "",
        selectedOption: "",
      });

      navigate('/host/create-listing', { state: { selectedType: type, draftId: draftRef.id } });
    } catch (error) {
      console.error("Error creating listing draft:", error);
      alert("Unable to start listing draft. Please try again.");
    } finally {
      setCreatingListing(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const switchedToHost = sessionStorage.getItem("stayvista-switched-to-host") === "true";
      setShowBackToGuest(switchedToHost);
    }

    const user = auth.currentUser;
    if (user) {
      const loadProfile = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          const userData = userDoc.exists() ? userDoc.data() : {};
          const photoURL = userData.photoURL || user.photoURL || "";
          setProfilePhotoURL(photoURL);
        } catch (error) {
          console.warn("Failed to load profile photo:", error);
          setProfilePhotoURL(user.photoURL || "");
        }
      };

      loadProfile();
      const initial = user.displayName?.trim().charAt(0) || user.email?.trim().charAt(0) || "H";
      setProfileInitial(initial.toUpperCase());
      setEmailVerified(user.emailVerified);

      const refreshVerification = async () => {
        try {
          await user.reload();
          setEmailVerified(user.emailVerified);
        } catch (err) {
          console.warn("Unable to refresh email verification status:", err);
        }
      };
      refreshVerification();

      if (location.state?.publishedSuccess) {
        setSuccessMessage("Your listing was published successfully.");
      } else if (location.state?.draftSaved) {
        setSuccessMessage("Your draft was saved. You can publish it later from the listing editor.");
      }

      const fetchListings = async () => {
        try {
          const q = query(collection(db, "listings"), where("hostId", "==", user.uid));
          const querySnapshot = await getDocs(q);
          const fetchedListings = [];
          querySnapshot.forEach((doc) => {
            fetchedListings.push({ id: doc.id, ...doc.data() });
          });
          
          // Sort to show newest first if we want
          fetchedListings.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
          
          setListings(fetchedListings);
          setHasListings(fetchedListings.length > 0);
        } catch (error) {
          console.error("Error fetching listings:", error);
        }
      };

      const loadMessagesForHost = () => {
        const storedMessages = JSON.parse(localStorage.getItem("stayvista-host-messages") || "[]");
        const currentHostIdentifier = (user.displayName || user.email || "").toLowerCase();
        const matchesHost = (hostName = "") => {
          const hostNameLower = hostName.toLowerCase();
          return hostNameLower === currentHostIdentifier
            || hostNameLower.includes(currentHostIdentifier)
            || currentHostIdentifier.includes(hostNameLower);
        };
        const filteredMessages = storedMessages
          .filter((item) => matchesHost(item.hostName))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setHostMessages(filteredMessages);
      };

      loadMessagesForHost();
      setBookingRecords(filterBookingsByHost(loadBookings(), user.uid, user.email || ""));

      const handleStorage = (ev) => {
        if (ev.key === 'stayvista-host-messages') loadMessagesForHost();
        if (ev.key === 'stayvista_bookings') setBookingRecords(filterBookingsByHost(loadBookings(), user.uid, user.email || ""));
      };
      window.addEventListener('storage', handleStorage);

      fetchListings();

      return () => {
        window.removeEventListener('storage', handleStorage);
      };
    }
  }, []);

  const emptyMessage = cardTab === "today"
    ? "You don't have any reservations"
    : "You don't have any upcoming reservations";

  const isConfirmedBooking = (booking) => String(booking.status || '').toUpperCase() === 'CONFIRMED';

  const hostBookingRecords = filterBookingsByHost(bookingRecords, auth.currentUser?.uid || "", auth.currentUser?.email || "");

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const parseIsoDate = (value) => {
    if (!value) return null;
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const today = new Date();
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());

  const calendarWeekdays = [
    { key: "sun", label: "S" },
    { key: "mon", label: "M" },
    { key: "tue", label: "T" },
    { key: "wed", label: "W" },
    { key: "thu", label: "T" },
    { key: "fri", label: "F" },
    { key: "sat", label: "S" }
  ];

  const getCalendarCells = (year, month) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < firstDay; i += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(day);
    }

    while (cells.length < 42) {
      cells.push(null);
    }

    return cells;
  };

  const formatDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const calendarCells = getCalendarCells(calendarYear, calendarMonth);

  const [hostBookedDates, setHostBookedDates] = useState(new Set());

  useEffect(() => {
    try {
      const confirmed = hostBookingRecords.filter((b) => isConfirmedBooking(b));
      const dates = new Set();
      confirmed.forEach((b) => {
        if (!b.checkInDate || !b.checkOutDate) return;
        let cur = new Date(`${b.checkInDate}T00:00:00`);
        const last = new Date(`${b.checkOutDate}T00:00:00`);
        while (cur <= last) {
          dates.add(formatDateKey(cur));
          cur.setDate(cur.getDate() + 1);
        }
      });
      setHostBookedDates(dates);
    } catch (err) {
      setHostBookedDates(new Set());
    }
  }, [hostBookingRecords]);

  const normalizeBookingCategory = (booking) => {
    const category = booking.listingCategory || booking.selectedType || booking.type || booking.category || "";
    const normalized = category.toString().toLowerCase();

    if (normalized.includes("experience")) return "Experience";
    if (normalized.includes("service")) return "Service";
    return "Home";
  };

  const getBookingsByCategory = (records, category) => (
    records.filter((booking) => normalizeBookingCategory(booking) === category)
  );

  const confirmedBookings = hostBookingRecords.filter((booking) => isConfirmedBooking(booking));

  const isBookingActiveToday = (booking) => {
    const checkIn = parseIsoDate(booking.checkInDate);
    const checkOut = parseIsoDate(booking.checkOutDate);
    if (!checkIn || !checkOut) return false;
    return checkIn <= today && today <= checkOut;
  };

  const todayBookings = confirmedBookings.filter((booking) => isBookingActiveToday(booking));
  const upcomingBookings = confirmedBookings.filter((booking) => {
    const checkIn = parseIsoDate(booking.checkInDate);
    return checkIn ? checkIn > today : false;
  });
  const filteredTodayBookings = reservationCategory === 'all'
    ? todayBookings
    : todayBookings.filter((booking) => normalizeBookingCategory(booking) === reservationCategory);
  const filteredUpcomingBookings = reservationCategory === 'all'
    ? upcomingBookings
    : upcomingBookings.filter((booking) => normalizeBookingCategory(booking) === reservationCategory);
  const displayedBookings = cardTab === "today" ? filteredTodayBookings : filteredUpcomingBookings;
  const hasBookingCards = displayedBookings.length > 0;
  const reservationCategories = [
    { key: "Home", label: "Homes", icon: "fa-house", empty: "No home reservations today." },
    { key: "Service", label: "Services", icon: "fa-bell-concierge", empty: "No service bookings today." },
    { key: "Experience", label: "Experiences", icon: "fa-map-location-dot", empty: "No experience bookings today." }
  ];
  const visibleReservationCategories = reservationCategory === 'all'
    ? reservationCategories
    : reservationCategories.filter((category) => category.key === reservationCategory);

  const renderReservationCard = (booking) => (
    <article key={booking.id} className="host-reservation-card">
      <div className="host-reservation-card-top">
        <div>
          <h3>{booking.listingTitle || "Reservation"}</h3>
          <p>{booking.checkInDate || "No check-in"} to {booking.checkOutDate || "No check-out"}</p>
        </div>
        <span className="host-reservation-status">{booking.status || "CONFIRMED"}</span>
      </div>
      <div className="host-reservation-details">
        <div>
          <span>Guest</span>
          <strong>{booking.guestName || "Guest"}</strong>
          <small>{booking.guestEmail || "No email"}</small>
          <small>{booking.phoneNumber || "No phone"}</small>
        </div>
        <div>
          <span>Booking info</span>
          <strong>PHP {Number(booking.amount || 0).toLocaleString()}</strong>
          <small>ID: {booking.bookingId || booking.id}</small>
          <small>Payment: {booking.paymentStatus || "Completed"}</small>
        </div>
      </div>
    </article>
  );

  const handlePrevMonth = () => {
    setCalendarMonth((currentMonth) => {
      if (currentMonth === 0) {
        setCalendarYear((year) => year - 1);
        return 11;
      }
      return currentMonth - 1;
    });
  };

  const handleNextMonth = () => {
    setCalendarMonth((currentMonth) => {
      if (currentMonth === 11) {
        setCalendarYear((year) => year + 1);
        return 0;
      }
      return currentMonth + 1;
    });
  };

  const unreadCount = hostMessages.filter((m) => !m.read).length;
  const messagesToShow = messageFilter === 'unread' ? hostMessages.filter((m) => !m.read) : hostMessages;

  const markMessageAsRead = (id) => {
    const stored = JSON.parse(localStorage.getItem('stayvista-host-messages') || '[]');
    const updated = stored.map((m) => (m.id === id ? { ...m, read: true } : m));
    localStorage.setItem('stayvista-host-messages', JSON.stringify(updated));
    // refresh local view
    setHostMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
  };

  const handleOpenMessage = (message) => {
    if (!message.read) markMessageAsRead(message.id);
    setSelectedMessage(message.read ? message : { ...message, read: true });
    setReplyMode(false);
    setReplySuccess('');
    setReplyText('');
  };

  const handleCloseMessage = () => {
    setSelectedMessage(null);
    setReplyMode(false);
    setReplySuccess('');
    setReplyText('');
  };

  const saveGuestReply = (message, body) => {
    // Validate host is logged in
    if (!auth.currentUser || !auth.currentUser.uid || !auth.currentUser.email) {
      console.error('Cannot send reply: Host not properly authenticated', { currentUser: auth.currentUser });
      setReplySuccess('Error: You must be logged in to send a reply. Please refresh and try again.');
      return false;
    }

    // Validate that we have the recipient's info (need at least email OR id)
    if (!message.senderId || !message.senderEmail) {
      console.error('Cannot send reply: Guest info incomplete', { 
        senderId: message.senderId, 
        senderEmail: message.senderEmail 
      });
      setReplySuccess('Error: Could not identify the guest. Please try reopening the message.');
      return false;
    }

    const storedReplies = JSON.parse(localStorage.getItem('stayvista-user-messages') || '[]');
    
    const newReply = {
      id: `reply-${Date.now()}`,
      threadId: message.id,
      listingTitle: message.listingTitle,
      senderName: auth.currentUser.displayName || auth.currentUser.email || 'Host',
      senderEmail: auth.currentUser.email,
      senderId: auth.currentUser.uid,
      recipientName: message.senderName || 'Guest',
      recipientEmail: message.senderEmail,
      recipientId: message.senderId,
      body: body.trim(),
      createdAt: new Date().toISOString(),
      read: false,
      isReply: true,
      originalMessageId: message.id
    };

    storedReplies.push(newReply);
    localStorage.setItem('stayvista-user-messages', JSON.stringify(storedReplies));
    
    console.log('Reply saved to guest messages:', {
      recipientId: newReply.recipientId,
      recipientEmail: newReply.recipientEmail,
      senderName: newReply.senderName,
      isReply: true
    });
    
    // Also add to host messages so host can see their reply
    const hostMessages = JSON.parse(localStorage.getItem('stayvista-host-messages') || '[]');
    const hostReplyRecord = {
      ...newReply,
      hostName: auth.currentUser.displayName || auth.currentUser.email || 'Host'
    };
    hostMessages.push(hostReplyRecord);
    localStorage.setItem('stayvista-host-messages', JSON.stringify(hostMessages));
    
    console.log('Reply also saved to host messages for tracking');
    
    return true;
  };

  const handleComposeReply = () => {
    if (!selectedMessage) return;
    setReplyMode(true);
    setReplyText(`Hi ${selectedMessage.senderName || 'Guest'},\n`);
    setReplySuccess('');
  };

  const handleSendReply = () => {
    if (!selectedMessage || !replyText.trim()) return;

    const success = saveGuestReply(selectedMessage, replyText);
    if (success) {
      setReplySuccess(`Your reply was sent to ${selectedMessage.senderName || 'the guest'}.`);
      setReplyMode(false);
      setReplyText('');
      
      // Auto-close success message after 3 seconds
      const timeoutId = setTimeout(() => {
        setReplySuccess('');
        handleCloseMessage();
      }, 3000);
      
      return () => clearTimeout(timeoutId);
    } else {
      setReplySuccess('Error sending reply. Please try again.');
    }
  };

  return (
    <main className="host-shell host-home-simple">
      <Navbar
        profilePhotoURL={profilePhotoURL}
        profileInitial={profileInitial}
        onMenuToggle={() => setMenuOpen((value) => !value)}
        menuOpen={menuOpen}
        isHost
      />

      {menuOpen && (
        <div className="guest-menu-dropdown guest-menu-dropdown-fixed">
          <button type="button" className="menu-item menu-item-icon" onClick={() => openSameTab("/account-settings")}> 
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
          <button type="button" className="menu-item menu-item-icon" onClick={() => openSameTab("/host/cohosts")}> 
            <i className="fa-solid fa-users" aria-hidden="true" />
            <span>Find a co-host</span>
          </button>
          <button type="button" className="menu-item menu-item-icon" onClick={() => openSameTab("/host/create-listing")}> 
            <i className="fa-solid fa-square-plus" aria-hidden="true" />
            <span>Create a new listing</span>
          </button>
          <button type="button" className="menu-item menu-item-icon"> 
            <i className="fa-solid fa-user-plus" aria-hidden="true" />
            <span>Refer a host</span>
          </button>
          {showBackToGuest && (
            <button type="button" className="menu-item menu-item-icon" onClick={() => { const user = auth.currentUser; if (user) { localStorage.setItem(`stayvista-role-view-${user.uid}`, 'guest'); } sessionStorage.removeItem("stayvista-switched-to-host"); setMenuOpen(false); navigate('/guest'); }}> 
              <i className="fa-solid fa-house" aria-hidden="true" />
              <span>Back to guest</span>
            </button>
          )}

          {showBackToGuest && <div className="menu-divider" />}

          <button type="button" className="menu-item menu-item-icon" onClick={handleLogout}> 
            <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
            <span>Log out</span>
          </button> 
        </div>
      )}

      <div style={{ width: '100%', padding: '0 24px', marginTop: 32, marginBottom: 10, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
        {showBackToGuest && (
          <button type="button" className="action-button" onClick={handleSwitchToGuest}>
            Back to guest
          </button>
        )}
        <button type="button" className="action-button" onClick={() => { window.location.href = '/host/bookings'; }} style={{ marginLeft: showBackToGuest ? 12 : 0 }}>
          View booking approvals
        </button>
      </div>

      <section className="host-home-center">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0 24px 16px', marginBottom: 12 }}>
          <div className="host-home-navrow">
          {['Today', 'Calendar', 'Listings', 'Messages', 'Payments'].map((label) => {
            const isActive = label.toLowerCase() === navTab;
            return (
              <button
                key={label}
                type="button"
                className={isActive ? 'host-home-nav-button host-home-nav-active' : 'host-home-nav-button'}
                onClick={() => setNavTab(label.toLowerCase())}
                style={{ position: 'relative' }}
              >
                {label}
                {label === 'Messages' && unreadCount > 0 && (
                  <span style={{ display: 'inline-block', width: 10, height: 10, background: '#e11d48', borderRadius: '50%', position: 'absolute', top: 6, right: 8 }} />
                )}
              </button>
            );
          })}
          </div>
        </div>

        {navTab === 'messages' ? (
          <div className="host-messages-panel">
            <div className="host-messages-header">
              <h1>Messages</h1>
              <div className="host-message-filters">
                <button
                  type="button"
                  className={messageFilter === 'all' ? 'host-message-filter-button host-message-filter-active' : 'host-message-filter-button'}
                  onClick={() => setMessageFilter('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={messageFilter === 'unread' ? 'host-message-filter-button host-message-filter-active' : 'host-message-filter-button'}
                  onClick={() => setMessageFilter('unread')}
                  style={{ position: 'relative' }}
                >
                  Unread
                  {unreadCount > 0 && (
                    <span style={{ display: 'inline-block', width: 10, height: 10, background: '#e11d48', borderRadius: '50%', position: 'absolute', top: -4, right: -10 }} />
                  )}
                </button>
              </div>
            </div>

            {hostMessages.length === 0 ? (
              <div className="host-message-empty-card">
                <img
                  src="https://static.thenounproject.com/png/3020844-200.png"
                  alt="Empty messages icon"
                  className="host-home-icon"
                />
                <h2>You don't have any messages</h2>
                <p>When you receive a new message, it will appear here.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '20px' }}>
                {messagesToShow.map((message) => (
                  <div
                    key={message.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenMessage(message)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleOpenMessage(message); }}
                    style={{
                      background: message.read ? '#ffffff' : '#f0fff4',
                      borderRadius: '20px',
                      padding: '24px',
                      boxShadow: '0 12px 30px rgba(0,0,0,0.08)',
                      border: '1px solid #e5e8df',
                      cursor: 'pointer',
                      borderLeft: message.read ? '1px solid #e5e8df' : '6px solid #16a34a'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 0 }}>
                        <h2 style={{ margin: 0, fontSize: '20px', color: '#151515' }}>{message.listingTitle || 'New message'}</h2>
                        <p style={{ margin: '8px 0 0', color: '#5f6f63' }}>
                          From <strong>{message.senderName}</strong>
                        </p>
                      </div>
                      <time style={{ color: '#8f9a92', fontSize: '14px' }}>
                        {new Intl.DateTimeFormat('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        }).format(new Date(message.createdAt))}
                      </time>
                    </div>
                    <p style={{ marginTop: '20px', color: message.read ? '#2f382f' : '#166534', lineHeight: 1.75 }}>{message.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : navTab === 'calendar' ? (
          <div className="host-calendar-panel">
            <div className="host-calendar-header">
              <button type="button" className="host-calendar-nav" onClick={handlePrevMonth}>‹</button>
              <h1>{monthNames[calendarMonth]} {calendarYear}</h1>
              <button type="button" className="host-calendar-nav" onClick={handleNextMonth}>›</button>
            </div>

            <div className="host-calendar-grid host-calendar-weekdays">
              {calendarWeekdays.map((day) => (
                <div key={day.key} className="host-calendar-weekday">
                  {day.label}
                </div>
              ))}
            </div>

            <div className="host-calendar-grid host-calendar-days">
              {calendarCells.map((date, index) => {
                const dateValue = date ? formatDateKey(new Date(calendarYear, calendarMonth, date)) : null;
                const isBooked = dateValue ? hostBookedDates.has(dateValue) : false;
                return (
                  <div
                    key={index}
                    className={date ? 'host-calendar-date' : 'host-calendar-date host-calendar-date-empty'}
                    style={isBooked ? { background: '#f3f4f6', color: '#9ca3af' } : undefined}
                  >
                    {date || ''}
                  </div>
                );
              })}
            </div>

          </div>
        ) : navTab === 'listings' ? (
          <div className="host-listings-panel">
            {!hasListings ? (
              <div className="host-listings-empty">
                <div className="host-listings-header">
                  <h1>Your listings</h1>
                  <button 
                    className="host-listings-add-button"
                    onClick={() => setShowTypeModal(true)}
                    type="button"
                    disabled={creatingListing}
                  >
                    ➕
                  </button>
                </div>

                <div className="host-listings-empty-content">
                  <div className="host-listings-icons">
                    <div className="host-listing-icon home-icon">🏠</div>
                    <div className="host-listing-icon balloon-icon">🎈</div>
                    <div className="host-listing-icon bell-icon">🔔</div>
                  </div>

                  <p className="host-listings-empty-text">
                    Create a listing with StayVista Tagaytay Setup and start getting booked.
                  </p>

                  <button 
                    className="host-create-listing-button"
                    onClick={() => navigate('/host/create-listing')}
                    type="button"
                  >
                    Create listing
                  </button>
                </div>
              </div>
            ) : (
              <div className="host-listings-content">
                <div className="host-listings-header">
                  <h1>Your listings</h1>
                  <button 
                    className="host-listings-add-button"
                    onClick={() => setShowTypeModal(true)}
                    type="button"
                    disabled={creatingListing}
                  >
                    ➕
                  </button>
                </div>
                {successMessage && (
                  <div className="host-publish-success-banner">
                    {successMessage}
                  </div>
                )}
                <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
                  <button type="button" className={selectedCategory === 'all' ? 'host-category active' : 'host-category'} onClick={() => setSelectedCategory('all')}>All</button>
                  <button type="button" className={selectedCategory === 'Home' ? 'host-category active' : 'host-category'} onClick={() => setSelectedCategory('Home')}>Homes</button>
                  <button type="button" className={selectedCategory === 'Experience' ? 'host-category active' : 'host-category'} onClick={() => setSelectedCategory('Experience')}>Experiences</button>
                  <button type="button" className={selectedCategory === 'Service' ? 'host-category active' : 'host-category'} onClick={() => setSelectedCategory('Service')}>Services</button>
                </div>

                <div className="draft-card-grid">
                  {listings.filter((listing) => {
                    if (selectedCategory === 'all') return true;
                    const t = listing.selectedType || listing.type || listing.listingType || listing.selectedCategory;
                    return t === selectedCategory;
                  }).map((listing) => (
                    <div
                      key={listing.id}
                      className="draft-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/host/listing-editor/${listing.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          navigate(`/host/listing-editor/${listing.id}`);
                        }
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="draft-card-image-wrapper">
                        {(listing.status === 'draft' || listing.status === 'published' || listing.published) && (
                          <div className="draft-card-badge">
                            {(listing.status === 'published' || listing.published)
                              ? "Published"
                              : (emailVerified ? "Ready to publish" : "Finish your listing")}
                          </div>
                        )}
                        <img 
                          src={listing.coverPhotoUrl || listing.photoUrls?.[0] || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop"} 
                          alt="Listing cover" 
                          className="draft-card-image"
                        />
                      </div>
                      <div className="draft-card-info">
                        <h3>{listing.listingTitle || "Untitled listing"}</h3>
                        <p>{listing.selectedType || "Property"} • {listing.addressDetails?.city || "No location"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : navTab === 'payments' ? (
          <div style={{ maxWidth: 1200, width: '100%', margin: '0 auto', padding: '0 24px' }}>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ margin: 0, fontSize: 32, color: '#1f4729' }}>💰 Payments & Earnings</h1>
              <p style={{ marginTop: 8, color: '#6b7769' }}>Track your earnings from confirmed bookings</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 40 }}>
              <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid #e5e8df' }}>
                <div style={{ color: '#6b7769', fontSize: 13, marginBottom: 8 }}>Total Earnings</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#047857' }}>
                  PHP {hostBookingRecords.filter(isConfirmedBooking).reduce((sum, b) => sum + (Number(b.amount) || 0), 0).toLocaleString()}
                </div>
              </div>
              <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid #e5e8df' }}>
                <div style={{ color: '#6b7769', fontSize: 13, marginBottom: 8 }}>Pending Payouts</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#b45309' }}>
                  PHP {hostBookingRecords.filter(isConfirmedBooking).reduce((sum, b) => sum + (Number(b.amount) || 0) * 0.8, 0).toLocaleString()}
                </div>
              </div>
              <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid #e5e8df' }}>
                <div style={{ color: '#6b7769', fontSize: 13, marginBottom: 8 }}>Confirmed Bookings</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#1f4729' }}>
                  {hostBookingRecords.filter(isConfirmedBooking).length}
                </div>
              </div>
            </div>

            <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid #e5e8df' }}>
              <h2 style={{ margin: '0 0 20px', fontSize: 20, color: '#1f4729' }}>Recent Earnings</h2>
              <div style={{ display: 'grid', gap: 12 }}>
                {hostBookingRecords.filter(isConfirmedBooking).slice(0, 10).map((booking) => (
                  <div key={booking.id} style={{ padding: 16, background: '#f8faf2', borderRadius: 12, border: '1px solid #e5e8df', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ display: 'block', color: '#1f4729' }}>{booking.listingTitle}</strong>
                      <small style={{ color: '#6b7769' }}>{booking.checkInDate} - {booking.checkOutDate}</small>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ display: 'block', color: '#047857', fontSize: 16 }}>PHP {Number(booking.amount).toLocaleString()}</strong>
                      <small style={{ color: '#6b7769' }}>{booking.guestName}</small>
                    </div>
                  </div>
                ))}
                {hostBookingRecords.filter(isConfirmedBooking).length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: '#6b7769' }}>
                    <p>No earnings yet. Get your first booking approved to see earnings here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="host-dashboard-panel">
            <div className="host-dashboard-header">
              <div>
                <p className="host-dashboard-eyebrow">Reservations</p>
                <h1>{cardTab === "today" ? "Today" : "Upcoming"}</h1>
              </div>
              <div className="host-card-toggle" aria-label="Reservation view">
                {["today", "upcoming"].map((label) => (
                  <button
                    key={label}
                    type="button"
                    className={label === cardTab ? "host-card-toggle-button host-card-toggle-active" : "host-card-toggle-button"}
                    onClick={() => setCardTab(label)}
                  >
                    {label === "today" ? "Today" : "Upcoming"}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {['all', 'Home', 'Experience', 'Service'].map((category) => (
                <button
                  key={category}
                  type="button"
                  className={reservationCategory === category ? 'host-category active' : 'host-category'}
                  onClick={() => setReservationCategory(category)}
                >
                  {category === 'all' ? 'All' : category === 'Home' ? 'Homes' : category === 'Experience' ? 'Experiences' : 'Services'}
                </button>
              ))}
            </div>

            {cardTab === "today" ? (
              <div className="host-reservation-category-grid">
                {visibleReservationCategories.map((category) => {
                  const categoryBookings = getBookingsByCategory(filteredTodayBookings, category.key);
                  return (
                    <section key={category.key} className="host-reservation-category">
                      <div className="host-reservation-category-header">
                        <div className="host-reservation-category-title">
                          <span className="host-reservation-category-icon">
                            <i className={`fa-solid ${category.icon}`} aria-hidden="true" />
                          </span>
                          <div>
                            <h2>{category.label}</h2>
                            <p>{categoryBookings.length} today</p>
                          </div>
                        </div>
                      </div>

                      {categoryBookings.length > 0 ? (
                        <div className="host-reservation-stack">
                          {categoryBookings.map(renderReservationCard)}
                        </div>
                      ) : (
                        <div className="host-category-empty">
                          <strong>{category.empty}</strong>
                          <span>New approved bookings will appear here.</span>
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            ) : hasBookingCards ? (
              <div className="host-reservation-stack host-reservation-stack-wide">
                {displayedBookings.map(renderReservationCard)}
              </div>
            ) : (
              <div className="host-dashboard-empty">
                <img
                  src="https://static.thenounproject.com/png/3020844-200.png"
                  alt="Empty reservations icon"
                  className="host-home-icon"
                />
                <h2>{emptyMessage}</h2>
                <p>To get booked, complete and publish a listing.</p>
                <button type="button" className="auth-button" onClick={() => navigate("/host/create-listing")}>
                  Complete your listing
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {selectedMessage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}>
          <div style={{ width: '92%', maxWidth: 820, background: '#fff', borderRadius: 16, padding: 24 }}>
            <button type="button" onClick={handleCloseMessage} style={{ border: 'none', background: 'transparent', color: '#1f2f21', cursor: 'pointer', marginBottom: 12 }}>← Back</button>
            <h2 style={{ marginTop: 0 }}>{selectedMessage.listingTitle || 'Message'}</h2>
            <p style={{ color: '#5f6f63', marginTop: 6 }}>From <strong>{selectedMessage.senderName}</strong> • {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(selectedMessage.createdAt))}</p>
            <div style={{ marginTop: 18, padding: 18, borderRadius: 12, background: '#f8faf5', color: '#1f4729', lineHeight: 1.8 }}>{selectedMessage.body}</div>
            <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleComposeReply}
                style={{
                  padding: '12px 18px',
                  borderRadius: 14,
                  border: 'none',
                  background: '#1f4729',
                  color: '#fff',
                  fontSize: 16,
                  cursor: 'pointer'
                }}
              >
                Reply
              </button> 
            </div>

            {replyMode && (
              <div style={{ marginTop: 20 }}>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={6}
                  placeholder={`Hi ${selectedMessage.senderName || 'Guest'},\n`}
                  style={{
                    width: '100%',
                    minHeight: 160,
                    padding: 16,
                    borderRadius: 16,
                    border: '1px solid #d1d5db',
                    fontSize: 16,
                    resize: 'vertical'
                  }}
                />
                <button
                  type="button"
                  onClick={handleSendReply}
                  disabled={!replyText.trim()}
                  style={{
                    marginTop: 16,
                    padding: '14px 24px',
                    borderRadius: 14,
                    border: 'none',
                    background: replyText.trim() ? '#1f4729' : '#cfd9cf',
                    color: '#fff',
                    fontSize: 16,
                    cursor: replyText.trim() ? 'pointer' : 'not-allowed'
                  }}
                >
                  Send reply
                </button>
                {replySuccess && (
                  <div style={{ marginTop: 14, padding: '14px 18px', borderRadius: 16, background: '#e6f4ea', color: '#1f4721', border: '1px solid #c6e3c4' }}>
                    {replySuccess}
                  </div>
                )}
              </div>
            )}
            {replySuccess && !replyMode && (
              <div style={{ marginTop: 20, padding: '14px 18px', borderRadius: 16, background: '#e6f4ea', color: '#1f4721', border: '1px solid #c6e3c4' }}>
                {replySuccess}
              </div>
            )}
          </div>
        </div>
      )}

      {showTypeModal && (
        <div className="listing-type-backdrop">
          <div className="listing-type-modal">
            <h2>What are you listing?</h2>
            <p className="listing-type-description-text">Choose a listing category to get started.</p>
            <div className="listing-type-grid">
              <button
                type="button"
                className="listing-type-option"
                onClick={() => handleCreateListingWithType('Home')}
                disabled={creatingListing}
              >
                <span className="listing-type-icon">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
                    <path d="M3 11.5L12 3l9 8.5V20a1 1 0 0 1-1 1h-5v-5H9v5H4a1 1 0 0 1-1-1v-8.5z" />
                  </svg>
                </span>
                <span className="listing-type-content">
                  <span className="listing-type-title">Home</span>
                  <span className="listing-type-subtitle">An entire house, apartment, or room</span>
                </span>
              </button>

              <button
                type="button"
                className="listing-type-option"
                onClick={() => handleCreateListingWithType('Experience')}
                disabled={creatingListing}
              >
                <span className="listing-type-icon">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1.5 6.5l4 1.5-1.5 4-4-1.5 1.5-4z" />
                  </svg>
                </span>
                <span className="listing-type-content">
                  <span className="listing-type-title">Experience</span>
                  <span className="listing-type-subtitle">Activities, tours, or unique experiences</span>
                </span>
              </button>

              <button
                type="button"
                className="listing-type-option"
                onClick={() => handleCreateListingWithType('Service')}
                disabled={creatingListing}
              >
                <span className="listing-type-icon">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
                    <path d="M4 7h16v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7zm2 0V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1h-2V6H8v1H6zm2 5h8v2H8v-2z" />
                  </svg>
                </span>
                <span className="listing-type-content">
                  <span className="listing-type-title">Service</span>
                  <span className="listing-type-subtitle">Professional services or consultations</span>
                </span>
              </button>
            </div>
            <div className="listing-type-footer">
              <button
                type="button"
                className="listing-type-cancel"
                onClick={() => setShowTypeModal(false)}
                disabled={creatingListing}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default HostHome;


