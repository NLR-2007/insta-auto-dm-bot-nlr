import React, { useState } from "react";
import {
  Zap, Shield, MessageSquare, Send, Lock, Sparkles, Check, ChevronDown, ArrowRight,
  Play, CheckCircle2, AlertTriangle, Cpu, Globe, Users, BarChart3, HelpCircle
} from "lucide-react";

export default function LandingPage({ onGetStarted }) {
  const [activeFaq, setActiveFaq] = useState(null);

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const features = [
    {
      icon: Lock,
      title: "Passwordless Authentication",
      desc: "Connect your Instagram accounts safely using browser cookies. Your passwords never touch our system, ensuring absolute security.",
      color: "rgba(249, 115, 22, 0.08)",
      textColor: "#F97316"
    },
    {
      icon: MessageSquare,
      title: "Comment-to-DM Triggers",
      desc: "Automatically send direct messages when users comment target keywords on your monitored Reels, posts, or carousels.",
      color: "rgba(37, 99, 235, 0.08)",
      textColor: "#2563EB"
    },
    {
      icon: Cpu,
      title: "Cascading Delivery Pipeline",
      desc: "Robust 3-tier fallback checks. Bypasses strict interface restrictions by searching and messaging through multiple alternative routes.",
      color: "rgba(22, 163, 74, 0.08)",
      textColor: "#16A34A"
    },
    {
      icon: Sparkles,
      title: "Spintax Message Templates",
      desc: "Keep outreach human-like and avoid spam filters. Dynamically randomize greeting synonyms and substitute client usernames.",
      color: "rgba(168, 85, 247, 0.08)",
      textColor: "#A855F7"
    },
    {
      icon: Send,
      title: "Telegram Channel Suite",
      desc: "Extend your outreach to Telegram. Automate bot replies, schedule channel broadcasts, and implement auto-moderation tools.",
      color: "rgba(14, 165, 233, 0.08)",
      textColor: "#0EA5E9"
    },
    {
      icon: BarChart3,
      title: "Real-Time Tracking Logs",
      desc: "Monitor active workers live. View sent, pending, or failed comments, read browser execution logs, and analyze campaign conversion.",
      color: "rgba(236, 72, 153, 0.08)",
      textColor: "#EC4899"
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Export Session Cookies",
      desc: "Log into Instagram on your personal desktop browser. Export your session cookies context to a JSON file using a standard cookie editor extension."
    },
    {
      number: "02",
      title: "Import & Configure Triggers",
      desc: "Upload the cookie JSON to connect your profile safely. Select the target Instagram Reels you wish to monitor and specify trigger words (e.g. 'SEND')."
    },
    {
      number: "03",
      title: "Launch Background Workers",
      desc: "Activate the headless worker thread. GramGlide headlessly scrolls comments, detects active keyword matches, and dispatches custom-templated DMs."
    }
  ];

  const pricingTiers = [
    {
      name: "Creator Lite",
      price: "$0",
      period: "Self-Hosted / Free",
      desc: "Perfect for single creators hosting their own backend uvicorn servers.",
      features: [
        "1 Connected Instagram Account",
        "30 automated DMs per day limit",
        "Comment-triggered keyword monitoring",
        "Spintax dynamic template processing",
        "Local SQLite database logging",
        "Standard delay intervals (45s - 120s)"
      ],
      cta: "Host Locally",
      popular: false,
      badge: "Open Source"
    },
    {
      name: "Pro Marketer",
      price: "$0",
      originalPrice: "$29",
      period: "Free Beta Test",
      desc: "For digital marketers looking to scale comment outreach with high safety.",
      features: [
        "5 Connected Instagram Accounts",
        "Unlimited automated DMs (safety spaced)",
        "Telegram integration suite (Schedule & Bots)",
        "Priority worker thread allocation",
        "Advanced opt-out blocklists",
        "Dedicated remote worker execution",
        "Priority Email & Discord support"
      ],
      cta: "Start Free Testing",
      popular: true,
      badge: "Free Testing Phase"
    },
    {
      name: "Agency / Scale",
      price: "$0",
      originalPrice: "$79",
      period: "Free Beta Test",
      desc: "For outreach agencies managing several influencer profiles.",
      features: [
        "Unlimited Connected Instagram Accounts",
        "Simultaneous worker execution threads",
        "Proxy rotation support per account profile",
        "Custom API access & Webhook triggers",
        "Telegram moderation auto-filters",
        "Weekly outreach conversion analytics",
        "Dedicated Account Success manager"
      ],
      cta: "Start Free Testing",
      popular: false,
      badge: "Free Testing Phase"
    }
  ];

  const faqs = [
    {
      q: "Does GramGlide require my Instagram password?",
      a: "No! GramGlide runs 100% password-free. It uses standard session cookies exported from your browser. Your login credentials are never typed, stored, or transmitted, reducing security risks entirely."
    },
    {
      q: "How does the bot avoid Instagram shadowbans and blocks?",
      a: "The automation engine simulates organic human behavior. It runs headlessly using Playwright Chromium with randomized typing delays (between 45 to 120 seconds), limits daily outreach limits, and supports spintax templates to prevent repetitive message patterns."
    },
    {
      q: "What is the Cascading DM Delivery Strategy?",
      a: "Instagram hides the 'Message' button on certain user profiles. GramGlide handles this by attempting a 3-tier cascade: first, it checks for a profile message button; if missing, it opens the profile action dropdown list; if still hidden, it fallback-navigates to the direct messaging inbox and searches for their username."
    },
    {
      q: "Can I monitor multiple Reels/posts simultaneously?",
      a: "Yes! You can configure multiple active post URLs. GramGlide's background crawler loops through all active posts, pulling recent comments, checking keyword matches, and tracking processed comment histories in the database to prevent duplicate outreach."
    },
    {
      q: "Does this require my computer to remain turned on?",
      a: "If you host the open-source backend locally, the script needs to run on your device. However, if you deploy our cloud container backend on a VPS or sign up for the Pro cloud plan, the workers run 24/7 on our remote servers, even with your dashboard closed."
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
            <span>GramGlide</span>
          </div>

          <nav className="nav-links">
            <button onClick={() => scrollToSection("features")}>Features</button>
            <button onClick={() => scrollToSection("how-it-works")}>How It Works</button>
            <button onClick={() => scrollToSection("testimonials")}>Reviews</button>
            <button onClick={() => scrollToSection("pricing")}>Pricing</button>
            <button onClick={() => scrollToSection("faqs")}>FAQs</button>
          </nav>

          <div className="nav-actions">
            <button className="landing-btn landing-btn-text" onClick={onGetStarted}>
              Sign In
            </button>
            <button className="landing-btn landing-btn-primary" onClick={onGetStarted}>
              Launch App
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section id="hero" className="landing-hero">
        <div className="hero-grid">
          <div className="hero-content">
            <div className="hero-badge">
              <Sparkles size={12} className="text-orange" />
              <span>SaaS DM Automation Solution</span>
            </div>

            <h1 className="hero-title">
              Automate Instagram DMs <br />
              <span className="gradient-text">Without Passwords</span>
            </h1>

            <p className="hero-description">
              Scalable, comment-triggered Instagram outreach running organic browser simulations. Connect accounts safely with session cookies, trigger direct messages via key comment reactions, and boost lead conversions seamlessly.
            </p>

            <div className="hero-buttons">
              <button className="landing-btn landing-btn-primary landing-btn-lg" onClick={onGetStarted}>
                Start Automating Free
                <ArrowRight size={16} />
              </button>
              <button className="landing-btn landing-btn-secondary landing-btn-lg" onClick={() => scrollToSection("features")}>
                Explore Capabilities
              </button>
            </div>

            <div className="hero-trust">
              <span className="trust-label">TRUSTED BY 12,000+ CREATORS & AGENCIES WORLDWIDE</span>
            </div>
          </div>

          {/* Interactive CSS Dashboard Mockup */}
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
                {/* Simulated App Header */}
                <div className="sim-app-header">
                  <div className="sim-logo">
                    <Zap size={14} className="text-blue" />
                    <span>GramGlide Dashboard</span>
                  </div>
                  <span className="sim-status-pill">
                    <span className="pulse-dot"></span> Active Engine
                  </span>
                </div>

                {/* Simulated Stats Grid */}
                <div className="sim-stats-grid">
                  <div className="sim-stat-card">
                    <span className="sim-stat-lbl">DMs DISPATCHED</span>
                    <span className="sim-stat-val text-blue">42,891</span>
                  </div>
                  <div className="sim-stat-card">
                    <span className="sim-stat-lbl">ACTIVE PROFILES</span>
                    <span className="sim-stat-val">8 / 10</span>
                  </div>
                  <div className="sim-stat-card">
                    <span className="sim-stat-lbl">CONVERSION RATE</span>
                    <span className="sim-stat-val text-green">24.6%</span>
                  </div>
                </div>

                {/* Simulated Monitor Queue */}
                <div className="sim-queue-box">
                  <p className="sim-box-title">Recent Keyword DMs Sent</p>
                  <div className="sim-list">
                    <div className="sim-item">
                      <div className="sim-user">
                        <span className="avatar">JD</span>
                        <div>
                          <p className="name">@john_dev</p>
                          <p className="comment">Commented "SEND INFO" on Reel</p>
                        </div>
                      </div>
                      <span className="badge badge-success">Sent (45s ago)</span>
                    </div>
                    <div className="sim-item">
                      <div className="sim-user">
                        <span className="avatar orange">SK</span>
                        <div>
                          <p className="name">@sarah_key</p>
                          <p className="comment">Commented "GROWTH" on Reel</p>
                        </div>
                      </div>
                      <span className="badge badge-success">Sent (2m ago)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Metric Bar ── */}
      <section className="stats-metric-bar">
        <div className="stats-bar-container">
          <div className="metric-item">
            <span className="metric-val">5.4M+</span>
            <span className="metric-lbl">DMs Dispatched</span>
          </div>
          <div className="metric-item">
            <span className="metric-val">99.8%</span>
            <span className="metric-lbl">Account Safety Score</span>
          </div>
          <div className="metric-item">
            <span className="metric-val">100%</span>
            <span className="metric-lbl">Password-Free Setup</span>
          </div>
          <div className="metric-item">
            <span className="metric-val">15ms</span>
            <span className="metric-lbl">Scraper Search Delay</span>
          </div>
        </div>
      </section>

      {/* ── Core Features Section ── */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2 className="section-title">Engines Tuned for Outreach and Security</h2>
          <p className="section-subtitle">
            GramGlide combines backend scraper loops with browser simulation vectors to establish highly conversion-oriented messaging loops.
          </p>
        </div>

        <div className="features-grid-container">
          {features.map((feat, idx) => (
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

      {/* ── How It Works Section (Timeline/Stepper) ── */}
      <section id="how-it-works" className="timeline-section">
        <div className="section-header">
          <h2 className="section-title">Three Steps to Automated Success</h2>
          <p className="section-subtitle">
            No API registrations, no official Facebook App review delays, and no complex configuration files.
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

      {/* ── System Architecture Visualization ── */}
      <section className="architecture-section">
        <div className="architecture-container">
          <div className="arch-text">
            <div className="hero-badge">
              <Cpu size={12} className="text-blue" />
              <span>Engine Architecture</span>
            </div>
            <h2 className="arch-title">Anti-Detection Automation Stack</h2>
            <p className="arch-desc">
              Standard bots trigger algorithms by communicating with private, undocumented endpoints. GramGlide acts completely as an organic client.
            </p>
            <ul className="arch-list">
              <li>
                <CheckCircle2 size={16} className="text-green" />
                <span><strong>No Password Transmissions:</strong> Operates entirely through user-data session cookies exported from active local sessions.</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="text-green" />
                <span><strong>DOM-Based Interactions:</strong> Employs Playwright triggers to simulate real typing pauses, page scrolling, and clicks.</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="text-green" />
                <span><strong>Cascading Fallbacks:</strong> Three separate outreach workflows configured to ensure messages are delivered regardless of target profiles.</span>
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
                <span className="node-lbl">FastAPI Server</span>
              </div>
              <div className="flow-arrow"></div>
              <div className="flow-step node-playwright">
                <span className="node-icon"><Globe size={16} /></span>
                <span className="node-lbl">Playwright Engine</span>
              </div>
              <div className="flow-arrow"></div>
              <div className="flow-step node-ig">
                <span className="node-icon"><Zap size={16} /></span>
                <span className="node-lbl">Instagram Web</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials Section ── */}
      <section id="testimonials" className="testimonials-section">
        <div className="section-header">
          <div className="hero-badge" style={{ margin: "0 auto 12px" }}>
            <Users size={12} className="text-orange" />
            <span>Customer Stories</span>
          </div>
          <h2 className="section-title">Loved by Creators & Agencies</h2>
          <p className="section-subtitle">
            See how marketers and content creators are scaling outreach and automating direct messages securely.
          </p>
        </div>

        <div className="testimonials-grid">
          <div className="testimonial-card">
            <div className="stars-row">
              <span className="star">★</span>
              <span className="star">★</span>
              <span className="star">★</span>
              <span className="star">★</span>
              <span className="star">★</span>
            </div>
            <p className="testimonial-quote">
              "GramGlide is a lifesaver for client campaigns. The session-cookie approach is brilliant—we connected 15+ creator accounts without asking for passwords once, ensuring compliance and peace of mind."
            </p>
            <div className="testimonial-author">
              <div className="author-avatar">AM</div>
              <div className="author-meta">
                <p className="author-name">Alex M.</p>
                <p className="author-handle">@alex_digital_growth</p>
              </div>
            </div>
          </div>

          <div className="testimonial-card">
            <div className="stars-row">
              <span className="star">★</span>
              <span className="star">★</span>
              <span className="star">★</span>
              <span className="star">★</span>
              <span className="star">★</span>
            </div>
            <p className="testimonial-quote">
              "Automating comment-to-DM flows for my Reels has boosted sales leads by 400%. The random delay spaces keep it extremely safe, and setting up Synonyms Spintax templates takes seconds."
            </p>
            <div className="testimonial-author">
              <div className="author-avatar orange">JC</div>
              <div className="author-meta">
                <p className="author-name">Jessica C.</p>
                <p className="author-handle">@jessica.creatives</p>
              </div>
            </div>
          </div>

          <div className="testimonial-card">
            <div className="stars-row">
              <span className="star">★</span>
              <span className="star">★</span>
              <span className="star">★</span>
              <span className="star">★</span>
              <span className="star">★</span>
            </div>
            <p className="testimonial-quote">
              "The cascading delivery strategy is unmatched. When Instagram hides direct message options on profiles, the bot automatically triggers failovers to direct inbox searches. Outstanding engineering work by NLR!"
            </p>
            <div className="testimonial-author">
              <div className="author-avatar green">SR</div>
              <div className="author-meta">
                <p className="author-name">Sanjay R.</p>
                <p className="author-handle">@sanjay_media_group</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing Section ── */}
      <section id="pricing" className="pricing-section">
        <div className="section-header">
          <div className="hero-badge" style={{ margin: "0 auto 12px", background: "rgba(16, 185, 129, 0.08)", borderColor: "rgba(16, 185, 129, 0.2)", color: "var(--lp-green)" }}>
            <Sparkles size={12} />
            <span>100% Free Testing Phase</span>
          </div>
          <h2 className="section-title">Transparent, Flexible Pricing Plans</h2>
          <p className="section-subtitle">
            All premium tiers are currently <strong>100% free</strong> during our active beta testing version! No credit card is required.
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
            Everything you need to know about cookie-based automation, security safety, and message loops.
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
          <h2>Ready to Scale Your Instagram Engagement?</h2>
          <p>
            Join thousands of creators using cookie-based automated direct messaging. Start setting up triggers within 5 minutes.
          </p>
          <div className="cta-buttons">
            <button className="landing-btn landing-btn-primary landing-btn-lg btn-white-accent" onClick={onGetStarted}>
              Get Started Now (No Card Required)
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
              <span>GramGlide</span>
            </div>
            <p className="footer-about">
              Modern passwordless Instagram DM trigger automation engine designed for marketers, creators, and client outreach channels.
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
          <p>© {new Date().getFullYear()} GramGlide. All rights reserved.</p>
          <p className="company-credit">
            Developed with excellence by <strong>NLR GROUP OF COMPANIES</strong>
          </p>
        </div>
      </footer>
    </div>
  );
}
