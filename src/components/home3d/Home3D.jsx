import React, {
  Suspense,
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { Perf } from "r3f-perf";
import { gsap } from "gsap";
import "./Home3D.css";
import Effects from "./Effects";
import RoomTextLabel from "./RoomTextLable";
import { sensorAPI } from "../../services/api";

// Preload the model outside of components to prevent multiple loads
useGLTF.preload("model/GP.glb");

const LoadingOverlay = ({ isVisible }) => {
  return (
    <div
      className={`loading-overlay ${isVisible ? "visible" : "fade-out"}`}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "#0d1017",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
        transition: "opacity 1s ease-out",
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? "auto" : "none",
      }}
    >
      <div
        className="loading-spinner"
        style={{
          width: "50px",
          height: "50px",
          border: "3px solid #333",
          borderTop: "3px solid #fff",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          marginBottom: "20px",
        }}
      ></div>
      <p
        style={{
          color: "#fff",
          fontSize: "18px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        Loading Smart Home Experience...
      </p>
    </div>
  );
};
// Simple 3D House Component with GLB loading and GSAP animations
function SimpleHouse({
  selectedCategory,
  onCategoryChange,
  controlsRef,
  onModelLoaded,
}) {
  const houseRef = useRef();
  const { scene } = useGLTF("model/GP.glb");
  const { camera, gl } = useThree();
  const [isRotating, setIsRotating] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const initRef = useRef(false);

  // Store original positions and rotations for reset
  const originalCameraPosition = useRef([12, 8, 8]);
  const originalCameraTarget = useRef([0, 5, 0]);

  // Animation refs for GSAP tweens
  const cameraAnimationRef = useRef(null);
  const houseAnimationRef = useRef(null);

  // Initialize model on mount - only once
  useEffect(() => {
    if (scene && houseRef.current && !initRef.current) {
      initRef.current = true;

      // Clone the scene to avoid issues with multiple instances
      const clonedScene = scene.clone();

      // Optimize the cloned scene
      clonedScene.traverse((child) => {
        if (child.isMesh) {
          child.frustumCulled = true; // Enable frustum culling for better performance
          child.castShadow = false; // Disable shadows for better performance
          child.receiveShadow = false;

          // Optimize materials
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => {
                mat.needsUpdate = false;
                // Reduce material quality for better performance
                if (mat.map) mat.map.generateMipmaps = false;
              });
            } else {
              child.material.needsUpdate = false;
              if (child.material.map)
                child.material.map.generateMipmaps = false;
            }
          }
        }
      });

      // Clear existing children and add cloned scene
      if (houseRef.current.children.length > 0) {
        houseRef.current.clear();
      }
      houseRef.current.add(clonedScene);

      // Set initial house rotation
      houseRef.current.rotation.y = 0;

      setModelReady(true);
      onModelLoaded?.();

      console.log("Model loaded and initialized");
    }
  }, [scene, onModelLoaded]);

  useFrame((state, delta) => {
    if (houseRef.current && isRotating && modelReady) {
      houseRef.current.rotation.y += delta * 0.5;
    }
  });

  // Memoize mesh finding function
  const findMeshesByPrefix = useCallback((scene, prefix) => {
    const meshes = [];
    if (houseRef.current) {
      houseRef.current.traverse((child) => {
        if (
          child.isMesh &&
          child.name.toLowerCase().startsWith(prefix.toLowerCase())
        ) {
          meshes.push(child);
        }
      });
    }
    return meshes;
  }, []);

  // Function to reset all walls to visible
  const wallPrefixes = [
    "rightWall",
    "leftWall",
    "backWall",
    "frontWall",
    "garage",
  ];

  const resetWallVisibility = useCallback(() => {
    wallPrefixes.forEach((prefix) => {
      const walls = findMeshesByPrefix(scene, prefix);
      walls.forEach((wall) => {
        wall.visible = true;
      });
    });
  }, [findMeshesByPrefix, scene]);

  // GSAP animation function for smooth camera transitions
  const animateCamera = useCallback(
    (
      distance,
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
      if (!controlsRef.current) {
        return;
      }

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
        const controls = controlsRef.current;
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
              controlsRef.current?.update();
            },
          },
          0
        );

        tl.to(
          controls,
          {
            minDistance: distance,
            duration: duration,
            ease: "power2.inOut",
            onUpdate: () => {
              controlsRef.current?.update();
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
    },
    [camera, controlsRef]
  );

  // Function to handle camera positioning and model rotation with GSAP
  const handleSceneChange = useCallback(
    (category) => {
      console.log(`Changing scene for: ${category}`);

      // Reset all walls to visible first
      resetWallVisibility();

      if (!houseRef.current) return;

      switch (category) {
        case "kitchen":
          // Hide right wall for kitchen view
          const rightWalls = findMeshesByPrefix(houseRef.current, "rightWall");
          rightWalls.forEach((wall) => (wall.visible = false));
          animateCamera(5, [10, 2, -3], [2, 0, -3], 0);
          break;

        case "living room":
          // Hide left wall for living room view
          const leftWallLiving = findMeshesByPrefix(
            houseRef.current,
            "leftWall"
          );
          leftWallLiving.forEach((wall) => (wall.visible = false));
          animateCamera(5, [-8, 6, 2], [-2, 1, 2], 0);
          break;

        case "bedroom":
          // Hide left wall for bedroom view
          const leftWallBedroom = findMeshesByPrefix(
            houseRef.current,
            "leftWall"
          );
          leftWallBedroom.forEach((wall) => (wall.visible = false));
          animateCamera(5, [-5, 4.5, -3], [-2, 4.5, -3], 0);
          break;

        case "bathroom":
          // Hide left wall for bathroom view
          const leftWallBathroom = findMeshesByPrefix(
            houseRef.current,
            "leftWall"
          );
          leftWallBathroom.forEach((wall) => (wall.visible = false));
          animateCamera(5, [-5, 2, -3], [-2, 1, -3], 0);
          break;

        case "garage":
          // No walls to hide, just position camera for garage view
          const garageDoor = findMeshesByPrefix(houseRef.current, "garage");
          garageDoor.forEach((wall) => (wall.visible = false));
          animateCamera(5, [4, 2, 6], [4, 2, 4], 0);
          break;

        case "roof":
          // Position camera from above for roof view
          animateCamera(5, [10, 15, 0], [0, 6, 0], 0);
          break;

        case "balcony":
          // Position camera for balcony view
          animateCamera(5, [4, 5, 5], [4, 4, 3], 0);
          break;

        case "door":
          // Position camera for door view
          animateCamera(5, [1, 1, 5], [1, 1, 4], 0);
          break;

        case "garden":
          // Position camera for garden view
          animateCamera(5, [10, 5, 10], [0, 0, 0], 0);
          break;

        default:
          // Default view - reset to original position
          animateCamera(
            20,
            originalCameraPosition.current,
            originalCameraTarget.current,
            0
          );
          setIsRotating(false);
          break;
      }
    },
    [findMeshesByPrefix, resetWallVisibility, animateCamera]
  );

  // React to category changes
  useEffect(() => {
    if (!modelReady) return;

    if (selectedCategory && selectedCategory !== "back") {
      handleSceneChange(selectedCategory);
    } else {
      // Reset to default view when no category is selected
      resetWallVisibility();
      animateCamera(
        20,
        originalCameraPosition.current,
        originalCameraTarget.current,
        0
      );
      setIsRotating(false);
    }
  }, [
    selectedCategory,
    modelReady,
    handleSceneChange,
    resetWallVisibility,
    animateCamera,
  ]);

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      // Kill GSAP animations
      if (cameraAnimationRef.current) {
        cameraAnimationRef.current.kill();
      }
      if (houseAnimationRef.current) {
        houseAnimationRef.current.kill();
      }
    };
  }, []);

  return <group ref={houseRef} position={[0, 0, 0]} />;
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

