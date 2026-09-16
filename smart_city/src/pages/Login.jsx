import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";

function Login() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();


  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = async (e) => {

    e.preventDefault();

    try {

      const response = await axios.post(
        "http://localhost:5000/api/auth/login",
        {
          email,
          password,
        }
      );


      // =================================================
      // GET LOGIN DATA
      // =================================================

      const {
        token,
        user,
      } = response.data;


      // IMPORTANT:
      // truckRegistered is inside user

      const truckRegistered =
        user.truckRegistered;


      console.log(
        "LOGIN RESPONSE:",
        response.data
      );

      console.log(
        "USER:",
        user
      );

      console.log(
        "USER ROLE:",
        user.role
      );

      console.log(
        "TRUCK REGISTERED:",
        truckRegistered
      );


      // =================================================
      // STORE LOGIN INFORMATION
      // =================================================

      localStorage.setItem(
        "token",
        token
      );

      localStorage.setItem(
        "role",
        user.role
      );

      localStorage.setItem(
        "userId",
        user.id
      );

      localStorage.setItem(
        "email",
        user.email
      );


      // Store truck registration status

      localStorage.setItem(
        "truckRegistered",
        String(truckRegistered)
      );


      // Store truck details if available

      if (user.truckId) {

        localStorage.setItem(
          "truckId",
          user.truckId
        );

      }

      if (user.depotId) {

        localStorage.setItem(
          "depotId",
          user.depotId
        );

      }


      alert("Login successful!");


      // =================================================
      // NAVIGATION BASED ON ROLE
      // =================================================

      if (user.role === "admin") {

        navigate("/admin-dashboard");

      }

      else if (user.role === "truck") {

        console.log(
          "Truck user registration status:",
          truckRegistered
        );


        // ---------------------------------------------
        // TRUCK ALREADY REGISTERED
        // ---------------------------------------------

        if (truckRegistered === true) {

          console.log(
            "Truck already registered."
          );

          navigate("/truck-dashboard");

        }

        // ---------------------------------------------
        // TRUCK NOT REGISTERED
        // ---------------------------------------------

        else {

          console.log(
            "Truck not registered."
          );

          navigate("/truck-registration");

        }

      }

      else if (user.role === "customer") {

        navigate("/customer-dashboard");

      }

    }

    catch (error) {

      console.log(
        "LOGIN ERROR:",
        error
      );

      alert(
        error.response?.data?.message ||
        "Login failed"
      );

    }

  };


  // =====================================================
  // UI
  // =====================================================

  return (

    <div className="login-page">

      {/* Background decorations */}

      <div className="login-bg-shape login-shape-one"></div>

      <div className="login-bg-shape login-shape-two"></div>

      <div className="login-bg-circle login-circle-one"></div>

      <div className="login-bg-circle login-circle-two"></div>


      {/* LOGIN CARD */}

      <div className="login-card">


        {/* BRAND */}

        <div className="login-brand">

          <h1>
            CITY BIN
          </h1>

          <p>
            Waste Management System
          </p>

        </div>


        {/* TITLE */}

        <h2>
          Welcome Back
        </h2>


        <p className="login-subtitle">

          Sign in to continue to your account

        </p>


        {/* LOGIN FORM */}

        <form onSubmit={handleLogin}>


          {/* EMAIL */}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            required
          />


          {/* PASSWORD */}

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            required
          />


          {/* LOGIN BUTTON */}

          <button type="submit">

            Login

          </button>

        </form>


        {/* SIGNUP */}

        <p className="login-account-text">

          Don't have an account?{" "}

          <span
            onClick={() =>
              navigate("/signup")
            }
          >

            Sign Up

          </span>

        </p>

      </div>

    </div>

  );

}

export default Login;