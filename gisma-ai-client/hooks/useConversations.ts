import { useMemo, useCallback, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchAllChats, fetchChatMessages } from '@/store/slices/chatMemorySlice';
import { Conversation, Message, ChatMessage } from '@/types/chat';
import { OpenAIModel, OpenAIModelID, OpenAIModels, fallbackModelID } from '@/types/openai';
import { DEFAULT_SYSTEM_PROMPT } from '@/utils/app/const';
import { ResponseFormat } from '@/types/responseFormat';
import { v4 as uuidv4 } from 'uuid';

/**
 * Custom hook to manage conversations from Redux state
 * Converts backend chats to Conversation format for UI
 */
export const useConversations = (defaultModelId: OpenAIModelID) => {
  const dispatch = useAppDispatch();
  const { chats, chatMessages } = useAppSelector((state) => state.chatMemory);
  const conversationIdsRef = useRef<Record<string, string>>({});

  const conversations = useMemo<Conversation[]>(() => {
    if (!chats || chats.length === 0) return [];

    return chats
      .map((chat) => {
        // Use stable ID - reuse existing ID if conversation already exists
        if (!conversationIdsRef.current[chat.chatId]) {
          conversationIdsRef.current[chat.chatId] = uuidv4();
        }

        const messages: Message[] = (chatMessages[chat.chatId] || []).map(
          (msg: ChatMessage) => ({
            role: msg.type === 'USER' ? 'user' : 'assistant',
            content: msg.content,
          })
        );

        return {
          id: conversationIdsRef.current[chat.chatId],
          chatId: chat.chatId,
          name: chat.description,
          messages,
          model: OpenAIModels[defaultModelId] || OpenAIModels[fallbackModelID],
          prompt: DEFAULT_SYSTEM_PROMPT,
          folderId: null,
          responseFormat: ResponseFormat.SIMPLE,
          textDirection: 'ltr' as const,
        };
      })
      .reverse(); // Newest first
  }, [chats, chatMessages, defaultModelId]);

  const loadChats = useCallback(() => {
    dispatch(fetchAllChats());
  }, [dispatch]);

  const loadingChatIdsRef = useRef<Set<string>>(new Set());
  
  const loadChatMessages = useCallback((chatId: string) => {
    // Don't load if already loaded
    if (chatMessages[chatId]) {
      return;
    }
    // Don't load if currently loading
    if (loadingChatIdsRef.current.has(chatId)) {
      return;
    }
    loadingChatIdsRef.current.add(chatId);
    dispatch(fetchChatMessages(chatId)).then(() => {
      loadingChatIdsRef.current.delete(chatId);
    }).catch(() => {
      loadingChatIdsRef.current.delete(chatId);
    });
  }, [dispatch, chatMessages]);

  return {
    conversations,
    loadChats,
    loadChatMessages,
  };
};