// Real-time sensor data display component - Optimized with memo
const SensorDataDisplay = React.memo(({ selectedCategory, sensorData }) => {
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

  // Only update timestamp when the actual data changes
  const previousDataRef = useRef();
  useEffect(() => {
    if (categoryData && selectedCategory && selectedCategory !== "back") {
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

  if (!selectedCategory || selectedCategory === "back") {
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
});

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
  const [autoRotate, setAutoRotate] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("back");
  const [sensorData, setSensorData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0); // Key to force canvas remount if needed
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);
  const controlsRef = useRef();
  const intervalRef = useRef(null);
  const categoryIntervalRef = useRef(null);

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
    { id: "back", name: "Back", icon: "⬅" },
  ];

  // Function to fetch sensor data from API - Optimized
  const fetchSensorData = useCallback(async () => {
    try {
      setError(null);
      const data = await sensorAPI.getAllSensorData();

      setSensorData((prevData) => {
        const dataString = JSON.stringify(data);
        const prevDataString = JSON.stringify(prevData);

        if (dataString !== prevDataString) {
          return data;
        }
        return prevData;
      });
    } catch (error) {
      console.error("Error fetching sensor data:", error);
      setError("Failed to fetch sensor data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Function to fetch specific category data - Optimized
  const fetchCategoryData = useCallback(async (category) => {
    try {
      const categoryMap = {
        "living room": "living room",
        kitchen: "kitchen",
        roof: "roof",
        garage: "garage",
        garden: "garden",
        bedroom: "bedroom",
        door: "door",
      };

      if (categoryMap[category]) {
        const apiCategory = categoryMap[category];
        const data = await sensorAPI.getCategoryStatus(apiCategory);

        setSensorData((prev) => {
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
  }, []);

  // Handle model loaded callback
  const handleModelLoaded = useCallback(() => {
    setModelLoaded(true);
    setIsLoading(false);

    // Wait 3 seconds after model is loaded, then fade out
    setTimeout(() => {
      setShowLoadingOverlay(false);
    }, 3000);

    console.log("Model loaded successfully");
  }, []);
  // Setup polling for sensor data - Optimized
  useEffect(() => {
    fetchSensorData();

    intervalRef.current = setInterval(fetchSensorData, 3000); // Reduced frequency

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchSensorData]);

  // Additional polling for selected category - Optimized
  useEffect(() => {
    if (categoryIntervalRef.current) {
      clearInterval(categoryIntervalRef.current);
    }

    if (selectedCategory && selectedCategory !== "back") {
      fetchCategoryData(selectedCategory);

      categoryIntervalRef.current = setInterval(() => {
        fetchCategoryData(selectedCategory);
      }, 2000); // Reduced frequency
    }

    return () => {
      if (categoryIntervalRef.current) {
        clearInterval(categoryIntervalRef.current);
      }
    };
  }, [selectedCategory, fetchCategoryData]);

  const handleCategorySelect = useCallback(
    (categoryId) => {
      setSelectedCategory(categoryId);
      setControlsEnabled(true);

      if (categoryId !== "back") {
        fetchCategoryData(categoryId);
      }
    },
    [fetchCategoryData]
  );

  // Memoize the alert checking function
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

  // Handle WebGL context loss
  const handleContextLoss = useCallback((event) => {
    console.warn("WebGL context lost, attempting to recover...");
    event.preventDefault();

    // Force canvas remount after a short delay
    setTimeout(() => {
      setCanvasKey((prev) => prev + 1);
    }, 1000);
  }, []);

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
          {isLoading && (
            <div className="loading-indicator">
              <span>Loading 3D Model...</span>
            </div>
          )}
        </div>

        {/* Real-time Sensor Data Display */}
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
            key={canvasKey} // Force remount if WebGL context is lost
            camera={{
              position: [12, 8, 8],
              fov: 60,
              near: 0.1,
              far: 1000,
            }}
            shadows={false} // Disable shadows for better performance
            style={{
              pointerEvents: controlsEnabled ? "auto" : "none",
            }}
            gl={{
              preserveDrawingBuffer: false, // Better for performance
              powerPreference: "high-performance",
              antialias: window.devicePixelRatio === 1, // Only enable on low DPI screens
              failIfMajorPerformanceCaveat: false,
              alpha: false,
              stencil: false, // Disable stencil buffer
              depth: true,
            }}
            onCreated={({ gl, scene, camera }) => {
              // Optimize renderer settings
              gl.setSize(window.innerWidth, window.innerHeight);
              gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
              gl.outputEncoding = THREE.sRGBEncoding;
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.2;

              // Add context loss event listener
              gl.domElement.addEventListener(
                "webglcontextlost",
                handleContextLoss
              );

              camera.lookAt(0, 5, 0);
              console.log("Canvas created successfully");
            }}
            performance={{
              min: 0.5, // Lower minimum FPS for better compatibility
              max: 1,
              debounce: 200,
            }}
          >
            <color attach="background" args={["#1a1f2e"]} />

            <Effects />

            <OrbitControls
              ref={controlsRef}
              enabled={controlsEnabled}
              enablePan={false}
              enableZoom={true}
              enableRotate={true}
              autoRotate={autoRotate && selectedCategory === "back"}
              autoRotateSpeed={1}
              maxPolarAngle={Math.PI / 2}
              minDistance={5}
              maxDistance={50}
              target={[0, 5, 0]}
              enableDamping={true}
              dampingFactor={0.05}
            />

            {/* Optimized Lighting */}
            <ambientLight intensity={2} />
            <directionalLight
              position={[10, 10, 5]}
              intensity={1}
              castShadow={false}
            />

            {/* 3D House */}
            <SimpleHouse
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              controlsRef={controlsRef}
              onModelLoaded={handleModelLoaded}
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
                  <cylinderGeometry args={[1, 0.8, 0.5, 8]}></cylinderGeometry>
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
                  value={sensorData["roof"].rainDetected ? "DETECTED" : "Clear"}
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
                    <mesh position={[-1.5, 2, 3.5]} scale={[0.06, 0.06, 0.06]}>
                      <cylinderGeometry args={[1, 1, 2, 8]}></cylinderGeometry>
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
      </div>
      <LoadingOverlay isVisible={showLoadingOverlay} />
    </div>
  );
};

export default Home3D;
