'use server';

/**
 * @fileOverview A Genkit flow to generate event ideas using Google Gemini.
 *
 * - generateEventIdeas - Function to generate event ideas based on a topic.
 * - GenerateEventIdeasInput - Input type for the generateEventIdeas function.
 * - GenerateEventIdeasOutput - Return type for the generateEventIdeas function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateEventIdeasInputSchema = z.object({
  topic: z.string().describe('The topic or theme for the event ideas.'),
});
export type GenerateEventIdeasInput = z.infer<typeof GenerateEventIdeasInputSchema>;

const GenerateEventIdeasOutputSchema = z.object({
    ideas: z.array(z.string()).describe('An array of three event ideas.'),
});
export type GenerateEventIdeasOutput = z.infer<typeof GenerateEventIdeasOutputSchema>;


export async function generateEventIdeas(input: GenerateEventIdeasInput): Promise<GenerateEventIdeasOutput> {
  return generateEventIdeasFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateEventIdeasPrompt',
  input: {schema: GenerateEventIdeasInputSchema},
  output: {schema: GenerateEventIdeasOutputSchema},
  prompt: `You are a creative event planner. Brainstorm 3 fun and unique event ideas based on the following topic: {{{topic}}}.`,
  config: {
    safetySettings: [
        {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE',
        },
    ]
  }
});

const generateEventIdeasFlow = ai.defineFlow(
  {
    name: 'generateEventIdeasFlow',
    inputSchema: GenerateEventIdeasInputSchema,
    outputSchema: GenerateEventIdeasOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
