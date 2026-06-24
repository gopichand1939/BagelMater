import { MapPin, Phone, Mail, ArrowRight } from "lucide-react";

export default function Footer() {
  return (
   <footer className="relative overflow-hidden border-t border-cafe-gold/20 bg-[#090705] pt-24 pb-10 text-white/60">
      <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-cafe-gold/10 blur-[180px] pointer-events-none" />
<div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-white/5 blur-[150px] pointer-events-none" />
      <div className="mx-auto max-w-7xl px-6">

    

        <div className="grid gap-14 lg:grid-cols-4">
          
          {/* Brand */}
          <div className="flex flex-col p-2 transition-colors ">
            <h2 className="mb-6 font-serif text-4xl font-bold tracking-wide text-white">Bagel Cafe</h2>
            <div className="mb-5 h-[2px] w-16 bg-cafe-gold"></div>
            <p className="mb-8 font-sans text-sm leading-relaxed text-white/70 flex-1">
              Premium artisanal bagels and meticulously roasted coffee, bringing warmth and flavor to our community since 2010.
            </p>
            <div className="flex gap-4 mt-auto">
{[
  {
    name: 'Instagram',
    url: 'https://www.instagram.com/bagelmaster_/',
    path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z'
  },
  {
    name: 'Facebook',
    url: '#',
    path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z'
  },
  {
    name: 'Twitter',
    url: '#',
    path: 'M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z'
  }
].map((social, i) => (
  <a
    key={i}
    href={social.url}
    target={social.url !== '#' ? '_blank' : undefined}
    rel={social.url !== '#' ? 'noopener noreferrer' : undefined}
    aria-label={social.name}
    className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.02] text-white transition-all hover:-translate-y-2 hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:border-cafe-gold hover:bg-cafe-gold hover:text-[#110e0d]"
  >
    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
      <path d={social.path} />
    </svg>
  </a>
))}
            </div>
          </div>
          
          {/* Quick Links */}
          <div className="flex flex-col p-2 transition-colors ">
            <h3 className="mb-8 font-sans text-xs font-bold uppercase tracking-[0.2em] text-cafe-gold">Quick Links</h3>
            <ul className="grid gap-4 font-sans text-sm">
              {[
                { label: 'Home', link: '#' },
                { label: 'Our Menu', link: 'menu' },
                { label: 'Our Story', link: 'about' },
                { label: 'Contact Us', link: 'contact' },
                { label: 'Privacy Policy', link: '#' }
              ].map((item, i) => (
                <li key={i}>
                  <a href={item.link} className="group flex items-center gap-2 text-white/70 transition-colors hover:text-white">
                    <span className="h-[1px] w-0 bg-cafe-gold transition-all duration-300 group-hover:w-4" />
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="flex flex-col p-2  ">
            <h3 className="mb-8 font-sans text-xs font-bold uppercase tracking-[0.2em] text-cafe-gold">Contact Info</h3>
            <ul className="grid gap-6 font-sans text-[13px] leading-relaxed text-white/70">
              <li className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cafe-gold/10">
                  <MapPin className="h-4 w-4 text-cafe-gold" />
                </div>
                <span className="pt-2">123 Baker Street, Cafe District<br />London, UK W1U 6TY</span>
              </li>
              <li className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cafe-gold/10">
                  <Phone className="h-4 w-4 text-cafe-gold" />
                </div>
                <span>+442070183720</span>
              </li>
              <li className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cafe-gold/10">
                  <Mail className="h-4 w-4 text-cafe-gold" />
                </div>
                <span>hello@bagelcafe.com</span>
              </li>
            </ul>
          </div>

          {/* Find Us */}
          <div className="flex flex-col p-2 transition-colors ">
            <h3 className="mb-8 font-sans text-xs font-bold uppercase tracking-[0.2em] text-cafe-gold">
              Find Us
            </h3>
            <div className="overflow-hidden rounded-2xl border border-white/10 relative group h-full min-h-[180px]">

              <iframe
                src="https://www.google.com/maps?q=Bagel+Master+London&output=embed"
              className="absolute inset-0 h-full w-full transition-all duration-500"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Bagel Master Location"
              />
            </div>
          </div>
          
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-cafe-gold/20 pt-8 text-center font-sans text-[13px] text-white/40 md:flex-row">
        
          <p>&copy; {new Date().getFullYear()} Bagel Cafe. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <span className="hidden md:inline">&middot;</span>
            <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
