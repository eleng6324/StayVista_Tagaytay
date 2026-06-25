import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  RecaptchaVerifier,
  linkWithPhoneNumber,
  sendEmailVerification,
} from "firebase/auth";
import Navbar from "../components/Navbar";

const COUNTRY_CODES = [
  { name: "Afghanistan", code: "+93" },
  { name: "Albania", code: "+355" },
  { name: "Algeria", code: "+213" },
  { name: "American Samoa", code: "+1684" },
  { name: "Andorra", code: "+376" },
  { name: "Angola", code: "+244" },
  { name: "Anguilla", code: "+1264" },
  { name: "Antarctica", code: "+672" },
  { name: "Antigua and Barbuda", code: "+1268" },
  { name: "Argentina", code: "+54" },
  { name: "Armenia", code: "+374" },
  { name: "Aruba", code: "+297" },
  { name: "Australia", code: "+61" },
  { name: "Austria", code: "+43" },
  { name: "Azerbaijan", code: "+994" },
  { name: "Bahamas", code: "+1242" },
  { name: "Bahrain", code: "+973" },
  { name: "Bangladesh", code: "+880" },
  { name: "Barbados", code: "+1246" },
  { name: "Belarus", code: "+375" },
  { name: "Belgium", code: "+32" },
  { name: "Belize", code: "+501" },
  { name: "Benin", code: "+229" },
  { name: "Bermuda", code: "+1441" },
  { name: "Bhutan", code: "+975" },
  { name: "Bolivia", code: "+591" },
  { name: "Bosnia and Herzegovina", code: "+387" },
  { name: "Botswana", code: "+267" },
  { name: "Brazil", code: "+55" },
  { name: "British Indian Ocean Territory", code: "+246" },
  { name: "British Virgin Islands", code: "+1284" },
  { name: "Brunei", code: "+673" },
  { name: "Bulgaria", code: "+359" },
  { name: "Burkina Faso", code: "+226" },
  { name: "Burundi", code: "+257" },
  { name: "Cambodia", code: "+855" },
  { name: "Cameroon", code: "+237" },
  { name: "Canada", code: "+1" },
  { name: "Cape Verde", code: "+238" },
  { name: "Cayman Islands", code: "+1345" },
  { name: "Central African Republic", code: "+236" },
  { name: "Chad", code: "+235" },
  { name: "Chile", code: "+56" },
  { name: "China", code: "+86" },
  { name: "Christmas Island", code: "+61" },
  { name: "Cocos Islands", code: "+61" },
  { name: "Colombia", code: "+57" },
  { name: "Comoros", code: "+269" },
  { name: "Congo", code: "+242" },
  { name: "Democratic Republic of the Congo", code: "+243" },
  { name: "Cook Islands", code: "+682" },
  { name: "Costa Rica", code: "+506" },
  { name: "Croatia", code: "+385" },
  { name: "Cuba", code: "+53" },
  { name: "Curaçao", code: "+599" },
  { name: "Cyprus", code: "+357" },
  { name: "Czech Republic", code: "+420" },
  { name: "Denmark", code: "+45" },
  { name: "Djibouti", code: "+253" },
  { name: "Dominica", code: "+1767" },
  { name: "Dominican Republic", code: "+1809" },
  { name: "Ecuador", code: "+593" },
  { name: "Egypt", code: "+20" },
  { name: "El Salvador", code: "+503" },
  { name: "Equatorial Guinea", code: "+240" },
  { name: "Eritrea", code: "+291" },
  { name: "Estonia", code: "+372" },
  { name: "Ethiopia", code: "+251" },
  { name: "Fiji", code: "+679" },
  { name: "Finland", code: "+358" },
  { name: "France", code: "+33" },
  { name: "French Guiana", code: "+594" },
  { name: "French Polynesia", code: "+689" },
  { name: "Gabon", code: "+241" },
  { name: "Gambia", code: "+220" },
  { name: "Georgia", code: "+995" },
  { name: "Germany", code: "+49" },
  { name: "Ghana", code: "+233" },
  { name: "Gibraltar", code: "+350" },
  { name: "Greece", code: "+30" },
  { name: "Greenland", code: "+299" },
  { name: "Grenada", code: "+1473" },
  { name: "Guadeloupe", code: "+590" },
  { name: "Guam", code: "+1671" },
  { name: "Guatemala", code: "+502" },
  { name: "Guinea", code: "+224" },
  { name: "Guinea-Bissau", code: "+245" },
  { name: "Guyana", code: "+592" },
  { name: "Haiti", code: "+509" },
  { name: "Honduras", code: "+504" },
  { name: "Hong Kong", code: "+852" },
  { name: "Hungary", code: "+36" },
  { name: "Iceland", code: "+354" },
  { name: "India", code: "+91" },
  { name: "Indonesia", code: "+62" },
  { name: "Iran", code: "+98" },
  { name: "Iraq", code: "+964" },
  { name: "Ireland", code: "+353" },
  { name: "Isle of Man", code: "+44" },
  { name: "Israel", code: "+972" },
  { name: "Italy", code: "+39" },
  { name: "Jamaica", code: "+1876" },
  { name: "Japan", code: "+81" },
  { name: "Jordan", code: "+962" },
  { name: "Kazakhstan", code: "+7" },
  { name: "Kenya", code: "+254" },
  { name: "Kiribati", code: "+686" },
  { name: "Kosovo", code: "+383" },
  { name: "Kuwait", code: "+965" },
  { name: "Kyrgyzstan", code: "+996" },
  { name: "Laos", code: "+856" },
  { name: "Latvia", code: "+371" },
  { name: "Lebanon", code: "+961" },
  { name: "Lesotho", code: "+266" },
  { name: "Liberia", code: "+231" },
  { name: "Libya", code: "+218" },
  { name: "Liechtenstein", code: "+423" },
  { name: "Lithuania", code: "+370" },
  { name: "Luxembourg", code: "+352" },
  { name: "Macau", code: "+853" },
  { name: "North Macedonia", code: "+389" },
  { name: "Madagascar", code: "+261" },
  { name: "Malawi", code: "+265" },
  { name: "Malaysia", code: "+60" },
  { name: "Maldives", code: "+960" },
  { name: "Mali", code: "+223" },
  { name: "Malta", code: "+356" },
  { name: "Marshall Islands", code: "+692" },
  { name: "Martinique", code: "+596" },
  { name: "Mauritania", code: "+222" },
  { name: "Mauritius", code: "+230" },
  { name: "Mayotte", code: "+262" },
  { name: "Mexico", code: "+52" },
  { name: "Micronesia", code: "+691" },
  { name: "Moldova", code: "+373" },
  { name: "Monaco", code: "+377" },
  { name: "Mongolia", code: "+976" },
  { name: "Montenegro", code: "+382" },
  { name: "Montserrat", code: "+1664" },
  { name: "Morocco", code: "+212" },
  { name: "Mozambique", code: "+258" },
  { name: "Myanmar", code: "+95" },
  { name: "Namibia", code: "+264" },
  { name: "Nauru", code: "+674" },
  { name: "Nepal", code: "+977" },
  { name: "Netherlands", code: "+31" },
  { name: "New Caledonia", code: "+687" },
  { name: "New Zealand", code: "+64" },
  { name: "Nicaragua", code: "+505" },
  { name: "Niger", code: "+227" },
  { name: "Nigeria", code: "+234" },
  { name: "Niue", code: "+683" },
  { name: "North Korea", code: "+850" },
  { name: "Norway", code: "+47" },
  { name: "Oman", code: "+968" },
  { name: "Pakistan", code: "+92" },
  { name: "Palau", code: "+680" },
  { name: "Palestine", code: "+970" },
  { name: "Panama", code: "+507" },
  { name: "Papua New Guinea", code: "+675" },
  { name: "Paraguay", code: "+595" },
  { name: "Peru", code: "+51" },
  { name: "Philippines", code: "+63" },
  { name: "Poland", code: "+48" },
  { name: "Portugal", code: "+351" },
  { name: "Puerto Rico", code: "+1787" },
  { name: "Qatar", code: "+974" },
  { name: "Réunion", code: "+262" },
  { name: "Romania", code: "+40" },
  { name: "Russia", code: "+7" },
  { name: "Rwanda", code: "+250" },
  { name: "Saint Barthélemy", code: "+590" },
  { name: "Saint Helena", code: "+290" },
  { name: "Saint Kitts and Nevis", code: "+1869" },
  { name: "Saint Lucia", code: "+1758" },
  { name: "Saint Martin", code: "+590" },
  { name: "Saint Pierre and Miquelon", code: "+508" },
  { name: "Saint Vincent and the Grenadines", code: "+1784" },
  { name: "Samoa", code: "+685" },
  { name: "San Marino", code: "+378" },
  { name: "São Tomé and Príncipe", code: "+239" },
  { name: "Saudi Arabia", code: "+966" },
  { name: "Senegal", code: "+221" },
  { name: "Serbia", code: "+381" },
  { name: "Seychelles", code: "+248" },
  { name: "Sierra Leone", code: "+232" },
  { name: "Singapore", code: "+65" },
  { name: "Sint Maarten", code: "+1721" },
  { name: "Slovakia", code: "+421" },
  { name: "Slovenia", code: "+386" },
  { name: "Solomon Islands", code: "+677" },
  { name: "Somalia", code: "+252" },
  { name: "South Africa", code: "+27" },
  { name: "South Georgia and the South Sandwich Islands", code: "+500" },
  { name: "South Korea", code: "+82" },
  { name: "Spain", code: "+34" },
  { name: "Sri Lanka", code: "+94" },
  { name: "Sudan", code: "+249" },
  { name: "Suriname", code: "+597" },
  { name: "Swaziland", code: "+268" },
  { name: "Sweden", code: "+46" },
  { name: "Switzerland", code: "+41" },
  { name: "Syria", code: "+963" },
  { name: "Taiwan", code: "+886" },
  { name: "Tajikistan", code: "+992" },
  { name: "Tanzania", code: "+255" },
  { name: "Thailand", code: "+66" },
  { name: "Togo", code: "+228" },
  { name: "Tokelau", code: "+690" },
  { name: "Tonga", code: "+676" },
  { name: "Trinidad and Tobago", code: "+1868" },
  { name: "Tunisia", code: "+216" },
  { name: "Turkey", code: "+90" },
  { name: "Turkmenistan", code: "+993" },
  { name: "Turks and Caicos Islands", code: "+1649" },
  { name: "Tuvalu", code: "+688" },
  { name: "Uganda", code: "+256" },
  { name: "Ukraine", code: "+380" },
  { name: "United Arab Emirates", code: "+971" },
  { name: "United Kingdom", code: "+44" },
  { name: "United States", code: "+1" },
  { name: "Uruguay", code: "+598" },
  { name: "Uzbekistan", code: "+998" },
  { name: "Vanuatu", code: "+678" },
  { name: "Vatican City", code: "+379" },
  { name: "Venezuela", code: "+58" },
  { name: "Vietnam", code: "+84" },
  { name: "Wallis and Futuna", code: "+681" },
  { name: "Western Sahara", code: "+212" },
  { name: "Yemen", code: "+967" },
  { name: "Zambia", code: "+260" },
  { name: "Zimbabwe", code: "+263" }
];

