/**
 * User-facing API validation copy (Phase 2 UX writing).
 * Prefer these in route handlers so clients never see bare "Invalid …" shame language.
 */
export const API_VALIDATION = {
  JSON_UNREADABLE: "We couldn't read that request. Refresh the page and try again.",
  APPLICATION_JSON: "We couldn't read your application data. Refresh the page and try again.",
  ORGANIZATION_ID: "We couldn't match that organization. Open it again from your list or dashboard.",
  EMAIL_SHAPE: "That email doesn't look right. Check for typos and use a format like name@example.com.",
  REFERRAL_FIELDS: "Some referral fields need another look. Check the form and try again.",
  FILE_GENERIC: "That file didn't pass validation. Try PDF, JPG, or PNG under the size limit.",
  GEOCODE_UPSTREAM: "Address lookup returned an unexpected response. Try again in a moment.",
  REFERRAL_PAYLOAD: "Some referral information doesn't match what we need. Review the form and try again.",
  PROFILE_STATUS: "That profile status isn't recognized. Choose a status from the list.",
  ROUTE_ID: "That link or ID doesn't look right. Go back and try again.",
  FIELDS_GENERIC: "Some fields need another look. Check the form and try again.",
  TRANSLATE_LANG: "Choose English (en) or Spanish (es) for translation.",
  CATALOG_ENTRY: "That directory entry isn't available for signup. Choose another organization.",
} as const;
