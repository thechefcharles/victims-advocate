export function PrivacyPolicyConsentDocument() {
  return (
    <div className="space-y-4 text-base leading-relaxed text-[var(--color-charcoal)]">
      <p>
        NxtStps is designed to handle sensitive information with care. This Privacy Policy describes
        how we collect, use, disclose, and protect information when you use the Platform. Please
        read it carefully before continuing.
      </p>
      <p>
        This summary is presented in the consent flow; a public reference copy may also be
        available on our website. When the full policy is updated, we will indicate the effective
        version you accepted in your account records.
      </p>
      <ul className="list-disc list-inside space-y-2">
        <li>Information you provide when creating an account or using features</li>
        <li>How documents and messages are stored and secured</li>
        <li>Authentication, session security, and optional multi-factor methods</li>
        <li>How sharing with an advocate or organization may work when you choose it</li>
        <li>Retention, deletion, and export requests where applicable</li>
        <li>Legal bases and disclosures required by law or to protect safety</li>
      </ul>
      <p>
        We do not sell your personal information. We use data to operate, secure, and improve the
        service, and to meet legal obligations. You are responsible for the accuracy of information
        you submit and for safeguarding your credentials.
      </p>
      <p className="text-sm text-[var(--color-muted)]">
        This is not legal advice. If you’re in immediate danger, call 911. If you need support now,
        call or text 988.
      </p>
    </div>
  );
}
