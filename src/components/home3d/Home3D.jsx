import React, { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { gsap } from "gsap";
import "./Home3D.css";

// Simple 3D House Component with GLB loading and GSAP animations
function SimpleHouse({ selectedCategory, onCategoryChange }) {
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
        console.log("Mesh Name:", child.name);
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
        if (controls) {
          controls.update();
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
    if (controls) {
      tl.to(
        controls.target,
        {
          x: targetLookAt[0],
          y: targetLookAt[1],
          z: targetLookAt[2],
          duration: duration,
          ease: "power2.inOut",
          onUpdate: () => {
            controls.update();
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

        animateCamera([5, 3, 5], [2, 1, 0], Math.PI / 4);
        break;

      case "living room":
        // Hide left wall for living room view
        const leftWallLiving = findMeshesByPrefix(scene, "leftWall");
        leftWallLiving.forEach((wall) => (wall.visible = false));

        animateCamera([-5, 3, 5], [-2, 1, 0], -Math.PI / 4);
        break;

      case "bedroom":
        // Hide left wall for bedroom view
        const leftWallBedroom = findMeshesByPrefix(scene, "leftWall");
        leftWallBedroom.forEach((wall) => (wall.visible = false));

        animateCamera([-4, 4, 4], [-1, 2, 1], -Math.PI / 6);
        break;

      case "bathroom":
        // Hide left wall for bathroom view
        const leftWallBathroom = findMeshesByPrefix(scene, "leftWall");
        leftWallBathroom.forEach((wall) => (wall.visible = false));

        animateCamera([-3, 2, 3], [-1, 1, -1], -Math.PI / 3);
        break;

      case "garage":
        // No walls to hide, just position camera for garage view
        animateCamera([6, 2, -4], [3, 0, -2], Math.PI);
        break;

      case "roof":
        // Position camera from above for roof view
        animateCamera([0, 15, 0], [0, 0, 0], 0, 2); // Longer duration for dramatic effect
        break;

      case "balcony":
        // Position camera for balcony view
        animateCamera([4, 4, 8], [1, 2, 4], Math.PI / 8);
        break;

      case "door":
        // Position camera for door view
        animateCamera([0, 2, 8], [0, 1, 0], 0);
        break;

      case "garden":
        // Position camera for garden view
        animateCamera([8, 4, 8], [4, 0, 4], Math.PI / 6);
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
        <span>Select Category to view sensors</span>
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
  const [controlsEnabled, setControlsEnabled] = useState(true);
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
    setControlsEnabled(true);
    setSensorData(null); // Reset sensor data when category changes
  };

  const handleSensorSelect = (sensor, data) => {
    setSensorData({ sensor, data });
  };

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
            camera={{ position: [25, 6, 23], fov: 60 }}
            shadows
            style={{
              background: "linear-gradient(135deg, #0d1017 0%, #1a1f2e 100%)",
              pointerEvents: controlsEnabled ? "auto" : "none",
            }}
          >
            <OrbitControls
              enabled={controlsEnabled}
              enablePan={false}
              enableZoom={true}
              enableRotate={true}
              autoRotate={autoRotate && !selectedCategory} // Disable auto-rotate when category is selected
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
            />
          </Canvas>
        </Suspense>
      </div>
    </div>
  );
};

// Preload the GLB model
useGLTF.preload("model/GP.glb");

export default Home3D;
