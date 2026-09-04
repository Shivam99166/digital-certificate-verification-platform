import { GoogleLogin } from "@react-oauth/google";
import api from "../services/api";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/**
 * Renders a Google Sign-In button (or nothing if VITE_GOOGLE_CLIENT_ID is not set).
 *
 * @param {object}   props
 * @param {string}   [props.text]         "signin_with" | "signup_with" | "continue_with"
 * @param {string}   [props.role]         Role hint for new account creation ("recipient")
 * @param {Function} props.onSuccess      Called with (token, user) after successful auth
 * @param {Function} [props.onError]      Called with (errorMessage) on failure
 */
function GoogleAuthButton({ text = "signin_with", role = "recipient", onSuccess, onError }) {
  if (!GOOGLE_CLIENT_ID) return null;

  const handleSuccess = async (credentialResponse) => {
    try {
      const res = await api.post("/auth/google", {
        credential: credentialResponse.credential,
        role,
      });
      onSuccess?.(res.data.token, res.data.user);
    } catch (err) {
      const msg = err.response?.data?.message || "Google sign-in failed. Please try again.";
      onError?.(msg);
    }
  };

  const handleError = () => {
    onError?.("Google sign-in was cancelled or failed. Please try again.");
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={handleError}
      theme="filled_black"
      shape="rectangular"
      text={text}
      width="100%"
      useOneTap={false}
    />
  );
}

export default GoogleAuthButton;
