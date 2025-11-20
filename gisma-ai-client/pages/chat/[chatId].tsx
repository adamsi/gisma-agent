import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { refreshToken, getUser } from '@/store/slices/authSlice';
import { deleteChat, setLastVisitedChatId, fetchChatMessages, addChat } from '@/store/slices/chatMemorySlice';
import { Chat } from '@/components/Chat/Chat';
import { Chatbar } from '@/components/Chatbar/Chatbar';
import HomePage from '@/components/HomePage/HomePage';
import { Conversation, Message } from '@/types/chat';
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
import { IconArrowBarLeft, IconArrowBarRight } from '@tabler/icons-react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import toast from 'react-hot-toast';
import ParticlesBackground from '@/components/Global/Particles';
import { useConversations } from '@/hooks/useConversations';
import { useChatStreaming } from '@/hooks/useChatStreaming';

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
  const { chats, chatMessages, lastVisitedChatId } = useAppSelector((state) => state.chatMemory);

  // STATE
  const [appLoading, setAppLoading] = useState<boolean>(false);
  const [lightMode, setLightMode] = useState<'dark' | 'light'>('dark');
  const [modelError, setModelError] = useState<ErrorMessage | null>(null);
  const [models, setModels] = useState<OpenAIModel[]>([
    OpenAIModels[defaultModelId] || OpenAIModels[fallbackModelID],
  ]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation>();
  const [currentMessage, setCurrentMessage] = useState<Message>();
  const [showSidebar, setShowSidebar] = useState<boolean>(true);

  // HOOKS
  const { conversations: backendConversations, loadChats, loadChatMessages: loadChatMessagesFromHook } = useConversations(defaultModelId);

  // Update conversations when backend conversations change
  useEffect(() => {
    setConversations(backendConversations);
  }, [backendConversations]);

  // Load chats on mount if user is authenticated
  useEffect(() => {
    if (user) {
      loadChats();
    }
  }, [user, loadChats]);

  // Track metadata descriptions to preserve them during stream updates
  const metadataDescriptionsRef = useRef<Record<string, string>>({});
  // Track navigation to prevent multiple simultaneous navigations
  const isNavigatingRef = useRef<boolean>(false);

  // Streaming hook
  const { sendMessage, handleStop, messageIsStreaming, stopConversationRef, chatService } = useChatStreaming({
    onStreamUpdate: (conversation) => {
      // Preserve description from metadata if it exists
      if (conversation.chatId && metadataDescriptionsRef.current[conversation.chatId]) {
        conversation = {
          ...conversation,
          name: metadataDescriptionsRef.current[conversation.chatId],
        };
      }
      setSelectedConversation(conversation);
      setConversations((prev) =>
        prev.map((c) => {
          if (c.chatId === conversation.chatId) {
            // Preserve description from metadata if it exists
            if (conversation.chatId && metadataDescriptionsRef.current[conversation.chatId]) {
              return {
                ...conversation,
                name: metadataDescriptionsRef.current[conversation.chatId],
              };
            }
            return conversation;
          }
          return c;
        })
      );
    },
    onMetadata: (metadata) => {
      // Store the metadata description
      metadataDescriptionsRef.current[metadata.chatId] = metadata.description;
      
      setSelectedConversation((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          chatId: metadata.chatId,
          name: metadata.description,
        };
        setConversations((prevConvs) =>
          prevConvs.map((c) => 
            c.chatId === metadata.chatId ? updated : c
          )
        );
        dispatch(addChat({ chatId: metadata.chatId, description: metadata.description }));
        dispatch(setLastVisitedChatId(metadata.chatId));
        return updated;
      });
    },
  });

  // AUTHENTICATION
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

  // UPDATE CHATSERVICE AUTHENTICATION STATE
  useEffect(() => {
    chatService.setAuthenticated(!!user);
  }, [user, chatService]);

  // WEBSOCKET CLEANUP
  useEffect(() => {
    const handleLogout = () => {
      chatService.disconnect();
    };
    window.addEventListener('websocket-disconnect', handleLogout);
    return () => {
      window.removeEventListener('websocket-disconnect', handleLogout);
    };
  }, [chatService]);

  // Reset navigation guard when route changes
  useEffect(() => {
    isNavigatingRef.current = false;
  }, [chatId]);

  // LOAD CONVERSATION FROM CHATID
  useEffect(() => {
    if (!chatId || typeof chatId !== 'string' || !user) return;

    // Try to find conversation in backend conversations first (has stable id)
    const conversation = backendConversations.find((c) => c.chatId === chatId);
    if (conversation) {
      // Ensure messages are loaded
      if (!chatMessages[chatId]) {
        loadChatMessagesFromHook(chatId);
        // Don't set selectedConversation yet - wait for messages to load
        return;
      }
      // Only update if it's different to avoid unnecessary re-renders
      if (!selectedConversation || selectedConversation.chatId !== chatId) {
        setSelectedConversation(conversation);
        dispatch(setLastVisitedChatId(chatId));
      }
      return;
    }

    // If not in backend conversations, check if chat exists in Redux
    const chat = chats.find((c) => c.chatId === chatId);
    if (!chat) {
      // Wait a bit for chats to load, then redirect if still not found
      const timeout = setTimeout(() => {
        if (chats.length > 0) {
          router.replace('/');
        }
      }, 1000);
      return () => clearTimeout(timeout);
    }

    // Chat exists but conversation not in backendConversations yet
    // Load messages and create conversation with chatId as id (temporary until backendConversations updates)
    if (!chatMessages[chatId]) {
      loadChatMessagesFromHook(chatId);
      // Don't set selectedConversation yet - wait for messages to load
      return;
    }

    // Load messages from backend
    const backendMessages: Message[] = (chatMessages[chatId] || []).map(
      (msg) => ({
        role: msg.type === 'USER' ? 'user' : 'assistant',
        content: msg.content,
      })
    );

    // Use chatId as id temporarily - this will be replaced when backendConversations updates
    const tempConversation: Conversation = {
      id: chatId, // Use chatId as id to maintain consistency
      chatId: chat.chatId,
      name: chat.description,
      messages: backendMessages,
      model: OpenAIModels[defaultModelId] || OpenAIModels[fallbackModelID],
      prompt: DEFAULT_SYSTEM_PROMPT,
      folderId: null,
      responseFormat: ResponseFormat.SIMPLE,
      textDirection: 'ltr',
    };

    // Only update if it's different to avoid unnecessary re-renders
    if (!selectedConversation || selectedConversation.chatId !== chatId) {
      setSelectedConversation(tempConversation);
      dispatch(setLastVisitedChatId(chatId));
    }
  }, [chatId, chats, chatMessages, backendConversations, user, defaultModelId, router, dispatch, loadChatMessagesFromHook, selectedConversation]);

  // Update selected conversation when backend conversations update (to get stable id)
  // Also preserve metadata descriptions
  useEffect(() => {
    if (selectedConversation?.chatId) {
      const updatedConversation = backendConversations.find((c) => c.chatId === selectedConversation.chatId);
      if (updatedConversation) {
        // Preserve description from metadata if it exists, otherwise use backend description
        const preservedName = metadataDescriptionsRef.current[selectedConversation.chatId] || updatedConversation.name;
        setSelectedConversation({
          ...updatedConversation,
          name: preservedName,
        });
      }
    }
  }, [backendConversations, selectedConversation?.chatId]);

  // HANDLERS
  const handleLightMode = (mode: 'dark' | 'light') => {
    setLightMode(mode);
    localStorage.setItem('theme', mode);
  };

  const handleToggleChatbar = () => {
    setShowSidebar(!showSidebar);
    localStorage.setItem('showChatbar', JSON.stringify(!showSidebar));
  };

  const handleSelectConversation = (conversation: Conversation) => {
    // Prevent multiple simultaneous navigations
    if (isNavigatingRef.current) return;
    
    dispatch(setLastVisitedChatId(conversation.chatId || null));
    
    if (conversation.chatId) {
      // Use replace to avoid adding to history and prevent abort errors
      // Only navigate if we're switching to a different chat
      if (chatId !== conversation.chatId) {
        isNavigatingRef.current = true;
        router.replace(`/chat/${conversation.chatId}`).then(() => {
          isNavigatingRef.current = false;
        }).catch(() => {
          isNavigatingRef.current = false;
        });
      } else {
        // If already on this chat, just update the state
        setSelectedConversation(conversation);
      }
    } else {
      isNavigatingRef.current = true;
      router.replace('/').then(() => {
        isNavigatingRef.current = false;
      }).catch(() => {
        isNavigatingRef.current = false;
      });
    }
  };

  const handleNewConversation = () => {
    dispatch(setLastVisitedChatId(null));
    router.replace('/');
  };

  const handleDeleteConversation = async (conversation: Conversation) => {
    if (conversation.chatId) {
      try {
        await dispatch(deleteChat(conversation.chatId)).unwrap();
        if (conversation.chatId === chatId) {
          router.replace('/');
        }
      } catch (error) {
        console.error('Failed to delete chat:', error);
        toast.error('Failed to delete conversation.');
      }
    }
  };

  const handleUpdateConversation = (conversation: Conversation, data: KeyValuePair) => {
    const updatedConversation = {
      ...conversation,
      [data.key]: data.value,
    };

    const { single, all } = updateConversation(updatedConversation, conversations);
    setSelectedConversation(single);
    setConversations(all);
  };

  const handleClearConversations = () => {
    setConversations([]);
    router.replace('/');
  };

  const handleEditMessage = (message: Message, messageIndex: number) => {
    if (selectedConversation) {
      const updatedMessages = selectedConversation.messages
        .map((m, i) => (i < messageIndex ? m : undefined))
        .filter((m) => m) as Message[];

      const updatedConversation = {
        ...selectedConversation,
        messages: updatedMessages,
      };

      const { single, all } = updateConversation(updatedConversation, conversations);
      setSelectedConversation(single);
      setConversations(all);
      setCurrentMessage(message);
    }
  };

  const handleSend = async (message: Message, deleteCount = 0) => {
    if (!user || !selectedConversation || !selectedConversation.chatId) return;
    await sendMessage(selectedConversation, message, deleteCount);
  };

  // EFFECTS
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

  // ON LOAD
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

  // Don't show fallback conversation - wait for actual conversation to load
  // This prevents the flash of "Loading..." or default chat
  if (!selectedConversation || (chatId && selectedConversation.chatId !== chatId)) {
    // Show loading state while conversation is being loaded
    return (
      <>
        <Head>
          <title>Gisma Agent - Loading...</title>
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
          className={`flex h-screen w-screen flex-col text-sm ${lightMode === 'light' ? 'text-gray-900 bg-gradient-to-br from-gray-50 via-white to-gray-100' : 'dark text-white bg-gradient-to-br from-gray-950 via-slate-950 to-black'} relative`}
        >
          {lightMode === 'dark' && (
            <div className="absolute inset-0 z-0">
              <ParticlesBackground />
            </div>
          )}
          <div className="flex h-full w-full items-center justify-center relative z-10">
            <div className="text-white/60">Loading conversation...</div>
          </div>
        </main>
      </>
    );
  }

  const displayConversation = selectedConversation;

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
        className={`flex h-screen w-screen flex-col text-sm ${lightMode === 'light' ? 'text-gray-900 bg-gradient-to-br from-gray-50 via-white to-gray-100' : 'dark text-white bg-gradient-to-br from-gray-950 via-slate-950 to-black'} relative`}
      >
        {lightMode === 'dark' && (
          <div className="absolute inset-0 z-0">
            <ParticlesBackground />
          </div>
        )}
        <div className="flex h-full w-full relative z-10">
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
                className={`fixed top-2.5 left-[270px] z-50 h-7 w-7 sm:top-0.5 sm:left-[270px] sm:h-8 sm:w-8 transition-colors ${
                  lightMode === 'light'
                    ? 'text-gray-700 hover:text-gray-900'
                    : 'text-white hover:text-gray-300'
                }`}
                onClick={handleToggleChatbar}
              >
                <IconArrowBarLeft />
              </button>
              <div
                onClick={handleToggleChatbar}
                className={`absolute top-0 left-0 z-10 h-full w-full sm:hidden ${
                  lightMode === 'light' ? 'bg-gray-900/30' : 'bg-black/70'
                }`}
              ></div>
            </div>
          ) : (
            <button
              className={`fixed top-2.5 left-4 z-50 h-7 w-7 sm:top-0.5 sm:left-4 sm:h-8 sm:w-8 transition-colors ${
                lightMode === 'light'
                  ? 'text-gray-700 hover:text-gray-900'
                  : 'text-white hover:text-gray-300'
              }`}
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
