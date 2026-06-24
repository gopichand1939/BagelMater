import React from 'react';
import About from "../../components/Home/About";
import Testimonials from "../../components/Home/Testimonials";

export default function AboutPage() {
  return (
    <div className="w-full pt-16 bg-[#110e0d]">
      <About />
      <Testimonials />
    </div>
  );
}
