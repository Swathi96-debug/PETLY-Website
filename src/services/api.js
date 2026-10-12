/**
 * PETLY Frontend API Service
 * Centralized HTTP request utility with JWT bearer token attachment,
 * error handling, and domain-specific endpoints.
 * 
 * NOTE ON SECURITY:
 * JWT tokens are stored in browser localStorage ('petly_token') for client-side
 * session persistence in this educational/prototype application. In production
 * environments handling highly sensitive financial or medical data, consider
 * httpOnly, secure, SameSite cookies to mitigate XSS exposure risks.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Generic request helper
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = { ...options.headers };

  // Attach JWT Bearer token if present
  const token = localStorage.getItem('petly_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Handle JSON vs FormData
  let body = options.body;
  if (body && !(body instanceof FormData) && typeof body === 'object') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      body,
    });

    // Parse JSON response if available
    let data = {};
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { message: text };
    }

    if (!response.ok) {
      const errorMessage = data.message || `Request failed with status ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    // Network or server error
    if (!error.status) {
      error.message = error.message || 'Unable to connect to PETLY server. Please check your connection.';
    }
    throw error;
  }
}

// HTTP Methods
export const api = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PUT', body }),
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
};

// ==========================================
// AUTH API
// ==========================================
export const authAPI = {
  signup: (userData) => api.post('/auth/signup', userData),
  login: (identifier, password) => {
    const isEmail = identifier && identifier.includes('@');
    return api.post('/auth/login', {
      email: isEmail ? identifier : undefined,
      phone: !isEmail ? identifier : undefined,
      identifier,
      password,
    });
  },
  getMe: () => api.get('/auth/me'),
  cognitoSync: (tokens) => api.post('/auth/cognito-sync', tokens),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  changePassword: (passwords) => api.put('/auth/change-password', passwords),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
};

// ==========================================
// LOCATION API (STRUCTURED PIN VERIFICATION)
// ==========================================
export const locationAPI = {
  lookupPincode: (pincode) => api.get(`/location/pincode/${pincode}`),
};

// ==========================================
// PETS API (PHASE 4A)
// ==========================================
export const petsAPI = {
  getAll: (params = '') => api.get(`/pets${params ? `?${params}` : ''}`),
  getById: (id) => api.get(`/pets/${id}`),
  create: (petData) => api.post('/pets', petData),
  update: (id, petData) => api.put(`/pets/${id}`, petData),
  delete: (id) => api.delete(`/pets/${id}`),
};

// ==========================================
// UPLOAD API (PHASE 2 S3 INTEGRATION)
// ==========================================
export const uploadAPI = {
  /**
   * Upload file to AWS S3
   * @param {File} file
   * @param {string} type - 'pet', 'avatar', 'document', etc.
   */
  uploadFile: async (file, type = 'pet') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return api.post('/uploads', formData);
  },
  getPresignedUrl: (key) => api.get(`/uploads/presigned-url?key=${encodeURIComponent(key)}`),
};

// ==========================================
// HEALTH API (PHASE 4B)
// ==========================================
export const healthAPI = {
  getAll: (params = '') => api.get(`/health${params ? `?${params}` : ''}`),
  getById: (id) => api.get(`/health/${id}`),
  create: (recordData) => api.post('/health', recordData),
  update: (id, recordData) => api.put(`/health/${id}`, recordData),
  delete: (id) => api.delete(`/health/${id}`),
};

// ==========================================
// DOCUMENTS API (PHASE 4B - S3 MEDICAL VAULT)
// ==========================================
export const documentsAPI = {
  getAll: (params = '') => api.get(`/documents${params ? `?${params}` : ''}`),
  upload: (data) => api.post('/documents', data),
  getPresignedUrl: (id) => api.get(`/documents/${id}/presigned-url`),
  delete: (id) => api.delete(`/documents/${id}`),
};

// ==========================================
// ADOPTION API (PHASE 5)
// ==========================================
export const adoptionAPI = {
  getAll: (params = '') => api.get(`/adoption${params ? `?${params}` : ''}`),
  getById: (id) => api.get(`/adoption/${id}`),
  create: (listingData) => api.post('/adoption', listingData),
  update: (id, listingData) => api.put(`/adoption/${id}`, listingData),
  delete: (id) => api.delete(`/adoption/${id}`),
  apply: (listingId, applicationData) => api.post(`/adoption/${listingId}/apply`, applicationData),
  getMyApplications: () => api.get('/adoption/applications/my'),
  getListingApplications: (listingId) => api.get(`/adoption/${listingId}/applications`),
  updateApplicationStatus: (id, data) => api.put(`/adoption/applications/${id}`, data),
  deleteApplication: (id) => api.delete(`/adoption/applications/${id}`),
};

// ==========================================
// COMMUNITY API (PHASE 6)
// ==========================================
export const communityAPI = {
  getPosts: (params = '') => api.get(`/community/posts${params ? `?${params}` : ''}`),
  getPostById: (id) => api.get(`/community/posts/${id}`),
  createPost: (postData) => api.post('/community/posts', postData),
  updatePost: (id, postData) => api.put(`/community/posts/${id}`, postData),
  deletePost: (id) => api.delete(`/community/posts/${id}`),
  toggleLike: (id) => api.post(`/community/posts/${id}/like`),
  toggleVote: (id, voteType = 'up') => api.post(`/community/posts/${id}/like`, { voteType }),
  toggleSave: (id) => api.post(`/community/posts/${id}/save`),
  getComments: (postId) => api.get(`/community/posts/${postId}/comments`),
  addComment: (postId, commentData) => api.post(`/community/posts/${postId}/comments`, commentData),
  updateComment: (id, commentData) => api.put(`/community/comments/${id}`, commentData),
  deleteComment: (id) => api.delete(`/community/comments/${id}`),
  getSocieties: () => api.get('/community/societies'),
  createSociety: (societyData) => api.post('/community/societies', societyData),
  deleteSociety: (id) => api.delete(`/community/societies/${id}`),
};

