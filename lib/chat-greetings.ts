export function getRandomChatGreeting(firstName: string): string {
  const name = firstName.trim();
  const withName = name
    ? [
        `What's on your mind, ${name}?`,
        `How can I help you, ${name}?`,
        `What should we build next, ${name}?`,
        `What are you working on, ${name}?`,
        `Ready when you are, ${name}.`,
        `What's the plan today, ${name}?`,
        `What can Ion help with, ${name}?`,
        `Where should we start, ${name}?`,
        `Got something on your mind, ${name}?`,
        `What would you like to tackle, ${name}?`,
      ]
    : [];

  const withoutName = [
    "What's on your mind?",
    "How can I help you today?",
    "What should we build next?",
    "What are you working on?",
    "Ready when you are.",
    "Where should we start?",
  ];

  const pool = [...withName, ...withoutName];
  return pool[Math.floor(Math.random() * pool.length)] ?? "Ask Ion";
}
