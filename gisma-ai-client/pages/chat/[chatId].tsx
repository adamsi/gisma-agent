import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { refreshToken, getUser } from '@/store/slices/authSlice';
import { fetchChatMessages, deleteChat, addChat, fetchAllChats } from '@/store/slices/chatMemorySlice';
import { Chat } from '@/components/Chat/Chat';
import { Chatbar } from '@/components/Chatbar/Chatbar';
import HomePage from '@/components/HomePage/HomePage';
import { Conversation, Message, ChatMessage } from '@/types/chat';
import { ResponseFormat } from '@/types/responseFormat';
import { KeyValuePair } from '@/types/data';
import { ErrorMessage } from '@/types/error';
import {
  OpenAIModel,
  OpenAIModelID,
  OpenAIModels,
  fallbackModelID,
} from '@/types/openai';
import { DEFAULT_SYSTEM_PROMPT } from '@/utils/app/const';
import { updateConversation } from '@/utils/app/conversation';
import { saveChatMessages, loadChatMessages, saveLastVisitedChat } from '@/utils/app/chatStorage';
import { IconArrowBarLeft, IconArrowBarRight } from '@tabler/icons-react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { ChatService } from '@/utils/websocket/chatService';
import { WEBSOCKET_CONFIG } from '@/utils/websocket/config';

interface ChatPageProps {
  serverSideApiKeyIsSet: boolean;
  defaultModelId: OpenAIModelID;
}

