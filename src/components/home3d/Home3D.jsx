import React, { Suspense, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import "./Home3D.css";
// Simple 3D House Component
function SimpleHouse({ selectedCategory, onCategoryChange }) {
  const houseRef = useRef();
  const [isRotating, setIsRotating] = useState(false);

  useFrame((state, delta) => {
    if (houseRef.current && isRotating) {
      houseRef.current.rotation.y += delta * 0.5;
    }
  });

  // Function to handle scene changes based on selected category
  const handleSceneChange = (category) => {
    console.log(`Changing scene for: ${category}`);
    // This is where you'll implement your scene modifications
    // Example: make walls invisible, highlight specific areas, etc.
    switch (category) {
      case "kitchen":
        // Handle kitchen view
        break;
      case "living room":
        // Handle living room view
        break;
      case "bedroom":
        // Handle bedroom view
        break;
      case "bathroom":
        // Handle bathroom view
        break;
      case "garage":
        // Handle garage view
        break;
      case "roof":
        // Handle roof view
        break;
      case "balcony":
        // Handle balcony view
        break;
      case "door":
        // Handle door view
        break;
      case "garden":
        // Handle garden view
        break;
      default:
        // Default view
        break;
    }
  };

  // React to category changes
  React.useEffect(() => {
    if (selectedCategory) {
      handleSceneChange(selectedCategory);
    }
  }, [selectedCategory]);

  return (
    <group ref={houseRef} position={[0, 0, 0]}>
      {/* This is a placeholder - replace with your GLB model */}
      <mesh position={[1.2, 0.8, 1.51]}>
        <boxGeometry args={[0.8, 0.8, 0.1]} />
        <meshStandardMaterial color="#87CEEB" />
      </mesh>
    </group>
  );
}

// Loading component for 3D scene
function LoadingFallback() {
  return (
    <div className="loading-3d">
      <div className="loading-spinner"></div>
      <p>Loading 3D Home...</p>
    </div>
  );
}

// Sensor dropdown component
function SensorDropdown({ selectedCategory, onSensorSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState("");

  // Define sensors for each category
  const sensorsByCategory = {
    kitchen: [
      { id: "temp_kitchen", name: "Temperature Sensor", type: "temperature" },
      { id: "smoke_kitchen", name: "Smoke Detector", type: "smoke" },
      { id: "gas_kitchen", name: "Gas Detector", type: "gas" },
      { id: "light_kitchen", name: "Light Control", type: "light" },
    ],
    "living room": [
      { id: "temp_living", name: "Temperature Sensor", type: "temperature" },
      { id: "motion_living", name: "Motion Detector", type: "motion" },
      { id: "light_living", name: "Light Control", type: "light" },
      { id: "tv_living", name: "TV Control", type: "device" },
    ],
    bedroom: [
      { id: "temp_bedroom", name: "Temperature Sensor", type: "temperature" },
      { id: "light_bedroom", name: "Light Control", type: "light" },
      { id: "curtain_bedroom", name: "Curtain Control", type: "device" },
    ],
    bathroom: [
      { id: "humidity_bathroom", name: "Humidity Sensor", type: "humidity" },
      { id: "temp_bathroom", name: "Temperature Sensor", type: "temperature" },
      { id: "light_bathroom", name: "Light Control", type: "light" },
      { id: "fan_bathroom", name: "Exhaust Fan", type: "device" },
    ],
    garage: [
      { id: "door_garage", name: "Garage Door", type: "door" },
      { id: "motion_garage", name: "Motion Detector", type: "motion" },
      { id: "light_garage", name: "Light Control", type: "light" },
    ],
    roof: [
      { id: "solar_roof", name: "Solar Panels", type: "energy" },
      { id: "weather_roof", name: "Weather Station", type: "weather" },
    ],
    balcony: [
      { id: "temp_balcony", name: "Temperature Sensor", type: "temperature" },
      { id: "light_balcony", name: "Light Control", type: "light" },
    ],
    door: [
      { id: "lock_door", name: "Smart Lock", type: "lock" },
      { id: "camera_door", name: "Door Camera", type: "camera" },
      { id: "bell_door", name: "Smart Doorbell", type: "bell" },
    ],
    garden: [
      { id: "moisture_garden", name: "Soil Moisture", type: "moisture" },
      { id: "sprinkler_garden", name: "Sprinkler System", type: "irrigation" },
      { id: "light_garden", name: "Garden Lights", type: "light" },
    ],
  };

  const availableSensors = selectedCategory
    ? sensorsByCategory[selectedCategory] || []
    : [];

  const handleSensorSelect = async (sensor) => {
    setSelectedSensor(sensor.name);
    setIsOpen(false);

    // Here you'll make your axios requests to the backend
    try {
      // Example axios call - replace with your actual API endpoints
      // const response = await axios.get(`/api/sensors/${sensor.id}`);
      // onSensorSelect(sensor, response.data);

      // Placeholder for now
      console.log(`Selected sensor: ${sensor.name} (${sensor.id})`);
      onSensorSelect(sensor, { status: "active", value: Math.random() * 100 });
    } catch (error) {
      console.error("Error fetching sensor data:", error);
    }
  };

  if (!selectedCategory) {
    return (
      <div className="sensor-dropdown disabled">
        <span>Select a room to view sensors</span>
      </div>
    );
  }

  return (
    <div className="sensor-dropdown">
      <button className="dropdown-trigger" onClick={() => setIsOpen(!isOpen)}>
        {selectedSensor || "Select Sensor"}
        <span className={`dropdown-arrow ${isOpen ? "open" : ""}`}>▼</span>
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          {availableSensors.map((sensor) => (
            <button
              key={sensor.id}
              className="dropdown-item"
              onClick={() => handleSensorSelect(sensor)}
            >
              <span className="sensor-name">{sensor.name}</span>
              <span className="sensor-type">{sensor.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const Home3D = () => {
  const [controlsEnabled, setControlsEnabled] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sensorData, setSensorData] = useState(null);

  const categories = [
    { id: "kitchen", name: "Kitchen", icon: "🍳" },
    { id: "living room", name: "Living Room", icon: "🛋️" },
    { id: "bedroom", name: "Bedroom", icon: "🛏️" },
    { id: "bathroom", name: "Bathroom", icon: "🚿" },
    { id: "garage", name: "Garage", icon: "🚗" },
    { id: "roof", name: "Roof", icon: "🏠" },
    { id: "balcony", name: "Balcony", icon: "🌿" },
    { id: "door", name: "Door", icon: "🚪" },
    { id: "garden", name: "Garden", icon: "🌱" },
  ];

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setSensorData(null); // Reset sensor data when category changes
  };

  const handleSensorSelect = (sensor, data) => {
    setSensorData({ sensor, data });
  };

  return (
    <div className="home3d-container">
      {/* <div className="home3d-header">
        <h1 className="home3d-title">3D Home Visualization</h1>
        <p className="home3d-subtitle">
          Interactive 3D view of your smart home
        </p>
      </div> */}

      <div className="canvas-container">
        <div className="home3d-controls">
          <button
            className={`control-btn ${controlsEnabled ? "active" : ""}`}
            onClick={() => setControlsEnabled(!controlsEnabled)}
          >
            {controlsEnabled ? "Disable" : "Enable"} Controls
          </button>
          <button
            className={`control-btn ${autoRotate ? "active" : ""}`}
            onClick={() => setAutoRotate(!autoRotate)}
          >
            {autoRotate ? "Stop" : "Start"} Auto Rotate
          </button>
        </div>
        <div className="sensor-controls">
          <SensorDropdown
            selectedCategory={selectedCategory}
            onSensorSelect={handleSensorSelect}
          />
          {sensorData && (
            <div className="sensor-data">
              <span className="sensor-reading">
                {sensorData.sensor.name}:{" "}
                {sensorData.data.value?.toFixed(1) || "N/A"}
              </span>
            </div>
          )}
        </div>
        {/* Category Buttons */}
        <div className="category-buttons">
          {categories.map((category) => (
            <button
              key={category.id}
              className={`category-btn ${
                selectedCategory === category.id ? "active" : ""
              }`}
              onClick={() => handleCategorySelect(category.id)}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
            </button>
          ))}
        </div>
        <Suspense fallback={<LoadingFallback />}>
          <Canvas
            camera={{ position: [8, 6, 8], fov: 60 }}
            shadows
            style={{
              background: "linear-gradient(135deg, #0d1017 0%, #1a1f2e 100%)",
              pointerEvents: controlsEnabled ? "auto" : "none",
            }}
          >
            <OrbitControls
              enabled={controlsEnabled}
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              autoRotate={autoRotate}
              autoRotateSpeed={1}
              maxPolarAngle={Math.PI / 2}
              minDistance={5}
              maxDistance={20}
            />

            {/* Lighting */}
            <ambientLight intensity={0.4} />
            <directionalLight
              position={[10, 10, 5]}
              intensity={1}
              castShadow
              shadow-mapSize={[1024, 1024]}
            />
            <pointLight position={[-10, -10, -10]} intensity={0.3} />

            {/* 3D House */}
            <SimpleHouse
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />

            {/* Ground */}
            <mesh
              position={[0, -0.5, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              receiveShadow
            >
              <planeGeometry args={[20, 20]} />
              <meshStandardMaterial color="#2d5a27" />
            </mesh>
          </Canvas>
        </Suspense>
      </div>
    </div>
  );
};

export default Home3D;
