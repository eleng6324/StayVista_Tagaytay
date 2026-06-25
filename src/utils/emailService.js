import emailjs from "@emailjs/browser";

// Support both Vite and Create React App environment variable styles.
const runtimeEnv = {
  ...(typeof process !== "undefined" && process.env ? process.env : {}),
  ...(typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {})
};

const hasCraEnv = Boolean(
  runtimeEnv.REACT_APP_EMAILJS_SERVICE_ID ||
  runtimeEnv.REACT_APP_EMAILJS_PUBLIC_KEY ||
  runtimeEnv.REACT_APP_EMAILJS_GUEST_TEMPLATE_ID ||
  runtimeEnv.REACT_APP_EMAILJS_HOST_TEMPLATE_ID
);
const hasViteEnv = Boolean(
  runtimeEnv.VITE_EMAILJS_SERVICE_ID ||
  runtimeEnv.VITE_EMAILJS_PUBLIC_KEY ||
  runtimeEnv.VITE_EMAILJS_GUEST_TEMPLATE_ID ||
  runtimeEnv.VITE_EMAILJS_HOST_TEMPLATE_ID
);
const envType = hasCraEnv ? "CRA" : hasViteEnv ? "VITE" : "UNKNOWN";

const SERVICE_ID =
  runtimeEnv.VITE_EMAILJS_SERVICE_ID ||
  runtimeEnv.REACT_APP_EMAILJS_SERVICE_ID ||
  "service_8vu7wli";

const PUBLIC_KEY =
  runtimeEnv.VITE_EMAILJS_PUBLIC_KEY ||
  runtimeEnv.REACT_APP_EMAILJS_PUBLIC_KEY ||
  "kkGkqNWe3QckHCss1";

const TEMPLATE_GUEST =
  runtimeEnv.VITE_EMAILJS_GUEST_TEMPLATE_ID ||
  runtimeEnv.REACT_APP_EMAILJS_GUEST_TEMPLATE_ID ||
  "template_8zfyu5s";

const TEMPLATE_HOST =
  runtimeEnv.VITE_EMAILJS_HOST_TEMPLATE_ID ||
  runtimeEnv.REACT_APP_EMAILJS_HOST_TEMPLATE_ID ||
  "template_6xe4g0f";

const HOST_EMAIL =
  runtimeEnv.VITE_HOST_EMAIL ||
  runtimeEnv.REACT_APP_HOST_EMAIL ||
  "host@stayvista-tagaytay.com";
// Initialize EmailJS once.
try {
  if (PUBLIC_KEY) {
    emailjs.init(PUBLIC_KEY);
    console.info("EmailJS initialized with provided public key.");
  } else {
    console.warn("EmailJS public key not provided. EmailJS not initialized.");
  }
} catch (err) {
  console.error("EmailJS initialization error:", err);
}

function isEmailConfigured(templateName) {
  const missingConfig = {
    SERVICE_ID: !SERVICE_ID,
    PUBLIC_KEY: !PUBLIC_KEY,
    TEMPLATE_ID: !templateName
  };

  if (missingConfig.SERVICE_ID || missingConfig.PUBLIC_KEY || missingConfig.TEMPLATE_ID) {
    console.warn(
      "EmailJS missing config. Please add EmailJS env vars and restart the dev server.",
      {
        envType,
        missingConfig,
        requiredVars: envType === "VITE"
          ? [
              "VITE_EMAILJS_SERVICE_ID",
              "VITE_EMAILJS_PUBLIC_KEY",
              "VITE_EMAILJS_GUEST_TEMPLATE_ID",
              "VITE_EMAILJS_HOST_TEMPLATE_ID"
            ]
          : [
              "REACT_APP_EMAILJS_SERVICE_ID",
              "REACT_APP_EMAILJS_PUBLIC_KEY",
              "REACT_APP_EMAILJS_GUEST_TEMPLATE_ID",
              "REACT_APP_EMAILJS_HOST_TEMPLATE_ID"
            ]
      }
    );
    return false;
  }

  return true;
}

export async function sendEmail(templateId, templateParams) {
  if (!isEmailConfigured(templateId)) {
    return Promise.resolve({ status: "skipped", reason: "email-config-missing" });
  }

  try {
    const result = await emailjs.send(SERVICE_ID, templateId, templateParams, PUBLIC_KEY);
    console.info("EmailJS send success", { templateId, to: templateParams?.to_email, result });
    return result;
  } catch (error) {
    console.error("EmailJS send failed", { templateId, params: templateParams, error });
    throw error;
  }
}

/**
 * Send email to the guest using a reusable dynamic guest template.
 * This template is used for payment success, approval, and rejection.
 */
export async function sendGuestEmail(booking, emailTitle, emailMessage) {
  if (!booking?.guestEmail) {
    console.warn("Guest email is missing. Skipping guest email.");
    return;
  }

console.log("BOOKING DATA:", booking);

  return sendEmail(TEMPLATE_GUEST, {
    to_email: booking.guestEmail,
    recipient_email: booking.guestEmail,
    guest_email: booking.guestEmail,
    guest_name: booking.guestName,
    booking_id: booking.bookingId || booking.id,
    room_name: booking.listingTitle,
    amount: booking.amount,
    check_in: booking.checkInDate,
    check_out: booking.checkOutDate,
    guests: booking.guestCount || booking.guests || 1,
    booking_status: booking.status,
    email_title: emailTitle,
    email_message: emailMessage
  });
}

export async function sendGuestPaymentPendingEmail(booking) {
  return sendGuestEmail(
    booking,
    "Payment Successful",
    "Your payment was received successfully and is now pending host approval."
  );
}

export async function sendGuestBookingConfirmedEmail(booking) {
  return sendGuestEmail(
    booking,
    "Booking Confirmed",
    "Your booking has been approved and confirmed by the host."
  );
}

export async function sendGuestBookingRejectedEmail(booking) {
  return sendGuestEmail(
    booking,
    "Booking Rejected",
    "Unfortunately, your booking request was not approved by the host."
  );
}

/**
 * Send host notification using the host/admin template.
 * This template only sends booking/payment details.
 */
export async function sendHostNewBookingEmail(booking) {
  const hostEmail = booking.hostEmail || HOST_EMAIL;
  if (!hostEmail) {
    console.warn("Host email is missing. Skipping host notification email.");
    return;
  }

  return sendEmail(TEMPLATE_HOST, {
    to_email: hostEmail,
    recipient_email: hostEmail,
    host_email: hostEmail,
    guest_name: booking.guestName,
    guest_email: booking.guestEmail,
    phone_number: booking.phoneNumber,
    booking_id: booking.bookingId || booking.id,
    room_name: booking.listingTitle,
    check_in: booking.checkInDate,
    check_out: booking.checkOutDate,
    guests: booking.guestCount || booking.guests || 1,
    amount: booking.amount
  });
}
