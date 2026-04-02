# ChanloPay - Secure Wedding Registry

Digital payments for modern events.

## 🚀 WhatsApp API Setup Guide
To enable real WhatsApp receipts, follow these steps:

1. **Register**: Go to [Meta for Developers](https://developers.facebook.com).
2. **Create App**: Create a "Business" type app.
3. **WhatsApp Product**: Add the "WhatsApp" product to your app.
4. **Environment Variables**: Get your credentials and add them to your environment:
   - `WHATSAPP_ACCESS_TOKEN`: Your permanent System User token.
   - `WHATSAPP_PHONE_NUMBER_ID`: Found in the WhatsApp Getting Started tab.
5. **Verified Templates**: Submit your message templates for approval in the WhatsApp Manager.

## 🛠️ Tech Stack
- **Next.js 15**: App Router & Server Actions.
- **Firebase**: Auth & Firestore.
- **Tailwind CSS**: Styling with ShadCN UI.
- **Genkit**: AI Fraud Detection.
