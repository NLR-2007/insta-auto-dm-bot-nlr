import React, { useState } from "react";
import {
  Zap, Shield, MessageSquare, Send, Lock, Sparkles, Check, ChevronDown, ArrowRight,
  Play, CheckCircle2, AlertTriangle, Cpu, Globe, Users, BarChart3, HelpCircle,
  Camera, Clock, Bot, Filter, Layers, Rocket, Star, Gift
} from "lucide-react";

export default function LandingPage({ onGetStarted }) {
  const [activeFaq, setActiveFaq] = useState(null);

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const igFeatures = [
    {
      icon: Lock,
      title: "Passwordless Authentication",
      desc: "Connect Instagram accounts safely using browser cookies. Your passwords never touch our system.",
      color: "rgba(249, 115, 22, 0.08)",
      textColor: "#F97316"
    },
    {
      icon: MessageSquare,
      title: "Comment-to-DM Triggers",
      desc: "Auto-send DMs when users comment target keywords on your monitored Reels, posts, or carousels.",
      color: "rgba(37, 99, 235, 0.08)",
      textColor: "#2563EB"
    },
    {
      icon: Layers,
      title: "Cascading Delivery Pipeline",
      desc: "3-tier fallback strategy ensures messages are delivered regardless of profile button restrictions.",
      color: "rgba(22, 163, 74, 0.08)",
      textColor: "#16A34A"
    },
    {
      icon: Sparkles,
      title: "Spintax Message Templates",
      desc: "Keep outreach human-like with dynamically randomized greetings, synonyms, and username substitutions.",
      color: "rgba(168, 85, 247, 0.08)",
      textColor: "#A855F7"
    }
  ];

  const tgFeatures = [
    {
      icon: Bot,
      title: "Multi-Bot Management",
      desc: "Add multiple Telegram bot tokens and sync channels automatically. Manage everything from one dashboard.",
      color: "rgba(14, 165, 233, 0.08)",
      textColor: "#0EA5E9"
    },
    {
      icon: Clock,
      title: "Scheduled Channel Posts",
      desc: "Queue content with timezone support, set recurring broadcasts, and never miss a posting window.",
      color: "rgba(99, 102, 241, 0.08)",
      textColor: "#6366F1"
    },
    {
      icon: Filter,
      title: "Auto-Moderation Rules",
      desc: "Create custom spam filters, keyword blocklists, and auto-delete rules to keep channels clean.",
      color: "rgba(236, 72, 153, 0.08)",
      textColor: "#EC4899"
    },
    {
      icon: Send,
      title: "Channel Broadcasting",
      desc: "Send to multiple channels simultaneously with media support and instant delivery tracking.",
      color: "rgba(16, 185, 129, 0.08)",
      textColor: "#10B981"
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Connect Your Accounts",
      desc: "Upload Instagram session cookies for passwordless auth or add Telegram bot tokens. No passwords, no API approvals needed."
    },
    {
      number: "02",
      title: "Configure Automations",
      desc: "Set up comment-triggered DM flows for Instagram, schedule Telegram posts, create moderation rules, and customize message templates."
    },
    {
      number: "03",
      title: "Launch & Monitor",
      desc: "Activate background workers and watch everything in real-time. Track DMs sent, scheduled posts delivered, and moderation actions from a unified dashboard."
    }
  ];

  const pricingTiers = [
    {
      name: "Self-Hosted",
      price: "$0",
      period: "Forever Free",
      desc: "Run the open-source stack on your own machine with full control.",
      features: [
        "1 Instagram Account",
        "30 DMs per day",
        "Comment-triggered monitoring",
        "Spintax templates",
        "Local SQLite database",
        "Community support"
      ],
      cta: "Clone & Deploy",
      popular: false,
      badge: "Open Source"
    },
    {
      name: "Beta Pro",
      price: "$0",
      originalPrice: "$49",
      period: "Free During Beta",
      desc: "Full-featured plan with Instagram + Telegram automation unlocked.",
      features: [
        "5 Instagram Accounts",
        "Unlimited DMs (safety-spaced)",
        "Full Telegram Suite",
        "Scheduled posts & broadcasting",
        "Auto-moderation rules",
        "Priority worker allocation",
        "Email & Discord support"
      ],
      cta: "Start Free Beta",
      popular: true,
      badge: "Beta - 100% Free"
    },
    {
      name: "Agency",
      price: "$0",
      originalPrice: "$99",
      period: "Free During Beta",
      desc: "For agencies managing multiple creator profiles at scale.",
      features: [
        "Unlimited Instagram Accounts",
        "Unlimited Telegram Bots",
        "Multi-workspace management",
        "Proxy rotation support",
        "Custom API & webhooks",
        "Conversion analytics",
        "Dedicated account manager"
      ],
      cta: "Start Free Beta",
      popular: false,
      badge: "Beta - 100% Free"
    }
  ];

  const faqs = [
    {
      q: "Is Lyvora really free during the Beta?",
      a: "Yes! Every feature across all tiers is 100% free during our Beta testing phase. No credit card required, no hidden fees. We're gathering feedback to build the best creator automation platform."
    },
    {
      q: "Does Lyvora require my Instagram password?",
      a: "Never. Lyvora uses session cookies exported from your browser. Your login credentials are never typed, stored, or transmitted through our system."
    },
    {
      q: "What Telegram features are included?",
      a: "You get multi-bot management, scheduled channel posts with timezone support, recurring broadcasts, auto-moderation rules (spam filters, keyword blocking, auto-delete), and real-time delivery tracking."
    },
    {
      q: "How does the bot avoid Instagram detection?",
      a: "Lyvora simulates organic human behavior using Playwright browser automation with randomized typing delays (45-120s), daily DM limits, working hours enforcement, and spintax templates to prevent repetitive patterns."
    },
    {
      q: "Can I use Instagram and Telegram automation together?",
      a: "Absolutely! Lyvora is a unified platform. You can run Instagram comment-to-DM flows and Telegram channel automation simultaneously from the same dashboard, with shared analytics and monitoring."
    },
    {
      q: "What happens when the Beta ends?",
      a: "You'll get early access pricing as a founding user. All your data, configurations, and automations will carry over seamlessly. We'll announce pricing well in advance."
    }
  ];

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="landing-layout">
      {/* ── Navigation Header ── */}
      <header className="landing-nav">
        <div className="nav-container">
          <div className="nav-logo" onClick={() => scrollToSection("hero")}>
            <div className="nav-logo-icon">
              <Zap size={18} fill="#F97316" stroke="none" />
            </div>
            <span>Lyvora</span>
          </div>

          <nav className="nav-links">
            <button onClick={() => scrollToSection("features")}>Features</button>
            <button onClick={() => scrollToSection("how-it-works")}>How It Works</button>
            <button onClick={() => scrollToSection("pricing")}>Pricing</button>
            <button onClick={() => scrollToSection("faqs")}>FAQs</button>
          </nav>

          <div className="nav-actions">
            <button className="landing-btn landing-btn-text" onClick={onGetStarted}>
              Sign In
            </button>
            <button className="landing-btn landing-btn-primary" onClick={onGetStarted}>
              Try Free Beta
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section id="hero" className="landing-hero">
        <div className="hero-grid">
          <div className="hero-content">
            <div className="hero-badge-row">
              <div className="hero-badge hero-badge-beta">
                <Gift size={12} />
                <span>Free Beta - All Features Unlocked</span>
              </div>
            </div>

            <h1 className="hero-title">
              Automate Your <br />
              <span className="gradient-text-ig">Instagram</span> +{" "}
              <span className="gradient-text-tg">Telegram</span>
            </h1>

            <p className="hero-tagline">
              Leading Your Vision with Optimized Reliable Automation
            </p>

            <p className="hero-description">
              One platform to automate Instagram comment-to-DM flows and Telegram channel management.
              Schedule posts, moderate channels, trigger keyword DMs, and track everything in real-time.
              <strong> Currently 100% free during Beta.</strong>
            </p>

            <div className="hero-buttons">
              <button className="landing-btn landing-btn-primary landing-btn-lg" onClick={onGetStarted}>
                Start Free Beta
                <ArrowRight size={16} />
              </button>
              <button className="landing-btn landing-btn-secondary landing-btn-lg" onClick={() => scrollToSection("features")}>
                See All Features
              </button>
            </div>

            <div className="hero-platform-pills">
              <div className="platform-pill pill-ig">
                <Camera size={14} />
                <span>Instagram DMs</span>
              </div>
              <div className="platform-pill pill-tg">
                <Send size={14} />
                <span>Telegram Channels</span>
              </div>
              <div className="platform-pill pill-free">
                <Sparkles size={14} />
                <span>100% Free</span>
              </div>
            </div>
          </div>

          {/* Dual-Platform Dashboard Mockup */}
          <div className="hero-mockup-wrapper">
            <div className="browser-mockup">
              <div className="browser-header">
                <div className="browser-dots">
                  <span className="dot dot-red"></span>
                  <span className="dot dot-yellow"></span>
                  <span className="dot dot-green"></span>
                </div>
                <div className="browser-address">app.gramglide.com/dashboard</div>
              </div>
              <div className="browser-content">
                <div className="sim-app-header">
                  <div className="sim-logo">
                    <Zap size={14} className="text-orange" />
                    <span>Lyvora</span>
                  </div>
                  <span className="sim-status-pill">
                    <span className="pulse-dot"></span> Live
                  </span>
                </div>

                <div className="sim-stats-grid">
                  <div className="sim-stat-card">
                    <span className="sim-stat-lbl">IG DMs SENT</span>
                    <span className="sim-stat-val text-orange">1,284</span>
                  </div>
                  <div className="sim-stat-card">
                    <span className="sim-stat-lbl">TG POSTS</span>
                    <span className="sim-stat-val text-blue">346</span>
                  </div>
                  <div className="sim-stat-card">
                    <span className="sim-stat-lbl">MODERATED</span>
                    <span className="sim-stat-val text-green">89</span>
                  </div>
                </div>

                <div className="sim-dual-feed">
                  <div className="sim-feed-section">
                    <p className="sim-feed-label"><Camera size={10} /> Instagram Activity</p>
                    <div className="sim-feed-item">
                      <div className="sim-user">
                        <span className="avatar orange">JD</span>
                        <div>
                          <p className="name">@john_dev</p>
                          <p className="comment">Commented "SEND"</p>
                        </div>
                      </div>
                      <span className="badge badge-success">DM Sent</span>
                    </div>
                  </div>
                  <div className="sim-feed-section">
                    <p className="sim-feed-label"><Send size={10} /> Telegram Activity</p>
                    <div className="sim-feed-item">
                      <div className="sim-user">
                        <span className="avatar">CH</span>
                        <div>
                          <p className="name">#coding-tips</p>
                          <p className="comment">Scheduled post sent</p>
                        </div>
                      </div>
                      <span className="badge badge-success">Delivered</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Beta Banner ── */}
      <section className="beta-banner">
        <div className="beta-banner-inner">
          <div className="beta-icon-wrap">
            <Rocket size={20} />
          </div>
          <div className="beta-banner-text">
            <strong>Free Beta Program</strong>
            <span>All premium features unlocked at no cost. Join now and help shape the future of creator automation.</span>
          </div>
          <button className="landing-btn landing-btn-primary" onClick={onGetStarted}>
            Join Beta
            <ArrowRight size={14} />
          </button>
        </div>
      </section>

      {/* ── Stats Metric Bar ── */}
      <section className="stats-metric-bar">
        <div className="stats-bar-container">
          <div className="metric-item">
            <span className="metric-val">2</span>
            <span className="metric-lbl">Platforms Automated</span>
          </div>
          <div className="metric-item">
            <span className="metric-val">100%</span>
            <span className="metric-lbl">Password-Free Setup</span>
          </div>
          <div className="metric-item">
            <span className="metric-val">$0</span>
            <span className="metric-lbl">Beta Access Cost</span>
          </div>
          <div className="metric-item">
            <span className="metric-val">24/7</span>
            <span className="metric-lbl">Background Automation</span>
          </div>
        </div>
      </section>

      {/* ── Instagram Features ── */}
      <section id="features" className="features-section">
        <div className="section-header">
          <div className="hero-badge" style={{ margin: "0 auto 4px", background: "rgba(249, 115, 22, 0.06)", borderColor: "rgba(249, 115, 22, 0.2)", color: "#F97316" }}>
            <Camera size={12} />
            <span>Instagram Automation</span>
          </div>
          <h2 className="section-title">Intelligent Instagram DM Outreach</h2>
          <p className="section-subtitle">
            Trigger automated direct messages when users comment on your posts. Passwordless, safe, and conversion-focused.
          </p>
        </div>

        <div className="features-grid-container features-grid-4">
          {igFeatures.map((feat, idx) => (
            <div className="feature-card" key={idx}>
              <div
                className="feature-icon-wrapper"
                style={{ backgroundColor: feat.color, color: feat.textColor }}
              >
                <feat.icon size={22} />
              </div>
              <h3 className="feature-card-title">{feat.title}</h3>
              <p className="feature-card-desc">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Telegram Features ── */}
      <section className="features-section features-section-alt">
        <div className="section-header">
          <div className="hero-badge" style={{ margin: "0 auto 4px", background: "rgba(14, 165, 233, 0.06)", borderColor: "rgba(14, 165, 233, 0.2)", color: "#0EA5E9" }}>
            <Send size={12} />
            <span>Telegram Automation</span>
          </div>
          <h2 className="section-title">Complete Telegram Channel Management</h2>
          <p className="section-subtitle">
            Schedule broadcasts, moderate channels, and manage multiple bots from a single unified dashboard.
          </p>
        </div>

        <div className="features-grid-container features-grid-4">
          {tgFeatures.map((feat, idx) => (
            <div className="feature-card" key={idx}>
              <div
                className="feature-icon-wrapper"
                style={{ backgroundColor: feat.color, color: feat.textColor }}
              >
                <feat.icon size={22} />
              </div>
              <h3 className="feature-card-title">{feat.title}</h3>
              <p className="feature-card-desc">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works Section ── */}
      <section id="how-it-works" className="timeline-section">
        <div className="section-header">
          <h2 className="section-title">Up and Running in Minutes</h2>
          <p className="section-subtitle">
            No API registrations, no Meta app review, no complex configs. Connect, configure, and launch.
          </p>
        </div>

        <div className="steps-container">
          {steps.map((step, idx) => (
            <div className="step-card" key={idx}>
              <div className="step-number-flow">
                <span className="step-num">{step.number}</span>
                {idx < steps.length - 1 && <span className="step-connector"></span>}
              </div>
              <div className="step-info">
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── System Architecture ── */}
      <section className="architecture-section">
        <div className="architecture-container">
          <div className="arch-text">
            <div className="hero-badge">
              <Cpu size={12} className="text-blue" />
              <span>Dual-Platform Architecture</span>
            </div>
            <h2 className="arch-title">One Dashboard, Two Platforms</h2>
            <p className="arch-desc">
              Lyvora unifies Instagram and Telegram automation behind a single React dashboard, powered by a FastAPI backend with real-time monitoring.
            </p>
            <ul className="arch-list">
              <li>
                <CheckCircle2 size={16} className="text-green" />
                <span><strong>Instagram Engine:</strong> Playwright browser automation simulates organic behavior for comment scraping and DM delivery.</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="text-green" />
                <span><strong>Telegram Engine:</strong> Native Bot API integration for scheduling, broadcasting, and auto-moderation across channels.</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="text-green" />
                <span><strong>Unified Dashboard:</strong> Real-time logs, stats, and controls for both platforms in one place.</span>
              </li>
            </ul>
          </div>

          <div className="arch-diagram-wrapper">
            <div className="arch-flow-diagram">
              <div className="flow-step node-user">
                <span className="node-icon"><Users size={16} /></span>
                <span className="node-lbl">Creator Dashboard</span>
              </div>
              <div className="flow-arrow"></div>
              <div className="flow-step node-api">
                <span className="node-icon"><Cpu size={16} /></span>
                <span className="node-lbl">FastAPI Backend</span>
              </div>
              <div className="flow-split">
                <div className="flow-branch">
                  <div className="flow-arrow"></div>
                  <div className="flow-step node-playwright">
                    <span className="node-icon"><Globe size={16} /></span>
                    <span className="node-lbl">Playwright</span>
                  </div>
                  <div className="flow-arrow"></div>
                  <div className="flow-step node-ig">
                    <span className="node-icon"><Camera size={16} /></span>
                    <span className="node-lbl">Instagram</span>
                  </div>
                </div>
                <div className="flow-branch">
                  <div className="flow-arrow"></div>
                  <div className="flow-step node-tg-api">
                    <span className="node-icon"><Bot size={16} /></span>
                    <span className="node-lbl">Bot API</span>
                  </div>
                  <div className="flow-arrow"></div>
                  <div className="flow-step node-telegram">
                    <span className="node-icon"><Send size={16} /></span>
                    <span className="node-lbl">Telegram</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing Section ── */}
      <section id="pricing" className="pricing-section">
        <div className="section-header">
          <div className="hero-badge" style={{ margin: "0 auto 12px", background: "rgba(16, 185, 129, 0.08)", borderColor: "rgba(16, 185, 129, 0.2)", color: "var(--lp-green)" }}>
            <Gift size={12} />
            <span>Free Beta - No Credit Card</span>
          </div>
          <h2 className="section-title">Everything Free During Beta</h2>
          <p className="section-subtitle">
            All premium features are <strong>100% free</strong> while we're in Beta. Help us build the best automation platform and lock in founding member pricing.
          </p>
        </div>

        <div className="pricing-grid">
          {pricingTiers.map((tier, idx) => (
            <div className={`pricing-card ${tier.popular ? "pricing-popular" : ""}`} key={idx}>
              {tier.popular && <span className="popular-badge">{tier.badge}</span>}
              {!tier.popular && <span className="standard-badge">{tier.badge}</span>}

              <h3 className="pricing-tier-name">{tier.name}</h3>
              <p className="pricing-tier-desc">{tier.desc}</p>

              <div className="pricing-price-wrap">
                {tier.originalPrice && (
                  <span className="original-price" style={{ textDecoration: "line-through", color: "var(--lp-text-muted)", marginRight: "8px", fontSize: "20px", fontWeight: 600 }}>
                    {tier.originalPrice}
                  </span>
                )}
                <span className="price">{tier.price}</span>
                <span className="period" style={{ marginLeft: "4px" }}>
                  {tier.originalPrice ? tier.period : `/${tier.period}`}
                </span>
              </div>

              <button
                className={`landing-btn w-full ${tier.popular ? "landing-btn-primary" : "landing-btn-secondary"}`}
                onClick={onGetStarted}
              >
                {tier.cta}
              </button>

              <ul className="pricing-features-list">
                {tier.features.map((feat, fidx) => (
                  <li key={fidx}>
                    <Check size={14} className="text-blue flex-shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section id="faqs" className="faq-section">
        <div className="section-header">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-subtitle">
            Everything you need to know about Lyvora's Instagram + Telegram automation platform.
          </p>
        </div>

        <div className="faq-list-container">
          {faqs.map((faq, idx) => (
            <div className={`faq-item-card ${activeFaq === idx ? "expanded" : ""}`} key={idx}>
              <button className="faq-question-trigger" onClick={() => toggleFaq(idx)}>
                <span className="faq-question-text">{faq.q}</span>
                <ChevronDown size={18} className="faq-chevron" />
              </button>
              <div className="faq-answer-collapse">
                <div className="faq-answer-inner">
                  <p>{faq.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Call To Action Banner ── */}
      <section className="cta-banner">
        <div className="cta-banner-content">
          <div className="cta-beta-badge">
            <Rocket size={16} />
            <span>Free Beta Access</span>
          </div>
          <h2>Automate Instagram + Telegram Today</h2>
          <p>
            Join the Beta and unlock all premium features for free. No credit card, no commitments. Start automating in under 5 minutes.
          </p>
          <div className="cta-buttons">
            <button className="landing-btn landing-btn-primary landing-btn-lg btn-white-accent" onClick={onGetStarted}>
              Start Free Beta Now
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer Section ── */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <div className="nav-logo">
              <div className="nav-logo-icon">
                <Zap size={16} fill="#F97316" stroke="none" />
              </div>
              <span>Lyvora</span>
            </div>
            <p className="footer-about">
              Leading Your Vision with Optimized Reliable Automation. Unified Instagram + Telegram platform for comment-triggered DMs, channel scheduling, auto-moderation, and real-time analytics.
            </p>
          </div>

          <div className="footer-links-grid">
            <div>
              <p className="footer-title">Product</p>
              <button onClick={() => scrollToSection("features")}>Features</button>
              <button onClick={() => scrollToSection("how-it-works")}>How It Works</button>
              <button onClick={() => scrollToSection("pricing")}>Pricing</button>
            </div>
            <div>
              <p className="footer-title">Company</p>
              <a href="https://nlrgroupofcompany.in" target="_blank" rel="noreferrer">
                NLR GROUP OF COMPANIES
              </a>
              <button onClick={() => scrollToSection("faqs")}>Support FAQ</button>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Lyvora. All rights reserved.</p>
          <p className="company-credit">
            Developed with excellence by <strong>NLR GROUP OF COMPANIES</strong>
          </p>
        </div>
      </footer>
    </div>
  );
}
