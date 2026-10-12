# PETLY — Codebase Implementation & Database Systems Audit (Assessment 9)

**Student Name:** Venkata Sai Swathi Kota  
**Register No.:** 24BDS0172  
**Lab Slot:** L11+L12  
**Course:** BCSE302P — Database Systems Lab  
**Baseline Reference:** Assessment 6 Project Proposal & Database Design Document  
**Source of Truth:** Live Project Codebase (`server/`, `src/`, `api/`)  

---

### Audit Scope & Pre-Audit Verification Summary

1. **Database Models:** All **20 Mongoose models** identified in Assessment 6 were inspected in `server/models/`. All 20 models exist, compile, and are actively referenced across backend controllers.
2. **Server Architecture:** Mounted in [server.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/server.js) with 13 modular API routers (`/api/auth`, `/api/uploads`, `/api/pets`, `/api/health`, `/api/documents`, `/api/adoption`, `/api/community`, `/api/quiz`, `/api/store`, `/api/services`, `/api/notifications`, `/api/location`, `/api/assistant`).
3. **Deployment Topology:** Hybrid single-page application (React 19 / Vite 8) with serverless-compatible Express 4 backend running on Vercel (`vercel.json`), backed by MongoDB Atlas, AWS S3 (`@aws-sdk/client-s3`), AWS Cognito, and Google Gemini API (`gemini-3.8-flash` primary model).

---

## Part 1: Feature-by-Feature Detailed Implementation Audit

---

### 1. Authentication and User Management
* **Frontend Implementation:** [Login.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/Login.jsx), [Signup.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/Signup.jsx), [ForgotPassword.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/ForgotPassword.jsx), [Profile.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/Profile.jsx), backed by [AuthContext.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/context/AuthContext.jsx) and `authAPI` in [api.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/services/api.js).
* **Backend Route / API:** `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`, `PUT /api/auth/profile`, `PUT /api/auth/change-password`, `POST /api/auth/forgot-password`, `PUT /api/auth/reset-password/:resetToken`, `POST /api/auth/cognito-sync` in [authRoutes.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/routes/authRoutes.js).
* **Controller:** [authController.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/controllers/authController.js).
* **MongoDB / Mongoose Model:** [User.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/models/User.js) (`users` collection).
* **Database Operation(s):**
  * `User.create({ fullName, email, phone, location, password, role, shelterDetails })` (password hashed via pre-save hook).
  * `User.findOne({ $or: [{ email }, { phone }] }).select('+password')`.
  * `User.findById(req.user._id)`.
  * `User.findByIdAndUpdate` / `user.save()`.
  * `User.findOne({ resetPasswordToken, resetPasswordExpire: { $gt: Date.now() } })`.
* **Current Implementation Status:** **IMPLEMENTED**
* **Important Notes / Limitations:**
  * Strict security check: public signup rejects `role === 'admin'` with `403 Forbidden`. Only `user` and `shelter` can self-register.
  * Hashed tokens for password reset expire in 10 minutes (`crypto.randomBytes(20)` hashed via `SHA-256`).
  * In the development/demo environment, `resetToken` is returned in the API response JSON for verification and UI autofill, as production SMTP/SES email dispatch is not active.

---

### 2. Pet Management
* **Frontend Implementation:** [HealthHub.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/HealthHub.jsx), [Profile.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/Profile.jsx), [PetDetail.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/PetDetail.jsx), backed by `petsAPI` in [api.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/services/api.js).
* **Backend Route / API:** `POST /api/pets`, `GET /api/pets`, `GET /api/pets/:id`, `PUT /api/pets/:id`, `DELETE /api/pets/:id` in [petRoutes.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/routes/petRoutes.js).
* **Controller:** [petController.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/controllers/petController.js).
* **MongoDB / Mongoose Model:** [Pet.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/models/Pet.js) (`pets` collection).
* **Database Operation(s):**
  * `Pet.create({ name, species, breed, age, gender, weight, healthStatus, owner: req.user._id, ... })`.
  * `Pet.find({ owner: req.user._id }).sort({ createdAt: -1 })`.
  * `Pet.findById(id)` (with ownership / historical ownership / admin validation).
  * `pet.save()` with allowed field whitelist.
  * Cascade delete: `HealthRecord.deleteMany({ pet: pet._id })`, `MedicalDocument.find({ pet: pet._id })` + `deleteS3Object()`, `MedicalDocument.deleteMany({ pet: pet._id })`, `Pet.findByIdAndDelete(pet._id)`.
* **Current Implementation Status:** **IMPLEMENTED**
* **Important Notes / Limitations:**
  * Read operations dynamically resolve temporary S3 presigned URLs for `photoKey` without modifying the persistent document in MongoDB Atlas.
  * Pet profile fields support structured medical traits: `allergies: [String]`, `medicalConditions: [String]`, `dob`, `adoptionDate`, `temperature`, `height`, `color`, and `themeColor`.

---

### 3. Health Records
* **Frontend Implementation:** [HealthHub.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/HealthHub.jsx) (interactive logs, category filters, vaccination trackers, and Recharts weight telemetry), backed by `healthAPI` in [api.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/services/api.js).
* **Backend Route / API:** `POST /api/health`, `GET /api/health`, `GET /api/health/:id`, `PUT /api/health/:id`, `DELETE /api/health/:id` in [healthRoutes.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/routes/healthRoutes.js).
* **Controller:** [healthController.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/controllers/healthController.js).
* **MongoDB / Mongoose Model:** [HealthRecord.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/models/HealthRecord.js) (`healthrecords` collection).
* **Database Operation(s):**
  * `HealthRecord.create({ pet, owner: req.user._id, type, title, date, value, status, notes })`.
  * `HealthRecord.find(filter).populate('pet', 'name species breed').sort({ date: -1, createdAt: -1 })`.
  * Smart ownership filtering: `filter.$or = [{ owner: req.user._id }, { pet: { $in: userPetIds } }]` ensuring new pet adopters inherit historical medical events.
  * `HealthRecord.findByIdAndUpdate` / `record.save()`.
  * `HealthRecord.findByIdAndDelete(id)`.
* **Current Implementation Status:** **IMPLEMENTED**
* **Important Notes / Limitations:**
  * Enforces enum: `general`, `vaccination`, `medication`, `appointment`, `weight`, `diagnosis`, `other`.
  * Includes `isHistorical` boolean flag and `preAdoptionOwner` reference set during adoption transfers to preserve provenance.

---

### 4. Medical Documents
* **Frontend Implementation:** [HealthHub.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/HealthHub.jsx) (Medical Documents Vault tab with PDF upload modal and secure view triggers), backed by `documentsAPI` in [api.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/services/api.js).
* **Backend Route / API:** `POST /api/documents`, `GET /api/documents`, `GET /api/documents/:id/presigned-url`, `DELETE /api/documents/:id` in [documentRoutes.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/routes/documentRoutes.js).
* **Controller:** [documentController.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/controllers/documentController.js).
* **MongoDB / Mongoose Model:** [MedicalDocument.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/models/MedicalDocument.js) (`medicaldocuments` collection).
* **Database Operation(s):**
  * `MedicalDocument.create({ pet, owner, title, category, s3Key, originalName, contentType, size, notes })`.
  * `MedicalDocument.find(filter).populate('pet', 'name species breed').sort({ createdAt: -1 })`.
  * Two-phase delete: verifies `!doc.isHistorical`, verifies owner, deletes object from AWS S3 via `deleteS3Object(doc.s3Key)`, then executes `MedicalDocument.findByIdAndDelete(id)`. If S3 fails (unless `NoSuchKey`), MongoDB document is preserved to prevent orphaned storage.
* **Current Implementation Status:** **IMPLEMENTED**
* **Important Notes / Limitations:**
  * Binary files are **never** stored in MongoDB (no base64 blobs in database). Only metadata is stored.
  * Access to the document is mediated via `generatePresignedUrl(doc.s3Key, 3600)`.
  * Historical medical documents created by previous owners cannot be deleted by adopters (`isHistorical: true` check blocks deletion).

---

### 5. Adoption Listings
* **Frontend Implementation:** [Adopt.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/Adopt.jsx) (Sanctuary Listings feed, species/status filtering, and "List a Companion" modal for shelters/owners), backed by `adoptionAPI` in [api.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/services/api.js).
* **Backend Route / API:** `GET /api/adoption`, `GET /api/adoption/:id`, `POST /api/adoption`, `PUT /api/adoption/:id`, `DELETE /api/adoption/:id` in [adoptionRoutes.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/routes/adoptionRoutes.js).
* **Controller:** [adoptionController.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/controllers/adoptionController.js).
* **MongoDB / Mongoose Model:** [AdoptionListing.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/models/AdoptionListing.js) (`adoptionlistings` collection).
* **Database Operation(s):**
  * `AdoptionListing.create({ pet, shelter: req.user._id, title, description, adoptionFee, requirements, location, status: 'available' })`.
  * `AdoptionListing.find(filter).populate('pet').populate('shelter', 'fullName email phone shelterDetails').sort({ createdAt: -1 })`.
  * `AdoptionListing.findById(id).populate('pet').populate('shelter', ...)`.
  * `AdoptionListing.findByIdAndUpdate(id, updates)`.
  * `AdoptionListing.findByIdAndDelete(id)`.
* **Current Implementation Status:** **IMPLEMENTED**
* **Important Notes / Limitations:**
  * Public users can browse active listings without logging in; creating a listing requires authentication.
  * When a pet is listed, `Pet.adoptionStatus` transitions to `AVAILABLE` and `Pet.isAdoptable` becomes `true`.

---

### 6. Adoption Applications & Ownership Transfer
* **Frontend Implementation:** [Adopt.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/Adopt.jsx) ("My Applications" tracking view, "Manage Listing Inquiries" drawer with Approve/Reject controls), backed by `adoptionAPI` in [api.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/services/api.js).
* **Backend Route / API:** `POST /api/adoption/:listingId/apply`, `GET /api/adoption/applications/my`, `GET /api/adoption/:listingId/applications`, `PUT /api/adoption/applications/:id`, `DELETE /api/adoption/applications/:id` in [adoptionRoutes.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/routes/adoptionRoutes.js).
* **Controller:** [adoptionController.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/controllers/adoptionController.js).
* **MongoDB / Mongoose Model:** [AdoptionApplication.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/models/AdoptionApplication.js) (`adoptionapplications` collection).
* **Database Operation(s):**
  * `AdoptionApplication.create({ applicant: req.user._id, listing: listing._id, pet: listing.pet, shelter: listing.shelter, livingSituation, experience, phone, notes })`.
  * `AdoptionApplication.find({ applicant: req.user._id }).populate({ path: 'listing', populate: { path: 'pet' } }).populate('shelter', 'fullName email')`.
  * `AdoptionApplication.find({ listing: listingId }).populate('applicant', 'fullName email phone')`.
  * **Ownership Transfer Transaction:**
    ```javascript
    session = await mongoose.startSession();
    session.startTransaction();
    // 1. Snapshot previous state & push to Pet.adoptionHistory
    pet.adoptionHistory.push({ previousOwner, newOwner: adopterId, application: app._id, listing, date: new Date(), snapshot });
    // 2. Transfer ownership
    pet.owner = adopterId;
    pet.adoptionStatus = 'ADOPTED';
    pet.isAdoptable = false;
    await pet.save({ session });
    // 3. Mark listing adopted
    await AdoptionListing.findByIdAndUpdate(listingId, { status: 'adopted' }, { session });
    // 4. Cascade historical flags to health records & medical documents
    await HealthRecord.updateMany({ pet: pet._id }, { $set: { isHistorical: true, preAdoptionOwner: previousOwner } }, { session });
    await MedicalDocument.updateMany({ pet: pet._id }, { $set: { isHistorical: true, preAdoptionOwner: previousOwner } }, { session });
    await session.commitTransaction();
    ```
  * Dispatches an in-app `Notification` to the applicant upon approval or rejection.
