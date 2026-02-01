'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { generateEventIdeas, type GenerateEventIdeasOutput } from '@/ai/flows/generate-event-ideas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb, Loader2, Sparkles } from 'lucide-react';

const formSchema = z.object({
  topic: z.string().min(2, {
    message: 'Topic must be at least 2 characters.',
  }),
});

export function EventIdeaGenerator() {
  const [ideas, setIdeas] = useState<GenerateEventIdeasOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    setIdeas(null);

    try {
      const result = await generateEventIdeas({
        topic: values.topic,
      });
      setIdeas(result);
    } catch (e) {
      setError('An unexpected error occurred while generating ideas. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-6 w-6" />
          Need some inspiration?
        </CardTitle>
        <CardDescription>
          Let AI help you brainstorm some creative ideas for your next event.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Topic</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., a child's birthday party, a corporate retreat..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Ideas
            </Button>
          </form>
        </Form>
        {ideas?.ideas && ideas.ideas.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-4 font-headline text-lg font-semibold">
              Here are a few ideas!
            </h3>
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertTitle>Event Ideas</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 list-disc space-y-2 pl-5">
                  {ideas.ideas.map((idea, index) => (
                    <li key={index}>{idea}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        )}
         {error && (
            <Alert variant="destructive" className="mt-4">
                <Lightbulb className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
      </CardContent>
    </Card>
  );
}
