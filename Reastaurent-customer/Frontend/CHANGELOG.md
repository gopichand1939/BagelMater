# Changelog (UI Enhancements & Updates)

*This file tracks the frontend UI changes and refactoring completed for the application.*

## [2026-05-24] UI Enhancements & Product Modal Integration

### Added
- **Top Sellers Section:**
  - Added a new premium section in the Home Page (`src/components/Home/TopSellers.jsx`).
  - Displays the most popular items (e.g., Everything Bagel, Cold Brew) in an elegant 3-column grid with hover effects and quick "Order Now" links.
  - Inserted just above the "Handcrafted" / "Freshly Baked Daily" section on the Home Page.
- **Premium Product Modal:**
  - Replaced the basic "AddonModal" with a full `ProductModal.jsx` (`src/components/Menu/ProductModal.jsx`).
  - The modal now triggers unconditionally whenever a user clicks on a product image or the "Customize details" button in the menu.
  - Features a split-layout (Image on the left, Details & Addons on the right) for a very high-end e-commerce feel.
- **Scroll to Top Button:**
  - Created a global `ScrollToTop.jsx` component (`src/components/common/ScrollToTop.jsx`).
  - Included in `App.jsx` so it appears universally across all customer-facing routes.
  - Animations make it smoothly fade in when scrolled past 300px, and it softly scrolls back to the top when clicked.

### Changed
- **CustomerLayout Updates:**
  - `CustomerLayout.jsx` now utilizes the `ProductModal` instead of `AddonModal`. This means all items flow through this single, premium popup experience when interacted with.
- **Stripe Payments Check:**
  - Analyzed the "Pay Online" button issue. Identified that it correctly disables itself if `VITE_STRIPE_PUBLISHABLE_KEY` is not provided in a `.env` file or if the minimum INR amount isn't met.
  - *Note: Please ensure a valid Stripe key is present in `.env` to enable this functionality.*

### Removed
- **AddonModal.jsx:** Effectively sunsetted and functionally replaced by the much more robust `ProductModal.jsx`.

---

## [2026-05-24] Homepage Styling & Premium Newsletter Block

### Changed
- **Homepage Section Backgrounds:**
  - **Hero:** Deepened to a premium `#0F0B08` dark background with a warm golden radial overlay.
  - **Top Sellers:** Shifted to a rich espresso brown (`#1A120D`) with soft radial lighting and sleek glassmorphism effects on the product cards.
  - **Freshly Baked Daily:** Returned to the deep dark background (`#0F0B08`) for striking product contrast.
  - **Our Philosophy:** Transformed into a warm cream-beige background (`#F5EFE6`) with dark brown typography (`#2D1B12`), creating a premium artisan bakery feel that vastly improves readability.
  - **Gallery:** Realigned to the dark luxury background (`#0F0B08`) with cinematic focus.
  - Added smooth gradient transitions between sections for a seamless flow.

### Added
- **Premium Newsletter Section (`src/components/Home/Newsletter.jsx`):**
  - Removed the simple email input from the footer.
  - Created a dedicated, high-conversion "Join Our Coffee Club" section on the homepage.
  - Features a warm beige card layout, rounded corners, elegant typography, modern email input design, and smooth hover animations.

---

## [Earlier Today] Navigation & Layout Restructure

### Added
- **Dedicated Cart Page:**
  - Migrated from a slide-out drawer to a dedicated `/cart` page (`src/Pages/Cart/CartPage.jsx`) for a cleaner, wider checkout experience.
- **Notification Drawer:**
  - Separated notifications from the profile tabs into their own focused `NotificationDrawer.jsx`.
- **Home Navigation:**
  - "Home" added directly into the Header navigation menu.

### Changed
- **Profile / Customer Drawer:**
  - Converted the grid layout into a sleek, vertical accordion structure for "My Profile", "My Orders", "My Account", etc.
