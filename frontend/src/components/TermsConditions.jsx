import React from "react";
import { ArrowLeft, FileText, Zap } from "lucide-react";

export default function TermsConditions({ onBack }) {
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
          <div className="legal-icon-wrap" style={{ background: "rgba(249, 115, 22, 0.08)" }}>
            <FileText size={28} color="#F97316" />
          </div>
          <h1>Terms and Conditions</h1>
          <div className="legal-meta">
            <span><strong>Effective Date:</strong> June 28, 2026</span>
            <span><strong>Product:</strong> Lyvora</span>
            <span><strong>Company:</strong> NLR Group of Companies</span>
          </div>
        </div>

        <div className="legal-body">
          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using Lyvora, you agree to these Terms and Conditions. If you do not agree, you must
              not use the platform.
            </p>
            <p>
              These Terms apply to all users of Lyvora, including individuals, businesses, agencies, administrators,
              workspace members, and beta users.
            </p>
          </section>

          <section>
            <h2>2. About Lyvora</h2>
            <p>
              Lyvora is a SaaS automation platform that provides tools for Instagram comment-to-DM workflows,
              Telegram bot/channel automation, scheduled broadcasts, auto-moderation, analytics, admin management,
              and workspace-based automation.
            </p>
            <p>
              Lyvora is currently offered as a <strong>Free Beta</strong> product. Features, limits, pricing,
              availability, and functionality may change at any time.
            </p>
          </section>

          <section>
            <h2>3. User Responsibilities</h2>
            <p>You are responsible for:</p>
            <ul>
              <li>Providing accurate account information</li>
              <li>Keeping your login credentials secure</li>
              <li>
                Ensuring you own or have permission to use connected Instagram accounts, Telegram bots, Telegram
                channels, and related assets
              </li>
              <li>Complying with all applicable laws and platform rules</li>
              <li>Using Lyvora only for lawful, ethical, and consent-based automation</li>
              <li>Reviewing automation settings before starting any campaign</li>
              <li>Monitoring messages, broadcasts, and moderation actions triggered through your account</li>
            </ul>
            <p>You remain fully responsible for all activity performed through your Lyvora account.</p>
          </section>

          <section>
            <h2>4. Acceptable Use</h2>
            <p>
              You may use Lyvora only for lawful business, creator, marketing, educational, or communication
              purposes.
            </p>
            <p>You agree not to use Lyvora to:</p>
            <ul>
              <li>Send spam or scam messages</li>
              <li>Send unsolicited or unauthorized messages</li>
              <li>Harass, threaten, or abuse any person</li>
              <li>Impersonate another person, company, or brand</li>
              <li>Spread malware, phishing links, or harmful content</li>
              <li>Promote illegal products, services, or activities</li>
              <li>Violate Instagram, Meta, Telegram, or any third-party platform terms</li>
              <li>Scrape, collect, or process personal data without permission or legal basis</li>
              <li>Bypass platform restrictions, security systems, or rate limits</li>
              <li>Use automation in a way that causes account bans, user complaints, or platform abuse</li>
              <li>Upload unauthorized cookies, tokens, credentials, or account access files</li>
            </ul>
          </section>

          <section>
            <h2>5. Platform Compliance</h2>
            <p>
              Lyvora is designed for ethical, consent-based automation. However, users are solely responsible for
              ensuring their use of Lyvora complies with:
            </p>
            <ul>
              <li>Instagram Terms of Use</li>
              <li>Meta Platform rules</li>
              <li>Telegram Terms of Service</li>
              <li>Privacy and data protection laws (GDPR, CCPA, and others)</li>
              <li>Anti-spam laws (CAN-SPAM, TCPA, and others)</li>
              <li>Consumer protection laws</li>
              <li>Any other applicable rules in their country or region</li>
            </ul>
            <p>
              Lyvora does not guarantee that any specific automation activity will be approved, allowed, or accepted
              by any third-party platform.
            </p>
          </section>

          <section>
            <h2>6. Third-Party Accounts, Cookies, and Tokens</h2>
            <p>
              Lyvora may allow users to connect third-party services using browser session cookies, bot tokens, API
              keys, or other authentication methods.
            </p>
            <p>You represent and warrant that:</p>
            <ul>
              <li>You have permission to use any connected account or token</li>
              <li>You will not upload stolen, unauthorized, shared, or leaked credentials</li>
              <li>You understand that misuse may result in account restrictions, bans, or legal consequences</li>
              <li>You are responsible for removing credentials when they are no longer needed</li>
            </ul>
            <p>
              Lyvora is not responsible for loss, suspension, limitation, or restriction of third-party accounts.
            </p>
          </section>

          <section>
            <h2>7. Beta Product Disclaimer</h2>
            <p>Lyvora may currently be provided as a Free Beta product.</p>
            <p>During beta:</p>
            <ul>
              <li>Features may be incomplete</li>
              <li>Bugs may occur</li>
              <li>Services may be interrupted</li>
              <li>Usage limits may change</li>
              <li>Data structures may change</li>
              <li>Certain features may be removed, modified, or restricted</li>
            </ul>
            <p>We may update, pause, or discontinue beta access at any time.</p>
          </section>

          <section>
            <h2>8. Account Suspension or Termination</h2>
            <p>We may suspend or terminate your account if we believe that you:</p>
            <ul>
              <li>Violated these Terms</li>
              <li>Used Lyvora for spam, scam, harassment, or abuse</li>
              <li>Violated third-party platform rules</li>
              <li>Created risk for Lyvora, other users, or third-party platforms</li>
              <li>Uploaded unauthorized credentials or tokens</li>
              <li>Attempted to attack, reverse-engineer, or misuse the platform</li>
            </ul>
            <p>
              We may also restrict access to protect platform security, legal compliance, or service reliability.
            </p>
          </section>

          <section>
            <h2>9. Subscription and Payments</h2>
            <p>Lyvora may offer free, beta, trial, starter, pro, agency, or other plan types.</p>
            <p>If paid billing is enabled:</p>
            <ul>
              <li>Fees will be shown before purchase</li>
              <li>Payments may be processed by third-party providers</li>
              <li>Subscription terms may vary by plan</li>
              <li>Failure to pay may result in downgraded or suspended access</li>
            </ul>
            <p>
              During Free Beta, premium features may be temporarily unlocked at no cost. Free Beta access does not
              guarantee future free access.
            </p>
          </section>

          <section>
            <h2>10. Intellectual Property</h2>
            <p>
              Lyvora, including its software, design, branding, documentation, workflows, and platform content, is
              owned by NLR Group of Companies or its licensors.
            </p>
            <p>
              You may not copy, resell, reverse-engineer, modify, distribute, or exploit Lyvora without written
              permission, except as allowed by applicable open-source licenses where applicable.
            </p>
          </section>

          <section>
            <h2>11. User Content</h2>
            <p>
              You retain ownership of content you upload or create through Lyvora, including message templates,
              scheduled posts, keywords, and campaign content.
            </p>
            <p>
              By using Lyvora, you grant us permission to process your content only as needed to provide the service.
            </p>
            <p>
              You are responsible for ensuring your content does not violate laws, third-party rights, copyrights,
              privacy rights, or platform rules.
            </p>
          </section>

          <section>
            <h2>12. No Guarantee of Results</h2>
            <p>Lyvora does not guarantee:</p>
            <ul>
              <li>Increased followers</li>
              <li>Increased sales</li>
              <li>Successful message delivery</li>
              <li>Platform approval</li>
              <li>Account safety</li>
              <li>Campaign performance</li>
              <li>Continuous uptime</li>
              <li>Error-free operation</li>
            </ul>
            <p>
              Automation results may vary based on platform changes, account status, user behavior, network
              conditions, and third-party limitations.
            </p>
          </section>

          <section>
            <h2>13. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Lyvora and NLR Group of Companies are not liable for:
            </p>
            <ul>
              <li>Loss of profits</li>
              <li>Loss of data</li>
              <li>Account suspension or bans</li>
              <li>Failed automation</li>
              <li>Missed scheduled posts</li>
              <li>Third-party platform restrictions</li>
              <li>User misuse</li>
              <li>Indirect, incidental, special, or consequential damages</li>
            </ul>
            <p>Use of Lyvora is at your own risk.</p>
          </section>

          <section>
            <h2>14. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless Lyvora, NLR Group of Companies, its owners, team members,
              partners, and affiliates from claims, damages, losses, liabilities, penalties, and expenses arising
              from:
            </p>
            <ul>
              <li>Your use of Lyvora</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of platform rules</li>
              <li>Your violation of laws</li>
              <li>Your content or campaigns</li>
              <li>Your misuse of third-party accounts, cookies, tokens, or credentials</li>
            </ul>
          </section>

          <section>
            <h2>15. Changes to the Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of Lyvora after updates means you accept the
              revised Terms.
            </p>
          </section>

          <section>
            <h2>16. Governing Law</h2>
            <p>
              These Terms shall be governed by the laws of India. Any disputes shall be handled in the courts located
              in Hyderabad, Telangana, India, unless otherwise required by law.
            </p>
          </section>

          <section>
            <h2>17. Contact</h2>
            <p>For questions about these Terms, contact:</p>
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