* **Current Implementation Status:** **IMPLEMENTED**
* **Important Notes / Limitations:**
  * Implements fallback sequential updates if MongoDB is running as a single-node replica set without transactions.

---

### 7. Store & Products
* **Frontend Implementation:** [Store.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/Store.jsx) (category tabs, price sorting, search filtering, product cards, stock indicators, and details modal), backed by `storeAPI` in [api.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/services/api.js).
* **Backend Route / API:** `GET /api/store/products`, `GET /api/store/products/:id`, `POST /api/store/products` (admin), `PUT /api/store/products/:id` (admin), `DELETE /api/store/products/:id` (admin) in [storeRoutes.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/routes/storeRoutes.js).
* **Controller:** [storeController.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/controllers/storeController.js).
* **MongoDB / Mongoose Model:** [Product.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/models/Product.js) (`products` collection).
* **Database Operation(s):**
  * `Product.find({ isActive: true, ...filters }).sort(sortCriteria)`.
  * `Product.findById(id)`.
  * `Product.create(productData)` (restricted to `role: 'admin'`).
  * `Product.findByIdAndUpdate(id, updates)`.
  * `Product.findByIdAndUpdate(id, { isActive: false })` (soft delete) or `Product.findByIdAndDelete(id)`.
* **Current Implementation Status:** **IMPLEMENTED**
* **Important Notes / Limitations:**
  * Products include default seeded demo catalogs with fallback emoji badges (`📦`, `🥩`, `🧶`) if S3 images are not configured.

---

### 8. Cart and Wishlist
* **Frontend Implementation:** [Store.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/Store.jsx) (flyout drawer with quantity steppers), [Wishlist.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/Wishlist.jsx) (dual tab view for saved store items and favorited adoption pets), backed by [WishlistContext.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/context/WishlistContext.jsx) and `storeAPI` in [api.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/services/api.js).
* **Backend Route / API:**
  * Cart: `GET /api/store/cart`, `POST /api/store/cart`, `PUT /api/store/cart/:productId`, `DELETE /api/store/cart/:productId`, `DELETE /api/store/cart` in [storeRoutes.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/routes/storeRoutes.js).
  * Wishlist: `GET /api/store/wishlist`, `POST /api/store/wishlist/toggle`, `DELETE /api/store/wishlist/:productId`, `POST /api/store/wishlist/pet/toggle`, `DELETE /api/store/wishlist/pet/:petId`.
* **Controller:** [storeController.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/controllers/storeController.js).
* **MongoDB / Mongoose Model:** Embedded directly in [User.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/models/User.js) (`cart: [{ product: ObjectId, quantity: Number }]`, `wishlistProducts: [ObjectId]`, `wishlistPets: [String]`).
* **Database Operation(s):**
  * `User.findById(req.user._id).populate('cart.product').populate('wishlistProducts')`.
  * Cart item addition/upsert: `user.cart.find(...) ? item.quantity += qty : user.cart.push({ product, quantity })`.
  * Wishlist toggle: `$addToSet: { wishlistProducts: productId }` or `$pull: { wishlistProducts: productId }`.
* **Current Implementation Status:** **IMPLEMENTED**
* **Important Notes / Limitations:**
  * Embedded subdocuments inside the User document ensure cart and wishlist are retrieved in a single read along with user identity.

---

### 9. Orders
* **Frontend Implementation:** [Store.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/Store.jsx) (Order Hub checkout modal with simulated payment methods), [Profile.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/Profile.jsx) (Orders tab with live status badges and order cancellation buttons).
* **Backend Route / API:** `POST /api/store/orders`, `GET /api/store/orders`, `GET /api/store/orders/:id`, `PUT /api/store/orders/:id/status`, `PUT /api/store/orders/:id/cancel` in [storeRoutes.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/routes/storeRoutes.js).
* **Controller:** [storeController.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/controllers/storeController.js).
* **MongoDB / Mongoose Model:** [Order.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/models/Order.js) (`orders` collection).
* **Database Operation(s):**
  * `Order.create({ user: req.user._id, items: [...snapshots], totalAmount, shippingAddress, paymentMethod, status: 'pending' })`.
  * Automatic cart clear upon order placement: `user.cart = []; await user.save();`.
  * `Order.find({ user: req.user._id }).sort({ createdAt: -1 })`.
  * Status cancellation: `order.status = 'cancelled'; order.cancelledAt = new Date(); await order.save()`.
  * Creates an in-app `Notification` on order creation and cancellation.
* **Current Implementation Status:** **IMPLEMENTED**
* **Important Notes / Limitations:**
  * Item prices and names are snapshotted inside `order.items[]` at purchase time so future catalog edits or price updates do not distort historical records.
  * Real payment gateway (Stripe/Razorpay) is intentionally out of scope: defaults to `"Cash on Delivery (Demo)"` or demo digital methods.

---

### 10. Product Reviews
* **Frontend Implementation:** [Store.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/Store.jsx) (Product Details modal with review submission form, star selector, and verified customer review cards).
* **Backend Route / API:** `GET /api/store/products/:productId/reviews`, `POST /api/store/products/:productId/reviews`, `PUT /api/store/reviews/:id`, `DELETE /api/store/reviews/:id` in [storeRoutes.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/routes/storeRoutes.js).
* **Controller:** [storeController.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/controllers/storeController.js).
* **MongoDB / Mongoose Model:** [Review.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/models/Review.js) (`reviews` collection, polymorphic with `targetType: 'product'`).
* **Database Operation(s):**
  * `Review.find({ targetId: productId, targetType: 'product' }).populate('user', 'fullName avatarUrl').sort({ createdAt: -1 })`.
  * `Review.create({ user: req.user._id, targetType: 'product', targetId: productId, product: productId, rating, reviewText })`.
  * Dynamic aggregation for rating recomputation: calculates `$avg: '$rating'` across all reviews for this product and updates `Product.rating` and `Product.reviewsCount`.
* **Current Implementation Status:** **IMPLEMENTED**
* **Important Notes / Limitations:**
  * Unique compound index `{ targetId: 1, user: 1 }` prevents a user from submitting multiple duplicate reviews on the same product.

---

### 11. Services & Providers
* **Frontend Implementation:** [Services.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/Services.jsx) (category tabs for Veterinary, Grooming, Training, Boarding, Photography; provider profile cards; experience badges; rating counters).
* **Backend Route / API:** `GET /api/services/providers`, `GET /api/services/providers/:id`, `GET /api/services/providers/:id/availability`, `POST /api/services/providers` (admin), `PUT /api/services/providers/:id` (admin), `DELETE /api/services/providers/:id` (admin) in [serviceRoutes.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/routes/serviceRoutes.js).
* **Controller:** [serviceController.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/controllers/serviceController.js).
* **MongoDB / Mongoose Model:** [ServiceProvider.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/models/ServiceProvider.js) (`serviceproviders` collection).
* **Database Operation(s):**
  * `ServiceProvider.find({ isActive: true, ...categoryFilter }).sort({ rating: -1 })`.
  * `ServiceProvider.findById(id)`.
  * `ServiceProvider.create(...)` (requires `admin` role).
  * `ServiceProvider.findByIdAndUpdate(id, updates)`.
* **Current Implementation Status:** **IMPLEMENTED**
* **Important Notes / Limitations:**
  * Contains embedded weekly schedule array: `availability: [{ day, startTime, endTime, isAvailable }]`.

---

### 12. Service Bookings
* **Frontend Implementation:** [Services.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/Services.jsx) (interactive Booking Modal with companion pet picker, calendar date selector, time slot selector, notes field), [Profile.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/Profile.jsx) (Bookings tab with live status tags and Cancel Booking action).
* **Backend Route / API:** `POST /api/services/bookings`, `GET /api/services/bookings`, `GET /api/services/bookings/:id`, `PUT /api/services/bookings/:id/status`, `DELETE /api/services/bookings/:id` in [serviceRoutes.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/routes/serviceRoutes.js).
* **Controller:** [serviceController.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/controllers/serviceController.js).
* **MongoDB / Mongoose Model:** [ServiceBooking.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/models/ServiceBooking.js) (`servicebookings` collection).
* **Database Operation(s):**
  * `ServiceBooking.create({ user: req.user._id, provider: providerId, providerName, serviceName, category, pet, petName, date, time, price, notes, status: 'Pending' })`.
  * `ServiceBooking.find({ user: req.user._id }).populate('provider').populate('pet').sort({ createdAt: -1 })`.
  * `booking.status = 'Cancelled'; await booking.save()`.
  * Auto-dispatches an in-app `Notification` upon confirmation or cancellation.
* **Current Implementation Status:** **IMPLEMENTED**
* **Important Notes / Limitations:**
  * Denormalizes `providerName` and `petName` inside the booking document for fast history presentation even if pet or provider records change.

---

### 13. Service Reviews
* **Frontend Implementation:** [Services.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/Services.jsx) (Provider Reviews modal, star rating selector, and feedback list).
* **Backend Route / API:** `GET /api/services/providers/:providerId/reviews`, `POST /api/services/providers/:providerId/reviews`, `PUT /api/services/providers/:providerId/reviews/:reviewId` in [serviceRoutes.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/routes/serviceRoutes.js).
* **Controller:** [serviceController.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/controllers/serviceController.js).
* **MongoDB / Mongoose Model:** [Review.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/models/Review.js) (`reviews` collection, polymorphic with `targetType: 'service_provider'`).
* **Database Operation(s):**
  * `Review.find({ targetId: providerId, targetType: 'service_provider' }).populate('user', 'fullName avatarUrl')`.
  * `Review.create({ user: req.user._id, targetType: 'service_provider', targetId: providerId, serviceProvider: providerId, rating, reviewText })`.
  * Dynamically updates `ServiceProvider.rating` and `ServiceProvider.reviewsCount`.
