import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import { auth } from "../firebase";

function MessageHost() {
  const navigate = useNavigate();
  const location = useLocation();
  const { host = {}, listingTitle = "your stay" } = location.state || {};
  const [menuOpen, setMenuOpen] = useState(false);
  const [message, setMessage] = useState(`Hi ${host.name || "Host"}! I'll be visiting...
`);
  const [sendSuccess, setSendSuccess] = useState("");

  const profileLabel = auth.currentUser?.displayName || auth.currentUser?.email || "Profile";
  const profileInitial = profileLabel.trim().charAt(0).toUpperCase() || "P";
  const storedAvatar = auth.currentUser ? localStorage.getItem(`stayvista-profile-photo-${auth.currentUser.uid}`) : "";
  const profilePhotoURL = storedAvatar || auth.currentUser?.photoURL || "";

  const saveHostMessage = (body) => {
    const trimmedBody = body.trim();
    if (!trimmedBody || !host.name) return;

    // Validate guest auth info
    const guestId = auth.currentUser?.uid;
    const guestEmail = auth.currentUser?.email;
    
    if (!guestId || !guestEmail) {
      console.error('Cannot save message: Guest not properly authenticated', { guestId, guestEmail });
      alert('Error: Please make sure you are logged in. Refresh and try again.');
      return;
    }

    const savedMessages = JSON.parse(localStorage.getItem("stayvista-host-messages") || "[]");
    const newMessage = {
      id: `msg-${Date.now()}`,
      hostName: host.name,
      listingTitle,
      senderName: auth.currentUser?.displayName || auth.currentUser?.email || "Guest",
      senderEmail: guestEmail,
      senderId: guestId,
      body: trimmedBody,
      createdAt: new Date().toISOString(),
      read: false
    };

    savedMessages.push(newMessage);
    localStorage.setItem("stayvista-host-messages", JSON.stringify(savedMessages));
    
    console.log('Message saved to host:', { 
      guestId, 
      guestEmail, 
      hostName: host.name,
      listingTitle
    });
  };

  useEffect(() => {
    if (!sendSuccess) return;
    const timeoutId = setTimeout(() => setSendSuccess(""), 4500);
    return () => clearTimeout(timeoutId);
  }, [sendSuccess]);

  return (
    <div style={{ minHeight: "100vh", background: "#f6f9f4", padding: "120px 32px 32px" }}>
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

      <div style={{ width: "100%", padding: "0 32px", boxSizing: "border-box" }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            border: "none",
            background: "transparent",
            color: "#1f2f21",
            fontSize: "16px",
            cursor: "pointer",
            marginBottom: "24px",
            paddingLeft: 0,
            display: "inline-flex",
            alignItems: "center"
          }}
        >
          ← Back
        </button>
      </div>

      <div style={{ maxWidth: "920px", margin: "0 auto" }}>
        <div style={{ background: "#ffffff", borderRadius: "28px", padding: "32px 32px 40px", boxShadow: "0 20px 60px rgba(0,0,0,0.08)", marginTop: "0" }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "24px", alignItems: "center" }}>
            <div style={{ flex: "1 1 360px", minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: "32px", color: "#151515" }}>Contact {host.name || "Host"}</h1>
              <p style={{ margin: "12px 0 0", color: "#5f6f63", fontSize: "16px" }}>Typically responds within an hour</p>
              <div style={{ marginTop: "28px", width: "100%", height: "1px", background: "#e5e8df" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: "172px" }}>
              <div style={{ width: "88px", height: "88px", borderRadius: "50%", overflow: "hidden", background: "#e9f2ee", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {host.photoURL ? (
                  <img src={host.photoURL} alt={host.name || "Host"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: "24px", fontWeight: 700, color: "#1f4729" }}>{(host.name || "H").charAt(0)}</span>
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#151515" }}>{host.name || "Host"}</div>
                <div style={{ color: "#5f6f63", fontSize: "14px", marginTop: "6px" }}>{host.role || "Host"}</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "32px", display: "grid", gap: "32px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "20px", color: "#1f2f21" }}>Most travelers ask about</h2>
              <div style={{ marginTop: "20px", display: "grid", gap: "24px" }}>
                <section>
                  <div style={{ fontWeight: 700, color: "#1f2f21", marginBottom: "12px" }}>Getting there</div>
                  <ul style={{ margin: 0, paddingLeft: "20px", color: "#484848", lineHeight: 1.8 }}>
                    <li>Check-in time for this home starts at 2:00 PM and checkout is at 12:00 PM.</li>
                  </ul>
                </section>
                <section>
                  <div style={{ fontWeight: 700, color: "#1f2f21", marginBottom: "12px" }}>House details and rules</div>
                  <ul style={{ margin: 0, paddingLeft: "20px", color: "#484848", lineHeight: 1.8 }}>
                    <li>No smoking. No parties or events. No pets.</li>
                  </ul>
                </section>
                <section>
                  <div style={{ fontWeight: 700, color: "#1f2f21", marginBottom: "12px" }}>Price and availability</div>
                  <ul style={{ margin: 0, paddingLeft: "20px", color: "#484848", lineHeight: 1.8 }}>
                    <li>Get a 10% discount on stays longer than a week, or 15% on stays longer than a month.</li>
                    <li>{host.name ? `${host.name}'s home is available from Jun 2 – 3. Book soon.` : "This home is available from Jun 2 – 3. Book soon."}</li>
                    <li>Cancel up to 5 days before check-in and get a full refund. After that, cancel before check-in and get a 50% refund, minus the first night and service fee.</li>
                  </ul>
                </section>
              </div>
            </div>

            <div style={{ borderTop: "1px solid #e5e8df", paddingTop: "28px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", color: "#1f2f21" }}>Still have questions? Message the host</h2>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Hi ${host.name || "Host"}! I'll be visiting...`}
                rows={6}
                style={{
                  width: "100%",
                  marginTop: "18px",
                  borderRadius: "16px",
                  border: "1px solid #d1d5db",
                  padding: "16px",
                  fontSize: "16px",
                  color: "#1f2f21",
                  resize: "vertical",
                  minHeight: "160px"
                }}
              />
              <button
                type="button"
                disabled={!message.trim()}
                onClick={() => {
                  saveHostMessage(message);
                  setMessage(`Hi ${host.name || "Host"}! I'll be visiting...\n`);
                  setSendSuccess(`Your message has been sent to ${host.name || "the host"}.`);
                }}
                style={{
                  marginTop: "18px",
                  padding: "14px 24px",
                  borderRadius: "14px",
                  border: "none",
                  background: message.trim() ? "#1f4729" : "#cfd9cf",
                  color: "white",
                  fontSize: "16px",
                  cursor: message.trim() ? "pointer" : "not-allowed"
                }}
              >
                Send message
              </button>
              {sendSuccess && (
                <div style={{
                  marginTop: "16px",
                  padding: "14px 18px",
                  borderRadius: "16px",
                  background: "#e6f4ea",
                  color: "#1f4721",
                  border: "1px solid #c6e3c4"
                }}>
                  {sendSuccess}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MessageHost;
