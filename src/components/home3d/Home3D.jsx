import { Suspense, useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { gsap } from "gsap";
import "./Home3D.css";
import Effects from "./Effects";
import RoomTextLabel from "./RoomTextLable";
import { sensorAPI } from "../../services/api";

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
  const wallPrefixes = ["rightWall", "leftWall", "backWall", "frontWall"];

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
        bedroom: "bedroom",
      };

      if (categoryMap[category]) {
        const data = await sensorAPI.getCategoryStatus(category);

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

        <Suspense fallback={<LoadingFallback />}>
          <Canvas
            camera={{ position: [25, 6, 23], fov: 60 }}
            shadows
            style={{
              background: "linear-gradient(135deg, #0d1017 0%, #1a1f2e 100%)",
              pointerEvents: controlsEnabled ? "auto" : "none",
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

            {sensorData["kitchen"] && (
              <>
                <RoomTextLabel
                  position={[3, 1, -3]} // Kitchen position
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
                  position={[4.7, 1.5, -4.7]} // Kitchen position
                  rotation={[0, 0, 0]}
                  scale={[0.5, 0.5, 0.5]}
                  label="Fire"
                  value={sensorData["kitchen"] > 300 ? "Fire" : "No Fire"}
                  color={
                    sensorData["kitchen"].mq2 > 300
                      ? new THREE.Color(10, 0, 0)
                      : new THREE.Color(0, 10, 0)
                  }
                />
              </>
            )}
          </Canvas>
        </Suspense>
      </div>
    </div>
  );
};

// Preload the GLB model
useGLTF.preload("model/GP.glb");

export default Home3D;
