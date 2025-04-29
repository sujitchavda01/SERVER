import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";  // Corrected import
import { toast } from "react-toastify";

const useAutoLogoutLogic = () => {
  console.log("Hello");
  const navigate = useNavigate();

  useEffect(() => {
    // Get token from local storage
    const token = localStorage.getItem("token");

    if (!token) return; // If no token, no need to proceed

    // Decode the token to get expiration time
    const decodedToken = jwtDecode(token);
    const expirationTime = decodedToken.exp * 1000;
    const currentTime = Date.now();
    const remainingTime = expirationTime - currentTime;

    console.log("Decoded Token:", decodedToken);
    console.log("Expiration Time:", expirationTime);

    if (remainingTime <= 0) {
      // Remove token from localStorage to log out the user
      localStorage.removeItem("token");
      toast.error("Request Timed out. Please login again.", {
        position: "top-center",
        autoClose: 3000,
      });

      // Delay the redirect to login page
      setTimeout(() => {
        navigate("/login");
      }, 400);  // Wait for 3 seconds before navigating
    } else {
      // If the session is still active, set a timeout to auto logout when it's expired
      const timeout = setTimeout(() => {
        localStorage.removeItem("token");
        toast.error("Request Timed out. Please login again.", {
          position: "top-center",
          autoClose: 3000,
        });

        // Delay the redirect to login page
        setTimeout(() => {
          navigate("/login");
        }, 400);  // Wait for 3 seconds before navigating
      }, remainingTime);

      return () => clearTimeout(timeout); // Cleanup on unmount
    }
  }, [navigate]);
};

export default useAutoLogoutLogic;