* **Current Implementation Status:** **IMPLEMENTED**
* **Important Notes / Limitations:**
  * Shares polymorphic collection with store product reviews.

---

### 14. Community Posts
* **Frontend Implementation:** [Community.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/Community.jsx) (post creator card, media uploader for images and videos, feed sorting, like/save counters, society filtering).
* **Backend Route / API:** `GET /api/community/posts`, `GET /api/community/posts/:id`, `POST /api/community/posts`, `PUT /api/community/posts/:id`, `DELETE /api/community/posts/:id`, `POST /api/community/posts/:id/like`, `POST /api/community/posts/:id/save` in [communityRoutes.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/routes/communityRoutes.js).
* **Controller:** [communityController.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/controllers/communityController.js).
* **MongoDB / Mongoose Model:** [Post.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/models/Post.js) (`posts` collection).
* **Database Operation(s):**
  * `Post.find(filter).populate('author', 'fullName avatarUrl role').sort({ createdAt: -1 })`.
  * `Post.create({ author: req.user._id, content, category, mediaKey, mediaType })`.
  * Toggle like/vote: `$addToSet: { likes: userId }, $inc: { likesCount: 1 }` or `$pull: { likes: userId }, $inc: { likesCount: -1 }`.
  * Toggle save: `$addToSet: { savedBy: userId }` or `$pull: { savedBy: userId }`.
  * Cascade delete: deletes associated S3 media object if present, removes all child comments via `Comment.deleteMany({ post: post._id })`, and executes `Post.findByIdAndDelete(id)`.
* **Current Implementation Status:** **IMPLEMENTED**
* **Important Notes / Limitations:**
  * Schema custom validator: requires either non-empty `content` or a valid `mediaKey`.
  * Media files (MP4/WebM videos, JPEG/PNG images) are uploaded to S3 under `posts/<userId>/` prefix.

---

### 15. Comments
* **Frontend Implementation:** [Community.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/Community.jsx) (collapsible comment threads, author avatar badges, comment submission field, and delete button for authors).
* **Backend Route / API:** `GET /api/community/posts/:postId/comments`, `POST /api/community/posts/:postId/comments`, `PUT /api/community/comments/:id`, `DELETE /api/community/comments/:id` in [communityRoutes.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/routes/communityRoutes.js).
* **Controller:** [communityController.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/controllers/communityController.js).
* **MongoDB / Mongoose Model:** [Comment.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/models/Comment.js) (`comments` collection).
* **Database Operation(s):**
  * `Comment.find({ post: postId }).populate('author', 'fullName avatarUrl').sort({ createdAt: 1 })`.
  * `Comment.create({ post: postId, author: req.user._id, content })`.
  * Increments parent post counter: `Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } })`.
  * Decrements parent post counter on comment deletion: `Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: -1 } })`.
  * Dispatches an in-app `Notification` to the post author when a new comment is posted.
* **Current Implementation Status:** **IMPLEMENTED**
* **Important Notes / Limitations:**
  * Comment deletion enforces ownership: only the comment author or an admin can delete a comment.

---

### 16. Societies / Groups
* **Frontend Implementation:** [Community.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/Community.jsx) (left sidebar listing built-in and user-created societies, post filtering by active society, "Create Society" modal).
* **Backend Route / API:** `GET /api/community/societies`, `POST /api/community/societies`, `DELETE /api/community/societies/:id` in [communityRoutes.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/routes/communityRoutes.js).
* **Controller:** [communityController.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/controllers/communityController.js).
* **MongoDB / Mongoose Model:** [Society.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/models/Society.js) (`societies` collection).
* **Database Operation(s):**
  * `Society.find().sort({ membersCount: -1, createdAt: 1 })`.
  * `Society.create({ name, slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'), icon, creator: req.user._id })`.
  * `Society.findByIdAndDelete(id)` (restricted to creator or admin).
* **Current Implementation Status:** **IMPLEMENTED**
* **Important Notes / Limitations:**
  * Differentiates built-in seeded societies (`isBuiltIn: true`) from user-created ones.

---

### 17. AI Conversations and Messages Persistence
* **Frontend Implementation:** [Messages.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/Messages.jsx) (multi-session sidebar, conversation creation, scoped pet dropdown selector, message thread viewer, Markdown rendering), [AIAssistantModal.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/components/AIAssistant/AIAssistantModal.jsx).
* **Backend Route / API:** `GET /api/assistant/conversations`, `POST /api/assistant/conversations`, `GET /api/assistant/conversations/:id`, `DELETE /api/assistant/conversations/:id` in [assistantRoutes.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/routes/assistantRoutes.js).
* **Controller:** [assistantController.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/controllers/assistantController.js).
* **MongoDB / Mongoose Model:** [Conversation.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/models/Conversation.js) (`conversations`), [Message.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/models/Message.js) (`messages`).
* **Database Operation(s):**
  * `Conversation.create({ user: req.user._id, title, pet: petId || null })`.
  * `Conversation.find({ user: req.user._id }).sort({ updatedAt: -1 })`.
  * `Message.find({ conversation: conversationId }).sort({ createdAt: 1 })`.
  * `Message.create({ conversation, role: 'user', content, media })` and `Message.create({ conversation, role: 'assistant', content })`.
  * Cascade delete: `Message.deleteMany({ conversation: convId })` then `Conversation.findByIdAndDelete(convId)`.
* **Current Implementation Status:** **IMPLEMENTED**
* **Important Notes / Limitations:**
  * Media attached to chat messages (images/videos) has only metadata (`name, mimeType, size, isVideo, url`) stored in MongoDB. The binary content is passed transiently to Gemini as base64 inline and never saved to the database.

---

### 18. Gemini AI Assistant & Tool Calling
* **Frontend Implementation:** [Messages.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/Messages.jsx) (input box, image/video attachment preview, prompt shortcuts, streaming/loading state), backed by `assistantAPI.chat` in [api.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/services/api.js).
* **Backend Route / API:** `POST /api/assistant/chat` in [assistantRoutes.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/routes/assistantRoutes.js).
* **Controller:** [assistantController.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/controllers/assistantController.js).
* **Mongoose Models Queried by AI:** `Pet`, `HealthRecord`, `MedicalDocument`, `Order`, `ServiceBooking`, `AdoptionApplication`, `AdoptionListing`, `Product`, `QuizAttempt`, `Post`, `Notification`.
* **Database Operation(s):**
  * Reads pet context: `Pet.findById(petId)`.
  * Loads prior 20 messages for context: `Message.find({ conversation: conversationId }).sort({ createdAt: 1 }).limit(20)`.
  * Executes read-only queries mapped from Gemini `functionCall` names:
    1. `getMyPets` -> `Pet.find({ owner: userId })`
    2. `getMyHealthRecords` -> `HealthRecord.find({ owner: userId, ... })`
    3. `getMyMedicalDocuments` -> `MedicalDocument.find({ owner: userId, ... })`
    4. `getMyOrders` -> `Order.find({ user: userId })`
    5. `getMyBookings` -> `ServiceBooking.find({ user: userId })`
    6. `getMyAdoptionApplications` -> `AdoptionApplication.find({ applicant: userId })`
    7. `getAvailableAdoptionListings` -> `AdoptionListing.find({ status: 'available' })`
    8. `getStoreProducts` -> `Product.find({ isActive: true })`
    9. `getMyQuizAttempts` -> `QuizAttempt.find({ user: userId })`
    10. `getMyCommunityActivity` -> `Post.find({ author: userId })`
    11. `getMyNotifications` -> `Notification.find({ user: userId })`
  * Saves both user turn and assistant reply to `messages` collection.
* **Current Implementation Status:** **IMPLEMENTED**
* **Important Notes / Limitations:**
  * **Strictly Read-Only:** None of the Gemini tools can perform insert, update, or delete operations.
  * **Model Chain:** Primary model is `gemini-3.8-flash`. If Google API returns 404/429/503, it falls back sequentially through `gemini-3.6-flash` -> `gemini-3.5-flash-lite` -> `gemini-3.1-flash-lite` -> `gemini-2.5-flash-lite`.
  * Guardrails strictly instructed: Not a veterinarian; emergencies trigger immediate veterinary referral.

---

### 19. Educational Quiz (Questions & Attempts)
* **Frontend Implementation:** [PetQuiz.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/PetQuiz.jsx) (Track selector, difficulty level selector, interactive MCQ interface, explanation cards, score summary, history viewer), backed by `quizAPI` in [api.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/services/api.js).
* **Backend Route / API:** `GET /api/quiz/questions`, `GET /api/quiz/questions/:id`, `POST /api/quiz/questions` (admin), `PUT /api/quiz/questions/:id` (admin), `DELETE /api/quiz/questions/:id` (admin), `POST /api/quiz/attempts`, `GET /api/quiz/attempts`, `GET /api/quiz/attempts/:id` in [quizRoutes.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/routes/quizRoutes.js).
* **Controller:** [quizController.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/controllers/quizController.js).
* **MongoDB / Mongoose Model:** [QuizQuestion.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/models/QuizQuestion.js) (`quizquestions`), [QuizAttempt.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/models/QuizAttempt.js) (`quizattempts`).
* **Database Operation(s):**
  * `QuizQuestion.find({ isActive: true, ...filters }).select('-correctAnswer')` (security: hides answer key from non-admin users).
  * Evaluates submitted answers against stored correct keys in database.
  * `QuizAttempt.create({ user: req.user._id, category, score, totalQuestions, percentage, answers: [...] })`.
  * `QuizAttempt.find({ user: req.user._id }).sort({ createdAt: -1 })`.
* **Current Implementation Status:** **IMPLEMENTED**
* **Important Notes / Limitations:**
  * Includes seeded question bank covering dog care, feline health, nutrition, and first aid.

---

### 20. Companion Matching
* **Frontend Implementation:** [PetQuiz.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/PetQuiz.jsx) ("Find Perfect Companion" questionnaire mode, live affinity ranking chart, "Explore Available Interfaces" link directly to filtered adoption listings).
* **Backend Route / API:** `POST /api/quiz/companion/matches`, `GET /api/quiz/companion/matches`, `GET /api/quiz/companion/matches/:id` in [quizRoutes.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/routes/quizRoutes.js).
* **Controller:** [quizController.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/controllers/quizController.js).
* **MongoDB / Mongoose Model:** [CompanionMatch.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/models/CompanionMatch.js) (`companionmatches` collection).
* **Database Operation(s):**
  * `CompanionMatch.create({ user: req.user._id, answers, primaryRecommendation, compatibilityScore, alternativeRankings, allMatches })`.
  * `CompanionMatch.find({ user: req.user._id }).sort({ createdAt: -1 })`.
  * `CompanionMatch.findById(id)`.
* **Current Implementation Status:** **IMPLEMENTED**
* **Important Notes / Limitations:**
  * Matches user answers across lifestyle traits (living space, activity level, shedding tolerance, budget) against pet archetypes (Feline, Canine, Leporidae/Rabbit, Avian) and persists the complete ranking.

