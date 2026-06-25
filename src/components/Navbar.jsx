import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";

function getStoredAvatarKey(uid) {
  return `stayvista-profile-photo-${uid}`;
}

/**
 * Navbar component with logo and user profile
 * @param {string} profilePhotoURL - URL of user's profile photo
 * @param {string} profileInitial - User's initial letter for avatar fallback
 * @param {function} onMenuToggle - Callback to toggle menu
 * @param {boolean} menuOpen - Whether menu is open
 * @param {boolean} isHost - Whether the user is a host and should see host-specific menu semantics
 */
function Navbar({ profilePhotoURL, profileInitial, onMenuToggle, menuOpen, homePath = "/guest", isHost = false, actionIcon, actionLabel, actionCallback }) {
  const navigate = useNavigate();

  const handleProfileClick = () => {
    navigate("/profile");
  };

  const handleLogoClick = () => {
    navigate(homePath);
  };

  const storedAvatar = auth.currentUser ? localStorage.getItem(getStoredAvatarKey(auth.currentUser.uid)) : "";
  const displayedPhotoURL = profilePhotoURL || storedAvatar;

  return (
    <header className={`navbar profile-page-topbar guest-navbar-topbar${isHost ? " navbar-host" : ""}`}>
      <button
        type="button"
        className="profile-brand profile-brand-button"
        onClick={handleLogoClick}
        aria-label="Go to home"
      >
        <img src="/stayvista_logo.png" alt="StayVista Tagaytay" className="profile-logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
        StayVista Tagaytay
      </button>

      <div className="profile-navbar-actions">
        <button
          type="button"
          className="profile-chip-button"
          aria-label="Open profile"
          onClick={handleProfileClick}
        >
          {displayedPhotoURL ? (
            <img src={displayedPhotoURL} alt="Profile" className="profile-chip-image" />
          ) : (
            <span className="profile-chip-letter">{profileInitial}</span>
          )}
        </button>
        <div className="menu-shell">
          {actionCallback ? (
            <button
              type="button"
              className="icon-circle-button"
              aria-label={actionLabel || "Log out"}
              title={actionLabel || "Log out"}
              onClick={actionCallback}
            >
              <i className={`fa-solid ${actionIcon || "fa-right-from-bracket"}`} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              className="icon-circle-button"
              aria-label={isHost ? "Open host menu" : "Open menu"}
              title={isHost ? "Open host menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={onMenuToggle}
            >
              <span className="navbar-menu-icon" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
