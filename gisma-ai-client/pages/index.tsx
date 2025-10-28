import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { refreshToken, getUser } from '@/store/slices/authSlice';
import { showToast } from '@/store/slices/toastSlice';
import { Chat } from '@/components/Chat/Chat';
import { Chatbar } from '@/components/Chatbar/Chatbar';
import { Navbar } from '@/components/Mobile/Navbar';
import HomePage from '@/components/HomePage/HomePage';
import LoadingSpinner from '@/components/Global/LoadingSpinner';
import { ChatBody, Conversation, Message } from '@/types/chat';
import { ResponseFormat } from '@/types/responseFormat';
import { KeyValuePair } from '@/types/data';
import { ErrorMessage } from '@/types/error';
import { Folder, FolderType } from '@/types/folder';
import {
  OpenAIModel,
  OpenAIModelID,
  OpenAIModels,
  fallbackModelID,
} from '@/types/openai';
import {
  cleanConversationHistory,
  cleanSelectedConversation,
} from '@/utils/app/clean';
import { DEFAULT_SYSTEM_PROMPT } from '@/utils/app/const';
import {
  saveConversation,
  saveConversations,
  updateConversation,
} from '@/utils/app/conversation';
import { saveFolders } from '@/utils/app/folders';
import { IconArrowBarLeft, IconArrowBarRight } from '@tabler/icons-react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRef, useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { ChatService } from '@/utils/websocket/chatService';
import { WEBSOCKET_CONFIG } from '@/utils/websocket/config';

interface HomeProps {
  serverSideApiKeyIsSet: boolean;
  defaultModelId: OpenAIModelID;
}

