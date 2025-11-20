import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { refreshToken, getUser } from '@/store/slices/authSlice';
import { deleteChat, addChat, setLastVisitedChatId } from '@/store/slices/chatMemorySlice';
import { fetchRootFolder } from '@/store/slices/uploadSlice';
import { Chat } from '@/components/Chat/Chat';
import { Chatbar } from '@/components/Chatbar/Chatbar';
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
import { updateConversation } from '@/utils/app/conversation';
import { IconArrowBarLeft, IconArrowBarRight } from '@tabler/icons-react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import toast from 'react-hot-toast';
import ParticlesBackground from '@/components/Global/Particles';
import { useConversations } from '@/hooks/useConversations';
import { useSelectedConversation } from '@/hooks/useSelectedConversation';
import { useChatStreaming } from '@/hooks/useChatStreaming';

interface HomeProps {
  serverSideApiKeyIsSet: boolean;
  defaultModelId: OpenAIModelID;
}

const Home: React.FC<HomeProps> = ({
  serverSideApiKeyIsSet,
  defaultModelId,
}) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isAdmin, loading: authLoading } = useAppSelector((state) => state.auth);
  const { rootFolder } = useAppSelector((state) => state.upload);

  // STATE
  const [appLoading, setAppLoading] = useState<boolean>(false);
  const [lightMode, setLightMode] = useState<'dark' | 'light'>('dark');
  const [modelError, setModelError] = useState<ErrorMessage | null>(null);
  const [models, setModels] = useState<OpenAIModel[]>([
    OpenAIModels[defaultModelId] || OpenAIModels[fallbackModelID],
  ]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentMessage, setCurrentMessage] = useState<Message>();
  const [showSidebar, setShowSidebar] = useState<boolean>(true);

  // HOOKS
  const { conversations: backendConversations, loadChats } = useConversations(defaultModelId);
  const {
    selectedConversation,
    setSelectedConversation,
    selectConversation,
    startNewConversation,
  } = useSelectedConversation(defaultModelId);

  // Update conversations when backend conversations change
  useEffect(() => {
    setConversations(backendConversations);
  }, [backendConversations]);

  // Update selected conversation when it changes in backend (only if it has a chatId)
  // Don't update if we're on home page and should have a new conversation
  // Also preserve metadata descriptions
  useEffect(() => {
    if (selectedConversation?.chatId && router.pathname !== '/') {
      const updated = backendConversations.find((c) => c.chatId === selectedConversation.chatId);
      if (updated) {
        // Preserve description from metadata if it exists, otherwise use backend description
        const preservedName = metadataDescriptionsRef.current[selectedConversation.chatId] || updated.name;
        setSelectedConversation({
          ...updated,
          name: preservedName,
        });
      }
    }
  }, [backendConversations, selectedConversation?.chatId, setSelectedConversation, router.pathname]);

  // Track metadata descriptions to preserve them during stream updates
  const metadataDescriptionsRef = useRef<Record<string, string>>({});

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
          const isMatch = 
            (c.chatId && conversation.chatId && c.chatId === conversation.chatId) ||
            (!c.chatId && !conversation.chatId && c.id === conversation.id);
          if (isMatch) {
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
        setConversations((prevConvs) => {
          // Remove any conversation with the same chatId or same id (if no chatId)
          const filtered = prevConvs.filter((c) => 
            !((c.chatId && c.chatId === metadata.chatId) ||
              (!c.chatId && !prev!.chatId && c.id === prev!.id))
          );
          return [updated, ...filtered];
        });
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
    if (user) {
      loadChats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (user && isAdmin && !rootFolder) {
      dispatch(fetchRootFolder());
    }
  }, [dispatch, user, isAdmin, rootFolder]);

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
    selectConversation(conversation); 
    // Navigate to chat page if it has a chatId, otherwise stay on home
    if (conversation.chatId) {
      router.replace(`/chat/${conversation.chatId}`);
    }
  };

  const handleNewConversation = () => {
    startNewConversation();
    setAppLoading(false);
  };

  const handleDeleteConversation = async (conversation: Conversation) => {
    if (conversation.chatId) {
      try {
        await dispatch(deleteChat(conversation.chatId)).unwrap();
      } catch (error) {
        console.error('Failed to delete chat:', error);
        toast.error('Failed to delete conversation.');
        return;
      }
    }

    const updatedConversations = conversations.filter((c) => 
      !((c.chatId && conversation.chatId && c.chatId === conversation.chatId) ||
        (!c.chatId && !conversation.chatId && c.id === conversation.id))
    );
    setConversations(updatedConversations);

    if (updatedConversations.length > 0) {
      setSelectedConversation(updatedConversations[updatedConversations.length - 1]);
      dispatch(setLastVisitedChatId(updatedConversations[updatedConversations.length - 1].chatId || null));
    } else {
      startNewConversation();
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
    startNewConversation();
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
    if (!user || !selectedConversation) return;
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

  if (!user || !selectedConversation) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Gisma Agent</title>
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
                selectedConversation={selectedConversation}
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
              conversation={selectedConversation}
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

export default Home;

export const getServerSideProps: GetServerSideProps = async () => {
  const defaultModelId =
    (process.env.DEFAULT_MODEL &&
      Object.values(OpenAIModelID).includes(
        process.env.DEFAULT_MODEL as OpenAIModelID,
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
