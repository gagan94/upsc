const GENERIC = "Something went wrong. Please try again.";

export function authErrorMessage(code: string | undefined | null): string {
  switch (code) {
    case "invalid_credentials":
      return "Email or password is incorrect";
    case "user_already_exists":
      return "An account with this email already exists";
    case "weak_password":
      return "Choose a stronger password (at least 12 characters)";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Please wait a minute and try again.";
    case "oauth_failed":
      return "Google sign-in did not complete. Please try again.";
    default:
      return GENERIC;
  }
}
