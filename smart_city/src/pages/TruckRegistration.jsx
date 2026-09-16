
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import "../styles/TruckRegistration.css";

function TruckRegistration() {
  const navigate = useNavigate();

  const [driverName, setDriverName] = useState("");
  const [truckId, setTruckId] = useState("");
  const [truckNumber, setTruckNumber] = useState("");
  const [capacity, setCapacity] = useState("5000");

  const [depots, setDepots] = useState([]);
  const [depotId, setDepotId] = useState("");

  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  // =====================================================
  // FETCH TRUCK DEPOTS
  // =====================================================

  useEffect(() => {
    const fetchDepots = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await axios.get(
          "http://localhost:5000/api/depots/truck-depots",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setDepots(response.data.depots || []);
      } catch (error) {
        console.log("FETCH TRUCK DEPOTS ERROR:", error);

        alert("Failed to load truck depots");
      } finally {
        setLoading(false);
      }
    };

    fetchDepots();
  }, []);

  // =====================================================
  // REGISTER TRUCK
  // =====================================================

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!depotId) {
      alert("Please select a depot");
      return;
    }

    try {
      setRegistering(true);

      const token = localStorage.getItem("token");

      const response = await axios.post(
        "http://localhost:5000/api/trucks/register",
        {
          driverName: driverName.trim(),
          truckId: truckId.trim(),
          truckNumber: truckNumber.trim(),
          capacity: Number(capacity),
          depotId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert(response.data.message);

      navigate("/truck-dashboard");
    } catch (error) {
      console.log("TRUCK REGISTRATION ERROR:", error);

      alert(
        error.response?.data?.message ||
          "Truck registration failed"
      );
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="truck-registration-page">

      <div className="truck-registration-card">

        {/* HEADER */}

        <div className="truck-registration-header">

          <div className="truck-registration-icon">
            🚛
          </div>

          <h1>Register Your Truck</h1>

          <p>
            Enter your driver and truck details to
            register the vehicle with City Bin.
          </p>

        </div>


        {/* FORM */}

        <form onSubmit={handleRegister}>

          {/* DRIVER NAME */}

          <div className="form-group">

            <label>
              Driver Name
            </label>

            <input
              id="driverName"
              type="text"
              placeholder="Enter driver name"
              value={driverName}
              onChange={(e) =>
                setDriverName(e.target.value)
              }
              required
            />

          </div>


          {/* TRUCK ID */}

          <div className="form-group">

            <label htmlFor="truckId">
              Truck ID
            </label>

            <input
              id="truckId"
              type="text"
              placeholder="Example: TRUCK-001"
              value={truckId}
              onChange={(e) =>
                setTruckId(e.target.value)
              }
              required
            />

          </div>


          {/* TRUCK NUMBER */}

          <div className="form-group">

            <label htmlFor="truckNumber">
              Vehicle Registration Number
            </label>

            <input
              id="truckNumber"
              type="text"
              placeholder="Example: TN38AB1234"
              value={truckNumber}
              onChange={(e) =>
                setTruckNumber(e.target.value)
              }
              required
            />

          </div>


          {/* CAPACITY */}

          <div className="form-group">

            <label htmlFor="capacity">
              Truck Capacity
            </label>

            <div className="input-with-unit">

              <input
                id="capacity"
                type="number"
                value={capacity}
                onChange={(e) =>
                  setCapacity(e.target.value)
                }
                min="1"
                required
              />

              <span>kg</span>

            </div>

          </div>


          {/* DEPOT */}

          <div className="form-group">

            <label htmlFor="depot">
              Select Truck Depot
            </label>

            {loading ? (

              <div className="form-message">
                Loading depots...
              </div>

            ) : depots.length === 0 ? (

              <div className="form-message">
                No truck depots are currently available.
              </div>

            ) : (

              <select
                id="depot"
                value={depotId}
                onChange={(e) =>
                  setDepotId(e.target.value)
                }
                required
              >

                <option value="">
                  Select Depot
                </option>

                {depots.map((depot) => (

                  <option
                    key={depot._id}
                    value={depot._id}
                  >
                    {depot.name}
                  </option>

                ))}

              </select>

            )}

          </div>


          {/* BUTTON */}

          <button
            type="submit"
            disabled={registering || loading}
          >

            {registering
              ? "Registering..."
              : "Register Truck"}

          </button>

        </form>

      </div>

    </div>
  );
}

export default TruckRegistration;

