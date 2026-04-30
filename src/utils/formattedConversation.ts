type DBMessage = {
  role: "USER" | "AI" | "SYSTEM";
  content: string;
};

export function formatConversationForAI(messages: DBMessage[]) {
  return messages.map((msg) => ({
    role:
      msg.role === "USER"
        ? "user"
        : msg.role === "AI"
        ? "assistant"
        : "system",
    content: msg.content,
  }));
}