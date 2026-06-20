import type { LegalDocumentKey } from "@/types/legal";

export interface LegalDocumentContent {
  key: LegalDocumentKey;
  title: string;
  lastUpdated: string;
  version: string;
  body: string;
}

const LAST_UPDATED = "April 1, 2026";
const VERSION = "v1.0";

export const LEGAL_DOCUMENTS: Record<LegalDocumentKey, LegalDocumentContent> = {
  user_terms: {
    key: "user_terms",
    title: "User Terms & Conditions",
    lastUpdated: LAST_UPDATED,
    version: VERSION,
    body: `## 1. Effective Date & Registered Office

**Effective Date:** April 1, 2026

**Registered Office:**
E-153, Swankar Colony, Nehru Nagar, Jaipur

---

## 2. Nature of the Platform

Nature's Grace Wellness App, operated by Nature's Grace Educational Trust Regd. ("Platform"), is an online intermediary that facilitates connections between holistic healers, counselors ("Practitioners"), product vendors ("Sellers"), and users ("Users").

---

## 3. Intermediary Status

Under Section 79 of the Information Technology Act, 2000, the Platform acts as an intermediary. The Platform does not initiate transmissions, select receivers, or modify the content of interactions between users, practitioners, or sellers.

---

## 4. Medical & Wellness Disclaimer

Services, products, workshops, courses, and content available through the Platform are intended for spiritual, educational, and holistic wellness purposes only.

They are not intended to diagnose, treat, cure, or prevent any medical or psychological condition and should not be considered a substitute for professional medical advice, diagnosis, or treatment.

Users should consult qualified healthcare professionals for medical concerns.

---

## 5. Emergency Disclaimer

The Platform is not intended for use during medical or mental health emergencies.

Users experiencing an emergency should immediately contact emergency services or their nearest hospital.

---

## 6. Natural Product Variation

Users acknowledge that natural products, including gemstones and rudraksha, may vary in color, texture, appearance, and pattern from displayed images.

Such natural variations do not constitute defects.

---

## 7. Governing Law & Jurisdiction

These Terms shall be governed by the laws of India.

Any dispute arising from the use of the Platform shall be subject to the exclusive jurisdiction of the courts of Jaipur, Rajasthan.

---

## 8. Acceptance

By clicking I Agree, creating an account, or using the Platform, the User acknowledges having read, understood, and agreed to these Terms & Conditions together with the Platform's Privacy Policy, Refund & Cancellation Policy, Medical Disclaimer, Account Deletion Policy, and Contact & Grievance Policy.

---

## 9. Grievance Officer

For complaints or concerns:

Email: Grievance@naturesgracereiki.com`,
  },

  privacy_policy: {
    key: "privacy_policy",
    title: "Privacy Policy",
    lastUpdated: LAST_UPDATED,
    version: VERSION,
    body: `## 1. Introduction

Nature's Grace Educational Trust Regd. ("we," "us," or "our") operates the Nature's Grace Wellness App ("Platform"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Platform.

By creating an account or using the Platform, you consent to the practices described in this Policy.

---

## 2. Information We Collect

**Account Information:** Name, email address, phone number, profile photo, and authentication credentials.

**Wellness Activity:** Journal entries, gratitude logs, mood reflections, favorites, event registrations, and resource enrollments that you choose to save.

**Transaction Data:** Order history, booking records, payment references (processed by Razorpay; we do not store full card details), delivery addresses, and payout information for practitioners and sellers.

**Application Data:** Information submitted when applying to become a Practitioner or Seller, including identity documents and professional credentials.

**Technical Data:** Device type, app version, and usage logs necessary for security and service improvement.

---

## 3. How We Use Your Information

We use collected information to:

- Create and manage your account
- Process bookings, orders, and payments
- Facilitate communication between users, practitioners, and sellers
- Provide customer support and respond to grievances
- Send service-related notifications (session reminders, order updates)
- Improve Platform features and security
- Comply with applicable laws and regulations

We do not sell your personal data to third parties.

---

## 4. Data Sharing

We may share information with:

- **Practitioners and Sellers** when you book a session or place an order (limited to what is necessary to fulfil the service)
- **Payment processors** (Razorpay) for transaction processing
- **Cloud infrastructure providers** (Supabase) for secure data storage
- **Law enforcement or regulators** when required by law or valid legal process

---

## 5. Data Retention

We retain your data for as long as your account is active or as needed to provide services. Upon account deletion, personal data is removed or anonymised in accordance with our Account Deletion Policy, subject to legal retention requirements.

---

## 6. Your Rights

You may:

- Access and update your profile information through the app
- Request correction of inaccurate data
- Request account deletion (see Account Deletion Policy)
- Withdraw consent for optional communications

To exercise rights, contact us through the in-app Support section or at Grievance@naturesgracereiki.com.

---

## 7. Security

We implement industry-standard safeguards including encrypted connections, access controls, and row-level security on our database. No method of transmission over the internet is 100% secure; we cannot guarantee absolute security.

---

## 8. Children's Privacy

The Platform is not intended for users under 18 years of age. We do not knowingly collect data from minors.

---

## 9. Changes to This Policy

We may update this Privacy Policy from time to time. When we do, we will update the version number and notify you through the app. Continued use after changes constitutes acceptance.

---

## 10. Grievance Officer

Email: Grievance@naturesgracereiki.com

Registered Office: E-153, Swankar Colony, Nehru Nagar, Jaipur`,
  },

  refund_policy: {
    key: "refund_policy",
    title: "Refund & Cancellation Policy",
    lastUpdated: LAST_UPDATED,
    version: VERSION,
    body: `## 1. Scope

This policy applies to all purchases and bookings made through the Nature's Grace Wellness App, including store orders and practitioner session bookings.

---

## 2. Store Orders

**Cancellation before dispatch:** Users may cancel an order before it is dispatched by contacting Support. A full refund will be processed to the original payment method within 7–10 business days.

**Cancellation after dispatch:** Once an order has been dispatched, cancellation is not available. Users may initiate a return only if the product is defective, damaged in transit, or materially different from the description.

**Return window:** Eligible returns must be reported within 14 days of delivery with photographic evidence where applicable.

**Natural product variation:** Gemstones, rudraksha, and other natural products may vary in appearance. Such variation is not grounds for return unless the product is materially defective.

**Refund processing:** Approved refunds are credited within 7–10 business days via the original payment method.

---

## 3. Practitioner Sessions

**Free cancellation:** Users may cancel a session without charge if cancellation occurs at least 24 hours before the scheduled session time.

**Late cancellation:** Cancellations within 24 hours of the session may be subject to a cancellation fee as displayed at the time of booking.

**Practitioner cancellation:** If a practitioner cancels a session, the user receives a full refund or may book a new session when availability allows.

**No-show:** Failure to attend a confirmed session without prior cancellation may result in forfeiture of the session fee.

**Changing session time:** Cancel your booking (subject to the cancellation window above), then book a new slot. In-app rescheduling is not offered.

---

## 4. Events & Resources

Paid event registrations and resource enrollments are subject to the specific terms displayed on the event or resource detail page. Refunds for events cancelled by the Platform or organiser will be processed in full.

---

## 5. Disputes

For refund disputes, contact Support through the app. Unresolved disputes may be escalated to our Grievance Officer at Grievance@naturesgracereiki.com.

---

## 6. Governing Law

This policy is governed by the laws of India. Disputes are subject to the exclusive jurisdiction of the courts of Jaipur, Rajasthan.`,
  },

  medical_disclaimer: {
    key: "medical_disclaimer",
    title: "Medical & Wellness Disclaimer",
    lastUpdated: LAST_UPDATED,
    version: VERSION,
    body: `## 1. Not Medical Advice

All services, products, workshops, courses, articles, and content available through the Nature's Grace Wellness App are provided for spiritual, educational, and holistic wellness purposes only.

Nothing on this Platform constitutes medical advice, psychiatric diagnosis, psychological treatment, or a substitute for care from a licensed physician, psychiatrist, psychologist, or other qualified healthcare professional.

---

## 2. No Doctor-Patient Relationship

Use of the Platform does not create a doctor-patient, therapist-client, or any other professional healthcare relationship between you and Nature's Grace Educational Trust Regd., the Platform, its practitioners, or its sellers.

---

## 3. Consult a Professional

Always seek the advice of a qualified healthcare provider with any questions regarding a medical condition, mental health concern, or before starting any wellness regimen, supplement, or treatment.

Never disregard professional medical advice or delay seeking it because of something you have read or experienced through the Platform.

---

## 4. Emergency Situations

The Platform is not designed for use during medical or mental health emergencies.

If you are experiencing a medical emergency, call your local emergency number immediately or go to the nearest hospital.

If you are in crisis or considering self-harm, please contact a crisis helpline or emergency services in your area.

---

## 5. Practitioner Services

Practitioners on the Platform offer complementary wellness services. They are not licensed to diagnose, treat, cure, or prevent disease unless they hold separate valid medical licensure and clearly disclose it.

Results from wellness services vary between individuals. The Platform makes no guarantees regarding outcomes.

---

## 6. Products

Wellness products sold through the Platform are not intended to diagnose, treat, cure, or prevent any disease. Product descriptions are provided by sellers and are for informational purposes.

---

## 7. Acknowledgement

By using the Platform, you acknowledge that you have read and understood this disclaimer and agree to use the Platform at your own risk.`,
  },

  account_deletion_policy: {
    key: "account_deletion_policy",
    title: "Account Deletion Policy",
    lastUpdated: LAST_UPDATED,
    version: VERSION,
    body: `## 1. Your Right to Delete

You may request deletion of your Nature's Grace Wellness App account at any time through Settings → Support or by emailing Grievance@naturesgracereiki.com.

---

## 2. What Happens When You Delete

Upon confirmed deletion:

- Your profile and login credentials are permanently removed
- Personal wellness data (journal entries, gratitude logs) associated with your account is deleted
- Order and booking records may be retained in anonymised or aggregated form for legal, tax, and accounting compliance
- If you are an approved Practitioner or Seller, your public listings are removed and pending payouts are settled per our payout terms

---

## 3. Processing Time

Account deletion requests are processed within 30 days. You will receive confirmation by email once deletion is complete.

---

## 4. Data We May Retain

We may retain certain information as required by law, including:

- Transaction records for tax and audit purposes (up to 7 years as per Indian law)
- Grievance and support correspondence
- Anonymised analytics data that cannot identify you

---

## 5. Reactivation

Deleted accounts cannot be reactivated. You may create a new account with the same email address after deletion is complete.

---

## 6. Practitioner & Seller Accounts

Practitioners and sellers with pending orders, bookings, or payouts must resolve all obligations before account deletion. The Platform may delay deletion until outstanding matters are settled.

---

## 7. Contact

For account deletion requests: Grievance@naturesgracereiki.com`,
  },

  grievance_policy: {
    key: "grievance_policy",
    title: "Contact & Grievance Policy",
    lastUpdated: LAST_UPDATED,
    version: VERSION,
    body: `## 1. Purpose

This policy outlines how users, practitioners, and sellers can contact Nature's Grace Educational Trust Regd. and lodge grievances regarding the Platform.

---

## 2. Grievance Officer

In accordance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, the Grievance Officer for the Platform is:

**Email:** Grievance@naturesgracereiki.com

**Registered Office:** E-153, Swankar Colony, Nehru Nagar, Jaipur, Rajasthan, India

---

## 3. How to Lodge a Grievance

You may submit a grievance by:

1. Using the in-app Support section (Profile → Support)
2. Emailing Grievance@naturesgracereiki.com with:
   - Your full name and registered email
   - A clear description of the grievance
   - Supporting documents or screenshots if applicable
   - The desired resolution

---

## 4. Response Timeline

We acknowledge grievances within 24 hours and aim to resolve them within 15 days. Complex matters may require additional time; you will be notified of any delay.

---

## 5. Types of Grievances We Handle

- Account access and data privacy concerns
- Refund and cancellation disputes
- Practitioner or seller conduct complaints
- Product quality or authenticity concerns
- Content moderation appeals
- Payment and payout issues

---

## 6. Escalation

If you are unsatisfied with the resolution, you may request escalation by replying to your grievance thread. Unresolved matters may be referred to appropriate regulatory authorities as per applicable law.

---

## 7. General Contact

For non-grievance inquiries (partnerships, media, general questions), use the in-app Contact section or email Grievance@naturesgracereiki.com.`,
  },

  practitioner_agreement: {
    key: "practitioner_agreement",
    title: "Practitioner Agreement",
    lastUpdated: LAST_UPDATED,
    version: VERSION,
    body: `## 1. Eligibility & Verification

All Practitioners must provide valid Government identification (Aadhaar/PAN), address proof, and relevant educational qualifications, certifications, or credentials before onboarding.

Approval is subject to verification by the Platform.

---

## 2. Professional Conduct

Practitioners shall conduct themselves professionally while providing services through the Platform.

Practitioners shall not make claims to cure or treat chronic medical conditions as defined under the Drugs and Magic Remedies Act, 1954.

Practitioners must clearly communicate that their services are complementary wellness services and are not substitutes for professional medical advice or treatment.

---

## 3. Medical Disclaimer

Services offered through the Platform are complementary wellness services only and do not constitute healthcare, psychiatric diagnosis, or medical treatment.

Practitioners acknowledge that results may vary among individuals.

---

## 4. Platform Status

Nature's Grace Wellness App functions solely as an intermediary connecting practitioners and users.

The Platform does not control or supervise practitioner services and does not modify communications between practitioners and users.

---

## 5. Indemnification

Practitioners agree to indemnify and hold harmless Nature's Grace Wellness App, Nature's Grace Educational Trust Regd., and its directors from claims, liabilities, damages, losses, or legal proceedings arising from the practitioner's services, representations, conduct, or breach of this Agreement.

---

## 6. Governing Law & Jurisdiction

This Agreement shall be governed by the laws of India.

All disputes shall be subject to the exclusive jurisdiction of the courts of Jaipur, Rajasthan.

---

## 7. Acceptance

By clicking I Agree and submitting an application to become a Practitioner, the applicant confirms that they have read, understood, and agree to be bound by this Practitioner Agreement and all applicable Platform policies.

---

## 8. Grievance Officer

Email: Grievance@naturesgracereiki.com`,
  },

  seller_agreement: {
    key: "seller_agreement",
    title: "Seller Agreement",
    lastUpdated: LAST_UPDATED,
    version: VERSION,
    body: `## 1. Eligibility & Verification

All Sellers must provide valid Government identification (Aadhaar/PAN), GST number, address proof, and any licenses required for their product category before onboarding.

Approval is subject to verification by the Platform.

---

## 2. Mandatory Dispatch Evidence

For every order fulfilled through the Platform, the Seller must record and upload one continuous, unedited dispatch video showing the product inspection, packaging, and courier labeling process.

In the absence of such evidence, the Seller may be held liable for claims relating to missing or damaged items.

---

## 3. Product Authenticity

Where applicable:

* Gemstones must be accompanied by certification from a recognized laboratory such as GIA or IGI.
* Pooja essentials must accurately disclose material composition and weight.

Sellers are responsible for ensuring that all product descriptions are accurate.

---

## 4. Platform Status

Nature's Grace Wellness App operates solely as an intermediary marketplace connecting sellers and customers.

The Platform does not manufacture, inspect, or modify products sold by sellers.

---

## 5. Medical & Wellness Disclaimer

Products offered through the Platform are intended for spiritual, educational, or holistic wellness purposes and are not intended to diagnose, treat, cure, or prevent medical or psychological conditions.

---

## 6. Indemnification

Sellers agree to indemnify and hold harmless Nature's Grace Wellness App, Nature's Grace Educational Trust Regd., and its directors from claims, liabilities, damages, losses, or legal proceedings arising from the Seller's products, representations, fulfillment process, or breach of this Agreement.

---

## 7. Governing Law & Jurisdiction

This Agreement shall be governed by the laws of India.

Any dispute arising from this Agreement shall be subject to the exclusive jurisdiction of the courts of Jaipur, Rajasthan.

---

## 8. Acceptance

By clicking I Agree and applying to become a Seller, the applicant acknowledges having read, understood, and agreed to be bound by this Seller Agreement and all applicable Platform policies.

---

## 9. Grievance Officer

Email: Grievance@naturesgracereiki.com`,
  },
  community_guidelines: {
    key: "community_guidelines",
    title: "Community Guidelines",
    lastUpdated: LAST_UPDATED,
    version: VERSION,
    body: `Nature's Grace community spaces exist for respectful wellness discussion.

- Be kind and constructive
- No harassment, hate speech, or spam
- Do not share medical advice as a substitute for professional care
- Report content that violates these guidelines

Violations may result in content removal or account suspension.`,
  },
  shipping_policy: {
    key: "shipping_policy",
    title: "Shipping Policy",
    lastUpdated: LAST_UPDATED,
    version: VERSION,
    body: `Sellers fulfill orders directly. Tracking information is provided when available.

Delivery timelines vary by seller and location. Contact support for order-specific questions.

See our Refund & Cancellation Policy for returns and refunds.`,
  },
};

export const USER_SIGNUP_LEGAL_LABELS: Record<
  Exclude<LegalDocumentKey, "practitioner_agreement" | "seller_agreement">,
  string
> = {
  user_terms: "User Terms & Conditions",
  privacy_policy: "Privacy Policy",
  refund_policy: "Refund & Cancellation Policy",
  medical_disclaimer: "Medical & Wellness Disclaimer",
  account_deletion_policy: "Account Deletion Policy",
  grievance_policy: "Contact & Grievance Policy",
  community_guidelines: "Community Guidelines",
  shipping_policy: "Shipping Policy",
};

export function getLegalDocument(key: LegalDocumentKey): LegalDocumentContent {
  return LEGAL_DOCUMENTS[key];
}
