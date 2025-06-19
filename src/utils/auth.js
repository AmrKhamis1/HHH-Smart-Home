import axios from 'axios';

const API_BASE_URL = 'http://192.168.1.6:3001';

export const getStoredToken = () => {
  try {
    const storedData = localStorage.getItem('accessToken');
    if (!storedData) return null;
    
    const parsed = JSON.parse(storedData);
    return parsed.success;
  } catch (error) {
    console.error('Error getting stored token:', error);
    return null;
  }
};

export const removeToken = () => {
  localStorage.removeItem('accessToken');
};

export const validateToken = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.valid;
  } catch (error) {
    console.error('Token validation failed:', error);
    return false;
  }
};

export const validateInputs = (isSignUp, formData) => {
  const { fname, lname, email, password, rPassword } = formData;

  if (isSignUp) {
    if (!fname?.trim() || !lname?.trim()) {
      return { isValid: false, message: 'Please enter both first and last name.' };
    }

    if (!email?.trim()) {
      return { isValid: false, message: 'Please enter your email address.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, message: 'Please enter a valid email address.' };
    }

    if (!password) {
      return { isValid: false, message: 'Please enter a password.' };
    }

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()\-_=+])[A-Za-z\d@$!%*?&#^()\-_=+]{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      return { 
        isValid: false, 
        message: 'Password must be 8+ characters with uppercase, lowercase, number & special symbol.' 
      };
    }

    if (password !== rPassword) {
      return { isValid: false, message: 'Passwords do not match.' };
    }
  } else {
    if (!email?.trim()) {
      return { isValid: false, message: 'Please enter your email.' };
    }

    if (!password) {
      return { isValid: false, message: 'Please enter your password.' };
    }
  }

  return { isValid: true };
};