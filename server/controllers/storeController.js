import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Review from '../models/Review.js';
import { isValidObjectId } from '../utils/validateObjectId.js';
import { generatePresignedUrl } from '../utils/s3Uploader.js';

const attachProductImageUrl = async (product) => {
  if (!product) return product;
  const prodObj = product.toObject ? product.toObject() : { ...product };
  if (prodObj.imageKey) {
    try {
      prodObj.imageUrl = await generatePresignedUrl(prodObj.imageKey, 3600);
    } catch (err) {
      console.warn(`[Store] Could not generate presigned URL for key ${prodObj.imageKey}:`, err.message);
      prodObj.imageUrl = '';
    }
  } else {
    prodObj.imageUrl = '';
  }
  return prodObj;
};

// ==========================================
// PRODUCTS (ADMIN MANAGED, PUBLIC BROWSING)
// ==========================================

// @desc    Get all active products
// @route   GET /api/store/products
// @access  Public
export const getProducts = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const filter = { isActive: true };

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    const resolvedProducts = await Promise.all(products.map(attachProductImageUrl));

    res.status(200).json({
      success: true,
      count: resolvedProducts.length,
      products: resolvedProducts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product by ID
// @route   GET /api/store/products/:id
// @access  Public
export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Product ID: ${id}`,
      });
    }

    const product = await Product.findById(id);
    if (!product || (!product.isActive && (!req.user || req.user.role !== 'admin'))) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    const resolvedProduct = await attachProductImageUrl(product);

    res.status(200).json({
      success: true,
      product: resolvedProduct,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create product
// @route   POST /api/store/products
// @access  Private (Admin only)
export const createProduct = async (req, res, next) => {
  try {
    const { name, description, price, category, stock, imageKey, imageUrl, rating } = req.body;

    if (!name || price === undefined || !category) {
      return res.status(400).json({
        success: false,
        message: 'Product name, price, and category are required.',
      });
    }

    const product = await Product.create({
      name: name.trim(),
      description: description || '',
      price: Number(price),
      category: category.trim(),
      stock: stock !== undefined ? Number(stock) : 10,
      imageKey: imageKey || '',
      imageUrl: imageUrl || '',
      rating: rating !== undefined ? Number(rating) : 5,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/store/products/:id
// @access  Private (Admin only)
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Product ID: ${id}`,
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    const allowedFields = ['name', 'description', 'price', 'category', 'stock', 'imageKey', 'imageUrl', 'rating', 'isActive'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    const updated = await product.save();

    res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      product: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete (or deactivate) product
// @route   DELETE /api/store/products/:id
// @access  Private (Admin only)
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Product ID: ${id}`,
      });
    }

    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully.',
      productId: id,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ORDERS (USER CHECKOUT & HISTORY)
// ==========================================

// @desc    Create new order (with price snapshotting)
// @route   POST /api/store/orders
// @access  Private
export const createOrder = async (req, res, next) => {
  try {
    const rawItems = req.body.items || req.body.orderItems;
    const { shippingAddress } = req.body;

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item.',
      });
    }

    let totalAmount = 0;
    const frozenItems = [];

    for (const item of rawItems) {
      const productId = item.productId || item.product;
      if (!productId || !isValidObjectId(productId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid product ID: ${productId}`,
        });
      }

      const product = await Product.findById(productId);
      if (!product || !product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product is unavailable or does not exist: ${productId}`,
        });
      }

      const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
      const itemTotal = product.price * quantity;
      totalAmount += itemTotal;

      // Deduct stock if sufficient
      if (product.stock >= quantity) {
        product.stock -= quantity;
        await product.save();
      }

      // Freeze price at time of purchase!
      frozenItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity,
        image: product.image || item.image || '',
        imageKey: product.imageKey || item.imageKey || '',
      });
    }

    const order = await Order.create({
      user: req.user._id,
      items: frozenItems,
      totalAmount: Math.round(totalAmount * 100) / 100,
      shippingAddress: shippingAddress || {},
      paymentMethod: req.body.paymentMethod || 'Cash on Delivery (Demo)',
      status: 'pending',
    });

    // Notify user
    await Notification.create({
      user: req.user._id,
      type: 'order',
      title: 'Order Placed',
      message: `Your order #${order._id.toString().slice(-6)} has been placed successfully for $${order.totalAmount.toFixed(2)}.`,
      link: '/store',
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Order created successfully.',
      order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's orders
// @route   GET /api/store/orders
// @access  Private
export const getOrders = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'admin' && req.query.all === 'true') {
      // Admin viewing all orders
    } else {
      filter.user = req.user._id;
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order by ID
// @route   GET /api/store/orders/:id
// @access  Private
export const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Order ID: ${id}`,
      });
    }

    const order = await Order.findById(id).populate('items.product', 'name category imageKey');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    // Strict ownership verification
    const isOwner = order.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view your own orders.',
      });
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status
// @route   PUT /api/store/orders/:id/status
// @access  Private (Admin, or Owner if cancelling pending order)
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Order ID: ${id}`,
      });
    }

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    const isOwner = order.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    // Users can only cancel their own pending orders
    if (!isAdmin && (!isOwner || status !== 'cancelled' || order.status !== 'pending')) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own pending orders.',
      });
    }

    order.status = status;
    await order.save();

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}.`,
      order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel order (Owner only, for cancellable statuses)
// @route   PUT /api/store/orders/:orderId/cancel
// @access  Private
export const cancelOrder = async (req, res, next) => {
  try {
    const orderId = req.params.orderId || req.params.id;
    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Order ID: ${orderId}`,
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    // 1. User can cancel ONLY their own order
    const isOwner = order.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only cancel your own orders.',
      });
    }

    // Check if already cancelled
    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Order is already cancelled.',
      });
    }

    // 2. Only cancellable statuses: pending, confirmed, processing
    const cancellableStatuses = ['pending', 'confirmed', 'processing'];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel an order with status "${order.status}". Orders that are shipped, dispatched, or delivered cannot be cancelled.`,
      });
    }

    // 6. Restore stock decremented when order was placed, exactly once
    if (Array.isArray(order.items) && order.items.length > 0) {
      for (const item of order.items) {
        if (item.product && item.quantity > 0) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: item.quantity },
          });
        }
      }
    }

    // 4. Update order status to cancelled and store timestamp
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order successfully cancelled.',
      order,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// WISHLIST (AUTHENTICATED USER)
// ==========================================

// @desc    Get user's product & pet wishlist
// @route   GET /api/store/wishlist
// @access  Private
export const getWishlist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlistProducts');
    res.status(200).json({
      success: true,
      wishlist: user.wishlistProducts || [],
      wishlistPets: user.wishlistPets || [],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle product in user's wishlist
// @route   POST /api/store/wishlist/:productId
// @access  Private
export const toggleWishlistProduct = async (req, res, next) => {
  try {
    const rawId = req.params.productId || req.body.productId;
    if (!rawId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required.',
      });
    }

    let resolvedId = rawId;
    if (!isValidObjectId(rawId)) {
      const prod = await Product.findOne({ demoId: rawId });
      if (prod) {
        resolvedId = prod._id.toString();
      } else {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${rawId}`,
        });
      }
    }

    const user = await User.findById(req.user._id);
    if (!user.wishlistProducts) user.wishlistProducts = [];

    const existingIndex = user.wishlistProducts.findIndex(
      (id) => id.toString() === resolvedId.toString()
    );

    let isAdded = false;
    if (existingIndex > -1) {
      user.wishlistProducts.splice(existingIndex, 1);
    } else {
      user.wishlistProducts.push(resolvedId);
      isAdded = true;
    }

    await user.save();
    const populatedUser = await User.findById(req.user._id).populate('wishlistProducts');

    res.status(200).json({
      success: true,
      message: isAdded ? 'Product added to wishlist.' : 'Product removed from wishlist.',
      isAdded,
      wishlist: populatedUser.wishlistProducts || [],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove product from user's wishlist
// @route   DELETE /api/store/wishlist/:productId
// @access  Private
export const removeFromWishlist = async (req, res, next) => {
  try {
    const rawId = req.params.productId;
    if (!rawId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required.',
      });
    }

    let resolvedId = rawId;
    if (!isValidObjectId(rawId)) {
      const prod = await Product.findOne({ demoId: rawId });
      if (prod) {
        resolvedId = prod._id.toString();
      }
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.wishlistProducts = (user.wishlistProducts || []).filter(
      (id) => id.toString() !== rawId.toString() && id.toString() !== resolvedId.toString()
    );
    await user.save();

    const populatedUser = await User.findById(req.user._id).populate('wishlistProducts');

    res.status(200).json({
      success: true,
      message: 'Product removed from wishlist.',
      wishlist: populatedUser.wishlistProducts || [],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle pet in user's wishlist
// @route   POST /api/store/wishlist/pet/toggle
// @access  Private
export const toggleWishlistPet = async (req, res, next) => {
  try {
    const petId = String(req.params.petId || req.body.petId || '').trim();
    if (!petId) {
      return res.status(400).json({
        success: false,
        message: 'Pet ID is required.',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.wishlistPets) user.wishlistPets = [];

    const existingIndex = user.wishlistPets.findIndex(
      (id) => String(id) === petId
    );

    let isAdded = false;
    if (existingIndex > -1) {
      user.wishlistPets.splice(existingIndex, 1);
    } else {
      user.wishlistPets.push(petId);
      isAdded = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: isAdded ? 'Pet added to wishlist.' : 'Pet removed from wishlist.',
      isAdded,
      wishlistPets: user.wishlistPets,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove pet from user's wishlist
// @route   DELETE /api/store/wishlist/pet/:petId
// @access  Private
export const removeFromWishlistPet = async (req, res, next) => {
  try {
    const petId = String(req.params.petId || '').trim();
    if (!petId) {
      return res.status(400).json({
        success: false,
        message: 'Pet ID is required.',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.wishlistPets = (user.wishlistPets || []).filter(
      (id) => String(id) !== petId
    );
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Pet removed from wishlist.',
      wishlistPets: user.wishlistPets,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CART (AUTHENTICATED USER)
// ==========================================

// @desc    Get user's cart
// @route   GET /api/store/cart
// @access  Private
export const getCart = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'cart.product',
      select: 'name price category image imageKey stock isActive',
    });

    res.status(200).json({
      success: true,
      cart: user.cart || [],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add item to cart or increment quantity
// @route   POST /api/store/cart
// @access  Private
export const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;
    if (!isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Product ID: ${productId}`,
      });
    }

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or unavailable.',
      });
    }

    const user = await User.findById(req.user._id);
    const cartItem = user.cart.find((item) => item.product.toString() === productId.toString());

    const qtyToAdd = Math.max(1, Number(quantity) || 1);
    if (cartItem) {
      cartItem.quantity += qtyToAdd;
    } else {
      user.cart.push({ product: productId, quantity: qtyToAdd });
    }

    await user.save();
    await user.populate('cart.product', 'name price category image imageKey stock isActive');

    res.status(200).json({
      success: true,
      message: 'Product added to cart.',
      cart: user.cart,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/store/cart/:productId
// @access  Private
export const updateCartQuantity = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    const user = await User.findById(req.user._id);
    const cartItem = user.cart.find((item) => item.product.toString() === productId.toString());

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not in cart.',
      });
    }

    const newQty = Number(quantity);
    if (newQty <= 0) {
      user.cart = user.cart.filter((item) => item.product.toString() !== productId.toString());
    } else {
      cartItem.quantity = newQty;
    }

    await user.save();
    await user.populate('cart.product', 'name price category image imageKey stock isActive');

    res.status(200).json({
      success: true,
      message: 'Cart updated.',
      cart: user.cart,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/store/cart/:productId
// @access  Private
export const removeFromCart = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const user = await User.findById(req.user._id);
    user.cart = user.cart.filter((item) => item.product.toString() !== productId.toString());
    await user.save();
    await user.populate('cart.product', 'name price category image imageKey stock isActive');

    res.status(200).json({
      success: true,
      message: 'Item removed from cart.',
      cart: user.cart,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear entire cart
// @route   DELETE /api/store/cart
// @access  Private
export const clearCart = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.cart = [];
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully.',
      cart: [],
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// PRODUCT REVIEWS
// ==========================================

// Helper to recalculate product rating & reviewsCount
const recalculateProductRating = async (productId) => {
  const reviews = await Review.find({ targetType: 'product', targetId: productId });
  const reviewsCount = reviews.length;
  let rating = 5;
  if (reviewsCount > 0) {
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    rating = Math.round((sum / reviewsCount) * 10) / 10;
  }
  await Product.findByIdAndUpdate(productId, { rating, reviewsCount });
};

// @desc    Get reviews for a product
// @route   GET /api/store/products/:productId/reviews
// @access  Public
export const getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    if (!isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Product ID: ${productId}`,
      });
    }

    const reviews = await Review.find({ targetType: 'product', targetId: productId })
      .populate('user', 'fullName avatarUrl')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create review for a product
// @route   POST /api/store/products/:productId/reviews
// @access  Private
export const createProductReview = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { rating, reviewText } = req.body;

    if (!isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Product ID: ${productId}`,
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    if (!rating || !reviewText) {
      return res.status(400).json({
        success: false,
        message: 'Rating (1-5) and review text are required.',
      });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      targetType: 'product',
      targetId: productId,
      user: req.user._id,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product. Please update your existing review.',
      });
    }

    const review = await Review.create({
      user: req.user._id,
      targetType: 'product',
      targetId: productId,
      product: productId,
      rating: Number(rating),
      reviewText: reviewText.trim(),
    });

    await recalculateProductRating(productId);

    res.status(201).json({
      success: true,
      message: 'Review created successfully.',
      review,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product review
// @route   PUT /api/store/reviews/:id
// @access  Private (Owner only)
export const updateProductReview = async (req, res, next) => {
  try {
    const rawId = req.params.id || req.params.productId;
    const { rating, reviewText } = req.body;

    if (!rawId || !isValidObjectId(rawId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ID: ${rawId}`,
      });
    }

    // Attempt lookup by review _id first
    let review = await Review.findById(rawId);
    if (!review) {
      // If not found by review ID, check if rawId was productId and find user's review
      review = await Review.findOne({
        targetType: 'product',
        targetId: rawId,
        user: req.user._id,
      });
    }

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found.',
      });
    }

    // Strict ownership verification: only review owner can update
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only edit your own reviews.',
      });
    }

    // Validate rating
    if (rating !== undefined) {
      const numRating = Number(rating);
      if (isNaN(numRating) || numRating < 1 || numRating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be a number between 1 and 5.',
        });
      }
      review.rating = numRating;
    }

    // Validate reviewText
    if (reviewText !== undefined) {
      const text = typeof reviewText === 'string' ? reviewText.trim() : '';
      if (!text) {
        return res.status(400).json({
          success: false,
          message: 'Review text cannot be empty.',
        });
      }
      if (text.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Review text cannot exceed 1000 characters.',
        });
      }
      review.reviewText = text;
    }

    await review.save();

    // Recalculate the product's average rating (review count stays identical)
    await recalculateProductRating(review.targetId);

    // Populate user for consistent client display
    await review.populate('user', 'fullName avatarUrl');

    res.status(200).json({
      success: true,
      message: 'Review updated successfully.',
      review,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product review
// @route   DELETE /api/store/reviews/:id
// @access  Private (Owner or Admin)
export const deleteProductReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found.',
      });
    }

    const isOwner = review.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only delete your own reviews.',
      });
    }

    const targetId = review.targetId;
    await Review.findByIdAndDelete(id);

    await recalculateProductRating(targetId);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// USER ADDRESSES (AUTHENTICATED CHECKOUT)
