import React from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { Button } from "./ui/button";

export default function LandingPage({ onGetStarted, onNavigateLegal }) {
  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden relative font-body text-foreground">
      {/* Background Video */}
      <video
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260319_015952_e1deeb12-8fb7-4071-a42a-60779fc64ab6.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
      />
      {/* Light soft background overlay to blend video with light theme */}
      <div className="absolute inset-0 bg-white/70 z-0 pointer-events-none" />

      {/* Navbar */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 lg:px-20 py-5 font-body">
        {/* Left: Logo */}
        <div className="flex items-center gap-1.5 cursor-pointer" onClick={onGetStarted}>
          <span className="text-xl font-semibold tracking-tight text-foreground">
            ✦ Lyvora
          </span>
        </div>



        {/* CTA Button */}
        <Button 
          onClick={onGetStarted}
          className="rounded-full px-5 text-sm font-medium"
        >
          Try Free Beta
        </Button>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-start pt-6 md:pt-10 px-6 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex flex-col items-center gap-0.5 rounded-2xl border border-border bg-background px-5 py-2 font-body mb-6 shadow-sm"
        >
          <span className="font-semibold text-foreground text-xs">Future with Sophie Support ✨</span>
          <span className="text-[9px] text-muted-foreground/80">powered by NLR GROUP OF COMPANIES</span>
        </motion.div>

        {/* 2. Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center font-display text-5xl md:text-6xl lg:text-[5rem] leading-[0.95] tracking-tight text-foreground max-w-2xl font-normal"
        >
          The Future of <span className="italic font-display font-normal text-accent">Smarter</span> Automation
        </motion.h1>

        {/* 3. Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-4 text-center text-base md:text-lg text-muted-foreground max-w-[650px] leading-relaxed font-body"
        >
          Automate your busywork with intelligent agents that learn, adapt, and execute—so your team can focus on what matters most.
        </motion.p>

        {/* 4. CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-5 flex items-center gap-3"
        >
          <Button
            onClick={onGetStarted}
            className="rounded-full px-6 py-5 text-sm font-medium font-body"
          >
            Start for Free
          </Button>

          <button
            onClick={onGetStarted}
            className="flex items-center justify-center h-11 w-11 rounded-full border-0 bg-background shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:bg-background/80 transition-colors"
            aria-label="Play video"
          >
            <Play className="h-4 w-4 fill-foreground text-foreground" />
          </button>
        </motion.div>


      </section>
    </div>
  );
}
