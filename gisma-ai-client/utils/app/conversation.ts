import { Conversation } from '@/types/chat';

/**
 * Update a conversation in the conversations list
 * Returns updated single conversation and all conversations
 */
export const updateConversation = (
  updatedConversation: Conversation,
  allConversations: Conversation[],
) => {
  const updatedConversations = allConversations.map((c) => {
    // Use chatId for matching when available (backend-generated), otherwise fall back to id (client-generated)
    if (
      (c.chatId && updatedConversation.chatId && c.chatId === updatedConversation.chatId) ||
      (!c.chatId && !updatedConversation.chatId && c.id === updatedConversation.id)
    ) {
      return updatedConversation;
    }
    return c;
  });

  return {
    single: updatedConversation,
    all: updatedConversations,
  };
};
