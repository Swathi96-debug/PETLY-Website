import React from 'react';
import { Link } from 'react-router-dom';
import { PawPrint, Globe, Heart, Mail, Phone } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="relative bg-black pt-32 pb-20 overflow-hidden border-t border-white/5">
      {/* Background Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-[300px] bg-orange-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">

          {/* Brand Info */}
          <div className="space-y-8">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-gradient-to-tr from-orange-500 to-yellow-400 rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
                <PawPrint className="text-white" size={24} />
              </div>
              <span className="text-2xl font-black tracking-tighter text-white">
                PETLY
              </span>
            </Link>

            <p className="text-white/40 leading-relaxed max-w-xs">
              Defining the future of pet care. Premium adoption, digital health
              tracking, and community-driven support.
            </p>

            <div className="flex items-center gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-orange-400 hover:bg-white/10 transition-all"
              >
                <Globe size={18} />
              </a>

              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-pink-400 hover:bg-white/10 transition-all"
              >
                <Heart size={18} />
              </a>

              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-blue-400 hover:bg-white/10 transition-all"
              >
                <Mail size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-8 tracking-tight">
              Platform
            </h4>

            <ul className="space-y-4">
              {[
                { name: 'Adopt', path: '/adopt' },
                { name: 'Matching Quiz', path: '/quiz' },
                { name: 'Pet Store', path: '/store' },
                { name: 'Health Hub', path: '/health' },
                { name: 'Community', path: '/community' },
              ].map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className="text-white/40 hover:text-orange-400 transition-colors text-sm font-medium"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white font-bold mb-8 tracking-tight">
              Support
            </h4>

            <ul className="space-y-4">
              {[
                'Help Center',
                'Safety Center',
                'Legal Hub',
                'Privacy Policy',
                'Cookie Settings',
              ].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-white/40 hover:text-orange-400 transition-colors text-sm font-medium"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold mb-8 tracking-tight">
              Global Care
            </h4>

            <ul className="space-y-6">
              <li className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex flex-shrink-0 items-center justify-center text-orange-400">
                  <Mail size={18} />
                </div>

                <div>
                  <p className="text-xs text-white/30 font-bold uppercase mb-1">
                    Email Support
                  </p>

                  <p className="text-sm font-medium text-white/80">
                    care@petly.co
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex flex-shrink-0 items-center justify-center text-blue-400">
                  <Phone size={18} />
                </div>

                <div>
                  <p className="text-xs text-white/30 font-bold uppercase mb-1">
                    24/7 Hotline
                  </p>

                  <p className="text-sm font-medium text-white/80">
                    +1 (888) PETLY-CARE
                  </p>
                </div>
              </li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-white/20 text-xs font-medium">
            &copy; 2026 PETLY Ecosystem. All rights reserved. Registered
            Trademark.
          </p>

          <div className="flex items-center gap-6">
            <span className="text-[10px] text-green-500 font-bold flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              SYSTEM STATUS: OPERATIONAL
            </span>

            <div className="flex items-center gap-1">
              <span className="text-[10px] text-white/20 uppercase tracking-widest font-black">
                Powered by PETLY Core
              </span>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;