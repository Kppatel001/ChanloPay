'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { analyzeTransactions, type AnalyzeTransactionsOutput } from '@/ai/flows/analyze-fraudulent-transactions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ShieldCheck, Loader2 } from 'lucide-react';

const formSchema = z.object({
  transactionData: z.string().min(10, {
    message: 'Please enter valid transaction data in JSON format.',
  }),
});

export function FraudDetectionForm() {
  const [analysisResult, setAnalysisResult] = useState<AnalyzeTransactionsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transactionData:
        '{\n  "transactionId": "txn_12345",\n  "userId": "user_abc",\n  "amount": 2500.00,\n  "currency": "USD",\n  "timestamp": "2023-10-31T10:00:00Z",\n  "location": "New York, NY",\n  "device": "Mobile",\n  "previousTransactions": 5\n}',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const result = await analyzeTransactions({
        transactionData: values.transactionData,
      });
      setAnalysisResult(result);
    } catch (e) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fraud Analysis Tool</CardTitle>
        <CardDescription>
          Paste transaction data in JSON format to assess fraud risk using AI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="transactionData"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Data (JSON)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter transaction data here..."
                      className="min-h-[200px] font-code text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Analyze Transaction
            </Button>
          </form>
        </Form>
        {analysisResult && (
          <div className="mt-6">
            <h3 className="mb-4 font-headline text-lg font-semibold">
              Analysis Result
            </h3>
            {analysisResult.isFraudulent ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Potential Fraud Detected!</AlertTitle>
                <AlertDescription>
                  {analysisResult.reason}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>Transaction Appears Safe</AlertTitle>
                <AlertDescription>
                  {analysisResult.reason}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
         {error && (
            <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
      </CardContent>
    </Card>
  );
}
