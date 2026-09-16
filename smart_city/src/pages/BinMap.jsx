import { useEffect, useState } from "react";
import axios from "axios";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "../styles/BinMap.css";


const MapSearch = () => {
  const map = useMap();

  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);

  const searchLocation = async () => {
    if (!searchText.trim()) {
      return;
    }

    try {
      setSearching(true);

      const response = await axios.get(
        "https://nominatim.openstreetmap.org/search",
        {
          params: {
            q: `${searchText}, Coimbatore, Tamil Nadu, India`,
            format: "json",
            limit: 1,
          },
          headers: {
            "User-Agent":
              "CityBinManagementSystem/1.0 (college-project)",
          },
        }
      );

      if (response.data.length === 0) {
        alert("Location not found");
        return;
      }

      const location = response.data[0];

      const latitude = Number(location.lat);
      const longitude = Number(location.lon);

      console.log("Search result:", location);

      map.flyTo(
        [latitude, longitude],
        17,
        {
          duration: 1.5,
        }
      );

    } catch (error) {
      console.error("Location search error:", error);

      alert("Unable to search location");

    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="map-search-box">

      <input
        type="text"
        placeholder="Search area or location..."
        value={searchText}
        onChange={(e) =>
          setSearchText(e.target.value)
        }
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            searchLocation();
          }
        }}
      />

      <button
        onClick={searchLocation}
        disabled={searching}
      >
        {searching ? "..." : "🔍"}
      </button>

    </div>
  );
};



const MapClickHandler = ({ onLocationSelect }) => {

  useMapEvents({

    click(event) {

      const { lat, lng } = event.latlng;

      console.log("MAP CLICKED");
      console.log("Latitude:", lat);
      console.log("Longitude:", lng);

      onLocationSelect(lat, lng);
    },

  });

  return null;
};