---

### 21. Notifications
* **Frontend Implementation:** [Navbar.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/components/Layout/Navbar.jsx) (bell icon badge with unread count), [Profile.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/Profile.jsx) (Notifications tab with Mark As Read, Mark All As Read, and Delete actions), backed by `notificationAPI` in [api.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/services/api.js).
* **Backend Route / API:** `GET /api/notifications`, `PUT /api/notifications/read-all`, `PUT /api/notifications/:id/read`, `DELETE /api/notifications/:id` in [notificationRoutes.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/routes/notificationRoutes.js).
* **Controller:** [notificationController.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/controllers/notificationController.js).
* **MongoDB / Mongoose Model:** [Notification.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/models/Notification.js) (`notifications` collection).
* **Database Operation(s):**
  * `Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50)`.
  * `Notification.countDocuments({ user: req.user._id, isRead: false })`.
  * `Notification.updateMany({ user: req.user._id, isRead: false }, { $set: { isRead: true } })`.
  * `Notification.findOneAndUpdate({ _id: id, user: req.user._id }, { isRead: true }, { new: true })`.
  * `Notification.findOneAndDelete({ _id: id, user: req.user._id })`.
* **Current Implementation Status:** **IMPLEMENTED**
* **Important Notes / Limitations:**
  * System events (adoption status change, order placed, service booked, comment received) automatically trigger `Notification.create()`.
  * Email dispatch (AWS SES) is out of scope; notifications are purely in-app.

---

### 22. AWS S3 File Storage
* **Frontend Implementation:** Profile avatar upload in [Profile.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/Profile.jsx), pet photo upload in [HealthHub.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/HealthHub.jsx), medical PDF upload in [HealthHub.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/HealthHub.jsx), community post media in [Community.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/Community.jsx).
* **Backend Route / API:** `POST /api/uploads`, `GET /api/uploads/presigned-url`, `DELETE /api/uploads` in [uploadRoutes.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/routes/uploadRoutes.js).
* **Controller:** [uploadController.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/controllers/uploadController.js).
* **Utility / Middleware:** [s3Uploader.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/utils/s3Uploader.js), [upload.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/middleware/upload.js), [s3.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/config/s3.js).
* **Current Implementation Status:** **IMPLEMENTED**
* **Important Notes / Limitations:**
  * Uses `@aws-sdk/client-s3` (AWS SDK v3) with `PutObjectCommand`, `GetObjectCommand`, `DeleteObjectCommand`, and `@aws-sdk/s3-request-presigner`.
  * Private by default: no public ACLs.
  * Presigned URLs are time-limited to 1 hour (3600 seconds).

---

### 23. Custom JWT Authentication
* **Frontend Implementation:** Token storage in `localStorage.getItem('petly_token')`, automatically attached to `Authorization: Bearer <token>` in [api.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/services/api.js).
* **Backend Middleware:** [auth.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/middleware/auth.js) (`protect` and `optionalProtect`).
* **Utility:** [generateToken.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/utils/generateToken.js) using `jsonwebtoken` with HS256 algorithm and `JWT_SECRET`.
* **Database Operation:** Resolves user via `User.findById(decoded.id).select('-password')`.
* **Current Implementation Status:** **IMPLEMENTED**
* **Important Notes / Limitations:**
  * Token expiration defaults to 30 days (`30d`).
  * `select: false` on `password` in schema prevents password hash leakage.

---

### 24. AWS Cognito Integration
* **Frontend Implementation:** [cognitoAuth.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/services/cognitoAuth.js) using `amazon-cognito-identity-js` for user pool signup, email verification code confirmation, and forgot-password code confirmation.
* **Backend Route / API:** `POST /api/auth/cognito-sync`, plus automatic RS256 token detection in `protect` middleware in [auth.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/middleware/auth.js).
* **Utility:** [cognitoVerifier.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/utils/cognitoVerifier.js) (verifies RS256 signature against live Cognito JWKS endpoint, validates claims, and links `cognitoSub` to MongoDB `User`).
* **Database Operation:** `User.findOne({ cognitoSub })` or resolves existing user by verified email/phone and attaches `cognitoSub`.
* **Current Implementation Status:** **IMPLEMENTED**
* **Important Notes / Limitations:**
  * Cognito handles registration email verification and password reset codes.
  * Dual-mode authentication: The backend transparently accepts both custom HS256 JWTs and Cognito RS256 JWTs in the `Authorization: Bearer` header.

---

### 25. Role-Based Authorization & Administrative Interfaces
* **Frontend Implementation:** Navigation and administrative links conditionally rendered based on `user.role` (e.g., [Navbar.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/components/Layout/Navbar.jsx), [Adopt.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/Adopt.jsx)). Administrative route `/admin` mounts [AdminPanel.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/AdminPanel.jsx) as a presentation demonstration dashboard.
* **Backend Middleware:** `authorize(...roles)` in [roles.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/middleware/roles.js) and [auth.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/middleware/auth.js).
* **Enforced Roles:** `user`, `shelter`, `admin`.
* **Database Operation:** Role stored in `User.role` enum attribute.
* **Current Implementation Status:** **IMPLEMENTED**
* **Important Notes / Limitations:**
  * Route protection: Admin routes (`POST /api/store/products`, `POST /api/services/providers`, `POST /api/quiz/questions`) enforce `authorize('admin')`.
  * Public sign-up strictly blocks assignment of the `admin` role.

---

### 26. Resource Ownership & Security Checks
* **Frontend Implementation:** Conditional rendering of edit/delete buttons only when `item.owner === user._id` or `item.author === user._id`.
* **Backend Implementation:** Explicit ID checks across all controllers:
  * Pets: `pet.owner.toString() === req.user._id.toString() || req.user.role === 'admin'`.
  * Health Records: `record.owner.toString() === req.user._id.toString()`.
  * Medical Documents: `(isCurrentPetOwner && isDocCreator) || isAdmin`.
  * Adoption Listings: `listing.shelter.toString() === req.user._id.toString()`.
  * Orders & Bookings: Scoped strictly to `req.user._id`.
  * S3 Keys: `verifyKeyOwnership(key, userId, userRole)` validates that the `userId` segment in the S3 key matches `req.user._id`.
* **Current Implementation Status:** **IMPLEMENTED**
* **Important Notes / Limitations:**
  * Protects against Insecure Direct Object References (IDOR).
  * Special historical protection: Pre-adoption medical records marked `isHistorical: true` cannot be deleted by either the adopter or previous owner.

---

## Part 2: Database Systems Audit

### 1. Actual Mongoose Models & Collections Present
The PETLY database contains **exactly 20 collections**, matching the design in Assessment 6:

| # | Model Name | File Path | Collection Name | Status |
|---|---|---|---|---|
| 1 | `User` | `server/models/User.js` | `users` | Present & Verified |
| 2 | `Pet` | `server/models/Pet.js` | `pets` | Present & Verified |
| 3 | `HealthRecord` | `server/models/HealthRecord.js` | `healthrecords` | Present & Verified |
| 4 | `MedicalDocument` | `server/models/MedicalDocument.js` | `medicaldocuments` | Present & Verified |
| 5 | `AdoptionListing` | `server/models/AdoptionListing.js` | `adoptionlistings` | Present & Verified |
| 6 | `AdoptionApplication` | `server/models/AdoptionApplication.js` | `adoptionapplications` | Present & Verified |
| 7 | `Product` | `server/models/Product.js` | `products` | Present & Verified |
| 8 | `Order` | `server/models/Order.js` | `orders` | Present & Verified |
| 9 | `Review` | `server/models/Review.js` | `reviews` | Present & Verified |
| 10 | `ServiceProvider` | `server/models/ServiceProvider.js` | `serviceproviders` | Present & Verified |
| 11 | `ServiceBooking` | `server/models/ServiceBooking.js` | `servicebookings` | Present & Verified |
| 12 | `Post` | `server/models/Post.js` | `posts` | Present & Verified |
| 13 | `Comment` | `server/models/Comment.js` | `comments` | Present & Verified |
| 14 | `Society` | `server/models/Society.js` | `societies` | Present & Verified |
| 15 | `Conversation` | `server/models/Conversation.js` | `conversations` | Present & Verified |
| 16 | `Message` | `server/models/Message.js` | `messages` | Present & Verified |
| 17 | `Notification` | `server/models/Notification.js` | `notifications` | Present & Verified |
| 18 | `QuizQuestion` | `server/models/QuizQuestion.js` | `quizquestions` | Present & Verified |
| 19 | `QuizAttempt` | `server/models/QuizAttempt.js` | `quizattempts` | Present & Verified |
| 20 | `CompanionMatch` | `server/models/CompanionMatch.js` | `companionmatches` | Present & Verified |

---

### 2. Embedded vs. Referenced Data Architecture

PETLY applies document modeling rules based on lifecycle independence and query patterns:

#### A. Embedded Data Patterns
Used when child data has no independent lifecycle, is bounded in size, and is always fetched with the parent:
1. **`User.cart`**: Array of `{ product: ObjectId, quantity: Number }`. Bounded in size; accessed only in checkout/cart contexts.
2. **`User.addresses`**: Array of structured shipping addresses `{ label, recipientName, phone, addressLine, city, state, postalCode, isDefault }`. Managed solely by the account owner.
3. **`User.shelterDetails`**: Sub-document `{ shelterName, address, licenseNumber, website }` populated only for `role === 'shelter'`. Avoids a nullable 1:1 relational join table.
4. **`Pet.adoptionHistory`**: Nested audit trail array `{ previousOwner, newOwner, application, listing, date, snapshot }` documenting every ownership transfer.
5. **`Order.items`**: Embedded snapshot array `{ product, name, price, quantity, imageKey, image }`. **Deliberate denormalization:** Preserves exact historical purchase price and name even if catalog items are later updated or deleted.
6. **`ServiceProvider.availability`**: Array of 7 weekly availability time slots `{ day, startTime, endTime, isAvailable }`.
7. **`Message.media`**: Transient metadata `{ name, mimeType, size, isVideo, url }` belonging strictly to a single chat turn.
8. **`CompanionMatch.primaryRecommendation` & `alternativeRankings`**: Embedded pet compatibility scores and descriptions resulting from a single quiz session.

