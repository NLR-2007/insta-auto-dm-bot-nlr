import React from "react";
import { ArrowLeft, Shield, Zap } from "lucide-react";

export default function PrivacyPolicy({ onBack }) {
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
          <div className="legal-icon-wrap" style={{ background: "rgba(37, 99, 235, 0.08)" }}>
            <Shield size={28} color="#2563EB" />
          </div>
          <h1>Privacy Policy</h1>
          <div className="legal-meta">
            <span><strong>Effective Date:</strong> June 28, 2026</span>
            <span><strong>Product:</strong> Lyvora</span>
            <span><strong>Company:</strong> NLR Group of Companies</span>
          </div>
        </div>

        <div className="legal-body">
          <section>
            <h2>1. Introduction</h2>
            <p>
              Lyvora is a creator automation platform that helps users manage Instagram comment-to-DM workflows,
              Telegram bot/channel automation, scheduled broadcasts, moderation rules, analytics, and workspace-based
              automation.
            </p>
            <p>
              This Privacy Policy explains how Lyvora collects, uses, stores, protects, and processes information
              when you access or use our website, dashboard, software, APIs, or related services.
            </p>
            <p>By using Lyvora, you agree to the practices described in this Privacy Policy.</p>
          </section>

          <section>
            <h2>2. Information We Collect</h2>
            <p>We may collect the following types of information:</p>

            <h3>Account Information</h3>
            <p>When you register or use Lyvora, we may collect:</p>
            <ul>
              <li>Name or username</li>
              <li>Email address</li>
              <li>Password hash</li>
              <li>Account role</li>
              <li>Workspace information</li>
              <li>Subscription or plan information</li>
            </ul>

            <h3>Automation Configuration Data</h3>
            <p>To provide automation features, we may collect and store:</p>
            <ul>
              <li>Instagram account usernames added by the user</li>
              <li>Instagram session cookie files uploaded by the user</li>
              <li>Telegram bot tokens</li>
              <li>Telegram channel or group IDs</li>
              <li>Scheduled post content</li>
              <li>Message templates</li>
              <li>Trigger keywords</li>
              <li>Auto-moderation rules</li>
              <li>Campaign settings</li>
              <li>Daily limits and automation preferences</li>
            </ul>

            <h3>Usage and Log Data</h3>
            <p>We may collect:</p>
            <ul>
              <li>Login activity</li>
              <li>Bot start/stop activity</li>
              <li>Automation status</li>
              <li>Sent, failed, and pending message logs</li>
              <li>Audit logs</li>
              <li>Error logs</li>
              <li>IP address</li>
              <li>Browser type</li>
              <li>Device information</li>
              <li>Date and time of access</li>
            </ul>

            <h3>Payment and Billing Information</h3>
            <p>
              If paid plans are enabled in the future, billing may be handled by a third-party payment provider.
              Lyvora does not intend to directly store full payment card details.
            </p>
          </section>

          <section>
            <h2>3. How We Use Your Information</h2>
            <p>We use collected information to:</p>
            <ul>
              <li>Create and manage user accounts</li>
              <li>Provide Instagram and Telegram automation features</li>
              <li>Authenticate users</li>
              <li>Secure user sessions</li>
              <li>Manage workspaces and user roles</li>
              <li>Send scheduled Telegram posts</li>
              <li>Process Instagram comment-triggered workflows</li>
              <li>Prevent duplicate or unauthorized automation</li>
              <li>Enforce opt-out and blocklist rules</li>
              <li>Monitor system performance</li>
              <li>Detect abuse, fraud, spam, or violations</li>
              <li>Improve product functionality</li>
              <li>Provide customer support</li>
              <li>Comply with legal and platform obligations</li>
            </ul>
          </section>

          <section>
            <h2>4. Session Cookies and Third-Party Credentials</h2>
            <p>
              Lyvora may allow users to upload Instagram browser session cookies for beta/testing automation
              workflows. These session files are used only to maintain the automation session requested by the user.
            </p>
            <p>
              Users are responsible for ensuring that they have the legal right and platform permission to use any
              account, cookie, token, bot, channel, or automation configuration uploaded to Lyvora.
            </p>
            <p>Lyvora does not request or store Instagram account passwords for automation purposes.</p>
            <p>
              Telegram bot tokens provided by users are used only to connect with the Telegram Bot API and perform
              user-requested actions such as channel posting, scheduling, and moderation.
            </p>
          </section>

          <section>
            <h2>5. Consent-Based Automation</h2>
            <p>Lyvora is intended for ethical and consent-based automation only.</p>
            <p>Users must not use Lyvora to:</p>
            <ul>
              <li>Send spam</li>
              <li>Send scam messages</li>
              <li>Harass users</li>
              <li>Send unauthorized promotional messages</li>
              <li>Impersonate another person or brand</li>
              <li>Violate Instagram, Meta, Telegram, or other platform rules</li>
              <li>Collect or process personal data without proper legal basis</li>
              <li>Circumvent restrictions, security controls, or rate limits</li>
              <li>Conduct illegal or abusive activity</li>
            </ul>
          </section>

          <section>
            <h2>6. Data Sharing</h2>
            <p>We do not sell your personal data.</p>
            <p>We may share limited information only when necessary with:</p>
            <ul>
              <li>Hosting providers</li>
              <li>Database providers</li>
              <li>Analytics or monitoring tools</li>
              <li>Payment processors, if billing is enabled</li>
              <li>Legal authorities, when required by law</li>
              <li>Third-party platforms, only as needed to perform user-requested actions</li>
            </ul>
          </section>

          <section>
            <h2>7. Data Security</h2>
            <p>
              We use reasonable technical and organizational measures to protect user data, including:
            </p>
            <ul>
              <li>Password hashing</li>
              <li>Token protection</li>
              <li>Access control</li>
              <li>Authentication checks</li>
              <li>Audit logging</li>
              <li>Environment-based configuration</li>
              <li>Encryption mechanisms where applicable</li>
            </ul>
            <p>
              However, no online system is completely secure. Users are responsible for protecting their own account
              credentials, browser sessions, bot tokens, and connected platform accounts.
            </p>
          </section>

          <section>
            <h2>8. Data Retention</h2>
            <p>We retain user data only as long as necessary to:</p>
            <ul>
              <li>Provide the service</li>
              <li>Maintain user accounts</li>
              <li>Support automation history</li>
              <li>Meet legal or operational requirements</li>
              <li>Prevent abuse or fraud</li>
            </ul>
            <p>
              Users may request deletion of their account or data by contacting us at{" "}
              <a href="mailto:nlrgroupofcompany@gmail.com">nlrgroupofcompany@gmail.com</a>.
            </p>
          </section>

          <section>
            <h2>9. User Rights</h2>
            <p>Depending on your location, you may have rights to:</p>
            <ul>
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of data</li>
              <li>Restrict or object to processing</li>
              <li>Withdraw consent</li>
              <li>Request data portability</li>
            </ul>
            <p>
              To exercise these rights, contact us at{" "}
              <a href="mailto:nlrgroupofcompany@gmail.com">nlrgroupofcompany@gmail.com</a>.
            </p>
          </section>

          <section>
            <h2>10. Third-Party Platforms</h2>
            <p>
              Lyvora may interact with third-party platforms such as Instagram, Meta, and Telegram. Your use of those
              platforms is governed by their own terms, privacy policies, and platform rules.
            </p>
            <p>
              Lyvora is not responsible for changes, restrictions, suspensions, limitations, or enforcement actions
              taken by third-party platforms.
            </p>
          </section>

          <section>
            <h2>11. Children's Privacy</h2>
            <p>
              Lyvora is not intended for use by children under the age required by applicable law. Users must be
              legally eligible to create accounts and use automation services.
            </p>
          </section>

          <section>
            <h2>12. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted on this page with an
              updated effective date.
            </p>
          </section>

          <section>
            <h2>13. Contact Us</h2>
            <p>For privacy-related questions, contact:</p>
            <div className="legal-contact-block">
              <p><strong>NLR Group of Companies</strong></p>
              <p>Email: <a href="mailto:nlrgroupofcompany@gmail.com">nlrgroupofcompany@gmail.com</a></p>
              <p>Address: Bachupally, Hyderabad, Telangana, India</p>
              <p>Website: <a href="https://nlrgroupofcompany.in" target="_blank" rel="noreferrer">nlrgroupofcompany.in</a></p>
            </div>
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
