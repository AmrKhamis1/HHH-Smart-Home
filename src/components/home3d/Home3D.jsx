import React, { Suspense, useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { gsap } from "gsap";
import "./Home3D.css";
import Effects from "./Effects";
import RoomTextLabel from "./RoomTextLable";
import { sensorAPI } from "../../services/api";

class CanvasErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Canvas crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>💥 Something went wrong in the 3D view. Please refresh.</div>;
    }
    return this.props.children;
  }
}

// Simple 3D House Component with GLB loading and GSAP animations
function SimpleHouse({ selectedCategory, onCategoryChange, controlsRef }) {
  const houseRef = useRef();
  const { scene } = useGLTF("model/GP.glb");
  const { camera, controls } = useThree();
  const [isRotating, setIsRotating] = useState(true);

  // Store original positions and rotations for reset
  const originalCameraPosition = useRef([12, 8, 8]);
  const originalCameraTarget = useRef([0, 5, 0]);

  // Animation refs for GSAP tweens
  const cameraAnimationRef = useRef(null);
  const houseAnimationRef = useRef(null);

  useFrame((state, delta) => {
    if (houseRef.current && isRotating) {
      houseRef.current.rotation.y += delta * 0.5;
    }
  });

  // Function to find mesh by name in the scene
  const findMeshesByPrefix = (scene, prefix) => {
    const meshes = [];
    scene.traverse((child) => {
      if (
        child.isMesh &&
        child.name.toLowerCase().startsWith(prefix.toLowerCase())
      ) {
        meshes.push(child);
      }
    });
    return meshes;
  };

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
      }
    });
  }, [scene]);

  // Function to reset all walls to visible
  const wallPrefixes = [
    "rightWall",
    "leftWall",
    "backWall",
    "frontWall",
    "garage",
  ];

  const resetWallVisibility = () => {
    wallPrefixes.forEach((prefix) => {
      const walls = findMeshesByPrefix(scene, prefix);
      walls.forEach((wall) => {
        wall.visible = true;
      });
    });
  };

  // GSAP animation function for smooth camera transitions
  const animateCamera = (
    targetPosition,
    targetLookAt,
    houseRotation = 0,
    duration = 1.5
  ) => {
    // Kill any existing animations
    if (cameraAnimationRef.current) {
      cameraAnimationRef.current.kill();
    }
    if (houseAnimationRef.current) {
      houseAnimationRef.current.kill();
    }

    // Stop rotation during animation
    setIsRotating(false);

    // Create timeline for coordinated animations
    const tl = gsap.timeline({
      ease: "power2.inOut",
      onComplete: () => {
        if (controlsRef.current) {
          controlsRef.current.update();
        }
      },
    });

    // Animate camera position
    tl.to(
      camera.position,
      {
        x: targetPosition[0],
        y: targetPosition[1],
        z: targetPosition[2],
        duration: duration,
        ease: "power2.inOut",
      },
      0
    );

    // Animate camera target (controls target)
    if (controlsRef.current && controlsRef.current.target) {
      const target = controlsRef.current.target;
      tl.to(
        target,
        {
          x: targetLookAt[0],
          y: targetLookAt[1],
          z: targetLookAt[2],
          duration: duration,
          ease: "power2.inOut",
          onUpdate: () => {
            controlsRef.current?.update(); // Extra safety
          },
        },
        0
      );
    }

    // Animate house rotation
    if (houseRef.current) {
      tl.to(
        houseRef.current.rotation,
        {
          y: houseRotation,
          duration: duration,
          ease: "power2.inOut",
        },
        0
      );
    }

    cameraAnimationRef.current = tl;
  };

  // Function to handle camera positioning and model rotation with GSAP
  const handleSceneChange = (category) => {
    console.log(`Changing scene for: ${category}`);

    // Reset all walls to visible first
    resetWallVisibility();

    switch (category) {
      case "kitchen":
        // Hide right wall for kitchen view
        const rightWalls = findMeshesByPrefix(scene, "rightWall");
        rightWalls.forEach((wall) => (wall.visible = false));

        animateCamera([10, 2, -3], [2, 0, -3], 0);
        break;

      case "living room":
        // Hide left wall for living room view
        const leftWallLiving = findMeshesByPrefix(scene, "leftWall");
        leftWallLiving.forEach((wall) => (wall.visible = false));

        animateCamera([-8, 6, 2], [-2, 1, 2], 0);
        break;

      case "bedroom":
        // Hide left wall for bedroom view
        const leftWallBedroom = findMeshesByPrefix(scene, "leftWall");
        leftWallBedroom.forEach((wall) => (wall.visible = false));

        animateCamera([-5, 4.5, -3], [-2, 4.5, -3], 0);
        break;

      case "bathroom":
        // Hide left wall for bathroom view
        const leftWallBathroom = findMeshesByPrefix(scene, "leftWall");
        leftWallBathroom.forEach((wall) => (wall.visible = false));

        animateCamera([-5, 2, -3], [-2, 1, -3], 0);
        break;

      case "garage":
        // No walls to hide, just position camera for garage view
        const garageDoor = findMeshesByPrefix(scene, "garage");
        garageDoor.forEach((wall) => (wall.visible = false));
        animateCamera([4, 2, 6], [4, 2, 4], 0);
        break;

      case "roof":
        // Position camera from above for roof view
        animateCamera([10, 15, 0], [0, 6, 0], 0); // Longer duration for dramatic effect
        break;

      case "balcony":
        // Position camera for balcony view
        animateCamera([4, 5, 5], [4, 4, 3], 0);
        break;

      case "door":
        // Position camera for door view
        animateCamera([1, 1, 5], [1, 1, 4], 0);
        break;

      case "garden":
        // Position camera for garden view
        animateCamera([10, 5, 10], [0, 0, 0], 0);
        break;

      default:
        // Default view - reset to original position
        animateCamera(
          originalCameraPosition.current,
          originalCameraTarget.current,
          0
        );
        break;
    }
  };

  // React to category changes
  useEffect(() => {
    if (selectedCategory) {
      handleSceneChange(selectedCategory);
    } else {
      // Reset to default view when no category is selected
      resetWallVisibility();
      animateCamera(
        originalCameraPosition.current,
        originalCameraTarget.current,
        0
      );
    }
  }, [selectedCategory]);

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      // Dispose geometry and materials when component unmounts
      scene.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose?.();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose?.());
          } else {
            child.material?.dispose?.();
          }
        }
      });

      // Kill GSAP animations
      if (cameraAnimationRef.current) {
        cameraAnimationRef.current.kill();
      }
      if (houseAnimationRef.current) {
        houseAnimationRef.current.kill();
      }
    };
  }, []);

  return (
    <group ref={houseRef} position={[0, 0, 0]}>
      <primitive object={scene} />
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

// Real-time sensor data display component
function SensorDataDisplay({ selectedCategory, sensorData }) {
  const [lastUpdateTime, setLastUpdateTime] = useState(
    new Date().toLocaleTimeString()
  );

  // Memoize the category data to avoid unnecessary re-renders
  const categoryData = useMemo(() => {
    return selectedCategory ? sensorData[selectedCategory] : null;
  }, [sensorData, selectedCategory]);
  const lastValidCategoryData = useRef(null);

  useEffect(() => {
    if (categoryData) {
      lastValidCategoryData.current = categoryData;
    }
  }, [categoryData]);

  // Only update timestamp when the actual data changes (not on every render)
  const previousDataRef = useRef();
  useEffect(() => {
    if (categoryData && selectedCategory) {
      // Compare with previous data to see if it actually changed
      const currentDataString = JSON.stringify(categoryData);
      const previousDataString = JSON.stringify(previousDataRef.current);

      if (currentDataString !== previousDataString) {
        setLastUpdateTime(new Date().toLocaleTimeString());
        previousDataRef.current = categoryData;
      }
    }
  }, [categoryData, selectedCategory]);
  const dataToRender = categoryData || lastValidCategoryData.current;

  // Memoize the sensor items to prevent re-rendering when data hasn't changed
  const sensorItems = useMemo(() => {
    if (!dataToRender) return null;

    return Object.entries(dataToRender).map(([key, value]) => (
      <div key={key} className="sensor-item">
        <div className="sensor-label">{getSensorLabel(key)}</div>
        <div
          className="sensor-value"
          style={{ color: getStatusColor(key, value) }}
        >
          {formatSensorValue(key, value)}
          {key.includes("temperature") && typeof value === "number" && "°C"}
          {key.includes("moisture") && typeof value === "number" && "%"}
          {key.includes("humidity") && typeof value === "number" && "%"}
        </div>
      </div>
    ));
  }, [dataToRender]);

  if (!selectedCategory) {
    return (
      <div className="sensor-data-display">
        <div className="sensor-title">SMART HOME SENSORS</div>
        <div className="no-selection">
          <p>Select a room to view sensor data</p>
        </div>
      </div>
    );
  }

  if (!dataToRender) {
    return (
      <div className="sensor-data-display">
        <div className="sensor-title">
          {selectedCategory.toUpperCase()} SENSORS
        </div>
        <div className="no-data">
          <p>Loading sensor data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sensor-data-display">
      <div className="sensor-title">
        {selectedCategory.toUpperCase()} SENSORS
      </div>
      <div className="sensor-grid">{sensorItems}</div>
      <div className="last-updated">Last updated: {lastUpdateTime}</div>
    </div>
  );
}

// Helper functions moved outside component to prevent recreation on each render
const formatSensorValue = (key, value) => {
  if (value === null || value === undefined) {
    return "N/A";
  }

  if (typeof value === "boolean") {
    return value ? "ON" : "OFF";
  }

  if (typeof value === "number") {
    return value.toFixed(1);
  }

  return String(value);
};

const getStatusColor = (key, value) => {
  if (value === null || value === undefined) return "#666";

  // Alert conditions
  if (key === "alert" && value) return "#ff4444";
  if (key === "fire" && value) return "#ff4444";
  if (key === "emergencyOn" && value) return "#ff4444";
  if (key === "rainDetected" && value) return "#4488ff";

  // Active states
  if (typeof value === "boolean" && value) return "#44ff44";
  if (typeof value === "boolean" && !value) return "#888";

  // Numeric values
  if (typeof value === "number") {
    if (key.includes("temperature")) {
      if (value > 30) return "#ff6644";
      if (value < 15) return "#4488ff";
      return "#44ff44";
    }
    if (key.includes("moisture") || key.includes("humidity")) {
      if (value < 30) return "#ff6644";
      if (value > 70) return "#4488ff";
      return "#44ff44";
    }
  }

  return "#44ff44";
};

const getSensorLabel = (key) => {
  const labels = {
    motion: "Motion Sensor",
    curtainOpen: "Curtains",
    temperature: "Temperature",
    fanOn: "Fan",
    tvOn: "TV",
    emergencyOn: "Emergency",
    lightOn: "Light",
    fire: "Fire Sensor",
    mq2: "Gas Sensor (MQ2)",
    mq5: "Gas Sensor (MQ5)",
    alert: "Alert Status",
    rainDetected: "Rain Sensor",
    doorOpen: "Door",
    carInside: "Car Present",
    soilMoisture: "Soil Moisture",
    irrigationOn: "Irrigation",
    acOn: "Air Conditioning",
  };

  return labels[key] || key.charAt(0).toUpperCase() + key.slice(1);
};

const Home3D = () => {
  const [controlsEnabled, setControlsEnabled] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sensorData, setSensorData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const controlsRef = useRef();
  const intervalRef = useRef(null);

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

  // Function to fetch sensor data from API
  const fetchSensorData = async () => {
    try {
      setError(null);

      const data = await sensorAPI.getAllSensorData();

      // Use functional update to compare with previous state
      setSensorData((prevData) => {
        // Deep comparison of the data
        const dataString = JSON.stringify(data);
        const prevDataString = JSON.stringify(prevData);

        // Only update if data has actually changed
        if (dataString !== prevDataString) {
          return data;
        }
        return prevData;
      });
    } catch (error) {
      console.error("Error fetching sensor data:", error);
      setError("Failed to fetch sensor data");
    }
  };

  // Function to fetch specific category data
  const fetchCategoryData = async (category) => {
    try {
      const categoryMap = {
        "living room": "living room",
        kitchen: "kitchen",
        roof: "roof",
        garage: "garage",
        garden: "garden",
        bedroom: "bedroom", // Note: API uses 'bed' but display uses 'bedroom'
        door: "door",
      };

      if (categoryMap[category]) {
        const apiCategory = categoryMap[category];
        const data = await sensorAPI.getCategoryStatus(apiCategory);

        setSensorData((prev) => {
          // Only update if the category data has changed
          const currentCategoryData = prev[category];
          const newDataString = JSON.stringify(data);
          const currentDataString = JSON.stringify(currentCategoryData);

          if (newDataString !== currentDataString) {
            return {
              ...prev,
              [category]: data,
            };
          }
          return prev;
        });
      }
    } catch (error) {
      console.error(`Error fetching ${category} data:`, error);
    }
  };

  // Setup polling for sensor data every 2 seconds
  useEffect(() => {
    // Initial fetch
    fetchSensorData();

    // Set up interval for polling
    intervalRef.current = setInterval(fetchSensorData, 2000);

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Additional polling for selected category (more frequent updates)
  useEffect(() => {
    if (selectedCategory) {
      const categoryInterval = setInterval(() => {
        fetchCategoryData(selectedCategory);
      }, 1000); // Update selected category every second

      return () => clearInterval(categoryInterval);
    }
  }, [selectedCategory]);

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setControlsEnabled(true);

    // Immediately fetch data for selected category
    fetchCategoryData(categoryId);
  };

  // Memoize the alert checking function to prevent unnecessary recalculations
  const hasAlert = useMemo(() => {
    return (categoryId) => {
      const data = sensorData[categoryId];
      if (!data) return false;

      return (
        data.alert === true ||
        data.fire === true ||
        data.emergencyOn === true ||
        data.rainDetected === true ||
        (data.mq2 !== null && data.mq2 > 300) ||
        (data.mq5 !== null && data.mq5 > 300)
      );
    };
  }, [sensorData]);

  return (
    <div className="home3d-container">
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
          {error && (
            <div className="error-indicator">
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Real-time Sensor Data Display - Now positioned in top-left */}
        <div className="sensor-display-panel">
          <SensorDataDisplay
            selectedCategory={selectedCategory}
            sensorData={sensorData}
          />
        </div>

        {/* Category Buttons */}
        <div className="category-buttons">
          {categories.map((category) => (
            <button
              key={category.id}
              className={`category-btn ${
                selectedCategory === category.id ? "active" : ""
              } ${hasAlert(category.id) ? "alert" : ""}`}
              onClick={() => handleCategorySelect(category.id)}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
              {hasAlert(category.id) && <span className="alert-badge">!</span>}
            </button>
          ))}
        </div>
        <CanvasErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <Canvas
              camera={{ position: [25, 6, 23], fov: 60 }}
              shadows
              style={{
                background: "linear-gradient(135deg, #0d1017 0%, #1a1f2e 100%)",
                pointerEvents: controlsEnabled ? "auto" : "none",
              }}
              gl={{
                preserveDrawingBuffer: false, // false is default; just being explicit
                powerPreference: "high-performance",
                antialias: true,
                failIfMajorPerformanceCaveat: false,
              }}
            >
              <Effects></Effects>
              <OrbitControls
                ref={controlsRef}
                enabled={controlsEnabled}
                enablePan={false}
                enableZoom={true}
                enableRotate={true}
                autoRotate={autoRotate && !selectedCategory}
                autoRotateSpeed={1}
                maxPolarAngle={Math.PI / 2}
                minDistance={5}
                maxDistance={20}
              />

              {/* Lighting */}
              <ambientLight intensity={4} />

              {/* 3D House */}
              <SimpleHouse
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                controlsRef={controlsRef}
              />

              {/* Kitchen Sensors */}
              {sensorData["kitchen"] && (
                <>
                  <RoomTextLabel
                    position={[3, 1, -3]}
                    rotation={[0, Math.PI / 2, 0]}
                    label="Gas"
                    value={sensorData["kitchen"].mq2 > 300 ? "HIGH" : "Normal"}
                    color={
                      sensorData["kitchen"].mq2 > 300
                        ? new THREE.Color(10, 0, 0)
                        : new THREE.Color(0, 10, 0)
                    }
                  />
                  <mesh position={[3, 2.6, -3]} scale={[0.1, 0.1, 0.1]}>
                    <sphereGeometry args={[1, 16, 16]}></sphereGeometry>
                    <meshBasicMaterial
                      color={
                        sensorData["kitchen"].alert == true
                          ? new THREE.Color(10, 0, 0)
                          : new THREE.Color(0, 10, 0)
                      }
                    ></meshBasicMaterial>
                  </mesh>

                  <RoomTextLabel
                    position={[4.7, 1.5, -4.7]}
                    rotation={[0, 0, 0]}
                    scale={[0.5, 0.5, 0.5]}
                    label="Fire"
                    value={
                      sensorData["kitchen"].fire == true ? "Fire" : "No Fire"
                    }
                    color={
                      sensorData["kitchen"].fire == true
                        ? new THREE.Color(10, 0, 0)
                        : new THREE.Color(0, 10, 0)
                    }
                  />
                </>
              )}

              {/* Living Room Sensors */}
              {sensorData["living room"] && (
                <>
                  {/* Motion Sensor */}
                  <mesh position={[-2, 1.4, 2]} scale={[0.08, 0.08, 0.08]}>
                    <sphereGeometry args={[1, 16, 16]}></sphereGeometry>
                    <meshBasicMaterial
                      color={
                        sensorData["living room"].motion
                          ? new THREE.Color(10, 5, 0) // Orange for motion detected
                          : new THREE.Color(0, 10, 0)
                      }
                    ></meshBasicMaterial>
                  </mesh>
                  <RoomTextLabel
                    position={[-2, 1, 2]}
                    rotation={[0, -Math.PI / 2, 0]}
                    label="Motion"
                    value={
                      sensorData["living room"].motion ? "Detected" : "Clear"
                    }
                    color={
                      sensorData["living room"].motion
                        ? new THREE.Color(10, 5, 0)
                        : new THREE.Color(0, 10, 0)
                    }
                  />

                  {/* TV Status */}
                  <mesh position={[-1.85, 2.0, -1.3]} scale={[0.2, 0.2, 0.2]}>
                    <boxGeometry args={[1, 0.6, 0.1]}></boxGeometry>
                    <meshBasicMaterial
                      color={
                        sensorData["living room"].tvOn
                          ? new THREE.Color(0, 5, 10) // Blue for TV on
                          : new THREE.Color(2, 2, 2) // Gray for TV off
                      }
                    ></meshBasicMaterial>
                  </mesh>
                  <RoomTextLabel
                    position={[-1.85, 2.3, -1.3]}
                    rotation={[0, 0, 0]}
                    label="TV"
                    value={sensorData["living room"].tvOn ? "ON" : "OFF"}
                    color={
                      sensorData["living room"].tvOn
                        ? new THREE.Color(0, 5, 10)
                        : new THREE.Color(5, 5, 5)
                    }
                  />

                  {/* Emergency Status */}
                  {sensorData["living room"].emergencyOn && (
                    <>
                      <mesh position={[-2, 3.5, 1]} scale={[0.1, 0.1, 0.1]}>
                        <sphereGeometry args={[1, 16, 16]}></sphereGeometry>
                        <meshBasicMaterial
                          color={new THREE.Color(10, 0, 0)}
                        ></meshBasicMaterial>
                      </mesh>
                      <RoomTextLabel
                        position={[-2, 3, 1]}
                        rotation={[0, -Math.PI / 2, 0]}
                        label="EMERGENCY"
                        value="ACTIVE"
                        color={new THREE.Color(10, 0, 0)}
                      />
                    </>
                  )}

                  {/* Light Status */}
                  <mesh position={[-2, 4, 1]} scale={[0.2, 0.2, 0.2]}>
                    <sphereGeometry args={[1, 16, 16]}></sphereGeometry>
                    <meshBasicMaterial
                      color={
                        sensorData["living room"].lightOn
                          ? new THREE.Color(10, 10, 5) // Bright yellow for light on
                          : new THREE.Color(2, 2, 2) // Dark gray for light off
                      }
                    ></meshBasicMaterial>
                  </mesh>
                </>
              )}

              {/* Bedroom Sensors */}
              {sensorData["bedroom"] && (
                <>
                  {/* Light Status */}
                  <mesh position={[-2, 5, -3]} scale={[0.02, 0.2, 0.2]}>
                    <sphereGeometry args={[1, 16, 16]}></sphereGeometry>
                    <meshBasicMaterial
                      color={
                        sensorData["bedroom"].buzzerActive
                          ? new THREE.Color(20, 20, 5)
                          : new THREE.Color(2, 2, 2)
                      }
                    ></meshBasicMaterial>
                  </mesh>
                  <RoomTextLabel
                    position={[-2, 4.3, -3]}
                    rotation={[0, -Math.PI / 2, 0]}
                    label="Light"
                    value={sensorData["bedroom"].buzzerActive ? "ON" : "OFF"}
                    color={
                      sensorData["bedroom"].buzzerActive
                        ? new THREE.Color(20, 20, 5)
                        : new THREE.Color(1, 1, 1)
                    }
                  />
                </>
              )}

              {/* Garage Sensors */}
              {sensorData["garage"] && (
                <>
                  {/* Garage Door Status */}
                  <mesh position={[3.8, 1, 4]} scale={[0.12, 0.12, 0.03]}>
                    <boxGeometry args={[1, 1, 1]}></boxGeometry>
                    <meshBasicMaterial
                      color={
                        sensorData["garage"].alert
                          ? new THREE.Color(10, 0, 0)
                          : new THREE.Color(0, 10, 0)
                      }
                    ></meshBasicMaterial>
                  </mesh>
                  <RoomTextLabel
                    position={[3.8, 0.5, 4]}
                    rotation={[0, Math.PI * 2, 0]}
                    label="Garage"
                    value={sensorData["garage"].doorOpen ? "OPEN" : "CLOSED"}
                    color={
                      sensorData["garage"].doorOpen
                        ? new THREE.Color(0, 10, 0)
                        : new THREE.Color(10, 0, 0)
                    }
                  />

                  {/* Car Presence */}
                  {sensorData["garage"].motion && (
                    <>
                      <RoomTextLabel
                        position={[3.8, 1.6, 4]}
                        rotation={[0, Math.PI * 2, 0]}
                        label="Car"
                        value="Present"
                        color={new THREE.Color(0, 0, 18)}
                      />
                    </>
                  )}
                </>
              )}

              {/* Garden Sensors */}
              {sensorData["garden"] && sensorData["garden"].soilMoisture && (
                <>
                  {/* Soil Moisture Indicator */}
                  <mesh position={[6, 0.2, 8]} scale={[0.15, 0.05, 0.15]}>
                    <cylinderGeometry args={[1, 1, 1, 8]}></cylinderGeometry>
                    <meshBasicMaterial
                      color={
                        sensorData["garden"].soilMoisture !== null
                          ? sensorData["garden"].soilMoisture < 30
                            ? new THREE.Color(8, 4, 0) // Brown for dry soil
                            : sensorData["garden"].soilMoisture > 70
                            ? new THREE.Color(0, 4, 8) // Blue for wet soil
                            : new THREE.Color(0, 8, 2) // Green for optimal moisture
                          : new THREE.Color(4, 2, 0) // Default brown
                      }
                    ></meshBasicMaterial>
                  </mesh>
                  <RoomTextLabel
                    position={[6, 0.8, 8]}
                    rotation={[0, 0, 0]}
                    label="Soil"
                    value={
                      sensorData["garden"].soilMoisture !== null
                        ? `${sensorData["garden"].soilMoisture.toFixed(1)}%`
                        : "N/A"
                    }
                    color={
                      sensorData["garden"].soilMoisture !== null
                        ? sensorData["garden"].soilMoisture < 30
                          ? new THREE.Color(8, 4, 0)
                          : sensorData["garden"].soilMoisture > 70
                          ? new THREE.Color(0, 4, 8)
                          : new THREE.Color(0, 8, 2)
                        : new THREE.Color(4, 2, 0)
                    }
                  />

                  {/* Irrigation System */}
                  <mesh position={[8, 0.5, 6]} scale={[0.08, 0.08, 0.08]}>
                    <cylinderGeometry args={[1, 0.5, 2, 8]}></cylinderGeometry>
                    <meshBasicMaterial
                      color={
                        sensorData["garden"].irrigationOn
                          ? new THREE.Color(0, 8, 12) // Bright cyan for irrigation on
                          : new THREE.Color(2, 2, 2) // Gray for irrigation off
                      }
                    ></meshBasicMaterial>
                  </mesh>
                  <RoomTextLabel
                    position={[8, 1.2, 6]}
                    rotation={[0, -Math.PI / 4, 0]}
                    label="Irrigation"
                    value={sensorData["garden"].irrigationOn ? "ON" : "OFF"}
                    color={
                      sensorData["garden"].irrigationOn
                        ? new THREE.Color(0, 8, 12)
                        : new THREE.Color(5, 5, 5)
                    }
                  />

                  {/* Water droplets effect when irrigation is on */}
                  {sensorData["garden"].irrigationOn && (
                    <>
                      {[...Array(5)].map((_, i) => (
                        <mesh
                          key={i}
                          position={[
                            8 + (Math.random() - 0.5) * 2,
                            0.3 + Math.random() * 0.5,
                            6 + (Math.random() - 0.5) * 2,
                          ]}
                          scale={[0.02, 0.02, 0.02]}
                        >
                          <sphereGeometry args={[1, 8, 8]}></sphereGeometry>
                          <meshBasicMaterial
                            color={new THREE.Color(0, 6, 10)}
                            transparent={true}
                            opacity={0.7}
                          ></meshBasicMaterial>
                        </mesh>
                      ))}
                    </>
                  )}
                </>
              )}

              {/* Roof Sensors */}
              {sensorData["roof"] && (
                <>
                  {/* Rain Detection Sensor */}
                  <mesh position={[0, 10.3, 0]} scale={[0.1, 0.1, 0.1]}>
                    <cylinderGeometry
                      args={[1, 0.8, 0.5, 8]}
                    ></cylinderGeometry>
                    <meshBasicMaterial
                      color={
                        sensorData["roof"].rainDetected
                          ? new THREE.Color(0, 8, 12) // Bright blue for rain detected
                          : new THREE.Color(6, 6, 6) // Light gray for no rain
                      }
                    ></meshBasicMaterial>
                  </mesh>
                  <RoomTextLabel
                    position={[0, 9.8, 0]}
                    rotation={[0, 0, 0]}
                    scale={[1.4, 1.4, 1.4]}
                    label="Rain"
                    value={
                      sensorData["roof"].rainDetected ? "DETECTED" : "Clear"
                    }
                    color={
                      sensorData["roof"].rainDetected
                        ? new THREE.Color(0, 8, 12)
                        : new THREE.Color(6, 6, 6)
                    }
                  />

                  {/* Alert Status for Roof */}
                  {sensorData["roof"].alert && (
                    <>
                      <mesh position={[2, 8.8, 2]} scale={[0.08, 0.08, 0.08]}>
                        <sphereGeometry args={[1, 16, 16]}></sphereGeometry>
                        <meshBasicMaterial
                          color={new THREE.Color(10, 0, 0)}
                        ></meshBasicMaterial>
                      </mesh>
                      <RoomTextLabel
                        position={[2, 8.2, 2]}
                        rotation={[0, 0, 0]}
                        label="ROOF ALERT"
                        value="ACTIVE"
                        color={new THREE.Color(10, 0, 0)}
                      />
                    </>
                  )}

                  {/* Rain particles effect when rain is detected */}
                  {sensorData["roof"].rainDetected && (
                    <>
                      {[...Array(62)].map((_, i) => (
                        <mesh
                          key={i}
                          position={[
                            (Math.random() - 0.5) * 10,
                            8 + Math.random() * 2,
                            (Math.random() - 0.5) * 10,
                          ]}
                          scale={[0.01, 0.05, 0.01]}
                        >
                          <cylinderGeometry
                            args={[1, 0.5, 1, 4]}
                          ></cylinderGeometry>
                          <meshBasicMaterial
                            color={new THREE.Color(0, 4, 8)}
                            transparent={true}
                            opacity={0.6}
                          ></meshBasicMaterial>
                        </mesh>
                      ))}
                    </>
                  )}
                </>
              )}

              {/* Living Room Sensors  */}
              {sensorData["living room"] && (
                <>
                  {/* Temperature Display */}
                  {sensorData["living room"].temperature !== null && (
                    <>
                      <mesh
                        position={[-1.5, 2, 3.5]}
                        scale={[0.06, 0.06, 0.06]}
                      >
                        <cylinderGeometry
                          args={[1, 1, 2, 8]}
                        ></cylinderGeometry>
                        <meshBasicMaterial
                          color={
                            sensorData["living room"].temperature > 30
                              ? new THREE.Color(10, 0, 0) // Red for hot
                              : sensorData["living room"].temperature < 15
                              ? new THREE.Color(0, 4, 10) // Blue for cold
                              : new THREE.Color(0, 8, 0) // Green for optimal
                          }
                        ></meshBasicMaterial>
                      </mesh>
                      <RoomTextLabel
                        position={[-1.5, 1.4, 3.5]}
                        rotation={[0, -Math.PI / 2, 0]}
                        label="Temp"
                        value={`${sensorData["living room"].temperature.toFixed(
                          1
                        )}°C`}
                        color={
                          sensorData["living room"].temperature > 30
                            ? new THREE.Color(10, 0, 0)
                            : sensorData["living room"].temperature < 15
                            ? new THREE.Color(0, 4, 10)
                            : new THREE.Color(0, 8, 0)
                        }
                      />
                    </>
                  )}

                  {/* Fan Status */}

                  {/* Fan blades that rotate when on */}
                  {sensorData["living room"].fanOn && (
                    <>
                      <group
                        position={[2, 1.5, 2]}
                        rotation={[0, 0, -Math.PI / 2]}
                      >
                        <mesh scale={[0.08, 0.02, 0.08]}>
                          <cylinderGeometry
                            args={[1, 1, 1, 8]}
                          ></cylinderGeometry>
                          <meshBasicMaterial
                            color={
                              sensorData["living room"].fanOn
                                ? new THREE.Color(0, 8, 12) // Cyan for fan on
                                : new THREE.Color(3, 3, 3) // Gray for fan off
                            }
                          ></meshBasicMaterial>
                        </mesh>
                        {[0, 1, 2].map((i) => (
                          <mesh
                            key={i}
                            rotation={[0, (i * Math.PI * 2) / 3, 0]}
                            scale={[0.12, 0.005, 0.02]}
                          >
                            <boxGeometry args={[4, 1, 1]}></boxGeometry>
                            <meshBasicMaterial
                              color={new THREE.Color(8, 8, 8)}
                            ></meshBasicMaterial>
                          </mesh>
                        ))}
                      </group>
                    </>
                  )}

                  <RoomTextLabel
                    position={[2, 2, 1]}
                    rotation={[0, -Math.PI / 2, 0]}
                    label="AC"
                    value={sensorData["living room"].fanOn ? "ON" : "OFF"}
                    color={
                      sensorData["living room"].fanOn
                        ? new THREE.Color(0, 8, 12)
                        : new THREE.Color(5, 5, 5)
                    }
                  />

                  {/* Curtain Status */}
                  <mesh position={[-3.5, 2, 1]} scale={[0.02, 0.2, 0.15]}>
                    <boxGeometry args={[1, 1, 1]}></boxGeometry>
                    <meshBasicMaterial
                      color={
                        sensorData["living room"].curtainOpen
                          ? new THREE.Color(10, 8, 0) // Yellow for curtains open
                          : new THREE.Color(4, 2, 0) // Dark brown for curtains closed
                      }
                    ></meshBasicMaterial>
                  </mesh>
                  <RoomTextLabel
                    position={[-3.5, 1.5, 1]}
                    rotation={[0, -Math.PI / 2, 0]}
                    label="Curtains"
                    value={
                      sensorData["living room"].curtainOpen ? "OPEN" : "CLOSED"
                    }
                    color={
                      sensorData["living room"].curtainOpen
                        ? new THREE.Color(10, 8, 0)
                        : new THREE.Color(4, 2, 0)
                    }
                  />
                </>
              )}

              {/* Door Sensors (Main Entrance) */}
              {selectedCategory === "door" && sensorData["door"] && (
                <>
                  <mesh position={[0.7, 1.2, 5]} scale={[0.45, 0.25, 0.02]}>
                    <boxGeometry args={[1, 1, 1]}></boxGeometry>
                    <meshBasicMaterial
                      color={
                        sensorData["door"].elock
                          ? new THREE.Color(0, 10, 0)
                          : new THREE.Color(10, 0, 0)
                      }
                    ></meshBasicMaterial>
                  </mesh>

                  <mesh position={[0.7, 2.2, 4.85]} scale={[0.1, 0.1, 0.1]}>
                    <sphereGeometry args={[1, 8, 8]}></sphereGeometry>
                    <meshBasicMaterial
                      color={
                        !sensorData["door"].light
                          ? new THREE.Color(0.3, 0.3, 0.3)
                          : new THREE.Color(18, 9, 0.5)
                      }
                    ></meshBasicMaterial>
                  </mesh>

                  <RoomTextLabel
                    position={[0.7, 0.7, 4.8]}
                    rotation={[0, Math.PI * 2, 0]}
                    scale={[0.4, 0.4, 0.4]}
                    label="Main Door"
                    value="Entrance"
                    color={new THREE.Color(6, 4, 2)}
                  />
                </>
              )}

              {/* Balcony Sensors */}
              {selectedCategory === "balcony" && (
                <>
                  <RoomTextLabel
                    position={[4, 4, 3]}
                    scale={[0.7, 0.7, 0.7]}
                    rotation={[0, Math.PI * 2, 0]}
                    label="Balcony"
                    value="Outdoor Space"
                    color={new THREE.Color(0, 8, 2)}
                  />
                </>
              )}

              {/* Bathroom Sensors (if you plan to add bathroom sensors in the future) */}
              {selectedCategory === "bathroom" && (
                <>
                  <RoomTextLabel
                    position={[2, 2, -4]}
                    rotation={[0, Math.PI / 2, 0]}
                    label="Bathroom"
                    value="No Sensors"
                    color={new THREE.Color(6, 6, 6)}
                  />
                </>
              )}
            </Canvas>
          </Suspense>
        </CanvasErrorBoundary>
      </div>
    </div>
  );
};

export default Home3D;
