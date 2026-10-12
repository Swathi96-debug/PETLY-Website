# PETLY Phase 3: MongoDB Data Model & CRUD Architecture

Phase 3 establishes PETLY's complete MongoDB Atlas-backed REST API and CRUD functionality, transitioning from mock/localStorage data to authenticated, ownership-enforced MongoDB models.

---

## 1. MongoDB Collections & Schemas

PETLY uses 13 distinct collections on MongoDB Atlas:

| Collection | Model File | Purpose | Key Indexes |
|---|---|---|---|
| `users` | `User.js` | User identities, password hashes, roles (`user`, `shelter`, `admin`), profile | `email` (unique) |
| `pets` | `Pet.js` | Registered pets, physical traits, theme colors, S3 photo references | `{ owner: 1 }` |
| `healthRecords` | `HealthRecord.js` | Medical events, vaccinations, medications, weight logs | `{ pet: 1 }`, `{ owner: 1 }` |
| `medicalDocuments`| `MedicalDocument.js` | Metadata & S3 keys for lab results, prescriptions, and health documents | `{ pet: 1 }`, `{ owner: 1 }` |
| `adoptionListings`| `AdoptionListing.js` | Public adoptable pet listings created by shelters or owners | `{ status: 1 }`, `{ shelter: 1 }` |
| `adoptionApplications` | `AdoptionApplication.js`| Applications submitted by users to adopt listed pets | `{ applicant: 1 }`, `{ listing: 1 }` |
| `posts` | `Post.js` | Community social feed posts, media S3 keys, and like counters | `{ createdAt: -1 }`, `{ author: 1 }` |
| `comments` | `Comment.js` | Comments on community posts | `{ post: 1 }` |
| `quizQuestions` | `QuizQuestion.js` | Category-based pet trivia and educational questions | `{ category: 1, difficulty: 1, isActive: 1 }` |
| `quizAttempts` | `QuizAttempt.js` | User quiz evaluations, percentage scores, and answer histories | `{ user: 1 }` |
| `products` | `Product.js` | Pet shop inventory, categories, prices, stock, S3 image references | `{ category: 1, isActive: 1 }` |
| `orders` | `Order.js` | Completed purchases, shipping details, and purchase-time price snapshots | `{ user: 1, createdAt: -1 }` |
| `notifications` | `Notification.js` | User alerts for adoption updates, orders, and system notices | `{ user: 1, isRead: 1 }` |

---

## 2. Document Relationships: Referenced vs. Embedded Data

### Referenced Relationships
- **Pets & Users**: `Pet.owner -> User._id`. Independent lifecycles; a user can own multiple pets.
- **Health Records & Medical Documents**: `HealthRecord.pet -> Pet._id`, `MedicalDocument.pet -> Pet._id`. Allows unlimited health logs without hitting the MongoDB 16MB document limit.
- **Adoption Listings & Applications**:
  - `AdoptionListing.pet -> Pet._id`, `AdoptionListing.shelter -> User._id`
  - `AdoptionApplication.listing -> AdoptionListing._id`, `applicant -> User._id`
- **Community Posts & Comments**: `Comment.post -> Post._id`, `Comment.author -> User._id`. Comments are referenced to allow efficient pagination and infinite scaling.
- **Quiz Attempts**: `QuizAttempt.user -> User._id`, `QuizAttempt.answers.questionId -> QuizQuestion._id`.

### Embedded Subdocuments
- **Order Items** (`Order.items`): Frozen snapshots of `{ product, name, price, quantity, imageKey }`. Prices are frozen at purchase time so future product price updates do not retroactively alter order receipts.
- **Shipping Address** (`Order.shippingAddress`): Self-contained address data.
- **User Shelter Details** (`User.shelterDetails`): Directly embedded within the user document for shelter profiles.

---

## 3. S3 Integration & Cross-System Consistency

Binary files are never stored inside MongoDB. MongoDB stores the S3 object key reference (`s3Key`), MIME type, original filename, and byte size.

### Safe Sequencing & Error Handling (Medical Documents & Media)
Because AWS S3 and MongoDB Atlas are distinct distributed systems, deletion cannot be executed as a single ACID transaction. PETLY implements safe sequencing:
1. **Ownership Verification**: Authenticated identity (`req.user._id`) is verified against the document owner in MongoDB.
2. **S3 Object Deletion**: The binary object is deleted from AWS S3 via the AWS SDK v3 `DeleteObjectCommand`. If S3 deletion fails with an unrecoverable error, the operation aborts and preserves the MongoDB record.
3. **MongoDB Record Deletion**: Only after S3 confirms removal (or reports `NoSuchKey`), the MongoDB document is deleted.
4. **Presigned URL Generation**: Private documents generate time-limited signed URLs on demand via `@aws-sdk/s3-request-presigner` without exposing public bucket access.

---

## 4. API Endpoints & Access Control

