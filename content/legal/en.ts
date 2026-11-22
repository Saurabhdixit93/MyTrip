/** Long-form legal copy, kept per locale (content/legal/<locale>.ts) rather than in the UI dictionary. */
export interface LegalDoc {
  updated: string;
  intro: string;
  sections: { heading: string; body: string[] }[];
}

export const privacy: LegalDoc = {
  updated: "22 November 2026",
  intro:
    "MyTrip helps groups track shared trip expenses. We collect only what we need to run the app, we never sell your data, and we never process or hold your money.",
  sections: [
    {
      heading: "What we collect",
      body: [
        "Account details: your name, and either your email address or the Google profile basics (name, email, photo) you choose to share. Guests can join with only a name and an optional phone number.",
        "Trip data you add: trip details, members, expenses, receipt photos, payment status, UTR numbers and payment screenshots.",
        "Payout details a Coach chooses to save: a UPI ID and an optional UPI QR image.",
      ],
    },
    {
      heading: "What we don't do",
      body: [
        "MyTrip does not process, route or hold payments. Pay Now opens your own UPI app; the money moves directly between bank accounts.",
        "We never ask for UPI PINs, card numbers or bank passwords. Nobody from MyTrip will ever ask you for them.",
        "We don't sell personal data or use it for third-party advertising.",
      ],
    },
    {
      heading: "Who can see your data",
      body: [
        "Trip data, including receipts and payment proofs, is visible only to members of that trip. Every change is recorded in the trip's audit log.",
        "We use infrastructure providers (hosting, database, file storage, email delivery) who process data on our behalf under contract.",
      ],
    },
    {
      heading: "Your choices",
      body: [
        "You can edit or delete expenses you created, leave trips, and ask us to delete your account and personal data at any time.",
        "Audit log entries for shared trips are kept so other members' balances stay correct, but your name is removed when your account is deleted.",
      ],
    },
    {
      heading: "Contact",
      body: ["Questions or deletion requests: privacy@mytrip.app."],
    },
  ],
};

export const terms: LegalDoc = {
  updated: "22 November 2026",
  intro: "By using MyTrip you agree to these terms. Please read them along with our Privacy Policy.",
  sections: [
    {
      heading: "The service",
      body: [
        "MyTrip is a tool for recording shared expenses and working out who owes whom. Calculations are provided for convenience; members are responsible for agreeing on amounts among themselves.",
        "MyTrip is not a bank, payment aggregator or payment system. Payments are made through your own UPI app, and any dispute about a payment is between the payer, the receiver and their banks.",
      ],
    },
    {
      heading: "Your responsibilities",
      body: [
        "Add accurate information and only upload content you have the right to share.",
        "Coaches are responsible for verifying that payments marked as paid were actually received before approving them.",
        "Don't use MyTrip for illegal activity, to harass others, or to try to break or overload the service.",
      ],
    },
    {
      heading: "Availability and liability",
      body: [
        "We work hard to keep MyTrip available and correct, but it is provided as-is. To the extent permitted by law, we are not liable for indirect losses or for payments made outside the app.",
      ],
    },
    {
      heading: "Changes",
      body: ["We may update these terms. If changes are significant, we'll let you know in the app."],
    },
  ],
};
