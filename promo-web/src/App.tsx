import TextFlippingBoardDemo from "./components/text-flipping-board-demo";
import { 
  Instagram, 
  Send, 
  Bot, 
  ShieldCheck, 
  Zap, 
  Clock, 
  BarChart3, 
  MessageSquare, 
  Sparkles,
  Play,
  ArrowRight
} from "lucide-react";

export default function App() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center selection:bg-orange-500 selection:text-white relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header / Navbar */}
      <header className="w-full max-w-6xl px-6 py-8 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-500 rounded-xl shadow-lg shadow-orange-500/30 flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              Lyvora
            </span>
            <span className="block text-[10px] text-neutral-400 font-mono tracking-widest uppercase">
              NLR Group
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://lyvoranlr.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-sm font-medium hover:bg-neutral-800 transition-colors flex items-center gap-2"
          >
            Live Dashboard
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Main Promo Content */}
      <main className="w-full max-w-5xl px-6 flex-1 flex flex-col items-center justify-center py-12 z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold tracking-wide uppercase mb-6 shadow-sm shadow-orange-500/5">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          Instagram + Telegram Automation
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl md:text-6xl font-extrabold text-center tracking-tight leading-tight max-w-3xl mb-6 bg-gradient-to-b from-white to-neutral-300 bg-clip-text text-transparent">
          Power Your Audience Workflows with <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-blue-500 bg-clip-text text-transparent">Lyvora</span>
        </h1>

        <p className="text-neutral-400 text-center max-w-2xl text-base md:text-lg mb-10 leading-relaxed">
          The unified marketing platform that automatically sends DMs to Instagram comments and schedules recurring channel broadcasts on Telegram.
        </p>

        {/* Text Flipping Board Demo Container */}
        <div className="w-full max-w-3xl mb-16 relative">
          {/* Glassmorphic Board container */}
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-blue-500/10 rounded-2xl blur-xl opacity-75 pointer-events-none" />
          <div className="relative rounded-2xl border border-neutral-800/80 bg-neutral-900/40 backdrop-blur-md p-2 md:p-6 shadow-2xl">
            <TextFlippingBoardDemo />
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl mb-20">
          {/* Instagram Card */}
          <div className="p-8 rounded-2xl border border-neutral-800 bg-neutral-900/30 backdrop-blur-sm hover:border-orange-500/30 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-6 group-hover:bg-orange-500 group-hover:text-white transition-all">
              <Instagram className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3 flex items-center gap-2 text-white">
              Instagram DM Automation
            </h3>
            <p className="text-neutral-400 text-sm leading-relaxed mb-4">
              Monitor posts/reels for target keywords. Automatically send personalized direct messages using cookie session authorization and cascading delivery.
            </p>
            <ul className="space-y-2.5 text-xs text-neutral-300 font-mono">
              <li className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-orange-500" />
                Passwordless Cookie Authentication
              </li>
              <li className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-orange-500" />
                Spintax Variated Message Templates
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                Safe Timing & Working Hours Settings
              </li>
            </ul>
          </div>

          {/* Telegram Card */}
          <div className="p-8 rounded-2xl border border-neutral-800 bg-neutral-900/30 backdrop-blur-sm hover:border-blue-500/30 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-6 group-hover:bg-blue-500 group-hover:text-white transition-all">
              <Send className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3 flex items-center gap-2 text-white">
              Telegram Channel Manager
            </h3>
            <p className="text-neutral-400 text-sm leading-relaxed mb-4">
              Schedule content deliveries, set up recurring broadcasts, and design auto-moderation rules to delete links, spam, and keep chat environments clean.
            </p>
            <ul className="space-y-2.5 text-xs text-neutral-300 font-mono">
              <li className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Timezone-Aware Scheduled Posts
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                Anti-Spam & Keyword Filters
              </li>
              <li className="flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                Dynamic Post Delivery Logs
              </li>
            </ul>
          </div>
        </div>

        {/* Video / Demo Showcase Section */}
        <div className="w-full max-w-4xl p-8 rounded-2xl border border-neutral-800 bg-neutral-900/20 backdrop-blur-sm flex flex-col md:flex-row items-center justify-between gap-8 mb-16">
          <div className="flex-1">
            <h4 className="text-lg font-bold text-white mb-2">Watch the Demo Video</h4>
            <p className="text-neutral-400 text-sm leading-relaxed">
              See Lyvora in action: setting up comment triggers, executing passwordless connections, and dispatching live automated scheduled announcements.
            </p>
          </div>
          <button className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold transition-all shadow-lg shadow-orange-500/20 group hover:scale-[1.02]">
            <Play className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" />
            Play Demo Reel
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-neutral-900 bg-neutral-950 py-12 flex flex-col items-center justify-center z-10">
        <p className="text-sm text-neutral-500 font-mono tracking-wide mb-2">
          &copy; 2024-2026 Lyvora. All rights reserved.
        </p>
        <p className="text-xs text-neutral-400">
          Developed with excellence by <strong className="text-neutral-300 font-semibold uppercase">NLR GROUP OF COMPANIES</strong>
        </p>
      </footer>
    </div>
  );
}
