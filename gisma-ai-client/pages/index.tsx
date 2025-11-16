import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { refreshToken, getUser } from '@/store/slices/authSlice';
import { fetchAllChats, fetchChatMessages, deleteChat, addChat } from '@/store/slices/chatMemorySlice';
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
import {
  saveConversation,
  saveConversations,
  updateConversation,
} from '@/utils/app/conversation';
import { saveChatMessages, saveLastVisitedChat } from '@/utils/app/chatStorage';
import { IconArrowBarLeft, IconArrowBarRight } from '@tabler/icons-react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { ChatService } from '@/utils/websocket/chatService';
import { WEBSOCKET_CONFIG } from '@/utils/websocket/config';
import { fetchRootFolder } from '@/store/slices/uploadSlice';

interface HomeProps {
  serverSideApiKeyIsSet: boolean;
  defaultModelId: OpenAIModelID;
}

const Home: React.FC<HomeProps> = ({
  serverSideApiKeyIsSet,
  defaultModelId,
}) => {
  const dispatch = useAppDispatch();
  const { user, isAdmin } = useAppSelector((state) => state.auth);
  const { rootFolder } = useAppSelector((state) => state.upload);
  const { chats, chatMessages, loading: chatMemoryLoading } = useAppSelector((state) => state.chatMemory);

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
    if (user) {
      dispatch(fetchAllChats());
    }
  }, [user, dispatch]);

  useEffect(() => {
    if (user && isAdmin && !rootFolder) {
      dispatch(fetchRootFolder());
    }
  }, [dispatch, user, isAdmin, rootFolder]);

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

  // FETCH MESSAGES FOR ALL CHATS ON MOUNT ---------------------------
  useEffect(() => {
    if (chats && chats.length > 0 && user) {
      chats.forEach(async (chat) => {
        if (!chatMessages[chat.chatId]) {
          await dispatch(fetchChatMessages(chat.chatId));
        }
      });
    }
  }, [chats, user, dispatch]);

  // CONVERT CHATS TO CONVERSATIONS ---------------------------
  useEffect(() => {
    if (chats && chats.length > 0) {
      setConversations((prevConversations) => {
        const chatConversations: Conversation[] = chats.map((chat) => {
          // Check if conversation already exists by chatId
          const existing = prevConversations.find(c => c.chatId === chat.chatId);
          if (existing) {
            // Update existing conversation with latest messages and description
            // Preserve existing messages if they have more content (streaming) or backend is empty
            const backendMessages: Message[] = (chatMessages[chat.chatId] || []).map((msg: ChatMessage) => ({
              role: msg.type === 'USER' ? 'user' : 'assistant',
              content: msg.content,
            }));
            // Prefer existing messages if they have more content (streaming), otherwise use backend
            // This preserves messages that were streamed in real-time, but loads from backend on mount
            // If existing messages are empty, always use backend messages
            const useExistingMessages = existing.messages.length > 0 && existing.messages.length > backendMessages.length;
            return {
              ...existing,
              name: chat.description,
              messages: useExistingMessages ? existing.messages : (backendMessages.length > 0 ? backendMessages : existing.messages),
            };
          }

          // Create new conversation from chat (only if not already in list)
          // Always use backend messages if available, they are the source of truth
          const messages: Message[] = (chatMessages[chat.chatId] || []).map((msg: ChatMessage) => ({
            role: msg.type === 'USER' ? 'user' : 'assistant',
            content: msg.content,
          }));

          return {
            id: uuidv4(),
            chatId: chat.chatId,
            name: chat.description,
            messages, // Use backend messages - they are fetched on mount
            model: OpenAIModels[defaultModelId] || OpenAIModels[fallbackModelID],
            prompt: DEFAULT_SYSTEM_PROMPT,
            folderId: null,
            responseFormat: ResponseFormat.SIMPLE,
            textDirection: 'ltr',
          };
        });

        // Keep conversations without chatId (new conversations that haven't received metadata yet)
        // Ensure new conversations always have empty messages to prevent old messages from appearing
        const conversationsWithoutChatId = prevConversations
          .filter(c => !c.chatId)
          .map(c => ({ ...c, messages: [] }));
        
        // Reverse chats so newest appears first, then merge
        const reversedChats = [...chatConversations].reverse();
        const existingChatIds = new Set(reversedChats.map(c => c.chatId));
        const uniqueNewConversations = conversationsWithoutChatId.filter(c => 
          !c.chatId || !existingChatIds.has(c.chatId)
        );
        
        // New conversations first, then reversed chats (newest first)
        return [...uniqueNewConversations, ...reversedChats];
      });
    }
  }, [chats, chatMessages, defaultModelId]);

  // RESTORE SELECTED CONVERSATION FROM LOCALSTORAGE ---------------------------
  useEffect(() => {
    if (!selectedConversation && user) {
      const savedSelected = localStorage.getItem('selectedConversation');
      if (savedSelected) {
        try {
          const parsed: Conversation = JSON.parse(savedSelected);
          
          // If it's a new conversation (no chatId), use it directly with empty messages
          // This ensures new conversations always start empty, even if saved with messages
          if (!parsed.chatId) {
            const newConversation = { ...parsed, messages: [] };
            setSelectedConversation(newConversation);
            saveConversation(newConversation);
            // Clear last visited chatId for new conversations
            saveLastVisitedChat(null);
            return;
          }
          
          // For backend chats, try to find in conversations array
          if (conversations.length > 0) {
            const found = conversations.find(c => 
              c.id === parsed.id || (parsed.chatId && c.chatId === parsed.chatId)
            );
            if (found) {
              setSelectedConversation(found);
              saveConversation(found);
              // If it's a backend chat, ensure messages are loaded
              if (found.chatId && !chatMessages[found.chatId]) {
                dispatch(fetchChatMessages(found.chatId));
              }
              return;
            }
          }
        } catch (e) {
          console.error('Failed to parse selectedConversation from localStorage:', e);
        }
      }
      
      // If no saved conversation or not found, select first conversation
      if (conversations.length > 0) {
        const firstConv = conversations[0];
        // If it's a new conversation (no chatId), ensure it has empty messages
        const conversationToSelect = firstConv.chatId 
          ? firstConv 
          : { ...firstConv, messages: [] };
        setSelectedConversation(conversationToSelect);
        saveConversation(conversationToSelect);
        // If it's a backend chat, ensure messages are loaded
        if (firstConv.chatId && !chatMessages[firstConv.chatId]) {
          dispatch(fetchChatMessages(firstConv.chatId));
        }
      }
    }
  }, [selectedConversation, user, conversations, chatMessages, dispatch]);

  // INITIALIZE NEW CONVERSATION ON MOUNT (if no conversations exist) ---------------------------
  useEffect(() => {
    if (!selectedConversation && user && conversations.length === 0 && chats.length === 0) {
      const newConversation: Conversation = {
        id: uuidv4(),
        name: 'New Conversation',
        messages: [],
        model: OpenAIModels[defaultModelId] || OpenAIModels[fallbackModelID],
        prompt: DEFAULT_SYSTEM_PROMPT,
        folderId: null,
        responseFormat: ResponseFormat.SIMPLE,
        textDirection: 'ltr',
      };
      // Don't add to sidebar until description is generated
      setSelectedConversation(newConversation);
      saveConversation(newConversation);
    }
  }, [selectedConversation, user, conversations.length, chats.length, defaultModelId]);

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

  const handleSend = async (
    message: Message,
    deleteCount = 0,
  ) => {
    if (!user || !selectedConversation) {
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
    setMessageIsStreaming(true);

    let assistantMessage: Message = { role: 'assistant', content: '' };
    let isFirstChunk = true;
    let completionTimer: any = null;
    let receivedChatId: string | undefined = updatedConversation.chatId;

    const finalizeStream = () => {
      if (completionTimer) {
        clearTimeout(completionTimer);
        completionTimer = null;
      }
      
      // Stop streaming immediately
      setMessageIsStreaming(false);
      
      setSelectedConversation((prev) => {
        if (!prev || prev.id !== updatedConversation.id) return prev;
        
        const finalConversation = {
          ...prev,
          chatId: receivedChatId,
        };
        
        setConversations((prevConvs) =>
          prevConvs.map((conv) => (conv.id === finalConversation.id ? finalConversation : conv))
        );
        saveConversation(finalConversation);
        
        // Save to localStorage per chatId
        if (receivedChatId) {
          saveChatMessages(receivedChatId, finalConversation.messages);
        }
        
        return finalConversation;
      });
      
      setAppLoading(false);
      finalizeStreamRef.current = null;
    };
    
    finalizeStreamRef.current = finalizeStream;

    try {
      const isNewConversation = !updatedConversation.chatId && updatedConversation.messages.length === 1;

      if (isNewConversation) {
        await chatService.current.startNewChat(
          message.content,
          updatedConversation.responseFormat,
          (chunk: string) => {
            if (stopConversationRef.current) {
              chatService.current.abortCurrentStream();
              finalizeStream();
              return;
            }

            if (completionTimer) clearTimeout(completionTimer);
            // Use a shorter timeout as fallback, but onComplete will be called immediately if server signals completion
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

              // Update conversations list
              setConversations((prevConvs) =>
                prevConvs.map((conv) => (conv.id === updated.id ? updated : conv))
              );

              // Save to localStorage per chatId
              if (updated.chatId) {
                saveChatMessages(updated.chatId, updated.messages);
              }

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
          (metadata) => {
            receivedChatId = metadata.chatId;
            
            // Update conversation state with generated description and add to conversations list
            setSelectedConversation((prev) => {
              if (!prev || prev.id !== updatedConversation.id) return prev;
              
              const updatedConv = {
                ...prev,
                chatId: metadata.chatId,
                name: metadata.description,
              };
              
              // Add to conversations list so messages can update it
              setConversations((prevConvs) => {
                const filtered = prevConvs.filter(c => 
                  c.id !== updatedConversation.id && c.chatId !== metadata.chatId
                );
                // Add at top - effect will handle final ordering
                return [updatedConv, ...filtered];
              });
              
              // Save last visited chatId when new conversation gets a chatId
              saveLastVisitedChat(metadata.chatId);
              
              return updatedConv;
            });
            
            // Dispatch to Redux - effect will handle final ordering
            dispatch(addChat({ chatId: metadata.chatId, description: metadata.description }));
          },
          updatedConversation.schemaJson
        );
      } else {
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
            // Use a shorter timeout as fallback, but onComplete will be called immediately if server signals completion
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

              // Update conversations list
              setConversations((prevConvs) =>
                prevConvs.map((conv) => (conv.id === updated.id ? updated : conv))
              );

              // Save to localStorage per chatId
              if (updated.chatId) {
                saveChatMessages(updated.chatId, updated.messages);
              }

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
      }
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
    setSelectedConversation(conversation);
    saveConversation(conversation);
    // Save last visited chatId
    saveLastVisitedChat(conversation.chatId || null);
    // If it's a backend chat, ensure messages are loaded
    if (conversation.chatId && !chatMessages[conversation.chatId]) {
      dispatch(fetchChatMessages(conversation.chatId));
    }
  };

  // CONVERSATION OPERATIONS  --------------------------------------------
  const handleNewConversation = () => {
    const lastConversation = conversations[conversations.length - 1];

    const newConversation: Conversation = {
      id: uuidv4(),
      name: 'New Conversation',
      messages: [], // Always empty - no chatId means new conversation
      model: lastConversation?.model || {
        id: OpenAIModels[defaultModelId].id,
        name: OpenAIModels[defaultModelId].name,
        maxLength: OpenAIModels[defaultModelId].maxLength,
        tokenLimit: OpenAIModels[defaultModelId].tokenLimit,
      },
      prompt: DEFAULT_SYSTEM_PROMPT,
      folderId: null,
      responseFormat: ResponseFormat.SIMPLE,
      textDirection: 'ltr',
    };

    // Don't add to sidebar until description is generated
    // Clear last visited chatId FIRST before setting new conversation
    // This ensures it's cleared on the first click
    saveLastVisitedChat(null);
    // Set and save immediately to prevent restore effect from overwriting
    setSelectedConversation(newConversation);
    saveConversation(newConversation);
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
    
    const updatedConversations = conversations.filter(
      (c) => c.id !== conversation.id,
    );
    setConversations(updatedConversations);
    saveConversations(updatedConversations);

    if (updatedConversations.length > 0) {
      setSelectedConversation(updatedConversations[updatedConversations.length - 1]);
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
        textDirection: 'ltr',
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

    // Save messages to localStorage if updated
    if (data.key === 'messages' && single.chatId) {
      saveChatMessages(single.chatId, single.messages);
    }
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
      textDirection: 'ltr',
    });
    localStorage.removeItem('selectedConversation');
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

      // Save to localStorage per chatId
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
      {!user ? (
        <HomePage />
      ) : (
        selectedConversation && (
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
                    selectedConversation={selectedConversation}
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
