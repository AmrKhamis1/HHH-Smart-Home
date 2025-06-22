import { useState, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Import the real API service
import { sensorAPI } from "../../services/api";

const Dashboard = () => {
  const [sensorData, setSensorData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [temperatureHistory, setTemperatureHistory] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState("living room");
  const intervalRef = useRef();
  const historyRef = useRef([]);

  // Fetch sensor data from real API endpoints
  const fetchSensorData = async () => {
    try {
      setError(null);

      // Fetch data from all endpoints
      const [
        livingRoomData,
        kitchenData,
        roofData,
        garageData,
        gardenData,
        bedroomData,
      ] = await Promise.allSettled([
        sensorAPI.getCategoryStatus("living room"),
        sensorAPI.getCategoryStatus("kitchen"),
        sensorAPI.getCategoryStatus("roof"),
        sensorAPI.getCategoryStatus("garage"),
        sensorAPI.getCategoryStatus("garden"),
        sensorAPI.getCategoryStatus("bedroom"),
      ]);
      console.log(bedroomData);
      // Process the results and handle any failures
      const processResult = (result, defaultValue = {}) => {
        return result.status === "fulfilled" ? result.value : defaultValue;
      };

      // Use only real API data - no mock values
      const combinedData = {
        "living room": {
          motion: processResult(livingRoomData).motion || false,
          curtainOpen: processResult(livingRoomData).curtainOpen || false,
          temperature: processResult(livingRoomData).temperature, // Keep null if null
          fanOn: processResult(livingRoomData).fanOn || false,
          tvOn: processResult(livingRoomData).tvOn || false,
          emergencyOn: processResult(livingRoomData).emergencyOn || false,
          lightOn: processResult(livingRoomData).lightOn || false,
        },
        kitchen: {
          fire: processResult(kitchenData).fire, // Keep null if null
          mq2: processResult(kitchenData).mq2, // Keep null if null
          mq5: processResult(kitchenData).mq5, // Keep null if null
          alert: processResult(kitchenData).alert || false,
        },
        bedroom: {
          lightOn: processResult(bedroomData).buzzerEnabled || false,
          acOn: processResult(bedroomData).buzzerActive || false,
        },
        garage: {
          doorOpen: processResult(garageData).doorOpen || false,
          carInside: processResult(garageData).carInside || false,
        },
        roof: {
          rainDetected: processResult(roofData).rainDetected || false,
          alert: processResult(roofData).alert || false,
        },
        garden: {
          soilMoisture: processResult(gardenData).soilMoisture, // Keep null if null
          irrigationOn: processResult(gardenData).irrigationOn || false,
        },
      };

      setSensorData(combinedData);

      // Update temperature history for charts (only if temperature data exists)
      const timestamp = new Date().toLocaleTimeString();
      const livingRoomTemp = combinedData["living room"]?.temperature;

      // Only add to history if we have actual temperature data
      if (livingRoomTemp !== null && livingRoomTemp !== undefined) {
        const newHistoryPoint = {
          time: timestamp,
          livingRoom: livingRoomTemp,
        };

        historyRef.current = [
          ...historyRef.current.slice(-19),
          newHistoryPoint,
        ];
        setTemperatureHistory(historyRef.current);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Failed to fetch sensor data:", error);
      setError("Failed to fetch sensor data from API endpoints");
      setIsLoading(false);
    }
  };

  // Setup polling every 2 seconds
  useEffect(() => {
    fetchSensorData();
    intervalRef.current = setInterval(fetchSensorData, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const getSensorStatusColor = (value, type) => {
    switch (type) {
      case "temperature":
        if (value < 18) return "#3b82f6";
        if (value > 28) return "#ef4444";
        return "#22c55e";
      case "humidity":
        if (value < 30 || value > 70) return "#ef4444";
        return "#22c55e";
      case "gas":
        if (value > 300) return "#ef4444";
        if (value > 200) return "#f59e0b";
        return "#22c55e";
      case "moisture":
        if (value < 30) return "#ef4444";
        if (value > 70) return "#3b82f6";
        return "#22c55e";
      default:
        return "#6b7280";
    }
  };

  const getAlertCount = () => {
    let alerts = 0;
    Object.values(sensorData).forEach((roomData) => {
      if (roomData.alert) alerts++;
      if (roomData.fire) alerts++;
      if (roomData.emergencyOn) alerts++;
      if (roomData.mq2 && roomData.mq2 > 300) alerts++;
      if (roomData.mq5 && roomData.mq5 > 300) alerts++;
      if (roomData.rainDetected) alerts++;
    });
    return alerts;
  };

  const getActiveDevices = () => {
    let active = 0;
    Object.values(sensorData).forEach((roomData) => {
      if (roomData.lightOn) active++;
      if (roomData.fanOn) active++;
      if (roomData.tvOn) active++;
      if (roomData.acOn) active++;
      if (roomData.irrigationOn) active++;
    });
    return active;
  };

  const getRoomStatusData = () => {
    const rooms = Object.keys(sensorData);
    return rooms.map((room) => ({
      name: room.charAt(0).toUpperCase() + room.slice(1),
      devices: Object.values(sensorData[room] || {}).filter(
        (val) => val === true
      ).length,
      temperature: sensorData[room]?.temperature || null,
    }));
  };

  const getSecurityStatus = () => {
    const data = [];

    // Since door/corridor API isn't included in current fetch, we'll show garage status
    if (sensorData.garage?.doorOpen) {
      data.push({ name: "Garage Open", value: 1, color: "#f59e0b" });
    } else {
      data.push({ name: "Garage Closed", value: 1, color: "#22c55e" });
    }

    // Add emergency status from living room
    if (sensorData["living room"]?.emergencyOn) {
      data.push({ name: "Emergency Active", value: 1, color: "#ef4444" });
    } else {
      data.push({ name: "Emergency Clear", value: 1, color: "#22c55e" });
    }

    return data;
  };

  const getAverageTemperature = () => {
    const temps = Object.values(sensorData)
      .map((room) => room.temperature)
      .filter((temp) => temp !== null && temp !== undefined);

    if (temps.length === 0) return "N/A";
    return (temps.reduce((acc, temp) => acc + temp, 0) / temps.length).toFixed(
      1
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="flex justify-center items-center min-h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="ml-4 text-lg">Loading sensor data from API...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Smart Home Dashboard
          </h1>
          <p className="text-gray-400 text-lg mb-4">
            Real-time monitoring and control of your home environment
          </p>
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
          {error && (
            <div className="mt-2 p-3 bg-red-900 border border-red-600 rounded-lg text-red-200">
              {error}
              <button
                onClick={fetchSensorData}
                className="ml-2 px-2 py-1 bg-red-700 hover:bg-red-600 rounded text-xs"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Rooms</p>
                <p className="text-2xl font-bold text-blue-400">
                  {Object.keys(sensorData).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                🏠
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-red-500 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Alerts</p>
                <p className="text-2xl font-bold text-red-400">
                  {getAlertCount()}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                🚨
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-green-500 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Devices</p>
                <p className="text-2xl font-bold text-green-400">
                  {getActiveDevices()}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                💡
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-purple-500 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Avg Temperature</p>
                <p className="text-2xl font-bold text-purple-400">
                  {getAverageTemperature() === "N/A"
                    ? "N/A"
                    : `${getAverageTemperature()}°C`}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                🌡️
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Temperature History Chart - Only show if we have temperature data */}
          {temperatureHistory.length > 0 && (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-semibold mb-4 text-white">
                Temperature History (Living Room)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={temperatureHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="livingRoom"
                    stroke="#3B82F6"
                    name="Living Room"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Room Activity Chart */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-white">
              Room Activity
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getRoomStatusData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="devices" fill="#3B82F6" name="Active Devices" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Room Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {Object.entries(sensorData).map(([roomName, roomData]) => (
            <div
              key={roomName}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold capitalize text-white">
                  {roomName}
                </h3>
                <div
                  className={`w-3 h-3 rounded-full ${
                    roomData.alert ||
                    roomData.fire ||
                    roomData.emergencyOn ||
                    roomData.rainDetected
                      ? "bg-red-500"
                      : "bg-green-500"
                  }`}
                ></div>
              </div>

              <div className="space-y-3">
                {roomData.temperature !== null &&
                  roomData.temperature !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Temperature</span>
                      <span
                        className={`font-semibold ${
                          roomData.temperature > 28
                            ? "text-red-400"
                            : roomData.temperature < 18
                            ? "text-blue-400"
                            : "text-green-400"
                        }`}
                      >
                        {typeof roomData.temperature === "number"
                          ? roomData.temperature.toFixed(1)
                          : "N/A"}
                        °C
                      </span>
                    </div>
                  )}

                {roomData.hasOwnProperty("lightOn") && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Light</span>
                    <span
                      className={`font-semibold ${
                        roomData.lightOn ? "text-yellow-400" : "text-gray-500"
                      }`}
                    >
                      {roomData.lightOn ? "ON" : "OFF"}
                    </span>
                  </div>
                )}

                {roomData.hasOwnProperty("motion") && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Motion</span>
                    <span
                      className={`font-semibold ${
                        roomData.motion ? "text-orange-400" : "text-gray-500"
                      }`}
                    >
                      {roomData.motion ? "Detected" : "Clear"}
                    </span>
                  </div>
                )}

                {roomData.hasOwnProperty("fanOn") && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Fan</span>
                    <span
                      className={`font-semibold ${
                        roomData.fanOn ? "text-blue-400" : "text-gray-500"
                      }`}
                    >
                      {roomData.fanOn ? "ON" : "OFF"}
                    </span>
                  </div>
                )}

                {roomData.hasOwnProperty("tvOn") && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">TV</span>
                    <span
                      className={`font-semibold ${
                        roomData.tvOn ? "text-purple-400" : "text-gray-500"
                      }`}
                    >
                      {roomData.tvOn ? "ON" : "OFF"}
                    </span>
                  </div>
                )}

                {roomData.hasOwnProperty("acOn") && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">AC</span>
                    <span
                      className={`font-semibold ${
                        roomData.acOn ? "text-cyan-400" : "text-gray-500"
                      }`}
                    >
                      {roomData.acOn ? "ON" : "OFF"}
                    </span>
                  </div>
                )}

                {roomData.hasOwnProperty("curtainOpen") && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Curtains</span>
                    <span
                      className={`font-semibold ${
                        roomData.curtainOpen
                          ? "text-yellow-400"
                          : "text-gray-500"
                      }`}
                    >
                      {roomData.curtainOpen ? "Open" : "Closed"}
                    </span>
                  </div>
                )}

                {roomData.hasOwnProperty("fire") && roomData.fire !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Fire Sensor</span>
                    <span
                      className={`font-semibold ${
                        roomData.fire ? "text-red-400" : "text-green-400"
                      }`}
                    >
                      {roomData.fire ? "DETECTED" : "Clear"}
                    </span>
                  </div>
                )}

                {roomData.mq2 !== null && roomData.mq2 !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Gas (MQ2)</span>
                    <span
                      className={`font-semibold ${
                        roomData.mq2 > 300
                          ? "text-red-400"
                          : roomData.mq2 > 200
                          ? "text-yellow-400"
                          : "text-green-400"
                      }`}
                    >
                      {typeof roomData.mq2 === "number"
                        ? roomData.mq2.toFixed(0)
                        : "N/A"}
                    </span>
                  </div>
                )}

                {roomData.mq5 !== null && roomData.mq5 !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Gas (MQ5)</span>
                    <span
                      className={`font-semibold ${
                        roomData.mq5 > 300
                          ? "text-red-400"
                          : roomData.mq5 > 200
                          ? "text-yellow-400"
                          : "text-green-400"
                      }`}
                    >
                      {typeof roomData.mq5 === "number"
                        ? roomData.mq5.toFixed(0)
                        : "N/A"}
                    </span>
                  </div>
                )}

                {roomData.hasOwnProperty("soilMoisture") &&
                  roomData.soilMoisture !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Soil Moisture</span>
                      <span
                        className={`font-semibold ${
                          getSensorStatusColor(
                            roomData.soilMoisture,
                            "moisture"
                          ) === "#ef4444"
                            ? "text-red-400"
                            : getSensorStatusColor(
                                roomData.soilMoisture,
                                "moisture"
                              ) === "#3b82f6"
                            ? "text-blue-400"
                            : "text-green-400"
                        }`}
                      >
                        {typeof roomData.soilMoisture === "number"
                          ? roomData.soilMoisture.toFixed(1)
                          : "N/A"}
                        %
                      </span>
                    </div>
                  )}

                {roomData.hasOwnProperty("irrigationOn") && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Irrigation</span>
                    <span
                      className={`font-semibold ${
                        roomData.irrigationOn
                          ? "text-blue-400"
                          : "text-gray-500"
                      }`}
                    >
                      {roomData.irrigationOn ? "ON" : "OFF"}
                    </span>
                  </div>
                )}

                {roomData.hasOwnProperty("doorOpen") && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Door</span>
                    <span
                      className={`font-semibold ${
                        roomData.doorOpen ? "text-red-400" : "text-green-400"
                      }`}
                    >
                      {roomData.doorOpen ? "Open" : "Closed"}
                    </span>
                  </div>
                )}

                {roomData.hasOwnProperty("carInside") && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Car Present</span>
                    <span
                      className={`font-semibold ${
                        roomData.carInside ? "text-blue-400" : "text-gray-500"
                      }`}
                    >
                      {roomData.carInside ? "Yes" : "No"}
                    </span>
                  </div>
                )}

                {roomData.hasOwnProperty("rainDetected") && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Rain</span>
                    <span
                      className={`font-semibold ${
                        roomData.rainDetected
                          ? "text-blue-400"
                          : "text-gray-500"
                      }`}
                    >
                      {roomData.rainDetected ? "Detected" : "Clear"}
                    </span>
                  </div>
                )}

                {roomData.hasOwnProperty("emergencyOn") && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Emergency</span>
                    <span
                      className={`font-semibold ${
                        roomData.emergencyOn ? "text-red-400" : "text-green-400"
                      }`}
                    >
                      {console.log(roomData.emergencyOn)}
                      {roomData.emergencyOn ? "ACTIVE" : "Clear"}
                    </span>
                  </div>
                )}

                {roomData.hasOwnProperty("alert") && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Alert Status</span>
                    <span
                      className={`font-semibold ${
                        roomData.alert ? "text-red-400" : "text-green-400"
                      }`}
                    >
                      {roomData.alert ? "ALERT" : "Normal"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Security Status */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-xl font-semibold mb-4 text-white">
            Security Status
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      sensorData.garage?.doorOpen
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                  ></div>
                  <span>Garage Door</span>
                </div>
                <span
                  className={`font-semibold ${
                    sensorData.garage?.doorOpen
                      ? "text-yellow-400"
                      : "text-green-400"
                  }`}
                >
                  {sensorData.garage?.doorOpen ? "Open" : "Closed"}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      sensorData["living room"]?.emergencyOn
                        ? "bg-red-500"
                        : "bg-green-500"
                    }`}
                  ></div>
                  <span>Emergency Status</span>
                </div>
                <span
                  className={`font-semibold ${
                    sensorData["living room"]?.emergencyOn
                      ? "text-red-400"
                      : "text-green-400"
                  }`}
                >
                  {sensorData["living room"]?.emergencyOn ? "Active" : "Clear"}
                </span>
              </div>
            </div>

            <div className="flex justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={getSecurityStatus()}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {getSecurityStatus().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 mt-8">
          <button
            onClick={fetchSensorData}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
