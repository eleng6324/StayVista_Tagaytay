import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import Navbar from "../components/Navbar";

function GuestMessages() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [profilePhotoURL, setProfilePhotoURL] = useState("");
  const [profileInitial, setProfileInitial] = useState("P");
  const [menuOpen, setMenuOpen] = useState(false);
  const [messageFilter, setMessageFilter] = useState("all");

  const unreadCount = messages.filter((message) => !message.read).length;
  const messagesToShow = messageFilter === "unread"
    ? messages.filter((message) => !message.read)
    : messages;

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const storedAvatar = localStorage.getItem(`stayvista-profile-photo-${user.uid}`) || "";
    setProfilePhotoURL(storedAvatar || user.photoURL || "");
    const initial = user.displayName?.trim().charAt(0) || user.email?.trim().charAt(0) || "P";
    setProfileInitial(initial.toUpperCase());

    const loadMessages = () => {
      const storedMessages = JSON.parse(localStorage.getItem("stayvista-user-messages") || "[]");
      const userEmail = user.email?.toLowerCase();
      const userId = user.uid;
      
      const filtered = storedMessages
        .filter((message) => {
          // Match by recipient ID or recipient email
          const matchesId = message.recipientId === userId;
          const matchesEmail = message.recipientEmail?.toLowerCase() === userEmail;
          return matchesId || matchesEmail;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Debug logging
      if (filtered.length > 0) {
        console.log('Loaded messages for guest:', { userId, userEmail, count: filtered.length });
      }
      
      setMessages(filtered);
    };

    loadMessages();

    const handleStorage = (ev) => {
      if (ev.key === "stayvista-user-messages") {
        loadMessages();
      }
    };

    // Listen for storage changes from other tabs
    window.addEventListener("storage", handleStorage);
    
    // Periodically refresh to catch same-tab changes
    const refreshInterval = setInterval(() => {
      loadMessages();
    }, 2000); // Check for new messages every 2 seconds

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(refreshInterval);
    };
  }, [refreshKey]);

  const markAsRead = (id) => {
    const storedMessages = JSON.parse(localStorage.getItem("stayvista-user-messages") || "[]");
    const updated = storedMessages.map((message) => {
      if (message.id === id) {
        return { ...message, read: true };
      }
      return message;
    });
    localStorage.setItem("stayvista-user-messages", JSON.stringify(updated));
    setMessages((prev) => prev.map((message) => (message.id === id ? { ...message, read: true } : message)));
  };

  const handleOpenMessage = (message) => {
    if (!message.read) {
      markAsRead(message.id);
    }
    setSelectedMessage(message.read ? message : { ...message, read: true });
  };

  const handleClose = () => {
    setSelectedMessage(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f6f9f4", padding: "120px 24px 32px" }}>
      <Navbar
        profilePhotoURL={profilePhotoURL}
        profileInitial={profileInitial}
        onMenuToggle={() => setMenuOpen((value) => !value)}
        menuOpen={menuOpen}
      />

      {menuOpen && (
        <div className="guest-menu-dropdown guest-menu-dropdown-fixed" style={{ zIndex: 100 }}>
          <button type="button" className="menu-item menu-item-icon" onClick={() => navigate("/profile?section=wishlist")}> 
            <i className="menu-line-icon fa-solid fa-bookmark" aria-hidden="true" />
            <span>Wishlists</span>
          </button>
          <button type="button" className="menu-item menu-item-icon" onClick={() => navigate("/profile?section=favorites")}> 
            <i className="menu-line-icon fa-solid fa-star" aria-hidden="true" />
            <span>Favorites</span>
          </button>
          <button type="button" className="menu-item menu-item-icon" onClick={() => navigate("/messages")}> 
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

      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, color: "#6b6b6b", fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase" }}>Guest Messages</p>
            <h1 style={{ margin: "8px 0 0", fontSize: 32, color: "#151515" }}>Messages</h1>
          </div>
        </div>

        <div style={{ marginBottom: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
          {['all', 'unread'].map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setMessageFilter(filter)}
              style={{
                position: 'relative',
                padding: '10px 18px',
                borderRadius: 999,
                border: messageFilter === filter ? '1px solid #1f4729' : '1px solid #d1d5db',
                background: messageFilter === filter ? '#1f4729' : '#ffffff',
                color: messageFilter === filter ? '#ffffff' : '#1f2420',
                cursor: 'pointer',
                minWidth: 100,
                textTransform: 'capitalize'
              }}
            >
              {filter === 'all' ? 'All' : 'Unread'}
              {filter === 'unread' && unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  minWidth: 22,
                  height: 22,
                  padding: '0 6px',
                  borderRadius: 999,
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600
                }}>
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {messagesToShow.length === 0 ? (
          <div style={{ background: '#ffffff', borderRadius: 24, padding: 48, boxShadow: '0 24px 80px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 96, height: 96, borderRadius: 24, background: '#f5faf4', marginBottom: 24 }}>
              <i className="fa-solid fa-message" aria-hidden="true" style={{ fontSize: 36, color: '#1f4729' }} />
            </div>
            <h2 style={{ margin: 0, fontSize: 24, color: '#151515' }}>You don’t have any messages</h2>
            <p style={{ marginTop: 12, color: '#6b6b6b', lineHeight: 1.8 }}>When a host replies, it will appear here. Check back later for messages from your bookings.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 20 }}>
            {messagesToShow.map((message) => (
              <button
                key={message.id}
                type="button"
                onClick={() => handleOpenMessage(message)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: message.read ? '#ffffff' : '#f0fff4',
                  border: '1px solid #e5e8df',
                  borderRadius: 24,
                  padding: 26,
                  cursor: 'pointer',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.08)',
                  minHeight: 140,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={{ margin: 0, fontSize: 20, color: '#151515' }}>{message.listingTitle || 'Host reply'}</h2>
                    <p style={{ margin: '8px 0 0', color: '#5f6f63', fontSize: 14 }}>
                      From <strong>{message.senderName}</strong>
                    </p>
                  </div>
                  <span style={{ color: '#8f9a92', fontSize: 14, whiteSpace: 'nowrap' }}>
                    {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(message.createdAt))}
                  </span>
                </div>
                <p style={{ marginTop: 20, color: message.read ? '#2f382f' : '#166534', lineHeight: 1.75, fontSize: 15 }}>
                  {message.body.slice(0, 180)}{message.body.length > 180 ? '...' : ''}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedMessage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 820, background: '#fff', borderRadius: 24, padding: 28, boxShadow: '0 24px 80px rgba(0,0,0,0.16)' }}>
            <button
              type='button'
              onClick={handleClose}
              style={{ border: 'none', background: 'transparent', color: '#1f2f21', cursor: 'pointer', marginBottom: 18, fontSize: 16 }}
            >
              ← Back
            </button>
            <h2 style={{ margin: 0, fontSize: 28, color: '#151515' }}>{selectedMessage.listingTitle || 'Reply from host'}</h2>
            <p style={{ color: '#5f6f63', marginTop: 8 }}>From <strong>{selectedMessage.senderName}</strong></p>
            <div style={{ marginTop: 22, padding: 24, borderRadius: 20, background: '#f8faf5', color: '#1f4729', lineHeight: 1.9, fontSize: 16 }}>
              {selectedMessage.body}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GuestMessages;
