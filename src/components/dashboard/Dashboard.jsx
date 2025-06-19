import { useState, useEffect } from 'react';
import './Dashboard.css';

const Dashboard = () => {
  const [sensorData, setSensorData] = useState({
    temperature: 0,
    humidity: 0,
    lightLevel: 0,
    motionDetected: false,
    doorStatus: 'closed',
    lastUpdate: new Date()
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate data fetching every 3 seconds
    const fetchSensorData = async () => {
      try {
        // TODO: Replace with actual API call
        // const response = await sensorAPI.getAllSensors();
        // setSensorData(response.data);
        
        // Placeholder simulation
        setSensorData({
          temperature: Math.floor(Math.random() * 10) + 20,
          humidity: Math.floor(Math.random() * 20) + 40,
          lightLevel: Math.floor(Math.random() * 100),
          motionDetected: Math.random() > 0.7,
          doorStatus: Math.random() > 0.5 ? 'open' : 'closed',
          lastUpdate: new Date()
        });
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch sensor data:', error);
        setIsLoading(false);
      }
    };

    fetchSensorData();
    const interval = setInterval(fetchSensorData, 3000);

    return () => clearInterval(interval);
  }, []);

  const getSensorStatusColor = (value, type) => {
    switch (type) {
      case 'temperature':
        if (value < 18) return 'var(--primary-blue)';
        if (value > 28) return '#ef4444';
        return '#22c55e';
      case 'humidity':
        if (value < 30 || value > 70) return '#ef4444';
        return '#22c55e';
      case 'light':
        if (value < 20) return 'var(--text-muted)';
        return '#22c55e';
      default:
        return 'var(--text-secondary)';
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="flex-center full-height">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Smart Home Dashboard</h1>
        <p className="dashboard-subtitle">
          Monitor and control your home environment
        </p>
        <div className="last-update">
          Last updated: {sensorData.lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="sensor-card">
          <div className="sensor-header">
            <h3 className="sensor-title">Temperature</h3>
            <div 
              className="sensor-status"
              style={{ backgroundColor: getSensorStatusColor(sensorData.temperature, 'temperature') }}
            ></div>
          </div>
          <div className="sensor-value">
            {sensorData.temperature}°C
          </div>
          <div className="sensor-description">
            Indoor temperature reading
          </div>
        </div>

        <div className="sensor-card">
          <div className="sensor-header">
            <h3 className="sensor-title">Humidity</h3>
            <div 
              className="sensor-status"
              style={{ backgroundColor: getSensorStatusColor(sensorData.humidity, 'humidity') }}
            ></div>
          </div>
          <div className="sensor-value">
            {sensorData.humidity}%
          </div>
          <div className="sensor-description">
            Relative humidity level
          </div>
        </div>

        <div className="sensor-card">
          <div className="sensor-header">
            <h3 className="sensor-title">Light Level</h3>
            <div 
              className="sensor-status"
              style={{ backgroundColor: getSensorStatusColor(sensorData.lightLevel, 'light') }}
            ></div>
          </div>
          <div className="sensor-value">
            {sensorData.lightLevel}%
          </div>
          <div className="sensor-description">
            Ambient light intensity
          </div>
        </div>

        <div className="sensor-card">
          <div className="sensor-header">
            <h3 className="sensor-title">Motion Sensor</h3>
            <div 
              className="sensor-status"
              style={{ backgroundColor: sensorData.motionDetected ? '#ef4444' : '#22c55e' }}
            ></div>
          </div>
          <div className="sensor-value">
            {sensorData.motionDetected ? 'Detected' : 'Clear'}
          </div>
          <div className="sensor-description">
            Motion detection status
          </div>
        </div>

        <div className="sensor-card">
          <div className="sensor-header">
            <h3 className="sensor-title">Door Status</h3>
            <div 
              className="sensor-status"
              style={{ backgroundColor: sensorData.doorStatus === 'open' ? '#ef4444' : '#22c55e' }}
            ></div>
          </div>
          <div className="sensor-value capitalize">
            {sensorData.doorStatus}
          </div>
          <div className="sensor-description">
            Main door position
          </div>
        </div>

        <div className="sensor-card system-status">
          <div className="sensor-header">
            <h3 className="sensor-title">System Status</h3>
            <div 
              className="sensor-status"
              style={{ backgroundColor: '#22c55e' }}
            ></div>
          </div>
          <div className="sensor-value">
            Online
          </div>
          <div className="sensor-description">
            All systems operational
          </div>
        </div>
      </div>

      <div className="dashboard-actions">
        <button className="btn btn-primary">
          Refresh Data
        </button>
        <button className="btn btn-secondary">
          System Settings
        </button>
      </div>
    </div>
  );
};

export default Dashboard;