# Agentic Voice Assistant

Voice-powered personal agent that performs Google searches, narrates highlights back to you, and presents a curated list of results. Built with Next.js App Router and deployable to Vercel.

## Features

- Voice capture via the Web Speech API with fallback to manual text input
- Google Programmable Search integration served through a secure Next.js API route
- Text-to-speech narration summarizing the most relevant findings
- Responsive interface designed for desktop and mobile

## Prerequisites

Create a Google API key and a Programmable Search Engine (Custom Search Engine). Add the credentials to an `.env.local` file based on `.env.local.example`:

```env
GOOGLE_API_KEY=your-api-key
GOOGLE_CSE_ID=your-search-engine-id
```

## Local Development

Install dependencies and start the dev server:

```bash
yarn install
yarn dev
```

Visit `http://localhost:3000` to interact with the agent.

## Production Build

```bash
yarn build
yarn start
```

## Deployment

The project is ready for Vercel deployment. Ensure the environment variables above are configured in the Vercel dashboard before deploying.
