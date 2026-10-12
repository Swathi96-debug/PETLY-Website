import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getWishlist,
  toggleWishlistProduct,
  removeFromWishlist,
  toggleWishlistPet,
  removeFromWishlistPet,
  getCart,
  addToCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
  getProductReviews,
  createProductReview,
  updateProductReview,
  deleteProductReview,
  getUserAddresses,
  addUserAddress,
  setDefaultAddress,
} from '../controllers/storeController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';

const router = express.Router();

// Products: Public browsing
router.get('/products', getProducts);
router.get('/products/:id', getProductById);

// Products: Admin management
router.post('/products', protect, authorize('admin'), createProduct);
router.put('/products/:id', protect, authorize('admin'), updateProduct);
router.delete('/products/:id', protect, authorize('admin'), deleteProduct);

// Product Reviews
router.get('/products/:productId/reviews', getProductReviews);
router.post('/products/:productId/reviews', protect, createProductReview);
router.put('/products/:productId/reviews', protect, updateProductReview);
router.put('/reviews/:id', protect, updateProductReview);
router.delete('/reviews/:id', protect, deleteProductReview);

// Orders: Authenticated user management & status updates
router.post('/orders', protect, createOrder);
router.get('/orders', protect, getOrders);
router.get('/orders/:id', protect, getOrderById);
router.put('/orders/:id/status', protect, updateOrderStatus);
router.put('/orders/:id/cancel', protect, cancelOrder);

// Wishlist: Authenticated user management
router.get('/wishlist', protect, getWishlist);
router.post('/wishlist/toggle', protect, toggleWishlistProduct);
router.post('/wishlist/:productId', protect, toggleWishlistProduct);
router.delete('/wishlist/:productId', protect, removeFromWishlist);
router.post('/wishlist/pet/toggle', protect, toggleWishlistPet);
router.post('/wishlist/pet/:petId', protect, toggleWishlistPet);
router.delete('/wishlist/pet/:petId', protect, removeFromWishlistPet);

// Cart: Authenticated user management
router.get('/cart', protect, getCart);
router.post('/cart', protect, addToCart);
router.put('/cart/:productId', protect, updateCartQuantity);
router.delete('/cart/:productId', protect, removeFromCart);
router.delete('/cart', protect, clearCart);

// Addresses: Authenticated saved checkout addresses
router.get('/addresses', protect, getUserAddresses);
router.post('/addresses', protect, addUserAddress);
router.put('/addresses/:addressId/default', protect, setDefaultAddress);

export default router;

