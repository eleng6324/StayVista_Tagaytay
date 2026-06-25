import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "../firebase";

const profileFields = [
  ["travelWish", "Where I've always wanted to go", "Tell us a destination you can’t wait to visit."],
  ["work", "My work", "Describe what you do."],
  ["uselessSkill", "My most useless skill", "Share a silly or useless talent."],
  ["pets", "Pets", "Tell us about the pets you love."],
  ["decade", "Decade I was born", "What year or decade are you from?"],
  ["school", "Where I went to school", "Share your school or university."],
  ["favoriteSong", "My favorite song in high school", "What song takes you back?"],
  ["funFact", "My fun fact", "A quick fun fact about you."],
  ["spendTime", "I spend too much time", "What do you spend too much time doing?"],
  ["obsessedWith", "I'm obsessed with", "What are you obsessed with?"],
  ["biographyTitle", "My biography title would be", "Finish this sentence."],
  ["languages", "Languages I speak", "List the languages you speak."],
  ["whereILive", "Where I live", "Where do you currently live?"],
];

const profileFieldIcons = {
  travelWish: "fa-plane-departure",
  work: "fa-briefcase",
  uselessSkill: "fa-star",
  pets: "fa-paw",
  decade: "fa-calendar",
  school: "fa-school",
  favoriteSong: "fa-music",
  funFact: "fa-lightbulb",
  spendTime: "fa-clock",
  obsessedWith: "fa-heart",
  biographyTitle: "fa-pen",
  languages: "fa-language",
  whereILive: "fa-location-dot",
};

const getStoredAvatarKey = (uid) => `stayvista-profile-photo-${uid}`;

const interestOptions = [
  "Adrenaline sports",
  "American football",
  "Animals",
  "Anime",
  "Archery",
  "Architecture",
  "Art",
  "Artisanal crafts",
  "Aviation",
  "Badminton",
  "Baseball",
  "Basketball",
  "Basque pelota",
  "Billiards",
  "Board games",
  "Bobsledding",
  "Bocce ball",
  "Bowling",
  "Boxing",
  "Bridge",
  "Building things",
  "Camping",
  "Canoeing",
  "Card Games",
  "Cars",
  "Charreria",
  "Cheerleading",
  "Chess",
  "Climbing",
  "Cocktails",
  "Coffee",
  "Comedy",
  "Content creation",
  "Cooking",
  "Crafting",
  "Cricket",
  "Cultural heritage",
  "Curling",
  "Cycling",
  "Dance",
  "Darts",
  "Design",
  "Diving",
  "Dodgeball",
  "Equestrian sports",
  "Fantasy sports",
  "Fashion",
  "Fencing",
  "Field hockey",
  "Figure skating",
  "Fishing",
  "Fitness",
  "Food scenes",
  "Gardening",
  "Golf",
  "Gymnastics",
  "Hair",
  "Handball",
  "Hiking",
  "History",
  "Hockey",
  "Home improvement",
  "Horse racing",
  "Judo",
  "Karate",
  "Kayaking",
  "Kickboxing",
  "Kung fu",
  "Lacrosse",
  "Live music",
  "Live sports",
  "Local culture",
  "Luge",
  "Makeup",
  "Meditation",
  "Motor sports",
  "Movies",
  "Museums",
  "Netball",
  "Nightlife",
  "Outdoors",
  "Padel",
  "Pentathlon",
  "Photography",
  "Pickleball",
  "Plants",
  "Playing music",
  "Podcasts",
  "Poker",
  "Polo",
  "Puzzles",
  "Racquetball",
  "Reading",
  "Rodeo",
  "Roller derby",
  "Roller skating",
  "Rowing",
  "Rugby",
  "Running",
  "Sailing",
  "Self-care",
  "Shooting sports",
  "Shopping",
  "Singing",
  "Skateboarding",
  "Skiing",
  "Snorkeling",
  "Snowboarding",
  "Soccer",
  "Social activism",
  "Spa",
  "Squash",
  "Sumo wrestling",
  "Surfing",
  "Sustainability",
  "Swimming",
  "Table tennis",
  "Taekwondo",
  "Tai chi",
  "Technology",
  "Tennis",
  "Theater",
  "Track & field",
  "Travel",
  "TV",
  "Ultimate frisbee",
  "Video games",
  "Volleyball",
  "Volunteering",
  "Walking",
  "Water polo",
  "Water sports",
  "Weight lifting",
  "Wine",
  "Wrestling",
  "Writing",
  "Yoga",
];

