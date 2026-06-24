import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'white', backgroundColor: 'red', minHeight: '100vh' }}>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy load layout and pages
const CustomerLayout = lazy(() => import("./components/common/CustomerLayout"));
const HomeContent = lazy(() => import("./Pages/Home/HomeContent"));
const MenuPage = lazy(() => import("./Pages/Menu/MenuPage"));
const AboutPage = lazy(() => import("./Pages/About/AboutPage"));
const EventsPage = lazy(() => import("./Pages/Events/EventsPage"));
const GalleryPage = lazy(() => import("./Pages/Gallery/GalleryPage"));
// const ContactPage = lazy(() => import("./Pages/Contact/ContactPage"));
const CartPage = lazy(() => import("./Pages/Cart/CartPage"));

const Office = lazy(() => import("./Pages/Office/Office"));
const OrderDetails = lazy(() => import("./Pages/OrderDetails/OrderDetails"));
const ScrollToTop = lazy(() => import("./components/common/ScrollToTop"));

const PageLoader = () => (
  <div style={{ 
    display: "flex", 
    justifyContent: "center", 
    alignItems: "center", 
    height: "100vh",
    fontSize: "1.2rem",
    fontWeight: "600",
    color: "#666"
  }}>
    Loading page...
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <ErrorBoundary>
          <ScrollToTop />
          <Routes>
            <Route element={<CustomerLayout />}>
              <Route path="/" element={<HomeContent />} />
              <Route path="/menu" element={<MenuPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/gallery" element={<GalleryPage />} />
              {/* <Route path="/contact" element={<ContactPage />} /> */}
              <Route path="/cart" element={<CartPage />} />
            </Route>
            <Route path="/orders/:id" element={<OrderDetails />} />
            <Route path="/office" element={<Office />} />
          </Routes>
        </ErrorBoundary>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
