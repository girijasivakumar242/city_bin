import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/Signup.css";

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("customer");

  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    console.log("SIGNUP DATA:", {
    email,
    password,
    confirmPassword,
    role,
  });

    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/signup",
        {
          email,
          password,
          confirmPassword,
          role,
        }
      );

      alert(response.data.message);

      navigate("/login");

    } catch (error) {
      console.log(error);

      alert(
        error.response?.data?.message ||
        "Signup failed"
      );
    }
  };

  return (
    <div className="signup-page">

      {/* Background decorations */}
      <div className="signup-bg-shape signup-shape-one"></div>
      <div className="signup-bg-shape signup-shape-two"></div>

      {/* =========================================
          LEFT INFORMATION SECTION
      ========================================= */}

      <div className="signup-info">

        <div className="info-brand">
          <div className="info-logo">♻</div>

          <h1>CITY BIN</h1>
        </div>

        <h2>
          Smarter Waste.
          <br />
          Cleaner Cities.
        </h2>

        <p className="info-description">
          City Bin is a smart waste management platform
          that helps communities report waste problems,
          track complaints and improve waste collection.
        </p>


        {/* Feature 1 */}

        <div className="feature-card">

          <div className="feature-icon">
            ♻
          </div>

          <div>
            <h3>Report Waste</h3>

            <p>
              Report overflowing bins and
              waste-related problems easily.
            </p>
          </div>

        </div>


        {/* Feature 2 */}

        <div className="feature-card">

          <div className="feature-icon">
            📍
          </div>

          <div>
            <h3>Track Complaints</h3>

            <p>
              Stay updated on the status
              of your reported complaints.
            </p>
          </div>

        </div>


        {/* Feature 3 */}

        <div className="feature-card">

          <div className="feature-icon">
            🚛
          </div>

          <div>
            <h3>Smart Collection</h3>

            <p>
              Help optimize waste collection
              using smart bin information.
            </p>
          </div>

        </div>


        <div className="info-footer">
          Together for cleaner and smarter communities.
        </div>

      </div>


      {/* =========================================
          SIGNUP SECTION
      ========================================= */}

      <div className="signup-card">

        <div className="signup-brand">

          <h1>CITY BIN</h1>

          <p>
            Smart Waste Management
          </p>

        </div>


        <h2>Create Account</h2>

        <p className="signup-subtitle">
          Join City Bin and make a difference
        </p>


        <form onSubmit={handleSignup}>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            required
          />


          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            required
          />


          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(e.target.value)
            }
            required
          />


          <select
            value={role}
            onChange={(e) =>
              setRole(e.target.value)
            }
          >
            <option value="customer">
              Customer
            </option>

            <option value="truck">
              Truck User
            </option>
          </select>


          <button type="submit">
            Create Account
          </button>

        </form>


        <p className="signup-account-text">

          Already have an account?{" "}

          <span
            onClick={() =>
              navigate("/login")
            }
          >
            Login
          </span>

        </p>

      </div>

    </div>
  );
}

export default Signup;