import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CustomerDashboard from "./pages/CustomerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import TruckRegistration from "./pages/TruckRegistration";
import TruckDashboard from "./pages/TruckDashboard";

function App() {
  return (
    <Routes>

      <Route
        path="/"
        element={<Login />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/signup"
        element={<Signup />}
      />

      <Route
        path="/customer-dashboard"
        element={<CustomerDashboard />}
      />

      <Route
        path="/admin-dashboard"
        element={<AdminDashboard />}
      />

       <Route
          path="/truck-registration"
          element={
            <TruckRegistration />
          }
        />
        <Route
    path="/truck-dashboard"
    element={<TruckDashboard />}
/>

    </Routes>
  );
}

export default App;