#### B. Referenced Data Patterns (ObjectId + `.populate()`)
Used when entities have independent lifecycles, require independent filtering, or change ownership:
1. **`Pet.owner` $\rightarrow$ `User`**: Owners exist independently; owner reference updates when an adoption application is approved.
2. **`HealthRecord.pet` $\rightarrow$ `Pet` & `HealthRecord.owner` $\rightarrow$ `User`**: Queried independently (e.g., all vaccinations for a specific pet).
3. **`MedicalDocument.pet` $\rightarrow$ `Pet` & `MedicalDocument.owner` $\rightarrow$ `User`**: Medical metadata listed independently in the document vault.
4. **`AdoptionApplication.listing` $\rightarrow$ `AdoptionListing`, `applicant` $\rightarrow$ `User`, `pet` $\rightarrow$ `Pet`, `shelter` $\rightarrow$ `User`**: Connects four independent entities.
5. **`Post.author` $\rightarrow$ `User`, `Comment.post` $\rightarrow$ `Post`, `Comment.author` $\rightarrow$ `User`**: Social graphs where authors and posts have independent lifecycles.
6. **`Review.targetId` $\rightarrow$ Polymorphic (`Product` or `ServiceProvider`)**: Dynamically references the target based on `Review.targetType`.

---

### 3. Database Indexes Implemented in Codebase

| Model | Index Definition | Access Pattern Supported |
|---|---|---|
| `User` | `{ email: 1 }` (unique)<br>`{ cognitoSub: 1 }` (unique, sparse) | Instant credential lookup on login; sparse index allows non-Cognito users without duplicate key collisions. |
| `Pet` | `{ owner: 1 }`<br>`{ adoptionStatus: 1 }` | Fast retrieval of user's pets; filtering available adoptable pets. |
| `HealthRecord` | `{ pet: 1 }`<br>`{ owner: 1 }`<br>`{ isHistorical: 1 }` | Fast retrieval of a pet's medical timeline; filtering pre- vs. post-adoption records. |
| `MedicalDocument` | `{ pet: 1 }`<br>`{ owner: 1 }`<br>`{ isHistorical: 1 }` | Document vault queries scoped to pet and owner. |
| `AdoptionListing` | `{ pet: 1 }`<br>`{ shelter: 1 }`<br>`{ status: 1 }` | Browsing listings by status (`available`); shelter managing listings. |
| `AdoptionApplication`| `{ applicant: 1 }`<br>`{ listing: 1 }`<br>`{ shelter: 1 }`<br>`{ status: 1 }` | User tracking submitted applications; shelter reviewing incoming applications. |
| `Product` | `{ category: 1 }`<br>`{ isActive: 1 }`<br>`{ demoId: 1 }` | Filtered store catalog queries by category and active stock status. |
| `Order` | `{ user: 1, createdAt: -1 }` (compound) | User order history sorted by latest first. |
| `Review` | `{ targetId: 1, user: 1 }` (compound) | Fetching all reviews for a product/service; enforcing single-review-per-user constraint. |
| `ServiceProvider` | `{ category: 1, isActive: 1 }` (compound) | Service provider filtering by professional domain (vet, groomer, etc.). |
| `ServiceBooking` | `{ user: 1, createdAt: -1 }` (compound) | User booking history sorted reverse-chronologically. |
| `Post` | `{ createdAt: -1 }`<br>`{ category: 1 }` | Reverse-chronological community feed generation; society filtering. |
| `Society` | `{ slug: 1 }` (unique) | Fast lookup by clean URL slug (`/community?society=dog-care`). |
| `Conversation` | `{ user: 1, updatedAt: -1 }` (compound) | Multi-session chat sidebar listing user's recent conversations. |
| `Message` | `{ conversation: 1, createdAt: 1 }` (compound) | Chronological replay of chat history for Gemini context window. |
| `Notification` | `{ user: 1, isRead: 1 }` (compound) | Unread notification badge counter and user alert feed. |
| `QuizQuestion` | `{ category: 1, difficulty: 1, isActive: 1 }` (compound) | Dynamic question pool generation based on quiz configuration. |

---

### 4. Advanced Queries, Population & Aggregations
1. **Multi-level Population in Adoption:**
   ```javascript
   AdoptionApplication.find({ applicant: req.user._id })
     .populate({ path: 'listing', populate: { path: 'pet' } })
     .populate('shelter', 'fullName email');
   ```
2. **Review Aggregation Pipeline (Rating Calculation):**
   Calculates average score and total count to update parent Product/ServiceProvider:
   ```javascript
   const stats = await Review.aggregate([
     { $match: { targetId: new mongoose.Types.ObjectId(productId), targetType: 'product' } },
     { $group: { _id: '$targetId', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
   ]);
   ```
3. **Compound Ownership Union for Adopted Pets:**
   Ensures an adopter can view historical health records logged by the previous shelter/owner:
   ```javascript
   const userPetIds = await Pet.find({ owner: req.user._id }).distinct('_id');
   filter.$or = [{ owner: req.user._id }, { pet: { $in: userPetIds } }];
   ```

---

## Part 3: AWS S3 & Binary Asset Audit

* **S3 Client Configuration:** Initialized in [s3.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/config/s3.js) using `@aws-sdk/client-s3` (`S3Client`) with credentials from `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, and `AWS_S3_BUCKET_NAME`.
* **Upload Mechanism:** Multer memory storage (`multer.memoryStorage()`) receives binary buffers directly in RAM (`req.file.buffer`). Files are never written to serverless temporary disk space.
* **Size & MIME Validation:** Enforced in [upload.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/middleware/upload.js):
  * **Images:** `image/jpeg`, `image/png`, `image/webp` (Max: 5 MB).
  * **Documents:** `application/pdf` (Max: 10 MB).
  * **Videos:** `video/mp4`, `video/webm` (Max: 25 MB).
* **Key Structure:** Constructed via `generateS3Key()` in [s3Uploader.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/utils/s3Uploader.js):
  $$\text{Key} = \langle\text{category}\rangle/\langle\text{cleanUserId}\rangle/\langle\text{timestamp}\rangle\text{-}\langle\text{randomHex}\rangle\text{-}\langle\text{sanitizedFilename}\rangle$$
  * *Example:* `documents/64f1a2b3c4d5e6f7a8b9c0d1/1700000000001-a1b2c3d4e5f6-blood_test_report.pdf`
* **Access Control & Presigned URLs:**
  * S3 objects are uploaded with private permissions (no public read ACL).
  * Access is granted via temporary presigned URLs (`generatePresignedUrl(key, 3600)` via `@aws-sdk/s3-request-presigner`).
* **Ownership Verification:**
  `verifyKeyOwnership(key, userId, userRole)` validates that the `userId` in the S3 path segment matches the authenticated requester's ID (or the requester is an admin).
* **Delete Workflow:**
  Two-step safe sequencing: The controller validates user ownership, checks `!isHistorical`, issues `DeleteObjectCommand` to S3, and only deletes the MongoDB metadata record upon confirmation.

---

## Part 4: Authentication & Security Audit

* **Password Hashing:** Implemented via `bcryptjs` in `User.js` pre-save hook using **10 salt rounds**. Passwords are never stored in plaintext.
* **Password Field Selection:** Configured with `select: false` on the User schema, guaranteeing exclusion from query projections unless explicitly invoked with `.select('+password')`.
* **JWT Security:** Signed using `jsonwebtoken` with HMAC-SHA256 (`HS256`), containing payload `{ id: user._id }`.
* **AWS Cognito Integration:**
  * Frontend handles user sign-up, verification code confirmation, and forgot-password flows via `amazon-cognito-identity-js`.
  * Backend verifies incoming RS256 tokens in [cognitoVerifier.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/utils/cognitoVerifier.js) by fetching the public JWKS directly from `https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json`.
  * Verifies issuer (`iss`), expiration (`exp`), audience (`aud`), and cryptographic signature via Node's `crypto.verify('RSA-SHA256', ...)`.
  * Transparently resolves the matching MongoDB User document using `cognitoSub` and verified attributes.
* **Role-Based Access Control:** `authorize('admin')` and `authorize('shelter', 'admin')` middlewares block unauthorized role access with `403 Forbidden`.
* **Public Signup Shield:** Public registration endpoint explicitly rejects attempts to create `admin` accounts.
* **Input Validation & Sanitization:** PIN code lookup endpoint ([locationController.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/controllers/locationController.js)) strictly validates 6-digit numeric strings (`/^\d{6}$/`) and caches responses in an in-memory TTL map (24-hour TTL).

---

## Part 5: Gemini AI & Tool Calling Audit

* **API Integration:** Direct HTTPS POST calls to Google's public Generative Language API (`https://generativelanguage.googleapis.com/v1beta/models`).
* **Model Selection & Resilient Fallback Chain:**
  $$\text{gemini-3.8-flash (Primary)} \longrightarrow \text{gemini-3.6-flash} \longrightarrow \text{gemini-3.5-flash-lite} \longrightarrow \text{gemini-3.1-flash-lite} \longrightarrow \text{gemini-2.5-flash-lite}$$
* **System Prompt & Veterinary Guardrails:**
  * Defines the PETLY persona and injects verified MongoDB pet profile context (species, breed, age, weight, allergies, medical conditions).
  * Enforces medical disclaimers: Assistant is not a veterinarian and cannot prescribe or diagnose.
  * Toxic ingestion (chocolate, grapes, xylitol) or emergency symptoms trigger immediate emergency clinic referrals.
* **Tool Calling Declarations (11 Read-Only Functions):**
  1. `getMyPets`: Retrieves authenticated user's pets.
  2. `getMyHealthRecords`: Retrieves vaccinations, medications, weight history.
  3. `getMyMedicalDocuments`: Retrieves document metadata and presigned URLs.
  4. `getMyOrders`: Retrieves store order history and line items.
  5. `getMyBookings`: Retrieves veterinary and grooming appointments.
  6. `getMyAdoptionApplications`: Retrieves submitted adoption applications.
  7. `getAvailableAdoptionListings`: Searches active sanctuary listings.
  8. `getStoreProducts`: Searches store catalog by category or query.
  9. `getMyQuizAttempts`: Retrieves pet-care quiz performance and scores.
  10. `getMyCommunityActivity`: Retrieves user's posts and comments.
  11. `getMyNotifications`: Retrieves recent user notifications.
* **Security & Read-Only Guarantee:** The tool handler only executes `find()` or `findById()` queries scoped to `req.user._id`. No write or update functions are exposed to the AI model.
* **Multimodal Capability:** Accepts JPEG, PNG, WEBP, and MP4/WebM base64 payloads inline to Gemini. Binary is passed transiently; only metadata is persisted in MongoDB.

---

## Part 6: Testing Audit

The test suite consists of standalone Node.js integration test scripts in `server/`:

| Test File | Target Subsystem Tested | Key Verifications Performed | Codebase Test Evidence |
|---|---|---|---|
| `test_phase1.js` | Auth & Mongo Connection | Atlas handshake, password hashing, admin signup block | Verified in code |
| `test_phase2.js` | Pet & Health CRUD | Pet creation, health record types, owner scoping | Verified in code |
| `test_phase3.js` | S3 Uploads & Documents | Multer memory buffer, S3 key format, presigned URLs | Verified in code |
| `test_phase4a.js` | Adoption Listings & Apps | Listing creation, application submission, inquiries | Verified in code |
| `test_phase4b.js` | Adoption Transfer & Audit | Transaction session, pet ownership transfer, `adoptionHistory` push | Verified in code |
| `test_phase5.js` | Community & Societies | Post creation, like toggle, comment counters, society slugs | Verified in code |
| `test_phase6.js` | Store, Cart, Wishlist, Orders | Cart upsert, wishlist toggle, order price snapshot, rating recomputation | Verified in code |
| `test_phase7.js` | Quiz & Companion Matching | MCQ answer evaluation, hidden answer keys, match ranking persistence | Verified in code |
| `test_phase9a.js` | Services & Bookings | Provider categories, appointment booking, cancellation | Verified in code |
| `test_phase9b.js` | Cognito Auth Integration | Live JWKS fetching, token signature verification, user linking | Verified in code |
| `test_phase9c.js` | Location & PIN Validation | Indian 6-digit regex, Postal API lookup, in-memory TTL caching | Verified in code |
| `test_phase11a.js` | Gemini AI & Tool Calling | Live HTTP payload, tool declaration schema, read-only query dispatch | Verified in code |
| `test_phase11b.js` | Multi-conversation & Fallback | Model fallback chain, conversation switching, message history replay | Verified in code |
| `test_adoption_ownership.js` | Adoption Cascades | `isHistorical` tag propagation to health records and documents | Verified in code |
| `test_store_review.js` | Polymorphic Reviews | Duplicate review block via `{ targetId, user }` index, avg score calculation | Verified in code |
| `test_health_bugfixes.js` | Health Record Parsing | Date normalization, status transitions, weight telemetry updates | Verified in code |
| `test_location_validation.js` | Address Formats | Object vs. string location format validation in profile updates | Verified in code |
| `test_vercel_readiness.js` | Serverless Cold Start | Connection pooling in `db.js`, `readyState` check, stateless request handling | Verified in code |

---

## Part 7: Assessment 6 Design vs. Current Implementation Differences

While the codebase closely reflects the Assessment 6 design, the following architectural additions and operational refinements were implemented during development:

1. **Location & Postal Verification Service (New Route & Controller):**
   * *Assessment 6:* Location was designed as a plain unvalidated `String` or `Mixed` attribute in `User.location`.
   * *Current Codebase:* Added `/api/location/pincode/:pincode` in [locationRoutes.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/routes/locationRoutes.js) and [locationController.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/controllers/locationController.js) with 6-digit regex validation, external Postal API verification, and in-memory TTL caching (24 hours).
2. **Pet Schema Medical Refinements:**
   * *Assessment 6:* Documented general fields (`name`, `species`, `breed`, `age`, `weight`).
   * *Current Codebase:* Added `allergies: [String]`, `medicalConditions: [String]`, `temperature`, `height`, `color`, `themeColor`, `dob`, and `adoptionDate`.
3. **Transaction Session with Sequential Fallback:**
   * *Assessment 6:* Specified atomic transfer on adoption approval.
   * *Current Codebase:* Uses `mongoose.startSession()` and `session.startTransaction()`, with an automated sequential fallback if running on a standalone non-replica MongoDB instance.