const ChatPage: React.FC<ChatPageProps> = ({
  serverSideApiKeyIsSet,
  defaultModelId,
}) => {
  const router = useRouter();
  const { chatId } = router.query;
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { chats, chatMessages, loading: chatMemoryLoading } = useAppSelector(
    (state) => state.chatMemory
  );

  // STATE ----------------------------------------------
  const [appLoading, setAppLoading] = useState<boolean>(false);
  const [lightMode, setLightMode] = useState<'dark' | 'light'>('dark');
  const [messageIsStreaming, setMessageIsStreaming] = useState<boolean>(false);
  const [modelError, setModelError] = useState<ErrorMessage | null>(null);
  const [models, setModels] = useState<OpenAIModel[]>([
    OpenAIModels[defaultModelId] || OpenAIModels[fallbackModelID],
  ]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation>();
  const [currentMessage, setCurrentMessage] = useState<Message>();
  const [showSidebar, setShowSidebar] = useState<boolean>(true);

  // REFS ----------------------------------------------
  const stopConversationRef = useRef<boolean>(false);
  const finalizeStreamRef = useRef<(() => void) | null>(null);

  // WEBSOCKET SERVICE ----------------------------------------------
  const chatService = useRef<ChatService>(new ChatService(WEBSOCKET_CONFIG.SERVER_URL));

  // AUTHENTICATION EFFECT ----------------------------------------------
  useEffect(() => {
    const initializeAuth = async () => {
      await dispatch(refreshToken());
      await dispatch(getUser());
    };

    initializeAuth();

    const refreshInterval = setInterval(() => {
      dispatch(refreshToken());
    }, 1000 * 60 * 10);

    return () => clearInterval(refreshInterval);
  }, [dispatch]);

  // UPDATE CHATSERVICE AUTHENTICATION STATE ---------------------------
  useEffect(() => {
    chatService.current.setAuthenticated(!!user);
    if (user && chatId && typeof chatId === 'string') {
      // Fetch all chats first if not loaded
      if (chats.length === 0 && !chatMemoryLoading) {
        dispatch(fetchAllChats());
      }
      // Fetch messages for this chat if not already loaded
      if (!(chatId in chatMessages)) {
        dispatch(fetchChatMessages(chatId));
      }
    }
  }, [user, chatId, dispatch, chats.length, chatMessages, chatMemoryLoading]);

  // WEBSOCKET CLEANUP EFFECT ----------------------------------------------
  useEffect(() => {
    const handleLogout = () => {
      chatService.current.disconnect();
    };

    window.addEventListener('websocket-disconnect', handleLogout);

    return () => {
      chatService.current.disconnect();
      window.removeEventListener('websocket-disconnect', handleLogout);
    };
  }, []);

  // LOAD CONVERSATION FROM LOCALSTORAGE IMMEDIATELY (for instant display on refresh)
  useEffect(() => {
    if (!chatId || typeof chatId !== 'string' || !user || selectedConversation) return;
    
    // Try to load from localStorage immediately for instant display
    const localMessages = loadChatMessages(chatId);
    
    // If we have local messages, show them immediately
    if (localMessages && localMessages.length > 0) {
      const tempConversation: Conversation = {
        id: uuidv4(),
        chatId: chatId,
        name: 'Loading...',
        messages: localMessages,
        model: OpenAIModels[defaultModelId] || OpenAIModels[fallbackModelID],
        prompt: DEFAULT_SYSTEM_PROMPT,
        folderId: null,
        responseFormat: ResponseFormat.SIMPLE,
        textDirection: 'ltr',
      };
      setSelectedConversation(tempConversation);
    }
  }, [chatId, user, defaultModelId, selectedConversation]);

  // LOAD CONVERSATION FROM CHATID ----------------------------------------------
  useEffect(() => {
    if (!chatId || typeof chatId !== 'string' || !user) return;
    
    // Wait for chats to load
    if (chatMemoryLoading) return;

    const chat = chats.find((c) => c.chatId === chatId);
    
    // If chats have loaded but chat not found, redirect
    if (!chat && chats.length > 0) {
      router.push('/');
      return;
    }
    
    // If chats are still loading, wait
    if (!chat) return;

    // Ensure messages are loaded - if not in Redux, fetch them
    if (!(chatId in chatMessages)) {
      dispatch(fetchChatMessages(chatId));
      // Don't return - continue to update with chat info if we have it
    }

    // Load messages from backend
    const backendMessages: Message[] = (chatMessages[chatId] || []).map(
      (msg: ChatMessage) => ({
        role: msg.type === 'USER' ? 'user' : 'assistant',
        content: msg.content,
      })
    );

    // Try to load from localStorage
    const localMessages = loadChatMessages(chatId);
    
    // Prefer localStorage if it has more messages (newer), otherwise use backend
    // This ensures new messages saved to localStorage are shown when navigating back
    const messages = localMessages && localMessages.length > backendMessages.length
      ? localMessages
      : backendMessages.length > 0
      ? backendMessages
      : localMessages || [];

    const conversation: Conversation = {
      id: uuidv4(),
      chatId: chat.chatId,
      name: chat.description,
      messages,
      model: OpenAIModels[defaultModelId] || OpenAIModels[fallbackModelID],
      prompt: DEFAULT_SYSTEM_PROMPT,
      folderId: null,
      responseFormat: ResponseFormat.SIMPLE,
      textDirection: 'ltr',
    };

    setSelectedConversation(conversation);
    
    // Save to localStorage - only if we're using backend messages or if local is empty
    // Don't overwrite localStorage if it has more messages (newer data)
    if (messages.length > 0 && (!localMessages || localMessages.length <= messages.length)) {
      saveChatMessages(chatId, messages);
    }
    
    // Save last visited chatId
    saveLastVisitedChat(chatId);
  }, [chatId, chats, chatMessages, user, defaultModelId, router, chatMemoryLoading, dispatch]);

  // CONVERT CHATS TO CONVERSATIONS FOR SIDEBAR ---------------------------
  useEffect(() => {
    if (chats && chats.length > 0) {
      const chatConversations: Conversation[] = chats.map((chat) => {
        const messages: Message[] = (chatMessages[chat.chatId] || []).map(
          (msg: ChatMessage) => ({
            role: msg.type === 'USER' ? 'user' : 'assistant',
            content: msg.content,
          })
        );

        return {
          id: uuidv4(),
          chatId: chat.chatId,
          name: chat.description,
          messages,
          model: OpenAIModels[defaultModelId] || OpenAIModels[fallbackModelID],
          prompt: DEFAULT_SYSTEM_PROMPT,
          folderId: null,
          responseFormat: ResponseFormat.SIMPLE,
          textDirection: 'ltr',
        };
      });

      setConversations([...chatConversations].reverse());
    }
  }, [chats, chatMessages, defaultModelId]);

  // WEBSOCKET RESPONSE ----------------------------------------------
  const handleStop = () => {
    stopConversationRef.current = true;
    chatService.current.abortCurrentStream();

    if (finalizeStreamRef.current) {
      finalizeStreamRef.current();
    } else {
      setMessageIsStreaming(false);
    }

    setTimeout(() => {
      stopConversationRef.current = false;
    }, 1000);
  };

  const handleSend = async (message: Message, deleteCount = 0) => {
    if (!user || !selectedConversation || !selectedConversation.chatId) {
      return;
    }

    let updatedConversation: Conversation;

    if (deleteCount) {
      const updatedMessages = [...selectedConversation.messages];
      for (let i = 0; i < deleteCount; i++) {
        updatedMessages.pop();
      }
      updatedConversation = {
        ...selectedConversation,
        messages: [...updatedMessages, message],
      };
    } else {
      updatedConversation = {
        ...selectedConversation,
        messages: [...selectedConversation.messages, message],
      };
    }

    setSelectedConversation(updatedConversation);
    // Save user message to localStorage immediately
    saveChatMessages(updatedConversation.chatId!, updatedConversation.messages);
    setMessageIsStreaming(true);

    let assistantMessage: Message = { role: 'assistant', content: '' };
    let isFirstChunk = true;
    let completionTimer: any = null;

    const finalizeStream = () => {
      if (completionTimer) {
        clearTimeout(completionTimer);
        completionTimer = null;
      }

      setMessageIsStreaming(false);

      setSelectedConversation((prev) => {
        if (!prev || prev.id !== updatedConversation.id) return prev;

        const finalConversation = { ...prev };

        // Save to localStorage
        saveChatMessages(prev.chatId!, finalConversation.messages);

        setConversations((prevConvs) =>
          prevConvs.map((conv) =>
            conv.chatId === finalConversation.chatId ? finalConversation : conv
          )
        );

        return finalConversation;
      });

      setAppLoading(false);
      finalizeStreamRef.current = null;
    };

    finalizeStreamRef.current = finalizeStream;

    try {
      if (!updatedConversation.chatId) {
        toast.error('Chat ID is missing.');
        setAppLoading(false);
        setMessageIsStreaming(false);
        return;
      }

      await chatService.current.sendMessage(
        message.content,
        updatedConversation.chatId,
        updatedConversation.responseFormat,
        (chunk: string) => {
          if (stopConversationRef.current) {
            chatService.current.abortCurrentStream();
            finalizeStream();
            return;
          }

          if (completionTimer) clearTimeout(completionTimer);
          completionTimer = setTimeout(() => {
            finalizeStream();
          }, 300);

          setSelectedConversation((prev) => {
            if (!prev || prev.id !== updatedConversation.id) return prev;

            let updated: Conversation;
            if (isFirstChunk) {
              isFirstChunk = false;
              assistantMessage = { role: 'assistant', content: chunk };
              updated = {
                ...prev,
                messages: [...prev.messages, assistantMessage],
              };
            } else {
              assistantMessage.content += chunk;
              updated = {
                ...prev,
                messages: prev.messages.map((msg, index) =>
                  index === prev.messages.length - 1 ? assistantMessage : msg
                ),
              };
            }

            // Save to localStorage on each chunk
            saveChatMessages(prev.chatId!, updated.messages);

            // Update conversations list
            setConversations((prevConvs) =>
              prevConvs.map((conv) =>
                conv.chatId === updated.chatId ? updated : conv
              )
            );

            return updated;
          });
        },
        () => {
          finalizeStream();
        },
        (error: string) => {
          console.error('WebSocket error:', error);
          toast.error('Connection error. Please try again.');
          setAppLoading(false);
          setMessageIsStreaming(false);
        },
        updatedConversation.schemaJson
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message. Please try again.');
      setAppLoading(false);
      setMessageIsStreaming(false);
    }
  };

  // BASIC HANDLERS --------------------------------------------
  const handleLightMode = (mode: 'dark' | 'light') => {
    setLightMode(mode);
    localStorage.setItem('theme', mode);
  };

  const handleToggleChatbar = () => {
    setShowSidebar(!showSidebar);
    localStorage.setItem('showChatbar', JSON.stringify(!showSidebar));
  };

  const handleSelectConversation = (conversation: Conversation) => {
    if (conversation.chatId) {
      router.push(`/chat/${conversation.chatId}`);
    } else {
      router.push('/');
    }
  };

  // CONVERSATION OPERATIONS  --------------------------------------------
  const handleNewConversation = () => {
    router.push('/');
  };

  const handleDeleteConversation = async (conversation: Conversation) => {
    if (conversation.chatId) {
      try {
        await dispatch(deleteChat(conversation.chatId)).unwrap();
        if (conversation.chatId === chatId) {
          router.push('/');
        }
      } catch (error) {
        console.error('Failed to delete chat:', error);
        toast.error('Failed to delete conversation.');
        return;
      }
    }
  };

  const handleUpdateConversation = (
    conversation: Conversation,
    data: KeyValuePair
  ) => {
    const updatedConversation = {
      ...conversation,
      [data.key]: data.value,
    };

    const { single, all } = updateConversation(
      updatedConversation,
      conversations
    );

    setSelectedConversation(single);
    setConversations(all);

    // Save messages to localStorage if updated
    if (data.key === 'messages' && single.chatId) {
      saveChatMessages(single.chatId, single.messages);
    }
  };

  const handleClearConversations = () => {
    setConversations([]);
    localStorage.removeItem('conversationHistory');
    router.push('/');
  };

  const handleEditMessage = (message: Message, messageIndex: number) => {
    if (selectedConversation) {
      const updatedMessages = selectedConversation.messages
        .map((m, i) => {
          if (i < messageIndex) {
            return m;
          }
        })
        .filter((m) => m) as Message[];

      const updatedConversation = {
        ...selectedConversation,
        messages: updatedMessages,
      };

      const { single, all } = updateConversation(
        updatedConversation,
        conversations
      );

      setSelectedConversation(single);
      setConversations(all);

      // Save to localStorage
      if (single.chatId) {
        saveChatMessages(single.chatId, single.messages);
      }

      setCurrentMessage(message);
    }
  };

  // EFFECTS  --------------------------------------------
  useEffect(() => {
    if (currentMessage) {
      handleSend(currentMessage);
      setCurrentMessage(undefined);
    }
  }, [currentMessage]);

  useEffect(() => {
    if (window.innerWidth < 640) {
      setShowSidebar(false);
    }
  }, [selectedConversation]);

  // ON LOAD --------------------------------------------
  useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme) {
      setLightMode(theme as 'dark' | 'light');
    }

    if (window.innerWidth < 640) {
      setShowSidebar(false);
    }

    const showChatbar = localStorage.getItem('showChatbar');
    if (showChatbar) {
      setShowSidebar(showChatbar === 'true');
    }
  }, [serverSideApiKeyIsSet]);

  if (!user) {
    return <HomePage />;
  }

  // Show chat interface immediately, even if conversation is still loading
  // Messages will appear once loaded from backend or localStorage
  const displayConversation = selectedConversation || (chatId && typeof chatId === 'string' ? {
    id: uuidv4(),
    chatId: chatId,
    name: 'Loading...',
    messages: [],
    model: OpenAIModels[defaultModelId] || OpenAIModels[fallbackModelID],
    prompt: DEFAULT_SYSTEM_PROMPT,
    folderId: null,
    responseFormat: ResponseFormat.SIMPLE,
    textDirection: 'ltr' as const,
  } : undefined);

  if (!displayConversation) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Gisma Agent - {displayConversation.name}</title>
        <meta name="description" content="AI assistant with gisma knowledge base." />
        <meta
          name="viewport"
          content="height=device-height ,width=device-width, initial-scale=1, user-scalable=no"
        />
        <link rel="icon" type="image/png" href="/sa-logo.png" />
        <link rel="shortcut icon" type="image/png" href="/sa-logo.png" />
        <link rel="apple-touch-icon" href="/sa-logo.png" />
      </Head>
      <main
        className={`flex h-screen w-screen flex-col text-sm text-white dark:text-white ${lightMode}`}
      >
        <div className="flex h-full w-full">
          {showSidebar ? (
            <div>
              <Chatbar
                loading={appLoading}
                conversations={conversations}
                lightMode={lightMode}
                selectedConversation={displayConversation}
                onNewConversation={handleNewConversation}
                onToggleLightMode={handleLightMode}
                onSelectConversation={handleSelectConversation}
                onDeleteConversation={handleDeleteConversation}
                onUpdateConversation={handleUpdateConversation}
                onClearConversations={handleClearConversations}
              />

              <button
                className="fixed top-2.5 left-[270px] z-50 h-7 w-7 text-white hover:text-gray-400 dark:text-white dark:hover:text-gray-300 sm:top-0.5 sm:left-[270px] sm:h-8 sm:w-8 sm:text-neutral-700"
                onClick={handleToggleChatbar}
              >
                <IconArrowBarLeft />
              </button>
              <div
                onClick={handleToggleChatbar}
                className="absolute top-0 left-0 z-10 h-full w-full bg-black opacity-70 sm:hidden"
              ></div>
            </div>
          ) : (
            <button
              className="fixed top-2.5 left-4 z-50 h-7 w-7 text-white hover:text-gray-400 dark:text-white dark:hover:text-gray-300 sm:top-0.5 sm:left-4 sm:h-8 sm:w-8 sm:text-neutral-700"
              onClick={handleToggleChatbar}
            >
              <IconArrowBarRight />
            </button>
          )}

          <div className="flex flex-1">
            <Chat
              conversation={displayConversation}
              messageIsStreaming={messageIsStreaming}
              serverSideApiKeyIsSet={serverSideApiKeyIsSet}
              defaultModelId={defaultModelId}
              modelError={modelError}
              models={models}
              loading={appLoading}
              onSend={handleSend}
              onUpdateConversation={handleUpdateConversation}
              onEditMessage={handleEditMessage}
              stopConversationRef={stopConversationRef}
              onStop={handleStop}
            />
          </div>
        </div>
      </main>
    </>
  );
};

export default ChatPage;

export const getServerSideProps: GetServerSideProps = async () => {
  const defaultModelId =
    (process.env.DEFAULT_MODEL &&
      Object.values(OpenAIModelID).includes(
        process.env.DEFAULT_MODEL as OpenAIModelID
      ) &&
      (process.env.DEFAULT_MODEL as OpenAIModelID)) ||
    fallbackModelID;

  return {
    props: {
      serverSideApiKeyIsSet: true,
      defaultModelId,
    },
  };
};

