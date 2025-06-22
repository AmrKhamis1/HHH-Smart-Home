import axios from "axios";

const API_BASE_URL = "http://localhost:3001";

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("accessToken");
      window.location.href = "/auth";
    }
    return Promise.reject(error);
  }
);

const getStoredToken = () => {
  try {
    const storedData = localStorage.getItem("accessToken");
    if (!storedData) return null;
    const parsed = JSON.parse(storedData);
    return parsed.success;
  } catch (error) {
    return null;
  }
};

// Auth API calls
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    return response.data;
  },

  register: async (fname, lname, email, password) => {
    const response = await api.post("/auth", { fname, lname, email, password });
    return response.data;
  },

  verifyToken: async (token) => {
    const response = await api.get("/auth/verify", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};

// Real Sensor API calls for each room
export const sensorAPI = {
  // Get living room status
  getLivingRoomStatus: async () => {
    try {
      const response = await api.post("/cat/living/status");
      return response.data;
    } catch (error) {
      console.error("Error fetching living room status:", error);
      throw error;
    }
  },

  // Get kitchen status
  getKitchenStatus: async () => {
    try {
      const response = await api.post("/cat/kitchen/status");
      return response.data;
    } catch (error) {
      console.error("Error fetching kitchen status:", error);
      throw error;
    }
  },

  // Get roof status
  getRoofStatus: async () => {
    try {
      const response = await api.post("/cat/roof/status");
      return response.data;
    } catch (error) {
      console.error("Error fetching roof status:", error);
      throw error;
    }
  },

  // Get garage status
  getGarageStatus: async () => {
    try {
      const response = await api.post("/cat/garage/status");
      return response.data;
    } catch (error) {
      console.error("Error fetching garage status:", error);
      throw error;
    }
  },

  // Get garden status
  getGardenStatus: async () => {
    try {
      const response = await api.post("/cat/garden/status");
      return response.data;
    } catch (error) {
      console.error("Error fetching garden status:", error);
      throw error;
    }
  },

  // Get bedroom status
  getBedroomStatus: async () => {
    try {
      const response = await api.post("/cat/bed/status");
      return response.data;
    } catch (error) {
      console.error("Error fetching bedroom status:", error);
      throw error;
    }
  },

  // Generic function to get status for any category
  getCategoryStatus: async (category) => {
    const categoryMap = {
      "living room": "living",
      kitchen: "kitchen",
      roof: "roof",
      garage: "garage",
      garden: "garden",
      bedroom: "bed",
      bed: "bed",
    };

    const apiCategory = categoryMap[category.toLowerCase()];
    if (!apiCategory) {
      throw new Error(`Unknown category: ${category}`);
    }

    try {
      const response = await api.post(`/cat/${apiCategory}/status`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${category} status:`, error);
      throw error;
    }
  },

  // Get all sensor data at once
  getAllSensorData: async () => {
    try {
      const [living, kitchen, roof, garage, garden, bedroom] =
        await Promise.allSettled([
          sensorAPI.getLivingRoomStatus(),
          sensorAPI.getKitchenStatus(),
          sensorAPI.getRoofStatus(),
          sensorAPI.getGarageStatus(),
          sensorAPI.getGardenStatus(),
          sensorAPI.getBedroomStatus(),
        ]);

      return {
        "living room": living.status === "fulfilled" ? living.value : null,
        kitchen: kitchen.status === "fulfilled" ? kitchen.value : null,
        roof: roof.status === "fulfilled" ? roof.value : null,
        garage: garage.status === "fulfilled" ? garage.value : null,
        garden: garden.status === "fulfilled" ? garden.value : null,
        bedroom: bedroom.status === "fulfilled" ? bedroom.value : null,
      };
    } catch (error) {
      console.error("Error fetching all sensor data:", error);
      throw error;
    }
  },
};

export default api;
