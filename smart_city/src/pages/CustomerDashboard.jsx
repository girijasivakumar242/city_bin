import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/CustomerDashboard.css";

function CustomerDashboard() {

  const [location, setLocation] = useState("");
  const [binId, setBinId] = useState("");
  const [description, setDescription] = useState("");
  const [media, setMedia] = useState(null);

  const [loading, setLoading] = useState(false);

  const [complaints, setComplaints] = useState([]);
  const [complaintsLoading, setComplaintsLoading] = useState(true);


  const getCustomerId = () => {

    const token = localStorage.getItem("token");

    if (!token) {
      return null;
    }

    try {

      const tokenPayload = JSON.parse(
        atob(token.split(".")[1])
      );

      return tokenPayload.userId;

    } catch (error) {

      console.log("TOKEN ERROR:", error);

      return null;
    }
  };




 const fetchMyComplaints = async () => {

  const customerId = getCustomerId();

  console.log("CUSTOMER ID FROM TOKEN:", customerId);

  if (!customerId) {
    setComplaintsLoading(false);
    return;
  }

  try {

    const url =
      `http://localhost:5000/api/complaints/customer/${customerId}`;

    console.log("REQUEST URL:", url);

    const response = await axios.get(url);

    console.log("CUSTOMER COMPLAINT RESPONSE:", response.data);

    setComplaints(response.data.complaints);

  } catch (error) {

    console.log(
      "FETCH CUSTOMER COMPLAINTS ERROR:",
      error.response?.data || error
    );

  } finally {

    setComplaintsLoading(false);

  }
};


  // Fetch complaints when dashboard opens
  useEffect(() => {

    fetchMyComplaints();

  }, []);


  // ================= SUBMIT COMPLAINT =================

 // ================= SUBMIT COMPLAINT =================

const handleSubmit = async (e) => {
  e.preventDefault();

  const token = localStorage.getItem("token");

  if (!token) {
    alert("Please login first");
    return;
  }

  try {
    setLoading(true);

    const tokenPayload = JSON.parse(
      atob(token.split(".")[1])
    );

    const customerId = tokenPayload.userId;

    console.log("CUSTOMER ID FROM TOKEN:", customerId);

    // ================= FORM DATA =================

    const formData = new FormData();

    formData.append("customerId", customerId);
    formData.append("location", location);
    formData.append("binId", binId);
    formData.append("description", description);

    if (media) {
      formData.append("media", media);
    }

    // ================= SUBMIT =================

    const response = await axios.post(
      "http://localhost:5000/api/complaints",
      formData
    );

    alert(response.data.message);

    // Clear form
    setLocation("");
    setBinId("");
    setDescription("");
    setMedia(null);

  } catch (error) {

    console.log("COMPLAINT ERROR:", error);

    alert(
      error.response?.data?.message ||
      "Failed to submit complaint"
    );

  } finally {
    setLoading(false);
  }
};
  const getStatusClass = (status) => {

    switch (status) {

      case "Resolved":
        return "status-resolved";

      case "In Progress":
        return "status-progress";

      case "Assigned":
        return "status-assigned";

      default:
        return "status-pending";
    }
  };


  return (

    <div className="customer-dashboard">


      {/* ================= HEADER ================= */}

      <header className="customer-header">

        <div className="customer-brand">

          <div className="customer-logo">
            ♻
          </div>

          <div>

            <h1>CITY BIN</h1>

            <span>
              Smart Waste Management
            </span>

          </div>

        </div>


        <div className="customer-user">

          <span>
            Welcome, Customer
          </span>

          <button>
            Logout
          </button>

        </div>

      </header>



      {/* ================= MAIN ================= */}

      <main className="customer-main">


        {/* ================= INTRO ================= */}

        <div className="complaint-intro">

          <span className="complaint-badge">
            WASTE REPORTING
          </span>

          <h2>
            Report a Waste Problem
          </h2>

          <p>
            Help us keep your community clean.
            Report overflowing bins or other
            waste-related problems.
          </p>

        </div>



        {/* ================= FORM ================= */}

        <div className="complaint-card">

          <form onSubmit={handleSubmit}>


            {/* Location */}

            <div className="form-group">

              <label>
                Location <span>*</span>
              </label>

              <input
                type="text"
                placeholder="Enter the waste location"
                value={location}
                onChange={(e) =>
                  setLocation(e.target.value)
                }
                required
              />

            </div>



            {/* Bin ID */}

            <div className="form-group">

              <label>
                Bin ID
                <small> (Optional)</small>
              </label>

              <input
                type="text"
                placeholder="Example: BIN-102"
                value={binId}
                onChange={(e) =>
                  setBinId(e.target.value)
                }
              />

            </div>



            {/* Description */}

            <div className="form-group">

              <label>
                Complaint Description
                <span>*</span>
              </label>

              <textarea
                placeholder="Describe the waste problem..."
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                required
              />

            </div>



            {/* Media */}

            <div className="form-group">

              <label>
                Attach Evidence
                <small> (Optional)</small>
              </label>

              <label className="upload-box">

                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) =>
                    setMedia(e.target.files[0])
                  }
                />

                <div className="upload-content">

                  <div className="upload-icon">
                    📎
                  </div>

                  <strong>
                    Click to upload
                  </strong>

                  <p>
                    Image or video
                  </p>

                  <small>
                    JPG, PNG, MP4
                  </small>

                </div>

              </label>


              {media && (

                <p className="selected-file">
                  Selected: {media.name}
                </p>

              )}

            </div>



            {/* Submit */}

            <button
              type="submit"
              className="submit-complaint"
              disabled={loading}
            >

              {loading
                ? "Submitting..."
                : "Submit Complaint"}

            </button>

          </form>

        </div>



        {/* ================================================= */}
        {/* MY COMPLAINTS */}
        {/* ================================================= */}

        <section className="my-complaints">

          <div className="my-complaints-header">

            <div>

              <span className="complaint-badge">
                MY REPORTS
              </span>

              <h2>
                My Complaints
              </h2>

              <p>
                Track the status of your reported
                waste problems.
              </p>

            </div>

          </div>



          {/* Loading */}

          {complaintsLoading ? (

            <div className="complaints-loading">
              Loading your complaints...
            </div>

          ) : complaints.length === 0 ? (

            <div className="no-customer-complaints">

              <div>
                📋
              </div>

              <h3>
                No complaints yet
              </h3>

              <p>
                Your submitted complaints will
                appear here.
              </p>

            </div>

          ) : (

            <div className="customer-complaints-list">

              {complaints.map((complaint) => (

                <div
                  className="customer-complaint-card"
                  key={complaint._id}
                >


                  {/* Header */}

                  <div className="customer-complaint-top">

                    <div>

                      <span>
                        Complaint
                      </span>

                    </div>


                    {/* STATUS */}

                    <span
                      className={`customer-status ${getStatusClass(
                        complaint.status
                      )}`}
                    >

                      {complaint.status}

                    </span>

                  </div>



                  {/* Details */}

                  <div className="customer-complaint-details">

                    <div>

                      <span>
                        📍 Location
                      </span>

                      <strong>
                        {complaint.location}
                      </strong>

                    </div>


                    <div>

                      <span>
                        🗑️ Bin ID
                      </span>

                      <strong>
                        {complaint.binId ||
                          "Not provided"}
                      </strong>

                    </div>


                    <div>

                      <span>
                        📅 Reported
                      </span>

                      <strong>
                        {new Date(
                          complaint.createdAt
                        ).toLocaleDateString()}
                      </strong>

                    </div>

                  </div>



                  {/* Description */}

                  <div className="customer-description">

                    <span>
                      Complaint
                    </span>

                    <p>
                      {complaint.description}
                    </p>

                  </div>



                  {/* Resolved Message */}

                  {complaint.status === "Resolved" && (

                    <div className="resolved-message">

                      <span className="resolved-icon">
                        ✓
                      </span>

                      <div>

                        <strong>
                          Complaint Resolved
                        </strong>

                        <p>
                          Your complaint has been
                          resolved by the City Bin
                          management team.
                        </p>

                      </div>

                    </div>

                  )}

                </div>

              ))}

            </div>

          )}

        </section>


      </main>

    </div>

  );
}

export default CustomerDashboard;