| Method | Endpoint | Access | Ownership Rule |
|---|---|---|---|
| **Pets** | | | |
| `POST` | `/api/pets` | Private | Owner is bound to `req.user._id` |
| `GET` | `/api/pets` | Private | Returns pets where `owner === req.user._id` (Admin can query all) |
| `GET` | `/api/pets/:id` | Private | Owner or Admin (or public if `isAdoptable`) |
| `PUT` | `/api/pets/:id` | Private | Only Pet Owner or Admin |
| `DELETE` | `/api/pets/:id` | Private | Only Pet Owner or Admin (cascades records & documents) |
| **Health Records** | | | |
| `POST` | `/api/health` | Private | Verified: Referenced pet must belong to `req.user._id` |
| `GET` | `/api/health` | Private | Filtered to pets owned by `req.user._id` |
| `GET` | `/api/health/:id`| Private | Owner or Admin |
| `PUT` | `/api/health/:id`| Private | Owner or Admin |
| `DELETE` | `/api/health/:id`| Private | Owner or Admin |
| **Medical Documents** | | | |
| `POST` | `/api/documents` | Private | Accepts multipart file or existing `s3Key`; verified against pet owner |
| `GET` | `/api/documents` | Private | Filtered by pet; pet ownership verified |
| `GET` | `/api/documents/:id/presigned-url` | Private | Generates temporary signed URL; verified against owner |
| `DELETE` | `/api/documents/:id` | Private | Safe sequencing: S3 delete -> MongoDB delete |
| **Adoption** | | | |
| `GET` | `/api/adoption` | Public | Lists available/pending adoption listings |
| `GET` | `/api/adoption/:id` | Public | Details of single adoption listing |
| `POST` | `/api/adoption` | Private | Pet owner, Shelter, or Admin only |
| `PUT` | `/api/adoption/:id` | Private | Listing Shelter or Admin only |
| `DELETE` | `/api/adoption/:id` | Private | Listing Shelter or Admin only |
| `POST` | `/api/adoption/:listingId/apply` | Private | Authenticated user applies (cannot apply to own listing) |
| `GET` | `/api/adoption/applications/my` | Private | Returns applicant's own applications |
| `GET` | `/api/adoption/:listingId/applications` | Private | Listing Shelter or Admin only |
| `PUT` | `/api/adoption/applications/:id` | Private | Shelter can approve/reject; Applicant can only withdraw |
| `DELETE` | `/api/adoption/applications/:id` | Private | Applicant or Admin |
| **Community** | | | |
| `GET` | `/api/community/posts` | Public | Recent posts with authors and like counts |
| `POST` | `/api/community/posts` | Private | Author bound to `req.user._id` |
| `PUT` | `/api/community/posts/:id` | Private | Author or Admin |
| `DELETE` | `/api/community/posts/:id` | Private | Author or Admin (deletes comments & S3 media) |
| `POST` | `/api/community/posts/:id/like` | Private | Toggles user like; updates count atomically |
| `POST` | `/api/community/posts/:postId/comments` | Private | Adds comment; increments post `commentsCount` |
| `GET` | `/api/community/posts/:postId/comments` | Public | Comments for post |
| `DELETE` | `/api/community/comments/:id` | Private | Author or Admin |
| **Quiz** | | | |
| `GET` | `/api/quiz/questions` | Public | Returns active questions (`correctAnswer` omitted) |
| `POST` | `/api/quiz/questions` | Admin | Creates question with `correctAnswer` |
| `PUT` | `/api/quiz/questions/:id` | Admin | Modifies question |
| `DELETE` | `/api/quiz/questions/:id` | Admin | Deletes question |
| `POST` | `/api/quiz/attempts` | Private | Evaluates answers against DB and computes score |
| `GET` | `/api/quiz/attempts` | Private | Returns user's own attempt history |
| **Store & Orders** | | | |
| `GET` | `/api/store/products` | Public | Active catalog browsing with category/search filters |
| `POST` | `/api/store/products` | Admin | Product inventory creation |
| `PUT` | `/api/store/products/:id` | Admin | Updates stock, price, details |
| `DELETE` | `/api/store/products/:id` | Admin | Removes product |
| `POST` | `/api/store/orders` | Private | Snapshots item prices from DB, computes total, deducts stock |
| `GET` | `/api/store/orders` | Private | Returns user's own orders |
| `GET` | `/api/store/orders/:id` | Private | Owner or Admin |
| **Notifications** | | | |
| `GET` | `/api/notifications` | Private | Current user's notifications and unread count |
| `PUT` | `/api/notifications/:id/read` | Private | Marks user notification as read |
| `PUT` | `/api/notifications/read-all` | Private | Marks all user notifications as read |
| `DELETE` | `/api/notifications/:id` | Private | Deletes notification |

---

## 5. Test Verification Results

All three test suites run and pass cleanly:

1. **Phase 1 Test Suite** (`node server/test_phase1.js`):
   - **6/6 PASS**: MongoDB connection, bcrypt hashing, password match, JWT generation, admin route protection, admin signup block.
2. **Phase 2 Test Suite** (`node server/test_phase2.js`):
   - **10/10 PASS**: AWS S3 configuration, live upload, presigned URL generation, live deletion, MIME filtering, file size limits, ownership delete protection, zero secret leakage.
3. **Phase 3 Test Suite** (`node server/test_phase3.js`):
   - **25/25 PASS**: Full CRUD coverage for Pets, Health, Documents, Adoption, Community, Quiz, Store/Orders, and Notifications, with cross-user rejections and automatic test data cleanup.