const BinMap = ({ onBinAdded }) => {

  const [bins, setBins] = useState([]);

  const [selectedLocation, setSelectedLocation] =
    useState(null);

  const [locationDetails, setLocationDetails] =
    useState(null);

  const [loadingLocation, setLoadingLocation] =
    useState(false);

  const [saving, setSaving] =
    useState(false);


  const center = [11.0133, 76.9856];


 

  useEffect(() => {

    fetchBins();

  }, []);


  const fetchBins = async () => {

    try {

      const response = await axios.get(
        "http://localhost:5000/api/bins/all"
      );

      console.log(
        "ALL BINS FROM DATABASE:",
        response.data
      );

      setBins(
        response.data.bins || []
      );

    } catch (error) {

      console.error(
        "Error fetching all bins:",
        error
      );

    }

  };


  /* ================================================= */
  /* ============== MAP LOCATION SELECT ============= */
  /* ================================================= */

  const handleLocationSelect = async (
    latitude,
    longitude
  ) => {

    setSelectedLocation({
      latitude,
      longitude,
    });

    setLocationDetails(null);

    setLoadingLocation(true);


    try {

      const response = await axios.get(
        "https://nominatim.openstreetmap.org/reverse",
        {
          params: {
            lat: latitude,
            lon: longitude,
            format: "jsonv2",
          },

          headers: {
            "User-Agent":
              "CityBinManagementSystem/1.0 (college-project)",
          },
        }
      );


      console.log(
        "Reverse geocoding response:",
        response.data
      );


      const address =
        response.data.address || {};


      const area =
        address.suburb ||
        address.neighbourhood ||
        address.city_district ||
        address.town ||
        address.village ||
        address.county ||
        "Unknown Area";


      const city =
        address.city ||
        address.town ||
        address.municipality ||
        "Coimbatore";


      setLocationDetails({

        area,

        city,

        displayName:
          response.data.display_name ||
          "Selected location",

      });


    } catch (error) {

      console.error(
        "Reverse geocoding error:",
        error
      );


      setLocationDetails({

        area: "Unknown Area",

        city: "Coimbatore",

        displayName:
          "Selected location",

      });

    } finally {

      setLoadingLocation(false);

    }

  };


  /* ================================================= */
  /* ================= SAVE BIN ====================== */
  /* ================================================= */

  const saveBin = async () => {

    if (!selectedLocation) {

      alert(
        "Please select a location on the map."
      );

      return;

    }


    if (!locationDetails) {

      alert(
        "Please wait until the area is detected."
      );

      return;

    }


    try {

      setSaving(true);


      const binData = {

        latitude:
          selectedLocation.latitude,

        longitude:
          selectedLocation.longitude,

        city:
          locationDetails.city,

        area:
          locationDetails.area,

      };


      console.log(
        "Saving admin bin:",
        binData
      );


      const response = await axios.post(
        "http://localhost:5000/api/bins",
        binData
      );


      console.log(
        "Admin bin saved:",
        response.data
      );


      const newBin =
        response.data.bin;


      /* Add immediately to map */

      setBins(
        (previousBins) => [
          ...previousBins,
          newBin,
        ]
      );


      alert(
        `${newBin.binId} added successfully!`
      );


      setSelectedLocation(null);

      setLocationDetails(null);


      if (onBinAdded) {

        onBinAdded(newBin);

      }


    } catch (error) {

      console.error(
        "SAVE BIN ERROR:",
        error
      );

      console.error(
        "BACKEND ERROR:",
        error.response?.data
      );


      alert(
        error.response?.data?.message ||
        "Failed to add bin"
      );


    } finally {

      setSaving(false);

    }

  };


  /* ================================================= */
  /* ===================== UI ======================== */
  /* ================================================= */

  return (

    <div className="bin-map-wrapper">

      <div className="bin-map-container">

        <MapContainer
          center={center}
          zoom={16}
          className="bin-map"
        >

          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />


          {/* ================= SEARCH BAR ================= */}

          <MapSearch />


          {/* ================= MAP CLICK ================= */}

          <MapClickHandler
            onLocationSelect={
              handleLocationSelect
            }
          />


          {/* ================================================= */}
          {/* ================= ALL BIN MARKERS ============== */}
          {/* ================================================= */}

          {bins.map((bin) => (

            <Marker
              key={bin.binId}
              position={[
                Number(bin.latitude),
                Number(bin.longitude),
              ]}
            >

              <Popup>

                <div className="bin-popup">

                  <strong>
                    🗑️ {bin.binId}
                  </strong>

                  <br />

                  City: {bin.city}

                  <br />

                  Area: {bin.area}

                  <br />

                  Latitude: {bin.latitude}

                  <br />

                  Longitude: {bin.longitude}

                  <br />

                  Source: {bin.source}

                  <br />

                  Status: {bin.status}

                </div>

              </Popup>

            </Marker>

          ))}


          {/* ================================================= */}
          {/* ============== SELECTED LOCATION ================= */}
          {/* ================================================= */}

          {selectedLocation && (

            <Marker
              position={[
                selectedLocation.latitude,
                selectedLocation.longitude,
              ]}
            >

              <Popup>

                <div className="selected-bin-popup">

                  <strong>
                    📍 New Bin Location
                  </strong>

                  <br />

                  Latitude:{" "}
                  {selectedLocation.latitude.toFixed(
                    6
                  )}

                  <br />

                  Longitude:{" "}
                  {selectedLocation.longitude.toFixed(
                    6
                  )}

                </div>

              </Popup>

            </Marker>

          )}

        </MapContainer>


        {/* ================================================= */}
        {/* ============== ADD BIN OVERLAY =================== */}
        {/* ================================================= */}

        {selectedLocation && (

          <div className="bin-selected-overlay">

            <div className="bin-selected-header">

              <div>

                <div className="bin-selected-heading">

                  📍 Add New Waste Bin

                </div>

                <div className="bin-selected-subtitle">

                  Confirm the selected location

                </div>

              </div>


              <button
                className="bin-close-button"
                onClick={() => {

                  setSelectedLocation(null);

                  setLocationDetails(null);

                }}
              >

                ×

              </button>

            </div>


            {/* ================= COORDINATES ================= */}

            <div className="bin-form-grid">

              <div className="bin-form-item">

                <label>
                  LATITUDE
                </label>

                <div className="bin-form-value coordinate">

                  {selectedLocation.latitude.toFixed(
                    6
                  )}

                </div>

              </div>


              <div className="bin-form-item">

                <label>
                  LONGITUDE
                </label>

                <div className="bin-form-value coordinate">

                  {selectedLocation.longitude.toFixed(
                    6
                  )}

                </div>

              </div>

            </div>


            {/* ================= LOCATION DETAILS ================= */}

            {loadingLocation ? (

              <div className="bin-detecting">

                <span>🔄</span>

                Detecting area and city...

              </div>

            ) : locationDetails ? (

              <>

                <div className="bin-form-item">

                  <label>
                    AREA
                  </label>

                  <div className="bin-form-value">

                    {locationDetails.area}

                  </div>

                </div>


                <div className="bin-form-item">

                  <label>
                    CITY
                  </label>

                  <div className="bin-form-value">

                    {locationDetails.city}

                  </div>

                </div>


                <div className="bin-form-item">

                  <label>
                    LOCATION
                  </label>

                  <div className="bin-form-value location-name">

                    {locationDetails.displayName}

                  </div>

                </div>


                <button
                  className="bin-save-button"
                  onClick={saveBin}
                  disabled={saving}
                >

                  {saving
                    ? "Saving Bin..."
                    : "💾 Save Bin"}

                </button>

              </>

            ) : null}

          </div>

        )}

      </div>


      {/* ================================================= */}
      {/* ================= INSTRUCTION =================== */}
      {/* ================================================= */}

      <div className="bin-map-instruction">

        <div className="bin-map-instruction-title">

          <span>📍</span>

          <span>
            Add New Bin
          </span>

        </div>


        <p className="bin-map-instruction-text">

          Click anywhere on the map to select the
          location of a new waste bin.

        </p>

      </div>

    </div>

  );

};


export default BinMap;