function VerifyListing() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [countryCode, setCountryCode] = useState("+63");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [phoneConfirmationResult, setPhoneConfirmationResult] = useState(null);
  const [phoneSending, setPhoneSending] = useState(false);
  const [sentCode, setSentCode] = useState("");
  const [verificationInput, setVerificationInput] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profilePhotoURL, setProfilePhotoURL] = useState("");
  const [profileInitial, setProfileInitial] = useState("H");
  const [loginEmail, setLoginEmail] = useState("");
  const [emailEditable, setEmailEditable] = useState(false);
  const emailInputRef = useRef(null);
  const [emailPassword, setEmailPassword] = useState("");
  const [emailStatusMessage, setEmailStatusMessage] = useState("");
  const [emailVerificationStatus, setEmailVerificationStatus] = useState("");
  const [emailLinkSent, setEmailLinkSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [listing, setListing] = useState(null);
  const [listingLoading, setListingLoading] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setProfilePhotoURL(user.photoURL || "");
      setLoginEmail(user.email || "");
      const initial = user.displayName?.trim().charAt(0) || user.email?.trim().charAt(0) || "H";
      setProfileInitial(initial.toUpperCase());

      if (user.emailVerified) {
        setEmailVerified(true);
        setEmailVerificationStatus("success");
        setEmailStatusMessage("Your Gmail account is already verified.");
      }
    }
  }, []);

  useEffect(() => {
    if (!id) return;

    const fetchListing = async () => {
      setListingLoading(true);
      try {
        const docRef = doc(db, "listings", id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          setListing({ id: snapshot.id, ...snapshot.data() });
        }
      } catch (error) {
        console.error("Error loading listing:", error);
      } finally {
        setListingLoading(false);
      }
    };

    fetchListing();
  }, [id]);

  const normalizedPhone = phoneNumber.replace(/\D/g, "");
  const sanitizedPhone = normalizedPhone.startsWith("0")
    ? `${countryCode}${normalizedPhone.slice(1)}`
    : `${countryCode}${normalizedPhone}`;
  const fullPhone = sanitizedPhone.replace(/\s+/g, "");
  const canContinue = phoneNumber.trim().length > 0;
  const canVerify = showCodeInput && verificationInput.trim().length > 0;

  const getPhoneAppVerifier = async () => {
    if (typeof window === "undefined") return null;
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        "recaptcha-container",
        {
          size: "invisible",
          callback: () => {},
        },
        auth
      );
    }

    try {
      await window.recaptchaVerifier.render();
    } catch (renderError) {
      // Ignore render issues when the widget is already rendered.
    }

    return window.recaptchaVerifier;
  };

  const sendPhoneVerificationCode = async () => {
    if (!canContinue) return;
    setPhoneSending(true);

    if (!auth.currentUser) {
      setPhoneSending(false);
      setVerificationStatus("error");
      setStatusMessage("Unable to verify phone because no user is signed in.");
      return;
    }

    try {
      const appVerifier = await getPhoneAppVerifier();
      const confirmationResult = await linkWithPhoneNumber(auth.currentUser, fullPhone, appVerifier);
      setPhoneConfirmationResult(confirmationResult);
      setShowCodeInput(true);
      setVerificationStatus("");
      setStatusMessage(`A verification code was sent to ${fullPhone}.`);
    } catch (error) {
      console.error("Phone verification failed:", error);
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setSentCode(code);
      setShowCodeInput(true);
      setVerificationStatus("");
      setStatusMessage(`Failed to send SMS; generated a simulated verification code for ${fullPhone}.`);
    } finally {
      setPhoneSending(false);
    }
  };

  const handleContinue = async () => {
    if (!canContinue) return;
    await sendPhoneVerificationCode();
  };

  const handleVerify = async () => {
    if (!canVerify) return;

    if (phoneConfirmationResult) {
      try {
        await phoneConfirmationResult.confirm(verificationInput.trim());
        setVerificationStatus("success");
        setStatusMessage("Phone number verified successfully.");
        setTimeout(() => {
          if (id) {
            navigate(`/host/listing-editor/${id}`);
            return;
          }
          navigate("/host");
        }, 1000);
        return;
      } catch (error) {
        console.error("Phone confirmation failed:", error);
        setVerificationStatus("error");
        setStatusMessage("The code is incorrect or expired. Please try again.");
        return;
      }
    }

    if (verificationInput.trim() === sentCode) {
      setVerificationStatus("success");
      setStatusMessage("Phone number verified successfully.");
      setTimeout(() => {
        if (id) {
          navigate(`/host/listing-editor/${id}`);
          return;
        }
        navigate("/host");
      }, 1000);
      return;
    }

    setVerificationStatus("error");
    setStatusMessage("The code you entered is incorrect. Please try again.");
  };

  const canEmailContinue = emailPassword.trim().length > 0;

  const handleEmailContinue = async () => {
    if (!canEmailContinue) return;
    const user = auth.currentUser;

    if (!user) {
      setEmailVerificationStatus("error");
      setEmailStatusMessage("Could not verify email because no user is signed in.");
      return;
    }

    if (!loginEmail || loginEmail.trim().length === 0) {
      setEmailVerificationStatus("error");
      setEmailStatusMessage("Please enter an email address to verify.");
      return;
    }

    if (loginEmail !== user.email) {
      setEmailVerificationStatus("error");
      setEmailStatusMessage(
        "Entered email does not match the account you're signed in with. To verify a different email, sign in with that account first."
      );
      return;
    }

    if (user.emailVerified) {
      setEmailVerified(true);
      setEmailVerificationStatus("success");
      setEmailStatusMessage("Your Gmail account is already verified.");
      setEmailLinkSent(false);
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, emailPassword);
      await reauthenticateWithCredential(user, credential);

      await sendEmailVerification(user);
      setEmailLinkSent(true);
      setEmailVerificationStatus("");
      setEmailStatusMessage(`A verification link was sent to ${user.email}. Please open it and click the link.`);
    } catch (error) {
      console.error("Email verification send failed:", error);
      if (error.code === "auth/requires-recent-login") {
        setEmailVerificationStatus("error");
        setEmailStatusMessage("Please sign in again before requesting a verification link.");
      } else if (error.code === "auth/invalid-email") {
        setEmailVerificationStatus("error");
        setEmailStatusMessage("The email address is invalid. Please update your signed-in account email.");
      } else {
        setEmailVerificationStatus("error");
        setEmailStatusMessage("Unable to send verification email. Please try again.");
      }
    }
  };

  const handleEmailResend = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) {
      setEmailVerificationStatus("error");
      setEmailStatusMessage("Unable to resend verification email because the account email is unavailable.");
      return;
    }

    try {
      await sendEmailVerification(user);
      setEmailLinkSent(true);
      setEmailVerificationStatus("");
      setEmailStatusMessage(`A new verification link was sent to ${user.email}.`);
    } catch (error) {
      console.error("Email resend failed:", error);
      setEmailVerificationStatus("error");
      setEmailStatusMessage("Unable to resend verification email. Please try again.");
    }
  };

  const handlePhoneResend = async () => {
    if (!canContinue) return;
    await sendPhoneVerificationCode();
  };

  const handleCheckEmailVerified = async () => {
    const user = auth.currentUser;
    if (!user) {
      setEmailVerificationStatus("error");
      setEmailStatusMessage("No signed-in user found.");
      return;
    }

    try {
      await user.reload();
      const refreshed = auth.currentUser;
      if (refreshed?.emailVerified) {
        setEmailVerified(true);
        setEmailVerificationStatus("success");
        setEmailStatusMessage("Your Gmail account is now verified.");
      } else {
        setEmailVerificationStatus("error");
        setEmailStatusMessage("Email not verified yet. Please check your inbox and click the verification link.");
      }
    } catch (err) {
      setEmailVerificationStatus("error");
      setEmailStatusMessage("Unable to check verification status. Please try again.");
    }
  };

  const handlePublish = () => {
    if (id) {
      navigate(`/host/listing-editor/${id}`);
      return;
    }
    navigate(`/host/create-listing/publish`);
  };

  return (
    <main className="host-shell">
      <Navbar
        profilePhotoURL={profilePhotoURL}
        profileInitial={profileInitial}
        onMenuToggle={() => setMenuOpen((value) => !value)}
        menuOpen={menuOpen}
        homePath="/host"
        isHost
      />

      {menuOpen && (
        <div className="guest-menu-dropdown guest-menu-dropdown-fixed">
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

          <button type="button" className="menu-item menu-item-icon" onClick={() => auth.signOut()}> 
            <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      )}

      <section className="verify-listing-wrapper">
        <div className="verify-listing-card verify-listing-form-card">
          <div className="verify-listing-action-row">
            <button
              type="button"
              className="verify-listing-back-button"
              onClick={() => navigate(id ? `/host/listing-editor/${id}` : "/host")}
            >
              ← Back
            </button>
          </div>

          <div className="verify-listing-header">
            <div>
              <p className="eyebrow">Verify listing contact</p>
              <h1>Which number can guests use to contact you?</h1>
              <p className="verify-listing-copy">
                We’ll send you booking requests, reminders, and other notifications. This number should be able to receive texts or calls.
              </p>
            </div>
          </div>

          <form className="verify-listing-form" onSubmit={(event) => event.preventDefault()}>
            <div id="recaptcha-container" style={{ position: "absolute", left: "-9999px", visibility: "hidden" }} />
            <label className="field">
              <span>Country code</span>
              <select value={countryCode} onChange={(event) => setCountryCode(event.target.value)}>
                {COUNTRY_CODES.map((country) => (
                  <option key={`${country.code}-${country.name}`} value={country.code}>
                    {`${country.name} (${country.code})`}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Phone number</span>
              <div className="verify-phone-input">
                <div className="verify-phone-code">{countryCode}</div>
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  required
                />
              </div>
            </label>

            <button
              type="button"
              className="auth-button"
              onClick={handleContinue}
              disabled={!canContinue || phoneSending}
            >
              {phoneSending ? "Sending..." : "Continue"}
            </button>

            {showCodeInput && (
              <>
                <label className="field">
                  <span>Verification code</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter the code sent to your phone"
                    value={verificationInput}
                    onChange={(event) => setVerificationInput(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="auth-button"
                  onClick={handleVerify}
                  disabled={!canVerify}
                >
                  Verify code
                </button>
                <button
                  type="button"
                  className="verify-inline-link"
                  onClick={handlePhoneResend}
                >
                  Resend text
                </button>
              </>
            )}

            {statusMessage && (
              <div className={`status-message ${verificationStatus === "error" ? "error" : "success"}`}>
                {statusMessage}
              </div>
            )}

            <div className="verify-divider">
              <span>OR</span>
            </div>

            <div className="verify-section-card">
              <div className="verify-section-header">
                <p className="eyebrow">Verify Gmail account</p>
                <p className="verify-section-copy">
                  We’ll send a verification link to your logged-in Gmail address. Click the link in the message to complete verification.
                </p>
              </div>

              {emailVerified ? (
                <div className="status-message success">
                  Your Gmail account is already verified.
                </div>
              ) : (
                <>
                  <label className="field verify-email-copy">
                    <span>Logged-in Gmail</span>
                    <input
                      type="email"
                      value={loginEmail}
                      readOnly={!emailEditable}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      onDoubleClick={() => {
                        setEmailEditable(true);
                        setTimeout(() => emailInputRef.current?.focus(), 0);
                      }}
                      onBlur={() => setEmailEditable(false)}
                      ref={emailInputRef}
                      className={emailEditable ? "editable-email-input" : "readonly-email-input"}
                    />
                  </label>

                  <label className="field">
                    <span>Confirm password</span>
                    <input
                      type="password"
                      placeholder="Enter your password"
                      value={emailPassword}
                      onChange={(event) => setEmailPassword(event.target.value)}
                    />
                  </label>

                  <button
                    type="button"
                    className="auth-button"
                    onClick={handleEmailContinue}
                    disabled={!canEmailContinue}
                  >
                    Continue
                  </button>

                  {emailLinkSent && (
                    <div className="email-link-sent">
                      <p className="verify-section-copy">A verification email was sent. Open your inbox, click the link, then return here.</p>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button type="button" className="auth-button" onClick={handleCheckEmailVerified}>I've verified</button>
                        <button type="button" className="verify-inline-link" onClick={handleEmailResend}>Resend verification email</button>
                      </div>
                    </div>
                  )}

                  {emailStatusMessage && (
                    <div className={`status-message ${emailVerificationStatus === "error" ? "error" : "success"}`}>
                      {emailStatusMessage}
                    </div>
                  )}
                </>
              )}
            </div>
          </form>
        </div>

        <aside className="verify-listing-summary-card">
          {listingLoading ? (
            <div className="listing-summary-placeholder">Loading listing details…</div>
          ) : listing ? (
            <div className="listing-summary-inner">
              <div className="listing-summary-image-wrapper">
                <img
                  src={listing.coverPhotoUrl || listing.photoUrls?.[0] || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop"}
                  alt={listing.listingTitle || "Listing cover"}
                  className="listing-summary-image"
                />
              </div>
              <span className="verify-summary-label">Selected listing</span>
              <h2 className="verify-summary-title">{listing.listingTitle || "Untitled listing"}</h2>
              <p className="verify-summary-meta">
                {listing.selectedType || listing.listingType || "Property"}
                {listing.addressDetails?.city ? ` • ${listing.addressDetails.city}` : ""}
              </p>
              {listing.addressDetails?.neighborhood && (
                <p className="verify-summary-subtext">{listing.addressDetails.neighborhood}</p>
              )}
              {emailVerified && (
                <div style={{ marginTop: 24 }}>
                  <button type="button" className="auth-button" style={{ marginTop: 16, width: '100%' }} onClick={handlePublish}>
                    Publish
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="listing-summary-placeholder">
              No listing selected. Open a listing from the Host listings screen to preview it here.
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

export default VerifyListing;


