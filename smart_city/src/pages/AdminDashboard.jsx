import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/AdminDashboard.css";

import BinMap from "./BinMap";
import VirtualBin from "./VirtualBin";


function AdminDashboard() {

  // =====================================================
  // COMPLAINT STATES
  // =====================================================

  const [complaints, setComplaints] = useState([]);

  const [loading, setLoading] = useState(true);

  const [selectedMedia, setSelectedMedia] =
    useState(null);


  // =====================================================
  // BIN STATES
  // =====================================================

  const [bins, setBins] = useState([]);

  const [binsLoading, setBinsLoading] =
    useState(true);


  // =====================================================
  // DEPOT STATES
  // =====================================================

  const [depots, setDepots] = useState([]);

  const [depotsLoading, setDepotsLoading] =
    useState(true);


  // =====================================================
  // TRUCK POPUP STATE
  // =====================================================

  const [selectedTruck, setSelectedTruck] =
    useState(null);


  // =====================================================
  // MENU STATES
  // =====================================================

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [activePage, setActivePage] =
    useState("complaints");


  // =====================================================
  // FETCH COMPLAINTS
  // =====================================================

  const fetchComplaints = async () => {

    try {

      const response = await axios.get(
        "http://localhost:5000/api/complaints"
      );

      setComplaints(
        response.data.complaints || []
      );

    } catch (error) {

      console.log(
        "FETCH COMPLAINTS ERROR:",
        error
      );

      alert("Failed to load complaints");

    } finally {

      setLoading(false);

    }

  };


  // =====================================================
  // FETCH BINS
  // =====================================================

  const fetchBins = async () => {

    try {

      const response = await axios.get(
        "http://localhost:5000/api/bins/all"
      );

      console.log(
        "LATEST BIN DATA:",
        response.data
      );

      let binData = [];


      if (Array.isArray(response.data)) {

        binData = response.data;

      }

      else if (
        Array.isArray(response.data.bins)
      ) {

        binData =
          response.data.bins;

      }

      else if (
        Array.isArray(response.data.data)
      ) {

        binData =
          response.data.data;

      }


      setBins(binData);

    } catch (error) {

      console.log(
        "FETCH BINS ERROR:",
        error
      );

    } finally {

      setBinsLoading(false);

    }

  };


  // =====================================================
  // FETCH DEPOTS
  // =====================================================

  const fetchDepots = async () => {

    try {

      const response = await axios.get(
        "http://localhost:5000/api/depots/all"
      );

      console.log(
        "DEPOT DATA:",
        response.data
      );


      let depotData = [];


      if (Array.isArray(response.data)) {

        depotData =
          response.data;

      }

      else if (
        Array.isArray(response.data.depots)
      ) {

        depotData =
          response.data.depots;

      }

      else if (
        Array.isArray(response.data.data)
      ) {

        depotData =
          response.data.data;

      }


      setDepots(depotData);

    } catch (error) {

      console.log(
        "FETCH DEPOTS ERROR:",
        error
      );

    } finally {

      setDepotsLoading(false);

    }

  };


  // =====================================================
  // INITIAL DATA
  // =====================================================

  useEffect(() => {

    fetchComplaints();

    fetchBins();

    fetchDepots();

  }, []);


  // =====================================================
  // AUTO REFRESH BIN DATA
  // =====================================================

  useEffect(() => {

    const interval = setInterval(() => {

      fetchBins();

    }, 5000);


    return () => {

      clearInterval(interval);

    };

  }, []);


  // =====================================================
  // UPDATE COMPLAINT STATUS
  // =====================================================

  const updateStatus = async (
    complaintId,
    newStatus
  ) => {

    try {

      const response = await axios.put(

        `http://localhost:5000/api/complaints/${complaintId}/status`,

        {
          status: newStatus,
        }

      );


      alert(response.data.message);


      fetchComplaints();

    } catch (error) {

      console.log(
        "STATUS UPDATE ERROR:",
        error
      );


      alert(
        error.response?.data?.message ||
        "Failed to update status"
      );

    }

  };


  // =====================================================
  // OPEN MEDIA
  // =====================================================

  const openMedia = (
    mediaUrl,
    mediaType
  ) => {

    setSelectedMedia({
      url: mediaUrl,
      type: mediaType,
    });

  };


  // =====================================================
  // CLOSE MEDIA
  // =====================================================

  const closeMedia = () => {

    setSelectedMedia(null);

  };


  // =====================================================
  // OPEN TRUCK DETAILS
  // =====================================================

  const openTruckDetails = (truck) => {

    setSelectedTruck(truck);

  };


  // =====================================================
  // CLOSE TRUCK DETAILS
  // =====================================================

  const closeTruckDetails = () => {

    setSelectedTruck(null);

  };


  // =====================================================
  // MENU
  // =====================================================

  const openPage = (page) => {

    setActivePage(page);

    setMenuOpen(false);

  };


  // =====================================================
  // RETURN
  // =====================================================

  return (

    <div className="admin-dashboard">


      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <header className="admin-header">


        <div className="admin-brand">


          {/* HAMBURGER */}

          <button
            className="hamburger-btn"
            onClick={() =>
              setMenuOpen(!menuOpen)
            }
            aria-label="Open admin menu"
          >

            <span></span>
            <span></span>
            <span></span>

          </button>


          {/* LOGO */}

          <div className="admin-logo">
            ♻
          </div>


          <div className="brand-text">

            <h1>
              CITY BIN
            </h1>

            <span>
              Smart Waste Management
            </span>

          </div>


        </div>


        {/* ADMIN USER */}

        <div className="admin-user">


          <div className="admin-avatar">
            A
          </div>


          <div className="admin-user-info">

            <span className="welcome-text">
              Welcome
            </span>

            <strong>
              Admin
            </strong>

          </div>


          <button className="logout-btn">
            Logout
          </button>


        </div>


      </header>



      {/* ================================================= */}
      {/* OVERLAY */}
      {/* ================================================= */}

      {menuOpen && (

        <div
          className="sidebar-overlay"
          onClick={() =>
            setMenuOpen(false)
          }
        ></div>

      )}



      {/* ================================================= */}
      {/* SIDEBAR */}
      {/* ================================================= */}

      <aside
        className={`admin-sidebar ${
          menuOpen
            ? "sidebar-open"
            : ""
        }`}
      >


        {/* SIDEBAR HEADER */}

        <div className="sidebar-header">


          <div>

            <span className="sidebar-small-title">
              ADMIN PANEL
            </span>

            <h3>
              Navigation
            </h3>

          </div>


          <button
            className="sidebar-close"
            onClick={() =>
              setMenuOpen(false)
            }
          >
            ✕
          </button>


        </div>



        <div className="sidebar-menu">


          {/* CUSTOMER COMPLAINTS */}

          <button
            className={`sidebar-item ${
              activePage === "complaints"
                ? "sidebar-item-active"
                : ""
            }`}
            onClick={() =>
              openPage("complaints")
            }
          >

            <div className="sidebar-icon">
              📋
            </div>


            <div className="sidebar-item-text">

              <strong>
                Customer Complaints
              </strong>

              <span>
                Monitor reported complaints
              </span>

            </div>

          </button>



          {/* BIN MAP */}

          <button
            className={`sidebar-item ${
              activePage === "bins"
                ? "sidebar-item-active"
                : ""
            }`}
            onClick={() =>
              openPage("bins")
            }
          >

            <div className="sidebar-icon">
              🗺️
            </div>


            <div className="sidebar-item-text">

              <strong>
                Bin Map & Details
              </strong>

              <span>
                View waste bin locations
              </span>

            </div>

          </button>



          {/* VIRTUAL BIN */}

          <button
            className={`sidebar-item ${
              activePage === "virtual-bins"
                ? "sidebar-item-active"
                : ""
            }`}
            onClick={() =>
              openPage("virtual-bins")
            }
          >

            <div className="sidebar-icon">
              🗑️
            </div>


            <div className="sidebar-item-text">

              <strong>
                Virtual Bin
              </strong>

              <span>
                Monitor waste levels
              </span>

            </div>

          </button>



          {/* DEPOT & TRUCK MANAGEMENT */}

          <button
            className={`sidebar-item ${
              activePage === "depots"
                ? "sidebar-item-active"
                : ""
            }`}
            onClick={() =>
              openPage("depots")
            }
          >

            <div className="sidebar-icon">
              🚛
            </div>


            <div className="sidebar-item-text">

              <strong>
                Depot & Truck Management
              </strong>

              <span>
                View depots and registered trucks
              </span>

            </div>

          </button>



          {/* MORE FEATURES */}

          <div className="sidebar-coming-soon">

            <span>
              MORE FEATURES
            </span>

            <p>
              Route optimization and
              analytics can be added here.
            </p>

          </div>


        </div>


      </aside>



      {/* ================================================= */}
      {/* MAIN */}
      {/* ================================================= */}

      <main className="admin-main">


        {/* ================================================= */}
        {/* COMPLAINT PAGE */}
        {/* ================================================= */}

        {activePage === "complaints" && (

          <>


            <div className="admin-title">


              <div>

                <span className="admin-badge">
                  ADMIN DASHBOARD
                </span>

                <h2>
                  Waste Complaints
                </h2>

                <p>
                  Monitor and manage waste complaints
                  reported by customers.
                </p>

              </div>


              <div className="page-icon">
                📋
              </div>


            </div>



            <div className="complaints-section">


              {loading ? (

                <p className="loading">
                  Loading complaints...
                </p>


              ) : complaints.length === 0 ? (

                <div className="no-complaints">

                  <div className="empty-icon">
                    ✓
                  </div>

                  <h3>
                    No active complaints
                  </h3>

                  <p>
                    All customer complaints have
                    been resolved.
                  </p>

                </div>


              ) : (

                <div className="complaints-grid">


                  {complaints.map(
                    (complaint) => (

                      <div
                        className="complaint-card"
                        key={complaint._id}
                      >


                        <div className="complaint-header">


                          <div>

                            <span className="complaint-label">
                              WASTE COMPLAINT
                            </span>

                            <h3>
                              {complaint.location}
                            </h3>

                          </div>


                          <select
                            value={
                              complaint.status
                            }
                            onChange={(e) =>
                              updateStatus(
                                complaint._id,
                                e.target.value
                              )
                            }
                            className={`status-select ${
                              complaint.status
                                ?.toLowerCase()
                                .replace(
                                  " ",
                                  "-"
                                )
                            }`}
                          >

                            <option value="Pending">
                              Pending
                            </option>

                            <option value="Assigned">
                              Assigned
                            </option>

                            <option value="In Progress">
                              In Progress
                            </option>

                            <option value="Resolved">
                              Resolved
                            </option>

                          </select>


                        </div>



                        <div className="complaint-details">


                          <div className="detail">

                            <span>
                              📍 Location
                            </span>

                            <strong>
                              {complaint.location}
                            </strong>

                          </div>


                          <div className="detail">

                            <span>
                              🗑️ Bin ID
                            </span>

                            <strong>
                              {complaint.binId ||
                                "Not provided"}
                            </strong>

                          </div>


                          <div className="detail">

                            <span>
                              👤 Customer
                            </span>

                            <strong>
                              {complaint.customerId?.email ||
                                "Unknown"}
                            </strong>

                          </div>


                        </div>



                        <div className="description">

                          <span>
                            COMPLAINT
                          </span>

                          <p>
                            {complaint.description}
                          </p>

                        </div>



                        {complaint.mediaUrl && (

                          <div className="complaint-media">


                            <div className="media-heading">

                              <span>
                                📎 Evidence
                              </span>

                              <small>
                                Click to view
                              </small>

                            </div>



                            {complaint.mediaType ===
                              "image" && (

                              <div
                                className="media-thumbnail-wrapper"
                                onClick={() =>
                                  openMedia(
                                    complaint.mediaUrl,
                                    "image"
                                  )
                                }
                              >

                                <img
                                  src={
                                    complaint.mediaUrl
                                  }
                                  alt="Complaint evidence"
                                  className="media-thumbnail"
                                />

                                <div className="media-overlay">

                                  <span>
                                    🔍 View Image
                                  </span>

                                </div>

                              </div>

                            )}



                            {complaint.mediaType ===
                              "video" && (

                              <div
                                className="media-thumbnail-wrapper"
                                onClick={() =>
                                  openMedia(
                                    complaint.mediaUrl,
                                    "video"
                                  )
                                }
                              >

                                <video
                                  src={
                                    complaint.mediaUrl
                                  }
                                  className="media-thumbnail"
                                  muted
                                />

                                <div className="media-overlay">

                                  <span>
                                    ▶ View Video
                                  </span>

                                </div>

                              </div>

                            )}


                          </div>

                        )}



                        <div className="complaint-footer">

                          <span>

                            Reported on{" "}

                            {new Date(
                              complaint.createdAt
                            ).toLocaleDateString()}

                          </span>

                        </div>


                      </div>

                    )
                  )}


                </div>

              )}


            </div>


          </>

        )}



        {/* ================================================= */}
        {/* BIN MAP PAGE */}
        {/* ================================================= */}

        {activePage === "bins" && (

          <>


            <div className="admin-title bin-page-title">


              <div>

                <span className="admin-badge">
                  BIN MANAGEMENT
                </span>

                <h2>
                  Bin Map & Details
                </h2>

                <p>
                  View existing waste bins fetched
                  from OpenStreetMap.
                </p>

              </div>


              <div className="page-icon bin-page-icon">
                🗺️
              </div>


            </div>



            <div className="bin-map-card">


              <div className="bin-map-card-header">


                <div>

                  <h3>
                    Waste Bin Locations
                  </h3>

                  <p>
                    Existing bins available in the
                    selected area.
                  </p>

                </div>


                <div className="map-source-badge">

                  <span className="source-dot"></span>

                  OpenStreetMap

                </div>


              </div>



              <div className="bin-map-container">

                <BinMap />

              </div>


            </div>



            <div className="bin-info-section">


              <div className="bin-info-card">


                <div className="bin-info-icon">
                  🗑️
                </div>


                <div>

                  <span>
                    EXISTING BINS
                  </span>

                  <h3>
                    OSM Bins
                  </h3>

                  <p>
                    These bins are currently
                    fetched from OpenStreetMap.
                  </p>

                </div>


              </div>



              <div className="bin-info-card future-card">


                <div className="bin-info-icon">
                  📍
                </div>


                <div>

                  <span>
                    NEXT FEATURE
                  </span>

                  <h3>
                    Add New Bin
                  </h3>

                  <p>
                    Admin will be able to click on
                    the map and add a new bin location.
                  </p>

                </div>


              </div>


            </div>


          </>

        )}



        {/* ================================================= */}
        {/* VIRTUAL BIN PAGE */}
        {/* ================================================= */}

        {activePage === "virtual-bins" && (

          <>


            <div className="admin-title bin-page-title">


              <div>

                <span className="admin-badge">
                  VIRTUAL BIN MONITORING
                </span>

                <h2>
                  Waste Level Monitoring
                </h2>

                <p>
                  Monitor the current waste level
                  of connected bins.
                </p>

              </div>


              <div className="page-icon bin-page-icon">
                🗑️
              </div>


            </div>



            <div className="virtual-bins-section">


              {binsLoading ? (

                <p className="loading">
                  Loading bin data...
                </p>


              ) : bins.length === 0 ? (

                <div className="no-complaints">

                  <div className="empty-icon">
                    🗑️
                  </div>

                  <h3>
                    No bins available
                  </h3>

                  <p>
                    No bin data has been received
                    from the backend.
                  </p>

                </div>


              ) : (

                <div className="virtual-bins-grid">


                  {bins.map((bin) => (

                    <VirtualBin
                      key={
                        bin._id ||
                        bin.binId
                      }
                      bin={bin}
                    />

                  ))}


                </div>

              )}


            </div>


          </>

        )}



        {/* ================================================= */}
        {/* DEPOT & TRUCK MANAGEMENT PAGE */}
        {/* ================================================= */}

        {activePage === "depots" && (

          <>


            <div className="admin-title">


              <div>

                <span className="admin-badge">
                  DEPOT MANAGEMENT
                </span>

                <h2>
                  Depots & Trucks
                </h2>

                <p>
                  View waste management facilities
                  and their registered trucks.
                </p>

              </div>


              <div className="page-icon">
                🚛
              </div>


            </div>



            <div className="depots-section">


              {depotsLoading ? (

                <p className="loading">
                  Loading depots...
                </p>


              ) : depots.length === 0 ? (

                <div className="no-complaints">

                  <div className="empty-icon">
                    🚛
                  </div>

                  <h3>
                    No depots available
                  </h3>

                  <p>
                    No waste facilities have been
                    fetched from OpenStreetMap.
                  </p>

                </div>


              ) : (

                <div className="depots-grid">


                  {depots.map((depot) => {


                    const trucks =
                      Array.isArray(depot.trucks)
                        ? depot.trucks
                        : [];


                    return (

                      <div
                        className="depot-card"
                        key={depot._id}
                      >


                        {/* ================================= */}
                        {/* DEPOT HEADER */}
                        {/* ================================= */}

                        <div className="depot-card-header">


                          <div>

                            <span className="depot-label">
                              DEPOT / FACILITY
                            </span>

                            <h3>
                              {depot.name ||
                                "Unnamed Depot"}
                            </h3>

                          </div>


                          <div className="depot-icon">
                            ♻️
                          </div>


                        </div>



                        {/* ================================= */}
                        {/* DEPOT DETAILS */}
                        {/* ================================= */}

                        <div className="depot-details">


                          <div className="depot-detail">

                            <span>
                              🏭 Type
                            </span>

                            <strong>
                              {depot.type ||
                                "Unknown"}
                            </strong>

                          </div>


                          <div className="depot-detail">

                            <span>
                              📍 Latitude
                            </span>

                            <strong>
                              {depot.latitude ??
                                "N/A"}
                            </strong>

                          </div>


                          <div className="depot-detail">

                            <span>
                              📍 Longitude
                            </span>

                            <strong>
                              {depot.longitude ??
                                "N/A"}
                            </strong>

                          </div>


                          <div className="depot-detail">

                            <span>
                              🟢 Status
                            </span>

                            <strong>
                              {depot.status ||
                                "AVAILABLE"}
                            </strong>

                          </div>


                        </div>



                        {/* ================================= */}
                        {/* TRUCK SECTION */}
                        {/* ================================= */}

                        <div className="depot-trucks">


                          <div className="depot-trucks-header">


                            <div>

                              <span>
                                🚛 TRUCKS
                              </span>

                              <h4>
                                Registered Trucks
                              </h4>

                            </div>


                            <span className="truck-count">
                              {trucks.length}
                            </span>


                          </div>



                          {/* ================================= */}
                          {/* NO TRUCKS */}
                          {/* ================================= */}

                          {trucks.length === 0 ? (

                            <div className="empty-truck-area">


                              <div className="empty-truck-icon">
                                🚚
                              </div>


                              <p>
                                No trucks registered
                              </p>


                              <small>
                                Trucks registered by
                                drivers under this depot
                                will appear here.
                              </small>


                            </div>

                          ) : (


                            /* ================================= */
                            /* TRUCK LIST */
                            /* ================================= */

                            <div className="truck-list">

                              {trucks.map((truck) => (

                                <button
                                  className="truck-item truck-clickable"
                                  key={
                                    truck._id ||
                                    truck.truckId
                                  }
                                  onClick={() =>
                                    openTruckDetails(
                                      truck
                                    )
                                  }
                                >

                                  {/* TRUCK ICON */}

                                  <div className="truck-item-icon">
                                    🚛
                                  </div>


                                  {/* ONLY TRUCK ID */}

                                  <div className="truck-item-info">

                                    <span className="truck-id-label">
                                      TRUCK ID
                                    </span>

                                    <strong>
                                      {truck.truckId ||
                                        "Unknown Truck"}
                                    </strong>

                                    <span className="truck-view-hint">
                                      Click to view details
                                    </span>

                                     <div
    className={`truck-assignment-status ${
      truck.assignmentStatus === "ASSIGNED"
        ? "truck-assigned"
        : "truck-not-assigned"
    }`}
  >
    <span className="assignment-dot"></span>

    {truck.assignmentStatus || "NOT_ASSIGNED"}
  </div>

                                  </div>


                                  <div className="truck-arrow">
                                    →
                                  </div>

                                </button>

                              ))}

                            </div>

                          )}


                        </div>


                      </div>

                    );

                  })}


                </div>

              )}


            </div>


          </>

        )}


      </main>



      {/* ================================================= */}
      {/* MEDIA MODAL */}
      {/* ================================================= */}

      {selectedMedia && (

        <div
          className="media-modal"
          onClick={closeMedia}
        >


          <div
            className="media-modal-content"
            onClick={(e) =>
              e.stopPropagation()
            }
          >


            <button
              className="media-close"
              onClick={closeMedia}
            >
              ✕
            </button>



            {selectedMedia.type ===
              "image" && (

              <img
                src={
                  selectedMedia.url
                }
                alt="Full complaint evidence"
                className="full-media"
              />

            )}



            {selectedMedia.type ===
              "video" && (

              <video
                src={
                  selectedMedia.url
                }
                className="full-media"
                controls
                autoPlay
              />

            )}


          </div>


        </div>

      )}



      {/* ================================================= */}
      {/* TRUCK DETAILS MODAL */}
      {/* ================================================= */}

      {selectedTruck && (

        <div
          className="truck-modal"
          onClick={closeTruckDetails}
        >


          <div
            className="truck-modal-content"
            onClick={(e) =>
              e.stopPropagation()
            }
          >


            {/* MODAL HEADER */}

            <div className="truck-modal-header">


              <div>

                <span className="truck-modal-label">
                  TRUCK DETAILS
                </span>

                <h3>
                  🚛{" "}
                  {selectedTruck.truckId ||
                    "Unknown Truck"}
                </h3>

              </div>


              <button
                className="truck-modal-close"
                onClick={closeTruckDetails}
              >
                ✕
              </button>


            </div>



            {/* MODAL DETAILS */}

            <div className="truck-modal-details">


              <div className="truck-modal-detail">

                <div className="truck-modal-detail-icon">
                  👤
                </div>

                <div>

                  <span>
                    DRIVER NAME
                  </span>

                  <strong>
                    {selectedTruck.driverName ||
                      "Not assigned"}
                  </strong>

                </div>

              </div>



              <div className="truck-modal-detail">

                <div className="truck-modal-detail-icon">
                  📧
                </div>

                <div>

                  <span>
                    DRIVER EMAIL
                  </span>

                  <strong>
                    {selectedTruck.userId?.email ||
                      "Not available"}
                  </strong>

                </div>

              </div>
               {/* DRIVER PHONE */}

        <div className="truck-modal-detail">

          <div className="truck-modal-detail-icon">
            📱
          </div>

          <div>

            <span>
              DRIVER PHONE
            </span>

            <strong>
              {selectedTruck.userId?.phone ||
                "Not available"}
            </strong>

          </div>

        </div>


              <div className="truck-modal-detail">

                <div className="truck-modal-detail-icon">
                  🔢
                </div>

                <div>

                  <span>
                    TRUCK NUMBER
                  </span>

                  <strong>
                    {selectedTruck.truckNumber ||
                      "Not available"}
                  </strong>

                </div>

              </div>



              <div className="truck-modal-detail">

                <div className="truck-modal-detail-icon">
                  ⚖️
                </div>

                <div>

                  <span>
                    CAPACITY
                  </span>

                  <strong>
                    {selectedTruck.capacity
                      ? `${selectedTruck.capacity} kg`
                      : "Not available"}
                  </strong>

                </div>

              </div>



              <div className="truck-modal-detail">

                <div className="truck-modal-detail-icon">
                  🟢
                </div>

                <div>

                  <span>
                    STATUS
                  </span>

                  <strong>
                    {selectedTruck.status ||
                      "Not available"}
                  </strong>

                </div>

              </div>


            </div>



            {/* MODAL FOOTER */}

            <button
              className="truck-modal-done"
              onClick={closeTruckDetails}
            >
              Close
            </button>


          </div>


        </div>

      )}


    </div>

  );

}


export default AdminDashboard;