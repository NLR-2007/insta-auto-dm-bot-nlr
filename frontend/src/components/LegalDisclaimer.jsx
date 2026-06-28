import React from "react";
import { ArrowLeft, AlertTriangle, Zap } from "lucide-react";

export default function LegalDisclaimer({ onBack }) {
  return (
    <div className="legal-page">
      <nav className="legal-nav">
        <div className="legal-nav-inner">
          <button className="legal-back-btn" onClick={onBack}>
            <ArrowLeft size={18} />
            <span>Back to Home</span>
          </button>
          <div className="nav-logo">
            <div className="nav-logo-icon">
              <Zap size={16} fill="#F97316" stroke="none" />
            </div>
            <span>Lyvora</span>
          </div>
        </div>
      </nav>

      <div className="legal-container">
        <div className="legal-header">
          <div className="legal-icon-wrap" style={{ background: "rgba(245, 158, 11, 0.08)" }}>
            <AlertTriangle size={28} color="#F59E0B" />
          </div>
          <h1>Legal Disclaimer</h1>
          <div className="legal-meta">
            <span><strong>Effective Date:</strong> June 28, 2026</span>
            <span><strong>Product:</strong> Lyvora</span>
            <span><strong>Company:</strong> NLR Group of Companies</span>
          </div>
        </div>

        <div className="legal-body">
          <section>
            <h2>1. General Disclaimer</h2>
            <p>
              Lyvora is provided for lawful, ethical, and consent-based automation purposes only. The platform is
              intended to help users manage creator workflows, communication tasks, Telegram channel operations,
              scheduled posts, moderation rules, and Instagram comment-triggered workflows.
            </p>
            <p>Use of Lyvora is at your own risk.</p>
          </section>

          <section>
            <h2>2. No Legal Advice</h2>
            <p>
              Information provided by Lyvora, including documentation, dashboard content, compliance notes,
              templates, and support materials, is for general informational purposes only.
            </p>
            <p>It does not constitute legal, compliance, privacy, tax, or professional advice.</p>
            <p>
              You should consult a qualified legal professional before using automation for commercial messaging,
              marketing campaigns, data processing, or regulated industries.
            </p>
          </section>

          <section>
            <h2>3. Third-Party Platform Disclaimer</h2>
            <p>
              Lyvora is <strong>not affiliated with, endorsed by, sponsored by, or officially connected with</strong>{" "}
              Instagram, Meta, Facebook, Telegram, or any other third-party platform.
            </p>
            <p>
              All product names, logos, trademarks, and platform names belong to their respective owners.
            </p>
            <p>
              Users are responsible for complying with the terms, policies, rules, and technical restrictions of any
              third-party platform they connect to Lyvora.
            </p>
          </section>

          <section>
            <h2>4. Automation Risk Disclaimer</h2>
            <p>Automation may carry risks, including but not limited to:</p>
            <ul>
              <li>Account restrictions</li>
              <li>Account suspension</li>
              <li>Rate limits</li>
              <li>Failed message delivery</li>
              <li>Platform enforcement actions</li>
              <li>User complaints</li>
              <li>Data processing obligations</li>
              <li>Changes in third-party platform behavior</li>
            </ul>
            <p>
              Lyvora does not guarantee that automation will always work, remain available, or be accepted by
              third-party platforms.
            </p>
          </section>

          <section>
            <h2>5. Consent and Anti-Spam Disclaimer</h2>
            <p>
              Lyvora must not be used for spam, scams, harassment, unauthorized outreach, phishing, impersonation, or
              illegal communication.
            </p>
            <p>
              Users must ensure that messages are sent only where there is proper consent, lawful basis, or valid
              permission.
            </p>
            <p>
              Users are solely responsible for the content, recipients, timing, frequency, and legality of all
              automated messages and broadcasts.
            </p>
          </section>

          <section>
            <h2>6. Cookie and Token Disclaimer</h2>
            <p>
              Lyvora may allow users to connect services using cookies, bot tokens, session files, or API keys.
            </p>
            <p>Users are responsible for ensuring that:</p>
            <ul>
              <li>They own or control the connected accounts</li>
              <li>They have permission to use the credentials</li>
              <li>They do not upload stolen, shared, leaked, or unauthorized credentials</li>
              <li>They understand the risks of using third-party automation</li>
            </ul>
            <p>
              Lyvora is not responsible for consequences resulting from misuse of cookies, tokens, sessions, or
              connected accounts.
            </p>
          </section>

          <section>
            <h2>7. Beta Disclaimer</h2>
            <p>
              Lyvora may be offered as a <strong>Free Beta</strong> product. Beta software may contain bugs, errors,
              incomplete features, or service interruptions.
            </p>
            <p>
              Features available during beta may be changed, restricted, or removed at any time without prior notice.
            </p>
            <p>Free Beta access does not guarantee permanent free access.</p>
          </section>

          <section>
            <h2>8. Limitation of Responsibility</h2>
            <p>NLR Group of Companies is not responsible for:</p>
            <ul>
              <li>Misuse of Lyvora by users</li>
              <li>Violation of platform rules by users</li>
              <li>Illegal campaigns created by users</li>
              <li>Suspended or banned third-party accounts</li>
              <li>Failed automation workflows</li>
              <li>Business losses</li>
              <li>Lost revenue</li>
              <li>Missed messages or broadcasts</li>
              <li>Data loss caused by user error or third-party platform changes</li>
            </ul>
          </section>

          <section>
            <h2>9. User Responsibility</h2>
            <p>
              By using Lyvora, you confirm that you understand and accept all risks associated with automation and
              third-party platform integrations.
            </p>
            <p>
              You agree to use Lyvora responsibly, ethically, legally, and in compliance with all applicable rules.
            </p>
          </section>
        </div>

        <div className="legal-disclaimer-bar">
          Lyvora is an independent automation platform developed by NLR Group of Companies. Lyvora is not affiliated
          with, endorsed by, or sponsored by Instagram, Meta, Facebook, or Telegram. Users are responsible for
          complying with all applicable platform terms, privacy laws, and anti-spam regulations.
        </div>
      </div>

      <footer className="legal-footer">
        <p>&copy; {new Date().getFullYear()} Lyvora. All rights reserved. Developed by NLR Group of Companies.</p>
      </footer>
    </div>
  );
}