4. **Historical Provenance Enforcement:**
   * *Assessment 6:* Proposed marking records with `isHistorical`.
   * *Current Codebase:* Fully enforced in [adoptionController.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/controllers/adoptionController.js) and [documentController.js](file:///c:/Users/Swathi/.gemini/antigravity/scratch/server/controllers/documentController.js); historical records flag `preAdoptionOwner` and strictly block deletion by the new adopter.
5. **AI Model Selection Chain:**
   * *Assessment 6:* Specified `gemini-3.8-flash`.
   * *Current Codebase:* Implemented a 5-tier fallback chain (`gemini-3.8-flash` $\rightarrow$ `gemini-3.6-flash` $\rightarrow$ `gemini-3.5-flash-lite` $\rightarrow$ `gemini-3.1-flash-lite` $\rightarrow$ `gemini-2.5-flash-lite`).
6. **Dual JWT and Cognito Support:**
   * *Assessment 6:* Planned custom JWT with optional Cognito.
   * *Current Codebase:* The `protect` middleware automatically checks token headers: if `alg === 'RS256'`, it verifies via Cognito JWKS; if `HS256`, it verifies via local secret.

---

## Part 8: Features Incomplete or Planned for Future Enhancement

1. **Production Payment Gateway Integration:**
   * *Current Status:* Orders use simulated demo payment options (`"Cash on Delivery (Demo)"`, `"Demo UPI"`, `"Demo Card"`). Real-time Stripe/Razorpay webhook processing is a future enhancement.
2. **Real-time Peer-to-Peer Chat:**
   * *Current Status:* User communication occurs asynchronously via adoption applications and community comment threads. Direct user-to-user WebSocket messaging is reserved for future releases.
3. **Outbound Email & SMS Dispatch:**
   * *Current Status:* Notifications are stored and viewed exclusively in-app via the `notifications` collection. Automated email delivery (via AWS SES) is not wired up.
4. **Admin Dashboard Analytics & Management Interface:**
   * *Code Inspection & Architectural Finding:* 
     * **Admin Backend APIs:** Fully functional and role-protected CRUD routes exist for store products (`POST/PUT/DELETE /api/store/products`), service providers (`POST/PUT/DELETE /api/services/providers`), and quiz trivia (`POST/PUT/DELETE /api/quiz/questions`), strictly guarded by `authorize('admin')`.
     * **AdminPanel.jsx Verification:** Inspection of `src/pages/AdminPanel.jsx` confirms that the dashboard mounted at `/admin` is a standalone demonstration mockup. Specifically:
       * **Charts Data Source:** Both charts utilize **genuinely hardcoded demonstration arrays** declared as top-level module constants (`revenueData` with 6 hardcoded monthly figures and `adoptionData` with 3 hardcoded category distributions). They do **not** use live MongoDB-derived data, nor are they computed locally from fetched database records.
       * **Interactive State & Network:** The component imports no data-fetching libraries, uses no React state hooks (`useState`), lifecycle hooks (`useEffect`), or context consumers (`useAuth`), receives no props, and renders no mutation forms or operational handlers. The KPI metric cards (e.g., 24,800 Total Users, $142,500 Monthly Revenue) and the `Recent Appointments` table ("James Wilson", "Lydia Chen") are static HTML text elements.
     * **Clarification Regarding Live Chart Visualizations:** The PETLY feature that provides interactive, live-updating Recharts visualizations driven by real database CRUD operations is the **Health Hub** ([HealthHub.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/HealthHub.jsx)). In HealthHub, users log and update pet health metrics (weight measurements, vaccination timelines, vitals) that persist directly to MongoDB Atlas via `/api/health`, and the client-side Recharts `AreaChart` dynamically recomputes and visualizes the updated records in real time.
   * *Future Enhancement:* Connect `AdminPanel.jsx` to dedicated backend MongoDB aggregation pipelines (`$facet`, `$group` over `orders`, `adoptionapplications`, and `users`), provide an interactive administrative management UI, and wrap the `/admin` route in role-based route guards.
5. **Mobile Applications:**
   * *Current Status:* PETLY is currently accessible through a responsive web SPA. Native Android/iOS builds are future enhancements.

---

## Summary Deliverables (Sections A – J)

### A. Complete Implementation Status Table

| Feature Area | Frontend Component / Page | Backend API Route | Controller | Model / Collection | Status |
|---|---|---|---|---|---|
| User Signup / Login | `Login.jsx`, `Signup.jsx` | `/api/auth/signup`, `/login` | `authController` | `User` / `users` | **IMPLEMENTED** |
| Profile & Address Management | `Profile.jsx` | `/api/auth/profile`, `/me` | `authController` | `User` / `users` | **IMPLEMENTED** |
| Password Reset Workflow | `ForgotPassword.jsx` | `/api/auth/forgot-password`, `/reset-password` | `authController` | `User` / `users` | **IMPLEMENTED** |
| Pet Profile CRUD | `HealthHub.jsx`, `Profile.jsx` | `/api/pets`, `/api/pets/:id` | `petController` | `Pet` / `pets` | **IMPLEMENTED** |
| Pet Health Records Tracking | `HealthHub.jsx` | `/api/health`, `/api/health/:id` | `healthController` | `HealthRecord` / `healthrecords` | **IMPLEMENTED** |
| Medical Documents Vault | `HealthHub.jsx` | `/api/documents`, `/:id/presigned-url` | `documentController` | `MedicalDocument` / `medicaldocuments` | **IMPLEMENTED** |
| Adoption Listings Feed | `Adopt.jsx` | `/api/adoption`, `/api/adoption/:id` | `adoptionController` | `AdoptionListing` / `adoptionlistings` | **IMPLEMENTED** |
| Adoption Applications & Transfer | `Adopt.jsx` | `/api/adoption/:id/apply`, `/applications` | `adoptionController` | `AdoptionApplication`, `Pet` | **IMPLEMENTED** |
| Store Catalog & Filtering | `Store.jsx` | `/api/store/products`, `/:id` | `storeController` | `Product` / `products` | **IMPLEMENTED** |
| Cart & Wishlist Operations | `Store.jsx`, `Wishlist.jsx` | `/api/store/cart`, `/wishlist` | `storeController` | Embedded in `User` | **IMPLEMENTED** |
| Order Checkout & History | `Store.jsx`, `Profile.jsx` | `/api/store/orders`, `/:id/cancel` | `storeController` | `Order` / `orders` | **IMPLEMENTED** |
| Product Reviews & Ratings | `Store.jsx` | `/api/store/products/:id/reviews` | `storeController` | `Review` / `reviews` | **IMPLEMENTED** |
| Service Providers Catalog | `Services.jsx` | `/api/services/providers` | `serviceController` | `ServiceProvider` / `serviceproviders`| **IMPLEMENTED** |
| Service Appointment Booking | `Services.jsx`, `Profile.jsx` | `/api/services/bookings` | `serviceController` | `ServiceBooking` / `servicebookings` | **IMPLEMENTED** |
| Service Provider Reviews | `Services.jsx` | `/api/services/providers/:id/reviews` | `serviceController` | `Review` / `reviews` | **IMPLEMENTED** |
| Community Posts & Media Feed | `Community.jsx` | `/api/community/posts`, `/:id/like` | `communityController`| `Post` / `posts` | **IMPLEMENTED** |
| Post Comments | `Community.jsx` | `/api/community/posts/:id/comments` | `communityController`| `Comment` / `comments` | **IMPLEMENTED** |
| Community Societies / Groups | `Community.jsx` | `/api/community/societies` | `communityController`| `Society` / `societies` | **IMPLEMENTED** |
| AI Conversations Management | `Messages.jsx` | `/api/assistant/conversations` | `assistantController`| `Conversation` / `conversations` | **IMPLEMENTED** |
| Gemini AI Chat & Tool Calling | `Messages.jsx` | `/api/assistant/chat` | `assistantController`| `Message` / `messages` | **IMPLEMENTED** |
| Pet-Care Knowledge Quiz | `PetQuiz.jsx` | `/api/quiz/questions`, `/attempts` | `quizController` | `QuizQuestion`, `QuizAttempt` | **IMPLEMENTED** |
| Companion Compatibility Match | `PetQuiz.jsx` | `/api/quiz/companion/matches` | `quizController` | `CompanionMatch` / `companionmatches`| **IMPLEMENTED** |
| In-App Notifications Feed | `Navbar.jsx`, `Profile.jsx` | `/api/notifications`, `/read-all` | `notificationController`| `Notification` / `notifications` | **IMPLEMENTED** |
| AWS S3 Presigned Uploads | `HealthHub.jsx`, `Community.jsx`| `/api/uploads`, `/presigned-url` | `uploadController` | S3 Object + MongoDB Metadata | **IMPLEMENTED** |
| Postal PIN Code Verification | `Profile.jsx`, `Signup.jsx` | `/api/location/pincode/:pincode` | `locationController`| In-Memory Cache + User Schema | **IMPLEMENTED** |
| Admin Backend CRUD Operations | Domain Pages / API Test Suite | `/api/store/products`, `/providers`, `/questions` | `storeController`, `serviceController`, `quizController` | `Product`, `ServiceProvider`, `QuizQuestion` | **IMPLEMENTED** (Role-guarded backend CRUD) |
| Admin Dashboard Analytics UI | `AdminPanel.jsx` | N/A (Static presentation mockup) | N/A | Hardcoded demonstration arrays (`revenueData`, `adoptionData`) | **STATIC DEMONSTRATION UI** (Hardcoded arrays; live interactive charts are in `HealthHub.jsx`) |
| Real Payment Gateway (Stripe) | Checkout Dialog | N/A (Simulated Demo Checkout) | N/A | Default `'Cash on Delivery (Demo)'` | **FUTURE ENHANCEMENT** |
| Outbound Email / SMS Dispatch | Notification System | N/A (In-app only) | N/A | `notifications` collection only | **FUTURE ENHANCEMENT** |

---

### B. Database Collection / Model Table

| # | Collection Name | Mongoose Model | Key Fields & Types | Referenced Collections | Embedded Sub-Documents | Key Indexes |
|---|---|---|---|---|---|---|
| 1 | `users` | `User` | `fullName`, `email`, `password`, `phone`, `role`, `avatarUrl`, `cognitoSub` | `Product` (in wishlist and cart) | `cart[]`, `addresses[]`, `shelterDetails` | `{ email: 1 }` (unique)<br>`{ cognitoSub: 1 }` (sparse) |
| 2 | `pets` | `Pet` | `name`, `species`, `breed`, `age`, `weight`, `healthStatus`, `photoKey`, `adoptionStatus` | `User` (`owner`, `originalOwner`) | `adoptionHistory[]` | `{ owner: 1 }`<br>`{ adoptionStatus: 1 }` |
| 3 | `healthrecords` | `HealthRecord` | `type`, `title`, `description`, `date`, `value`, `status`, `notes`, `isHistorical` | `Pet` (`pet`), `User` (`owner`, `preAdoptionOwner`) | None | `{ pet: 1 }`<br>`{ owner: 1 }`<br>`{ isHistorical: 1 }` |
| 4 | `medicaldocuments` | `MedicalDocument` | `title`, `category`, `s3Key`, `originalName`, `contentType`, `size`, `isHistorical` | `Pet` (`pet`), `User` (`owner`, `preAdoptionOwner`) | None | `{ pet: 1 }`<br>`{ owner: 1 }`<br>`{ isHistorical: 1 }` |
| 5 | `adoptionlistings` | `AdoptionListing` | `title`, `description`, `adoptionFee`, `requirements[]`, `status`, `location` | `Pet` (`pet`), `User` (`shelter`) | None | `{ pet: 1 }`<br>`{ shelter: 1 }`<br>`{ status: 1 }` |
| 6 | `adoptionapplications` | `AdoptionApplication` | `status`, `livingSituation`, `experience`, `phone`, `notes` | `User` (`applicant`, `shelter`), `AdoptionListing` (`listing`), `Pet` (`pet`) | None | `{ applicant: 1 }`<br>`{ listing: 1 }`<br>`{ shelter: 1 }`<br>`{ status: 1 }` |
| 7 | `products` | `Product` | `name`, `description`, `price`, `category`, `stock`, `imageKey`, `rating`, `isActive` | None | None | `{ category: 1 }`<br>`{ isActive: 1 }`<br>`{ demoId: 1 }` |
| 8 | `orders` | `Order` | `totalAmount`, `paymentMethod`, `status`, `cancelledAt` | `User` (`user`), `Product` (`items[].product`) | `items[]` (`orderItemSchema`), `shippingAddress` | `{ user: 1, createdAt: -1 }` |
| 9 | `reviews` | `Review` | `targetType`, `rating`, `reviewText` | `User` (`user`), `Product` / `ServiceProvider` (`targetId`) | None | `{ targetId: 1, user: 1 }` (unique) |
| 10 | `serviceproviders` | `ServiceProvider` | `name`, `category`, `bio`, `description`, `price`, `rating`, `isActive` | None | `availability[]` (`availabilitySlotSchema`) | `{ category: 1, isActive: 1 }` |
| 11 | `servicebookings` | `ServiceBooking` | `serviceName`, `category`, `providerName`, `petName`, `date`, `time`, `price`, `status` | `User` (`user`), `ServiceProvider` (`provider`), `Pet` (`pet`) | None | `{ user: 1, createdAt: -1 }` |
| 12 | `posts` | `Post` | `content`, `category`, `mediaKey`, `mediaType`, `likesCount`, `commentsCount` | `User` (`author`, `likes[]`, `downvotes[]`, `savedBy[]`) | None | `{ createdAt: -1 }`<br>`{ category: 1 }` |
| 13 | `comments` | `Comment` | `content` | `Post` (`post`), `User` (`author`) | None | `{ post: 1 }`<br>`{ author: 1 }` |
| 14 | `societies` | `Society` | `name`, `slug`, `icon`, `membersCount`, `isBuiltIn` | `User` (`creator`) | None | `{ slug: 1 }` (unique) |
| 15 | `conversations` | `Conversation` | `title` | `User` (`user`), `Pet` (`pet`) | None | `{ user: 1, updatedAt: -1 }` |
| 16 | `messages` | `Message` | `role`, `content` | `Conversation` (`conversation`) | `media` (`mediaMetadataSchema`) | `{ conversation: 1, createdAt: 1 }` |
| 17 | `notifications` | `Notification` | `type`, `title`, `message`, `link`, `isRead`, `metadata` | `User` (`user`) | None | `{ user: 1, isRead: 1 }` |
| 18 | `quizquestions` | `QuizQuestion` | `category`, `difficulty`, `question`, `options[]`, `correctAnswer`, `isActive` | None | None | `{ category: 1, difficulty: 1, isActive: 1 }` |
| 19 | `quizattempts` | `QuizAttempt` | `category`, `score`, `totalQuestions`, `percentage` | `User` (`user`), `QuizQuestion` (`answers[].questionId`) | `answers[]` | `{ user: 1, createdAt: -1 }` |
| 20 | `companionmatches` | `CompanionMatch` | `answers`, `compatibilityScore` | `User` (`user`) | `primaryRecommendation`, `alternativeRankings[]`, `allMatches[]` | `{ user: 1, createdAt: -1 }` |

---

### C. API/Route $\rightarrow$ Controller $\rightarrow$ Model Mapping

```
POST   /api/auth/signup               -> authController.signup               -> User
POST   /api/auth/login                -> authController.login                -> User
POST   /api/auth/cognito-sync         -> authController.cognitoSync          -> User
GET    /api/auth/me                   -> authController.getMe                -> User
PUT    /api/auth/profile              -> authController.updateProfile        -> User
PUT    /api/auth/change-password      -> authController.changePassword       -> User
POST   /api/auth/forgot-password      -> authController.forgotPassword       -> User
PUT    /api/auth/reset-password/:tok  -> authController.resetPassword        -> User

POST   /api/pets                      -> petController.createPet             -> Pet
GET    /api/pets                      -> petController.getPets               -> Pet
GET    /api/pets/:id                  -> petController.getPetById            -> Pet
PUT    /api/pets/:id                  -> petController.updatePet             -> Pet
DELETE /api/pets/:id                  -> petController.deletePet             -> Pet, HealthRecord, MedicalDocument

POST   /api/health                    -> healthController.createHealthRecord -> HealthRecord, Pet
GET    /api/health                    -> healthController.getHealthRecords   -> HealthRecord, Pet
GET    /api/health/:id                -> healthController.getHealthRecordById-> HealthRecord
PUT    /api/health/:id                -> healthController.updateHealthRecord -> HealthRecord
DELETE /api/health/:id                -> healthController.deleteHealthRecord -> HealthRecord

POST   /api/documents                 -> documentController.uploadMedicalDoc -> MedicalDocument, Pet
GET    /api/documents                 -> documentController.getMedicalDocs   -> MedicalDocument
GET    /api/documents/:id/presigned   -> documentController.getDocumentUrl   -> MedicalDocument, Pet
DELETE /api/documents/:id             -> documentController.deleteMedicalDoc -> MedicalDocument, S3

GET    /api/adoption                  -> adoptionController.getListings      -> AdoptionListing, Pet, User
POST   /api/adoption                  -> adoptionController.createListing    -> AdoptionListing, Pet
PUT    /api/adoption/:id              -> adoptionController.updateListing    -> AdoptionListing
DELETE /api/adoption/:id              -> adoptionController.deleteListing    -> AdoptionListing
POST   /api/adoption/:id/apply        -> adoptionController.applyForAdoption -> AdoptionApplication, Notification
GET    /api/adoption/applications/my  -> adoptionController.getMyApplications-> AdoptionApplication
GET    /api/adoption/:id/applications -> adoptionController.getListingApps  -> AdoptionApplication
PUT    /api/adoption/applications/:id -> adoptionController.updateAppStatus -> AdoptionApplication, Pet, HealthRecord, MedicalDocument

GET    /api/store/products            -> storeController.getProducts         -> Product
POST   /api/store/products            -> storeController.createProduct       -> Product
POST   /api/store/cart                -> storeController.addToCart           -> User (embedded cart)
DELETE /api/store/cart/:productId     -> storeController.removeFromCart      -> User (embedded cart)
POST   /api/store/wishlist/toggle     -> storeController.toggleWishlist      -> User (wishlistProducts)
POST   /api/store/orders              -> storeController.createOrder         -> Order, User, Notification
GET    /api/store/orders              -> storeController.getOrders           -> Order
PUT    /api/store/orders/:id/cancel   -> storeController.cancelOrder         -> Order, Notification
POST   /api/store/products/:id/reviews-> storeController.createProductReview -> Review, Product

GET    /api/services/providers        -> serviceController.getProviders      -> ServiceProvider
POST   /api/services/providers        -> serviceController.createProvider    -> ServiceProvider
POST   /api/services/bookings         -> serviceController.createBooking     -> ServiceBooking, Notification
GET    /api/services/bookings         -> serviceController.getBookings       -> ServiceBooking
PUT    /api/services/bookings/:id/stat-> serviceController.updateStatus      -> ServiceBooking, Notification
POST   /api/services/providers/:id/rev-> serviceController.createReview      -> Review, ServiceProvider

GET    /api/community/posts           -> communityController.getPosts        -> Post, User
POST   /api/community/posts           -> communityController.createPost      -> Post
POST   /api/community/posts/:id/like  -> communityController.toggleLike      -> Post
POST   /api/community/posts/:id/save  -> communityController.toggleSave      -> Post
POST   /api/community/posts/:id/comms -> communityController.addComment      -> Comment, Post, Notification
GET    /api/community/societies       -> communityController.getSocieties    -> Society
POST   /api/community/societies       -> communityController.createSociety   -> Society

GET    /api/quiz/questions            -> quizController.getQuestions         -> QuizQuestion
POST   /api/quiz/attempts             -> quizController.submitAttempt        -> QuizAttempt, QuizQuestion
POST   /api/quiz/companion/matches    -> quizController.saveCompanionMatch   -> CompanionMatch

GET    /api/assistant/conversations   -> assistantController.getConversations-> Conversation
POST   /api/assistant/conversations   -> assistantController.createConv     -> Conversation
POST   /api/assistant/chat            -> assistantController.chatWithAssistant-> Message, Gemini, Read-only Models

GET    /api/notifications             -> notificationController.getMyNotifs  -> Notification
PUT    /api/notifications/read-all    -> notificationController.markAllAsRead-> Notification

POST   /api/uploads                   -> uploadController.uploadFile         -> S3 Storage
GET    /api/uploads/presigned-url     -> uploadController.getPresignedUrl    -> S3 Storage
DELETE /api/uploads                   -> uploadController.deleteFile         -> S3 Storage

GET    /api/location/pincode/:pincode -> locationController.lookupPincode    -> In-memory Cache / External API
```

---

### D. S3 Implementation Summary

* **Storage Architecture:** AWS S3 serves as the binary object layer; MongoDB persists structured metadata and object keys.
* **Folder Categories:** `pets/`, `avatars/`, `adoption/`, `documents/`, `posts/`, `products/`, `services/`.
* **Upload Path:** Client sends multipart/form-data $\rightarrow$ Multer memory storage buffers file in RAM $\rightarrow$ MIME type and size checks run $\rightarrow$ Structured user-scoped key generated $\rightarrow$ S3 `PutObjectCommand` stores object with private ACL.
* **Retrieval Path:** Client requests presigned URL $\rightarrow$ Backend checks ownership $\rightarrow$ `@aws-sdk/s3-request-presigner` issues temporary 1-hour signed URL.
* **Safe Deletion:** Ownership verified $\rightarrow$ Historical status checked (`!isHistorical`) $\rightarrow$ S3 object deleted $\rightarrow$ MongoDB metadata record deleted.

---

### E. Authentication & Security Summary

* **Dual Token Engine:** Accepts both custom HMAC-SHA256 JWTs and AWS Cognito RS256 JWTs verified via live JWKS public keys.
* **Credential Protection:** Passwords hashed with `bcryptjs` (10 rounds); User schema sets `password: { select: false }`.
* **Authorization Levels:** Role hierarchy (`user`, `shelter`, `admin`) enforced by middleware; public registration for `admin` is blocked.
* **IDOR Defense:** Direct object comparison (`resource.owner === req.user._id`) on pet records, medical documents, orders, bookings, and S3 keys.
* **Input Validation:** 6-digit Indian PIN code validation with in-memory TTL caching and safe error handling.

---

### F. Gemini AI Implementation Summary

* **Integration Model:** Direct HTTPS POST calls to Google Generative Language API using `gemini-3.8-flash` with a 4-tier fallback chain.
* **Context Assembly:** Incorporates conversation history (prior 20 messages) and verified pet health metrics.
* **Tool Calling Capabilities:** 11 declared tools querying MongoDB collections (`pets`, `healthrecords`, `orders`, `servicebookings`, etc.).
* **Security Guardrail:** All 11 tools are strictly read-only; the AI assistant cannot perform insert, update, or delete operations.
* **Transient Media:** Uploaded images and videos are converted to base64 inline for the Gemini API call; only metadata is persisted in MongoDB.

---

### G. Testing Summary

* **Test Suite:** 28 targeted Node.js test scripts in `server/` covering database connections, auth restrictions, S3 uploads, adoption transactions, polymorphic reviews, and Gemini tool execution.
* **Key Verified Behaviors:**
  * Prevention of admin creation via public signup.
  * Atomic ownership transfer and historical record tagging upon adoption approval.
  * Secure presigned URL generation and ownership enforcement for medical documents.
  * Correct recomputation of average review ratings and counts using aggregation.
  * Gemini tool calling and multi-model fallback execution.

---

### H. Differences Between Assessment 6 and Current Implementation

| Feature / Domain | Assessment 6 Proposal | Current Codebase Implementation | Rationale |
|---|---|---|---|
| **Location Validation** | Unstructured text string | Dedicated `/api/location` endpoint with 6-digit PIN validation and TTL cache | Prevents malformed addresses and speeds up repeated lookups |
| **Pet Medical Fields** | Basic demographic fields | Structured `allergies[]`, `medicalConditions[]`, `dob`, `temperature`, `height`, `themeColor` | Provides richer context for Gemini AI pet advice |
| **Adoption Atomicity** | Conceptual atomic transfer | Dual-mode: Mongoose transaction session with sequential fallback | Ensures compatibility across single-node and multi-node replica MongoDB setups |
| **Medical Provenance** | Flagged as future enhancement | Enforced `isHistorical: true` check that prevents adopters from deleting previous records | Maintains medical record audit integrity across pet ownership changes |
| **AI Model Topology** | Single model (`gemini-3.8-flash`) | 5-tier fallback chain (`3.8-flash` $\rightarrow$ `3.6-flash` $\rightarrow$ `3.5-flash-lite` $\rightarrow$ `3.1-flash-lite` $\rightarrow$ `2.5-flash-lite`) | Shields chat functionality from quota limits and model availability changes |
| **Authentication System** | JWT with optional Cognito | Integrated dual-engine supporting both HS256 JWTs and Cognito RS256 JWKS tokens | Enables Cognito email verification while preserving fast local authentication |

---

### I. Incomplete Features & Future Enhancements

* **Payment Gateway Integration:** Payment checkout currently simulates Cash on Delivery, UPI, and Card options. Production Stripe or Razorpay integration with webhook reconciliation is a future enhancement.
* **Direct User Messaging:** User communication is handled via adoption applications and community threads. Live peer-to-peer WebSocket messaging is planned for a subsequent release.
* **Outbound SMS/Email Dispatch:** Alerts and notifications are stored and displayed in-app. Automated delivery via AWS SES/SNS is scheduled for future work.
* **Real-time Admin Analytics & Management Dashboard:** Role-restricted administrative CRUD APIs are operational on the backend (`/api/store/products`, `/api/services/providers`, `/api/quiz/questions`), but [AdminPanel.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/AdminPanel.jsx) operates as a static visual showcase using **genuinely hardcoded demonstration arrays** (`revenueData`, `adoptionData`) rather than live MongoDB aggregation pipelines or database-fetched state. In contrast, interactive, live-updating charts backed by persistent MongoDB records are implemented in the Health Hub ([HealthHub.jsx](file:///c:/Users/Swathi/.gemini/antigravity/scratch/src/pages/HealthHub.jsx)) for pet wellness metrics.
* **Native Mobile Apps:** The current solution is a responsive web application; native Android and iOS mobile builds are future enhancements.

---

### J. Recommended Screenshots & Evidence for Assessment 9

1. **MongoDB Atlas Collections Overview:**
   * *What it proves:* Visual confirmation that all 20 collections exist in MongoDB Atlas (`users`, `pets`, `healthrecords`, `medicaldocuments`, `adoptionlistings`, etc.).
2. **User Authentication & Role Shield:**
   * *What it proves:* Successful user registration, JWT generation, and `403 Forbidden` response when attempting to signup with `role: "admin"`.
3. **Pet Profile & Structured Health Record Hub (`/health`):**
   * *What it proves:* Shows pet demographics, Recharts weight analytics, vaccination schedule, and active medications.
4. **AWS S3 Document Vault & Presigned URL Access:**
   * *What it proves:* Upload of a private medical PDF, storage of the object key in MongoDB, and temporary presigned URL generation.
5. **Adoption Application Approval & Ownership Transfer (`/adopt`):**
   * *What it proves:* Shows listing inquiry approval, automatic update of `Pet.owner`, audit entry appended to `Pet.adoptionHistory`, and status update on `AdoptionListing`.
6. **Historical Medical Record Tagging (`isHistorical`):**
   * *What it proves:* Inspection of a transferred pet showing that prior health records and medical documents are tagged `isHistorical: true` with `preAdoptionOwner` set.
7. **Store Catalog, Cart & Order Placement (`/store`):**
   * *What it proves:* Product browsing, cart management in the User document, and order creation with snapshotted line item prices.
8. **Polymorphic Product & Service Reviews:**
   * *What it proves:* Review submission updating the average rating and review count on the target item, and enforcement of the compound index preventing duplicate reviews.
9. **Service Booking Workflow (`/services`):**
   * *What it proves:* Browsing service providers by category, booking an appointment with an owned pet, and verifying the booking status in the user profile.
10. **Community Feed, Media Upload & Comment Threads (`/community`):**
    * *What it proves:* Creation of a community post with S3 media attachment, upvote/downvote counter increments, and post comment hierarchy.
11. **Pet-Care Knowledge Quiz & Companion Matching (`/quiz`):**
    * *What it proves:* Submission of quiz answers, percentage score calculation, lifestyle matching questionnaire, and compatibility ranking persistence in `companionmatches`.
12. **In-App Notification Feed:**
    * *What it proves:* Automated generation of notifications triggered by adoption, order, and comment events, unread badge counter, and mark-all-as-read behavior.
13. **Gemini AI Contextual Assistant & Tool Calling (`/messages`):**
    * *What it proves:* User inquiring about their pet, Gemini executing a read-only tool call (`getMyPets` / `getMyHealthRecords`), and returning a contextual response adhering to veterinary safety guidelines.
14. **AWS Cognito Live JWKS Verification:**
    * *What it proves:* Output of `test_phase9b.js` demonstrating live cryptographic token verification against the Cognito User Pool endpoint.