// ==========================================

const DEMO_INDIAN_ADDRESSES = [
  {
    label: 'Home',
    recipientName: 'Swathi',
    phone: '+91 98765 43210',
    addressLine: 'Flat 402, Lotus Heights, 12th Main Road, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560038',
    isDefault: true,
  },
  {
    label: 'Office',
    recipientName: 'Swathi',
    phone: '+91 98765 43210',
    addressLine: 'Level 4, Innov8 Tech Hub, Outer Ring Road, Bellandur',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560103',
    isDefault: false,
  },
];

// @desc    Get user's saved addresses
// @route   GET /api/store/addresses
// @access  Private
export const getUserAddresses = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Seed realistic demo Indian addresses if user currently has none
    if (!user.addresses || user.addresses.length === 0) {
      const recipient = user.fullName || 'Swathi';
      user.addresses = DEMO_INDIAN_ADDRESSES.map((addr) => ({
        ...addr,
        recipientName: recipient,
        phone: user.phone || addr.phone,
      }));
      await user.save();
    }

    res.status(200).json({
      success: true,
      addresses: user.addresses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a new address
// @route   POST /api/store/addresses
// @access  Private
export const addUserAddress = async (req, res, next) => {
  try {
    const { label, recipientName, phone, addressLine, city, state, postalCode, isDefault } = req.body;

    if (!recipientName || !phone || !addressLine || !city || !state || !postalCode) {
      return res.status(400).json({
        success: false,
        message: 'Recipient name, phone, address line, city, state, and postal code are required.',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.addresses) {
      user.addresses = [];
    }

    const shouldBeDefault = isDefault || user.addresses.length === 0;

    if (shouldBeDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    const newAddress = {
      label: label || 'Home',
      recipientName: recipientName.trim(),
      phone: phone.trim(),
      addressLine: addressLine.trim(),
      city: city.trim(),
      state: state.trim(),
      postalCode: postalCode.trim(),
      isDefault: Boolean(shouldBeDefault),
    };

    user.addresses.push(newAddress);
    await user.save();

    const createdAddress = user.addresses[user.addresses.length - 1];

    res.status(201).json({
      success: true,
      message: 'Address added successfully.',
      address: createdAddress,
      addresses: user.addresses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Set default address
// @route   PUT /api/store/addresses/:addressId/default
// @access  Private
export const setDefaultAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let found = false;
    user.addresses.forEach((addr) => {
      if (addr._id.toString() === addressId) {
        addr.isDefault = true;
        found = true;
      } else {
        addr.isDefault = false;
      }
    });

    if (!found) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Default address updated.',
      addresses: user.addresses,
    });
  } catch (error) {
    next(error);
  }
};

