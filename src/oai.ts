import OpenAI from 'openai';


export class OpenAIConnect {

    private openai

    constructor(openai_api_key: string) {
        this.openai = new OpenAI({
            apiKey: openai_api_key
        });
    }

    //TODO: Parameterize this and build interface for user to tinker and provide additional context
    private translatePrompt(text: string) {
        return `You are a professional translation engine for translating Japanese to English.
        Your task is to translate the following excerpts from a Manga.
        Each line of input should have a corresponding translated line. Do not combine lines.
        If you are ever unsure of how to translate something, leave it as Japanese.
        
        # Manga Text #
        ${text}
        
        # Translated Text #
        `
    }

    private translateOnePrompt(text: string, context: string) {
        return `You are a professional translation engine for translating Japanese to English.

        Here is the full context of the passage you are translating:
        ${context}
        
        Your task is to translate the following selected line from a Manga.
        If you are ever unsure of how to translate something, leave it as Japanese.
        
        # Selected Line #
        ${text}
        
        # Translated Line #
        `
    }

    private vocabPrompt(text: string) {
        return `You are a professional japanese teacher fluent in Japanese and English.
        Your task is to create a list of vocabulary for students based on the passages they provide you.
        Your vocab list should have the original word accompanied by the kana decomposition and a definition in english.
        If you are ever unsure of how to translate something, omit it.
        
        # Passage #
        ${text}
        
        # Vocabulary #
        `
    }

    async translate(messages: string[]): Promise<string[]> {
        const content = this.translatePrompt(messages.join('\n'));

        const completion = await this.openai.chat.completions.create({
            messages: [{ role: 'user', content }],
            model: 'gpt-3.5-turbo',
        });

        console.log("Full prompt and response: ", content, completion);
        const result = completion.choices[0].message.content;
        console.log("First choice: ", result);
        return result.split('\n')
    }

    async vocab(text: string): Promise<string> {
        const content = this.vocabPrompt(text);

        const completion = await this.openai.chat.completions.create({
            messages: [{ role: 'user', content }],
            model: 'gpt-3.5-turbo',
        });
        console.log("Full prompt and response: ", content, completion);
        const result = completion.choices[0].message.content;
        console.log("First choice: ", result);
        return result
    }

    async translateOne(text: string, context: string): Promise<string> {
        const content = this.translateOnePrompt(text, context);

        const completion = await this.openai.chat.completions.create({
            messages: [{ role: 'user', content }],
            model: 'gpt-3.5-turbo',
        });
        console.log("Full prompt and response: ", content, completion);
        const result = completion.choices[0].message.content;
        console.log("First choice: ", result);
        return result
    }



}