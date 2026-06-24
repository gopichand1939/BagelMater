import { useState, useEffect } from "react";
import { ShoppingCart, Bell, User, Menu, X, LogOut, Settings, ShoppingBag, Info, Search } from "lucide-react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { NavLink, Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import BMLogo from "../../assets/Cafe_logo.jpeg";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function Header({
  cartCount,
  onCartClick,
  onCustomerClick,
  onNotificationClick,
  onDropdownClick,
  onLogoutClick,
  customer,
  notificationCount = 0,
  searchQuery = "",
  onSearchChange,
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu when screen resizes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const iconButtonClass = cn(
    "relative flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300",
    scrolled
      ? "bg-white/5 text-white hover:bg-cafe-gold hover:text-[#110e0d]"
      : "bg-black/20 text-white backdrop-blur-md border border-white/10 hover:bg-white hover:text-[#110e0d]"
  );

  const navLinkClass = ({ isActive }) => cn(
    "transition-colors hover:text-cafe-gold",
    isActive ? "text-cafe-gold" : ""
  );

  return (
    <header
      className={cn(
        "fixed left-0 right-0 top-0 z-[100] flex items-center justify-between px-6 py-4 transition-all duration-500",
        scrolled ? "bg-[#110e0d]/90 py-3 shadow-premium backdrop-blur-xl border-b border-white/10" : "bg-transparent py-6"
      )}
    >
      {/* Logo */}
{/* Logo */}
<Link to="/" className="flex items-center gap-3">
  <img
    src={BMLogo}
    alt="Bagel Master Logo"
    className="h-20 w-auto rounded-full object-contain " 
  />
</Link>

      {/* Center Nav (Hidden on Mobile) */}
      <nav className="hidden md:flex items-center gap-8 font-sans text-sm font-semibold uppercase tracking-widest text-white/80">
        <NavLink to="/" className={navLinkClass}>Home</NavLink>
        <NavLink to="/menu" className={navLinkClass}>Menu</NavLink>
        <NavLink to="/about" className={navLinkClass}>About</NavLink>
        <NavLink to="/events" className={navLinkClass}>Events</NavLink>
        <NavLink to="/gallery" className={navLinkClass}>Gallery</NavLink>
        {/* <NavLink to="/contact" className={navLinkClass}>Contact Us</NavLink> */}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Search */}
        <div className="flex items-center relative">
          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ opacity: 0, width: 0, paddingRight: 0 }}
                animate={{ opacity: 1, width: "150px", paddingRight: "8px" }}
                exit={{ opacity: 0, width: 0, paddingRight: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden md:!w-[200px]"
              >
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  placeholder="Search..."
                  className="w-full h-10 px-4 bg-black/40 text-white placeholder-white/50 border border-white/20 rounded-full focus:outline-none focus:border-cafe-gold backdrop-blur-md text-sm"
                />
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={() => {
              if (searchOpen) {
                if (!searchQuery) setSearchOpen(false);
              } else {
                setSearchOpen(true);
              }
            }} 
            className={iconButtonClass}
          >
            {searchOpen && searchQuery ? <X className="h-4 w-4" onClick={(e) => { e.stopPropagation(); onSearchChange?.(""); setSearchOpen(false); }} /> : <Search className="h-5 w-5" />}
          </button>
        </div>
        {/* User / Dropdown */}
        <div className="relative">
          <button 
            onClick={() => {
              if (customer) setDropdownOpen(!dropdownOpen);
              else onCustomerClick();
            }} 
            className={iconButtonClass}
          >
            {customer?.name ? (
              <span className="font-sans text-lg font-bold">{customer.name.charAt(0).toUpperCase()}</span>
            ) : (
              <User className="h-5 w-5" />
            )}
          </button>
          
          <AnimatePresence>
            {dropdownOpen && customer && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full mt-3 w-64 rounded-2xl bg-[#110e0d] border border-white/10 shadow-2xl overflow-hidden z-50 flex flex-col"
                >
                  <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                    <p className="text-sm font-bold text-white truncate">{customer.name}</p>
                    <p className="text-xs text-white/50 truncate mt-0.5">{customer.email}</p>
                  </div>
                  
                  <div className="flex flex-col py-2">
                    {[
                      { id: 'profile', label: 'My Profile', icon: User },
                      { id: 'orders', label: 'My Orders', icon: ShoppingBag },
                      { id: 'settings', label: 'Settings', icon: Settings },
                      { id: 'support', label: 'Support', icon: Info },
                    ].map(item => {
                      const Icon = item.icon;
                      return (
                        <button 
                          key={item.id}
                          onClick={() => {
                            setDropdownOpen(false);
                            onDropdownClick?.(item.id);
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors text-left"
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </button>
                      )
                    })}
                  </div>
                  
                  <div className="border-t border-white/5 py-2">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onLogoutClick?.();
                      }}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors text-left w-full"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Notifications */}
        <button onClick={onNotificationClick} className={iconButtonClass}>
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 font-sans text-[10px] font-bold text-white shadow-lg">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </button>

        {/* Cart */}
        <button onClick={onCartClick} className={iconButtonClass}>
          <ShoppingCart className="h-5 w-5" />
          {cartCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-cafe-gold font-sans text-[10px] font-bold text-[#110e0d] shadow-lg">
              {cartCount}
            </span>
          )}
        </button>

        {/* Mobile Menu Toggle */}
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className={cn(iconButtonClass, "md:hidden")}>
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="absolute left-0 right-0 top-full flex flex-col bg-[#110e0d]/95 backdrop-blur-xl border-b border-white/10 p-6 shadow-2xl md:hidden">
          <nav className="flex flex-col gap-6 font-sans text-lg font-semibold uppercase tracking-widest text-white/80">
            <NavLink to="/" onClick={() => setMobileMenuOpen(false)} className={navLinkClass}>Home</NavLink>
            <NavLink to="/menu" onClick={() => setMobileMenuOpen(false)} className={navLinkClass}>Menu</NavLink>
            <NavLink to="/about" onClick={() => setMobileMenuOpen(false)} className={navLinkClass}>About Us</NavLink>
            <NavLink to="/events" onClick={() => setMobileMenuOpen(false)} className={navLinkClass}>Events</NavLink>
            {/* <NavLink to="/gallery" onClick={() => setMobileMenuOpen(false)} className={navLinkClass}>Gallery</NavLink> */}
            <NavLink to="/contact" onClick={() => setMobileMenuOpen(false)} className={navLinkClass}>Contact Us</NavLink>
          </nav>
        </div>
      )}
    </header>
  );
}

export default Header;
