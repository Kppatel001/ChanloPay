'use server';

/**
 * @fileOverview Secure WhatsApp Receipt Service.
 * 
 * - Supports Multi-language templates (EN, GU, HI).
 * - Implements mock API integration for production-ready logic.
 */

import { z } from 'zod';

const WhatsAppReceiptSchema = z.object({
  mobile: z.string().regex(/^\d{10}$/, "Invalid mobile number"),
  guestName: z.string(),
  amount: z.number(),
  eventName: z.string(),
  transactionId: z.string(),
  language: z.enum(['en', 'gu', 'hi']).default('en'),
});

export type WhatsAppReceiptInput = z.infer<typeof WhatsAppReceiptSchema>;

const templates = {
  en: (data: WhatsAppReceiptInput) => 
    `Namaste ${data.guestName}! 🙏\n\nThank you for your generous gift of ₹${data.amount} for ${data.eventName}. We have securely received your contribution.\n\nTxn ID: ${data.transactionId}\n\nWith love,\nChanloPay Team`,
  
  gu: (data: WhatsAppReceiptInput) => 
    `નમસ્તે ${data.guestName}! 🙏\n\n${data.eventName} માટે તમારી ₹${data.amount} ની ભેટ બદલ ખૂબ ખૂબ આભાર. અમને તમારું યોગદાન સુરક્ષિત રીતે પ્રાપ્ત થયું છે.\n\nTxn ID: ${data.transactionId}\n\nશુભેચ્છા,\nChanloPay ટીમ`,
  
  hi: (data: WhatsAppReceiptInput) => 
    `नमस्ते ${data.guestName}! 🙏\n\n${data.eventName} के लिए आपके ₹${data.amount} के उपहार के लिए बहुत-बहुत धन्यवाद। हमें आपका योगदान सुरक्षित रूप से प्राप्त हो गया है।\n\nTxn ID: ${data.transactionId}\n\nशुभकामनाएं,\nChanloPay टीम`,
};

/**
 * Sends a WhatsApp receipt via Cloud API (Simulated for this prototype).
 * In production, this would use Axios to hit the WhatsApp/Twilio API.
 */
export async function sendWhatsAppReceipt(input: WhatsAppReceiptInput) {
  const validation = WhatsAppReceiptSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: "Validation failed" };
  }

  const data = validation.data;
  const message = templates[data.language](data);

  try {
    // PRODUCTION LOGIC:
    // await axios.post('https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID/messages', { ... });
    
    console.log(`[WHATSAPP API] Sending Receipt to ${data.mobile}:`);
    console.log(message);

    return {
      success: true,
      receiptId: `RCPT_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[WHATSAPP ERROR]', error);
    return { success: false, error: "API Delivery Failed" };
  }
}