// ==========================================
// QUIZ API (PHASE 7)
// ==========================================
export const quizAPI = {
  getQuestions: (params = '') => api.get(`/quiz/questions${params ? `?${params}` : ''}`),
  getQuestionById: (id) => api.get(`/quiz/questions/${id}`),
  createQuestion: (questionData) => api.post('/quiz/questions', questionData),
  updateQuestion: (id, questionData) => api.put(`/quiz/questions/${id}`, questionData),
  deleteQuestion: (id) => api.delete(`/quiz/questions/${id}`),
  submitAttempt: (attemptData) => api.post('/quiz/attempts', attemptData),
  getMyAttempts: () => api.get('/quiz/attempts'),
  getAttemptById: (id) => api.get(`/quiz/attempts/${id}`),
  // Companion Matches (Phase 7 Extension)
  saveCompanionMatch: (matchData) => api.post('/quiz/companion/matches', matchData),
  getMyCompanionMatches: () => api.get('/quiz/companion/matches'),
  getCompanionMatchById: (id) => api.get(`/quiz/companion/matches/${id}`),
};

// ==========================================
// STORE API (PHASE 8)
// ==========================================
export const storeAPI = {
  getProducts: (params = '') => api.get(`/store/products${params ? `?${params}` : ''}`),
  getProductById: (id) => api.get(`/store/products/${id}`),
  getProductReviews: (productId) => api.get(`/store/products/${productId}/reviews`),
  createProductReview: (productId, reviewData) => api.post(`/store/products/${productId}/reviews`, reviewData),
  updateProductReview: (reviewId, reviewData) => api.put(`/store/reviews/${reviewId}`, reviewData),
  deleteProductReview: (reviewId) => api.delete(`/store/reviews/${reviewId}`),
  getWishlist: () => api.get('/store/wishlist'),
  toggleWishlist: (productId) => api.post('/store/wishlist/toggle', { productId }),
  removeFromWishlist: (productId) => api.delete(`/store/wishlist/${productId}`),
  toggleWishlistPet: (petId) => api.post('/store/wishlist/pet/toggle', { petId }),
  removeFromWishlistPet: (petId) => api.delete(`/store/wishlist/pet/${petId}`),
  getCart: () => api.get('/store/cart'),
  addToCart: (productId, quantity = 1) => api.post('/store/cart', { productId, quantity }),
  updateCartQuantity: (productId, quantity) => api.put(`/store/cart/${productId}`, { quantity }),
  removeFromCart: (productId) => api.delete(`/store/cart/${productId}`),
  clearCart: () => api.delete('/store/cart'),
  createOrder: (orderData) => api.post('/store/orders', orderData),
  getOrders: () => api.get('/store/orders'),
  getOrderById: (id) => api.get(`/store/orders/${id}`),
  cancelOrder: (orderId) => api.put(`/store/orders/${orderId}/cancel`),
  getAddresses: () => api.get('/store/addresses'),
  addAddress: (addressData) => api.post('/store/addresses', addressData),
  setDefaultAddress: (addressId) => api.put(`/store/addresses/${addressId}/default`),
};

// ==========================================
// SERVICES API (PHASE 8C)
// ==========================================
export const servicesAPI = {
  // Providers (public)
  getProviders: (params = '') => api.get(`/services/providers${params ? `?${params}` : ''}`),
  getProviderById: (id) => api.get(`/services/providers/${id}`),
  getProviderAvailability: (id) => api.get(`/services/providers/${id}/availability`),
  // Provider reviews (public read, auth write)
  getProviderReviews: (providerId) => api.get(`/services/providers/${providerId}/reviews`),
  createProviderReview: (providerId, data) => api.post(`/services/providers/${providerId}/reviews`, data),
  updateProviderReview: (reviewId, data) => api.put(`/services/reviews/${reviewId}`, data),
  // Bookings (authenticated)
  createBooking: (data) => api.post('/services/bookings', data),
  getBookings: () => api.get('/services/bookings'),
  getBookingById: (id) => api.get(`/services/bookings/${id}`),
  cancelBooking: (id) => api.delete(`/services/bookings/${id}`),
  updateBookingStatus: (id, status) => api.put(`/services/bookings/${id}/status`, { status }),
};

// ==========================================
// NOTIFICATIONS API (PHASE 10B)
// ==========================================
export const notificationAPI = {
  getMyNotifications: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
};

// ==========================================
// ASSISTANT API (PHASE 11)
// ==========================================
export const assistantAPI = {
  chat: ({ message, petId, media, conversationId }) =>
    api.post('/assistant/chat', { message, petId, media, conversationId }),
  getConversations: () => api.get('/assistant/conversations'),
  getConversation: (id) => api.get(`/assistant/conversations/${id}`),
  createConversation: ({ title, petId, messages } = {}) =>
    api.post('/assistant/conversations', { title, petId, messages }),
  deleteConversation: (id) => api.delete(`/assistant/conversations/${id}`),
};

export default api;


