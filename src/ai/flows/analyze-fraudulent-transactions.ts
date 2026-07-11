'use server';

/**
 * @fileOverview Analyzes transaction data to identify and flag potentially fraudulent transactions.
 *
 * - analyzeTransactions - Function to analyze transaction data and flag potentially fraudulent transactions.
 * - AnalyzeTransactionsInput - Input type for the analyzeTransactions function.
 * - AnalyzeTransactionsOutput - Return type for the analyzeTransactions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeTransactionsInputSchema = z.object({
  transactionData: z.string().describe('A string containing the transaction data in JSON format.'),
});
export type AnalyzeTransactionsInput = z.infer<typeof AnalyzeTransactionsInputSchema>;

const AnalyzeTransactionsOutputSchema = z.object({
  isFraudulent: z.boolean().describe('Whether the transaction is potentially fraudulent.'),
  reason: z.string().describe('The reason why the transaction is flagged as potentially fraudulent.'),
  error: z
    .boolean()
    .optional()
    .describe('True if analysis could not be completed (e.g. AI service unavailable).'),
});
export type AnalyzeTransactionsOutput = z.infer<typeof AnalyzeTransactionsOutputSchema>;

export async function analyzeTransactions(input: AnalyzeTransactionsInput): Promise<AnalyzeTransactionsOutput> {
  return analyzeTransactionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeTransactionsPrompt',
  input: {schema: AnalyzeTransactionsInputSchema},
  output: {schema: AnalyzeTransactionsOutputSchema},
  prompt: `You are an expert in fraud detection. Analyze the provided transaction data and determine if it is potentially fraudulent. Respond in a JSON format.

Transaction Data: {{{transactionData}}}

Consider the following factors when determining if a transaction is fraudulent:
- Unusual transaction amount
- Unusual transaction frequency
- Mismatched location
- Suspicious user activity

Return a JSON object with the following format:
{
  "isFraudulent": true or false,
  "reason": "The reason why the transaction is flagged as potentially fraudulent."
}`,
});

const analyzeTransactionsFlow = ai.defineFlow(
  {
    name: 'analyzeTransactionsFlow',
    inputSchema: AnalyzeTransactionsInputSchema,
    outputSchema: AnalyzeTransactionsOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      return output!;
    } catch (error) {
      console.error('Error analyzing transactions:', error);
      // Do NOT report a failed analysis as "safe" (isFraudulent: false), which
      // would silently mask a broken AI service. Flag it so the UI can show a
      // real error state instead of a false all-clear.
      return {
        isFraudulent: false,
        error: true,
        reason:
          'Fraud analysis could not be completed. The AI service may be unavailable or the API key may be missing. Please try again.',
      };
    }
  }
);
