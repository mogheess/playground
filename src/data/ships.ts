export interface Ship {
  name: string;
  description: string;
  url?: string;
  type: "ios" | "web" | "library";
}

export const ships: Ship[] = [
  {
    name: "salah first",
    description: "ios app for prayer times, tracking, and reminders.",
    url: "https://apps.apple.com/us/app/salah-first/id6757348350",
    type: "ios",
  },
  {
    name: "aurora ui",
    description: "modern react component library built with next.js and tailwind.",
    url: "https://auroraui.dev",
    type: "library",
  },
  {
    name: "careerweave ai",
    description: "saas for generating tailored resumes and cover letters with gemini.",
    url: "https://careerweaveai.com",
    type: "web",
  },
  {
    name: "kalend.io",
    description: "ai-native scheduling app with natural language event creation.",
    url: "https://kalend.io",
    type: "web",
  },
  {
    name: "whosaidwhat",
    description: "multiplayer guessing game where you figure out who said what.",
    url: "https://whosaidwhat.app",
    type: "web",
  },
];