const Home: React.FC<HomeProps> = ({
  serverSideApiKeyIsSet,
  defaultModelId,
}) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);

  // STATE ----------------------------------------------
  const [appLoading, setAppLoading] = useState<boolean>(false);
  const [lightMode, setLightMode] = useState<'dark' | 'light'>('dark');
  const [messageIsStreaming, setMessageIsStreaming] = useState<boolean>(false);
  const [modelError, setModelError] = useState<ErrorMessage | null>(null);
  const [models, setModels] = useState<OpenAIModel[]>([
    OpenAIModels[defaultModelId] || OpenAIModels[fallbackModelID],
  ]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation>();
  const [currentMessage, setCurrentMessage] = useState<Message>();
  const [showSidebar, setShowSidebar] = useState<boolean>(true);

  // REFS ----------------------------------------------
  const stopConversationRef = useRef<boolean>(false);
  
  // WEBSOCKET SERVICE ----------------------------------------------
  const chatService = useRef<ChatService>(new ChatService(WEBSOCKET_CONFIG.SERVER_URL));

  // AUTHENTICATION EFFECT ----------------------------------------------
  useEffect(() => {
    const initializeAuth = async () => {
        // Only refresh token, getUser will be called separately if needed
        await dispatch(refreshToken());
       };

    // Only run once on mount
    initializeAuth();

    // Set up interval to refresh token every 10 minutes
    const refreshInterval = setInterval(() => {
      dispatch(refreshToken());
    }, 1000 * 60 * 10); // 10 minutes

    // Cleanup interval on unmount
    return () => clearInterval(refreshInterval);
  }, [dispatch]); // Add dispatch to dependency array

  // UPDATE CHATSERVICE AUTHENTICATION STATE ---------------------------
  useEffect(() => {
    // Update ChatService authentication state when user state changes
    chatService.current.setAuthenticated(!!user);
  }, [user]);

  // WEBSOCKET CLEANUP EFFECT ----------------------------------------------
  useEffect(() => {
    // Listen for logout event to disconnect WebSocket
    const handleLogout = () => {
      chatService.current.disconnect();
    };

    window.addEventListener('websocket-disconnect', handleLogout);

    return () => {
      // Cleanup WebSocket connection on unmount
      chatService.current.disconnect();
      window.removeEventListener('websocket-disconnect', handleLogout);
    };
  }, []);


  // Note: Avoid early returns that change hook order. Render conditionally in JSX below.

  // WEBSOCKET RESPONSE ----------------------------------------------
  const handleSend = async (
    message: Message,
    deleteCount = 0,
  ) => {
    // Only send messages if user is signed in
    if (!user) {
      console.warn('Cannot send message: User not signed in');
      return;
    }

    if (selectedConversation) {
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
      setAppLoading(true);
      setMessageIsStreaming(true);

      // Set conversation name if it's the first message
      if (updatedConversation.messages.length === 1) {
        const { content } = message;
        const customName =
          content.length > 30 ? content.substring(0, 30) + '...' : content;

        updatedConversation = {
          ...updatedConversation,
          name: customName,
        };
      }

      setAppLoading(false);

      let assistantMessage: Message = { role: 'assistant', content: '' };
      let isFirstChunk = true;
      let completionTimer: any = null;

      const finalizeStream = () => {
        if (completionTimer) {
          clearTimeout(completionTimer);
          completionTimer = null;
        }
        saveConversation(updatedConversation);
        const updatedConversations: Conversation[] = conversations.map(
          (conversation) => {
            if (conversation.id === selectedConversation.id) {
              return updatedConversation;
            }
            return conversation;
          },
        );
        if (updatedConversations.length === 0) {
          updatedConversations.push(updatedConversation);
        }
        setConversations(updatedConversations);
        saveConversations(updatedConversations);
        setMessageIsStreaming(false);
      };

      try {
        await chatService.current.sendMessage(
          message.content,
          updatedConversation.responseFormat,
          updatedConversation.schemaJson,
          (chunk: string) => {
            // Debug: Log each chunk to see what's being received
            console.log('Received chunk:', JSON.stringify(chunk));
      
            if (stopConversationRef.current) {
              chatService.current.abortCurrentStream();
              finalizeStream();
              return;
            }

            if (completionTimer) clearTimeout(completionTimer);
            completionTimer = setTimeout(() => {
              finalizeStream();
            }, 800);

            if (isFirstChunk) {
              isFirstChunk = false;
              assistantMessage = { role: 'assistant', content: chunk };
              const updatedMessages: Message[] = [
                ...updatedConversation.messages,
                assistantMessage,
              ];

              updatedConversation = {
                ...updatedConversation,
                messages: updatedMessages,
              };
            } else {
              assistantMessage.content += chunk;
              const updatedMessages: Message[] = updatedConversation.messages.map(
                (msg, index) => {
                  if (index === updatedConversation.messages.length - 1) {
                    return assistantMessage;
                  }
                  return msg;
                },
              );

              updatedConversation = {
                ...updatedConversation,
                messages: updatedMessages,
              };
            }

            setSelectedConversation(updatedConversation);
          },
          () => {
            // On complete from server
            finalizeStream();
          },
          (error: string) => {
            // On error
            console.error('WebSocket error:', error);
            toast.error('Connection error. Please try again.');
            setAppLoading(false);
            setMessageIsStreaming(false);
          }
        );
      } catch (error) {
        console.error('Failed to send message:', error);
        toast.error('Failed to send message. Please try again.');
        setAppLoading(false);
        setMessageIsStreaming(false);
      }
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
    setSelectedConversation(conversation);
    saveConversation(conversation);
  };

  // FOLDER OPERATIONS  --------------------------------------------
  const handleCreateFolder = (name: string, type: FolderType) => {
    const newFolder: Folder = {
      id: uuidv4(),
      name,
      type,
    };

    const updatedFolders = [...folders, newFolder];
    setFolders(updatedFolders);
    saveFolders(updatedFolders);
  };

  const handleDeleteFolder = (folderId: string) => {
    const updatedFolders = folders.filter((f) => f.id !== folderId);
    setFolders(updatedFolders);
    saveFolders(updatedFolders);

    const updatedConversations: Conversation[] = conversations.map((c) => {
      if (c.folderId === folderId) {
        return {
          ...c,
          folderId: null,
        };
      }

      return c;
    });
    setConversations(updatedConversations);
    saveConversations(updatedConversations);
  };

  const handleUpdateFolder = (folderId: string, name: string) => {
    const updatedFolders = folders.map((f) => {
      if (f.id === folderId) {
        return {
          ...f,
          name,
        };
      }

      return f;
    });

    setFolders(updatedFolders);
    saveFolders(updatedFolders);
  };

  // CONVERSATION OPERATIONS  --------------------------------------------
  const handleNewConversation = () => {
    const lastConversation = conversations[conversations.length - 1];

    const newConversation: Conversation = {
      id: uuidv4(),
      name: `New Conversation`,
      messages: [],
      model: lastConversation?.model || {
        id: OpenAIModels[defaultModelId].id,
        name: OpenAIModels[defaultModelId].name,
        maxLength: OpenAIModels[defaultModelId].maxLength,
        tokenLimit: OpenAIModels[defaultModelId].tokenLimit,
      },
      prompt: DEFAULT_SYSTEM_PROMPT,
      folderId: null,
      responseFormat: ResponseFormat.SIMPLE,
    };

    const updatedConversations = [...conversations, newConversation];

    setSelectedConversation(newConversation);
    setConversations(updatedConversations);

    saveConversation(newConversation);
    saveConversations(updatedConversations);

    setAppLoading(false);
  };

  const handleDeleteConversation = (conversation: Conversation) => {
    const updatedConversations = conversations.filter(
      (c) => c.id !== conversation.id,
    );
    setConversations(updatedConversations);
    saveConversations(updatedConversations);

    if (updatedConversations.length > 0) {
      setSelectedConversation(
        updatedConversations[updatedConversations.length - 1],
      );
      saveConversation(updatedConversations[updatedConversations.length - 1]);
    } else {
      setSelectedConversation({
        id: uuidv4(),
        name: 'New conversation',
        messages: [],
        model: OpenAIModels[defaultModelId],
        prompt: DEFAULT_SYSTEM_PROMPT,
        folderId: null,
        responseFormat: ResponseFormat.SIMPLE,
      });
      localStorage.removeItem('selectedConversation');
    }
  };

  const handleUpdateConversation = (
    conversation: Conversation,
    data: KeyValuePair,
  ) => {
    const updatedConversation = {
      ...conversation,
      [data.key]: data.value,
    };

    const { single, all } = updateConversation(
      updatedConversation,
      conversations,
    );

    setSelectedConversation(single);
    setConversations(all);
  };

  const handleClearConversations = () => {
    setConversations([]);
    localStorage.removeItem('conversationHistory');

    setSelectedConversation({
      id: uuidv4(),
      name: 'New conversation',
      messages: [],
      model: OpenAIModels[defaultModelId],
      prompt: DEFAULT_SYSTEM_PROMPT,
      folderId: null,
      responseFormat: ResponseFormat.SIMPLE,
    });
    localStorage.removeItem('selectedConversation');

    const updatedFolders = folders.filter((f) => f.type !== 'chat');
    setFolders(updatedFolders);
    saveFolders(updatedFolders);
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
        conversations,
      );

      setSelectedConversation(single);
      setConversations(all);

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

    const folders = localStorage.getItem('folders');
    if (folders) {
      setFolders(JSON.parse(folders));
    }

    const conversationHistory = localStorage.getItem('conversationHistory');
    if (conversationHistory) {
      const parsedConversationHistory: Conversation[] =
        JSON.parse(conversationHistory);
      const cleanedConversationHistory = cleanConversationHistory(
        parsedConversationHistory,
      );
      setConversations(cleanedConversationHistory);
    }

    const savedSelectedConversation = localStorage.getItem('selectedConversation');
    if (savedSelectedConversation) {
      const parsedSelectedConversation: Conversation =
        JSON.parse(savedSelectedConversation);
      const cleanedSelectedConversation = cleanSelectedConversation(
        parsedSelectedConversation,
      );
      setSelectedConversation(cleanedSelectedConversation);
    } else {
      setSelectedConversation({
        id: uuidv4(),
        name: 'New conversation',
        messages: [],
        model: OpenAIModels[defaultModelId] || OpenAIModels[fallbackModelID],
        prompt: DEFAULT_SYSTEM_PROMPT,
        folderId: null,
        responseFormat: ResponseFormat.SIMPLE,
      });
    }
  }, [serverSideApiKeyIsSet]);

  return (
    <>
      <Head>
        <title>Gisma Agent</title>
        <meta name="description" content="AI assistant with legal knowledge base." />
        <meta
          name="viewport"
          content="height=device-height ,width=device-width, initial-scale=1, user-scalable=no"
        />
        <link rel="icon" type="image/png" href="/sa-logo.png" />
        <link rel="shortcut icon" type="image/png" href="/sa-logo.png" />
        <link rel="apple-touch-icon" href="/sa-logo.png" />
      </Head>
      {!user ? (
        <HomePage />
      ) : (
        selectedConversation && (
          <main
            className={`flex h-screen w-screen flex-col text-sm text-white dark:text-white ${lightMode}`}
          >
            <div className="fixed top-0 w-full sm:hidden">
              <Navbar
                selectedConversation={selectedConversation}
                onNewConversation={handleNewConversation}
              />
            </div>

            <div className="flex h-full w-full pt-[48px] sm:pt-0">
              {showSidebar ? (
                <div>
                  <Chatbar
                    loading={appLoading}
                    conversations={conversations}
                    lightMode={lightMode}
                    selectedConversation={selectedConversation}
                    folders={folders.filter((folder) => folder.type === 'chat')}
                    onCreateFolder={(name) => handleCreateFolder(name, 'chat')}
                    onDeleteFolder={handleDeleteFolder}
                    onUpdateFolder={handleUpdateFolder}
                    onNewConversation={handleNewConversation}
                    onToggleLightMode={handleLightMode}
                    onSelectConversation={handleSelectConversation}
                    onDeleteConversation={handleDeleteConversation}
                    onUpdateConversation={handleUpdateConversation}
                    onClearConversations={handleClearConversations}
                  />

                  <button
                    className="fixed top-5 left-[270px] z-50 h-7 w-7 hover:text-gray-400 dark:text-white dark:hover:text-gray-300 sm:top-0.5 sm:left-[270px] sm:h-8 sm:w-8 sm:text-neutral-700"
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
                />
              </div>
            </div>
          </main>
        )
      )}
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