function ProfileEditor() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    displayName: "",
    email: "",
    photoURL: "",
    role: "Guest",
    travelWish: "",
    work: "",
    uselessSkill: "",
    pets: "",
    decade: "",
    school: "",
    favoriteSong: "",
    funFact: "",
    spendTime: "",
    obsessedWith: "",
    biographyTitle: "",
    languages: "",
    whereILive: "",
    about: "",
  });
  const [interests, setInterests] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [selectedValue, setSelectedValue] = useState("");
  const [showInterestPicker, setShowInterestPicker] = useState(false);
  const [interestSearch, setInterestSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isHost = profile.role?.toLowerCase() === "host";

  const handleLogout = async () => {
    await signOut(auth);
  };

  useEffect(() => {
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
        console.error("Failed to load profile for editor:", error);
      }

      const savedPhoto = localStorage.getItem(getStoredAvatarKey(user.uid));
      const savedProfileData = localStorage.getItem(`stayvista-profile-data-${user.uid}`);
      let parsedProfileData = {};
      if (savedProfileData) {
        try {
          parsedProfileData = JSON.parse(savedProfileData);
        } catch (error) {
          parsedProfileData = {};
        }
      }

      setProfile((current) => ({
        ...current,
        displayName: user.displayName || parsedProfileData.displayName || current.displayName,
        email: user.email || parsedProfileData.email || current.email,
        photoURL: savedPhoto || user.photoURL || parsedProfileData.photoURL || current.photoURL,
        role: documentProfile.role ?? parsedProfileData.role ?? current.role,
        travelWish: documentProfile.travelWish ?? parsedProfileData.travelWish ?? current.travelWish,
        work: documentProfile.work ?? parsedProfileData.work ?? current.work,
        uselessSkill: documentProfile.uselessSkill ?? parsedProfileData.uselessSkill ?? current.uselessSkill,
        pets: documentProfile.pets ?? parsedProfileData.pets ?? current.pets,
        decade: documentProfile.decade ?? parsedProfileData.decade ?? current.decade,
        school: documentProfile.school ?? parsedProfileData.school ?? current.school,
        favoriteSong: documentProfile.favoriteSong ?? parsedProfileData.favoriteSong ?? current.favoriteSong,
        funFact: documentProfile.funFact ?? parsedProfileData.funFact ?? current.funFact,
        spendTime: documentProfile.spendTime ?? parsedProfileData.spendTime ?? current.spendTime,
        obsessedWith: documentProfile.obsessedWith ?? parsedProfileData.obsessedWith ?? current.obsessedWith,
        biographyTitle: documentProfile.biographyTitle ?? parsedProfileData.biographyTitle ?? current.biographyTitle,
        languages: documentProfile.languages ?? parsedProfileData.languages ?? current.languages,
        whereILive: documentProfile.whereILive ?? parsedProfileData.whereILive ?? current.whereILive,
        about: documentProfile.about ?? parsedProfileData.about ?? current.about,
      }));
      setInterests(
        Array.isArray(documentProfile.interests)
          ? documentProfile.interests
          : Array.isArray(parsedProfileData.interests)
            ? parsedProfileData.interests
            : []
      );
    };

    loadProfile();
  }, []);

  const profileName = profile.displayName || "Maria Ellaine";
  const profileInitial = profileName.trim().charAt(0).toUpperCase() || "M";

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

  const openFieldEditor = (key) => {
    setSelectedField(key);
    setSelectedValue(profile[key] || "");
  };

  const closeFieldEditor = () => {
    setSelectedField(null);
    setSelectedValue("");
  };

  const saveFieldEditor = () => {
    if (!selectedField) return;
    setProfile((current) => ({ ...current, [selectedField]: selectedValue }));
    closeFieldEditor();
  };

  const addInterest = () => {
    setShowInterestPicker(true);
    setInterestSearch("");
  };

  const addInterestChoice = (choice) => {
    setInterests((current) => {
      if (current.includes(choice)) {
        return current.filter((item) => item !== choice);
      }
      return [...current, choice];
    });
  };

  const filteredInterestOptions = interestOptions.filter((label) =>
    label.toLowerCase().includes(interestSearch.toLowerCase())
  );

  const removeInterest = (index) => {
    setInterests((current) => current.filter((_, idx) => idx !== index));
  };

  const handleSaveProfile = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setSaving(true);
    try {
      const profileData = {
        displayName: profile.displayName,
        travelWish: profile.travelWish,
        work: profile.work,
        uselessSkill: profile.uselessSkill,
        pets: profile.pets,
        decade: profile.decade,
        school: profile.school,
        favoriteSong: profile.favoriteSong,
        funFact: profile.funFact,
        spendTime: profile.spendTime,
        obsessedWith: profile.obsessedWith,
        biographyTitle: profile.biographyTitle,
        languages: profile.languages,
        whereILive: profile.whereILive,
        about: profile.about,
        interests,
        photoURL: profile.photoURL,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(
        doc(db, "users", user.uid),
        profileData,
        { merge: true }
      );

      if (profile.photoURL) {
        await updateProfile(user, { photoURL: profile.photoURL });
      }

      localStorage.setItem(getStoredAvatarKey(user.uid), profile.photoURL || "");
      localStorage.setItem(`stayvista-profile-data-${user.uid}`, JSON.stringify(profileData));

      navigate("/profile");
    } catch (error) {
      console.error("Failed to save profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const currentFieldLabel = profileFields.find(([key]) => key === selectedField)?.[1] || "";
  const currentFieldPlaceholder = profileFields.find(([key]) => key === selectedField)?.[2] || "";

  const profileMenu = isHost ? (
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
      <button type="button" className="menu-item menu-item-icon" onClick={() => { navigate("/host/cohosts"); setMenuOpen(false); }}> 
        <i className="fa-solid fa-users" aria-hidden="true" />
        <span>Find a co-host</span>
      </button>
      <button type="button" className="menu-item menu-item-icon" onClick={() => { navigate("/host/create-listing"); setMenuOpen(false); }}> 
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
      <button type="button" className="menu-item menu-item-icon" onClick={() => { navigate('/profile?section=wishlist'); setMenuOpen(false); }}> 
        <i className="menu-line-icon fa-solid fa-bookmark" aria-hidden="true" />
        <span>Wishlists</span>
      </button>
      <button type="button" className="menu-item menu-item-icon" onClick={() => { navigate('/profile?section=favorites'); setMenuOpen(false); }}> 
        <i className="menu-line-icon fa-solid fa-star" aria-hidden="true" />
        <span>Favorites</span>
      </button>
      <button type="button" className="menu-item menu-item-icon"> 
        <i className="menu-line-icon fa-solid fa-comment-dots" aria-hidden="true" />
        <span>Messages</span>
      </button>
      <button type="button" className="menu-item menu-item-icon" onClick={() => { navigate('/profile'); setMenuOpen(false); }}> 
        <i className="menu-line-icon fa-solid fa-user" aria-hidden="true" />
        <span>Profile</span>
      </button>

      <div className="menu-divider" />

      <button type="button" className="menu-item menu-item-icon" onClick={() => { navigate("/account-settings"); setMenuOpen(false); }}> 
        <span className="menu-line-icon menu-icon-settings" aria-hidden="true" />
        <span>Account settings</span>
      </button>
      <button type="button" className="menu-item menu-item-icon"> 
        <span className="menu-line-icon menu-icon-globe" aria-hidden="true" />
        <span>Languages &amp; currency</span>
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

  return (
    <main className="profile-editor-page">
      <header className="profile-page-topbar">
        <a href="/guest" className="profile-brand">
          <img src="/stayvista_logo.png" alt="StayVista Tagaytay" className="profile-logo" />
          StayVista Tagaytay
        </a>
        <div className="profile-navbar-actions">
          <button type="button" className="profile-chip-button" aria-label={profileInitial} onClick={() => navigate("/profile")}>
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
      <header className="profile-editor-topbar">
        <div className="profile-editor-topbar-heading">
          <p>My profile</p>
          <h1>Edit your profile</h1>
        </div>
      </header>

      <div className="profile-editor-grid">
        <section className="profile-editor-card profile-editor-photo-card">
          <div className="profile-photo-picker">
            {profile.photoURL ? (
              <img src={profile.photoURL} alt={profileName} />
            ) : (
              <span>{profileInitial}</span>
            )}
          </div>
          <label className="profile-photo-picker-label">
            <span>Add</span>
            <input type="file" accept="image/*" onChange={handlePhotoChange} />
          </label>
          <h2>{profileName}</h2>
          <p>{profile.role}</p>
        </section>

        <section className="profile-editor-card profile-editor-fields-card">
          <div className="profile-editor-header">
            <h2>My profile</h2>
            <p>Hosts and guests can see your profile and it may appear across StayVista when you connect with the community.</p>
          </div>

          <div className="profile-editor-fields-grid">
            {profileFields.map(([key, label]) => (
              <button key={key} type="button" className="profile-field-button" onClick={() => openFieldEditor(key)}>
                <div className="profile-field-row">
                  <span className="profile-field-icon">
                    <i className={`fa-solid ${profileFieldIcons[key] || "fa-circle"}`} aria-hidden="true" />
                  </span>
                  <span className="profile-field-text">
                    <span className="profile-field-label">{label}</span>
                    <span className="profile-field-value">
                      {profile[key] ? profile[key] : "Tap to answer"}
                    </span>
                  </span>
                </div>
                <i className="fa-solid fa-chevron-right profile-field-action-icon" aria-hidden="true" />
              </button>
            ))}
          </div>

          <div className="profile-editor-section">
            <div className="profile-editor-section-header">
              <h3>About me</h3>
            </div>
            <textarea
              className="profile-textarea"
              placeholder="Write something fun and punchy."
              value={profile.about || ""}
              onChange={(event) => setProfile((current) => ({ ...current, about: event.target.value }))}
            />
          </div>

          <div className="profile-editor-section">
            <div className="profile-editor-section-header">
              <h3>My interests</h3>
              <p>Find common ground with other guests and hosts by adding interests to your profile.</p>
            </div>
            <div className="profile-interests-list">
              {interests.map((interest, idx) => (
                <button key={idx} type="button" className="interest-pill" onClick={() => removeInterest(idx)}>
                  <i className="fa-solid fa-heart interest-pill-icon" aria-hidden="true" />
                  {interest}
                  <span className="interest-pill-remove">✕</span>
                </button>
              ))}
              <button type="button" className="interest-pill interest-pill-add" onClick={addInterest}>
                <i className="fa-solid fa-plus" aria-hidden="true" />
                Add interests
              </button>
            </div>
          </div>

          <div className="profile-editor-actions">
            <button type="button" className="profile-primary-action" onClick={handleSaveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </section>
      </div>

      {selectedField && (
        <div className="profile-modal-overlay">
          <div className="profile-modal profile-modal-field">
            <button type="button" className="modal-close" onClick={closeFieldEditor}>×</button>
            <div className="profile-modal-body profile-modal-body-field">
              <h2>{currentFieldLabel}</h2>
              <p>{currentFieldPlaceholder}</p>
              <div className="profile-input-card">
                <input
                  className="profile-input profile-field-input"
                  value={selectedValue}
                  onChange={(event) => setSelectedValue(event.target.value)}
                  placeholder={currentFieldPlaceholder}
                />
              </div>
              <div className="profile-modal-actions">
                <button type="button" className="profile-primary-action profile-primary-action-white" onClick={saveFieldEditor}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInterestPicker && (
        <div className="profile-modal-overlay">
          <div className="profile-modal profile-modal-large">
            <button type="button" className="modal-close" onClick={() => setShowInterestPicker(false)}>×</button>
            <div className="profile-modal-body profile-modal-body-large">
              <h2>Interests</h2>
              <p>Pick some interests you enjoy that you want other people to see.</p>
              <div className="interest-search-row">
                <label className="interest-search-box">
                  <i className="fa-solid fa-magnifying-glass interest-search-icon" aria-hidden="true" />
                  <input
                    type="text"
                    className="interest-search-input"
                    placeholder="Search for interests"
                    value={interestSearch}
                    onChange={(event) => setInterestSearch(event.target.value)}
                  />
                </label>
              </div>
              <div className="profile-option-grid">
                {filteredInterestOptions.map((label) => {
                  const selected = interests.includes(label);
                  return (
                    <button
                      key={label}
                      type="button"
                      className={`interest-option-pill ${selected ? "selected" : ""}`}
                      onClick={() => addInterestChoice(label)}
                    >
                      <span className="interest-option-pill-left">
                        <i className="fa-solid fa-circle-dot interest-option-icon" aria-hidden="true" />
                        <span>{label}</span>
                      </span>
                      <i
                        className={`fa-solid ${selected ? "fa-check-square" : "fa-square"} interest-option-select-icon`}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
              <div className="profile-modal-actions profile-modal-actions-right">
                <button type="button" className="profile-primary-action" onClick={() => setShowInterestPicker(false)}>
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default ProfileEditor;

