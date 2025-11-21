import { Conversation, Message } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import { ErrorMessage } from '@/types/error';
import { throttle } from '@/utils';
import { IconArrowDown } from '@tabler/icons-react';
import {
  FC,
  MutableRefObject,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ChatInput } from './ChatInput';
import { ChatLoader } from './ChatLoader';
import { ChatMessage } from './ChatMessage';
import { ErrorMessageDiv } from './ErrorMessageDiv';

interface Props {
  conversation: Conversation;
  messageIsStreaming: boolean;
  modelError: ErrorMessage | null;
  loading: boolean;
  onSend: (
    message: Message,
    deleteCount: number,
  ) => void;
  onUpdateConversation: (
    conversation: Conversation,
    data: KeyValuePair,
  ) => void;
  onEditMessage: (message: Message, messageIndex: number) => void;
  stopConversationRef: MutableRefObject<boolean>;
  onStop: () => void;
}

export const Chat: FC<Props> = memo(
  ({
    conversation,
    messageIsStreaming,
    modelError,
    loading,
    onSend,
    onUpdateConversation,
    onEditMessage,
    stopConversationRef,
    onStop,
  }) => {
    const [currentMessage, setCurrentMessage] = useState<Message>();
    const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
    const [showScrollDownButton, setShowScrollDownButton] =
      useState<boolean>(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = useCallback(() => {
      if (autoScrollEnabled) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        textareaRef.current?.focus();
      }
    }, [autoScrollEnabled]);

    const handleScroll = () => {
      if (chatContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } =
          chatContainerRef.current;
        const bottomTolerance = 30;

        if (scrollTop + clientHeight < scrollHeight - bottomTolerance) {
          setAutoScrollEnabled(false);
          setShowScrollDownButton(true);
        } else {
          setAutoScrollEnabled(true);
          setShowScrollDownButton(false);
        }
      }
    };

    const handleScrollDown = () => {
      chatContainerRef.current?.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    };

    const scrollDown = () => {
      if (autoScrollEnabled) {
        messagesEndRef.current?.scrollIntoView(true);
      }
    };
    const throttledScrollDown = throttle(scrollDown, 250);

    useEffect(() => {
      throttledScrollDown();
      setCurrentMessage(
        conversation.messages[conversation.messages.length - 2],
      );
    }, [conversation.messages, throttledScrollDown]);

    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          setAutoScrollEnabled(entry.isIntersecting);
          if (entry.isIntersecting) {
            textareaRef.current?.focus();
          }
        },
        {
          root: null,
          threshold: 0.5,
        },
      );
      const messagesEndElement = messagesEndRef.current;
      if (messagesEndElement) {
        observer.observe(messagesEndElement);
      }
      return () => {
        if (messagesEndElement) {
          observer.unobserve(messagesEndElement);
        }
      };
    }, [messagesEndRef]);

    return (
      <div className="relative flex-1 overflow-hidden bg-transparent">
        {modelError ? (
          <ErrorMessageDiv error={modelError} />
        ) : (
          <>
            <div
              className="max-h-full overflow-x-hidden"
              ref={chatContainerRef}
              onScroll={handleScroll}
            >
              {conversation.messages.length === 0 ? (
                <>
                  <div className="mx-auto flex w-[350px] flex-col space-y-10 pt-12 sm:w-[600px]">
                    <div className="text-center text-3xl font-semibold text-gray-800 dark:text-gray-100">
                      {conversation.chatId ? (
                        // If we have a chatId but no messages, we're loading - show empty
                        ''
                      ) : (
                        'Gisma Agent'
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-center border border-b-neutral-300 bg-neutral-100/50 py-2 text-sm text-neutral-500 dark:border-none dark:bg-[#444654]/50 dark:text-neutral-200">
                    Model: GPT-4.1
                  </div>

                  {conversation.messages.map((message, index) => (
                    <ChatMessage
                      key={index}
                      message={message}
                      messageIndex={index}
                      conversation={conversation}
                      onEditMessage={onEditMessage}
                      isLastMessage={index === conversation.messages.length - 1}
                      onRegenerate={() => {
                        if (currentMessage) {
                          onSend(currentMessage, 2);
                        }
                      }}
                    />
                  ))}

                  {messageIsStreaming && conversation.messages.length > 0 && conversation.messages[conversation.messages.length - 1].role !== 'assistant' && <ChatLoader /> }

                  <div
                    className="h-[120px] sm:h-[162px] bg-transparent"
                    ref={messagesEndRef}
                  />
                </>
              )}
            </div>

            <ChatInput
              stopConversationRef={stopConversationRef}
              onStop={onStop}
              textareaRef={textareaRef}
              messageIsStreaming={messageIsStreaming}
              conversationIsEmpty={conversation.messages.length === 0}
              conversation={conversation}
              onUpdateConversation={onUpdateConversation}
              onSend={(message) => {
                setCurrentMessage(message);
                onSend(message, 0);
              }}
              onRegenerate={() => {
                if (currentMessage) {
                  onSend(currentMessage, 2);
                }
              }}
            />
          </>
        )}
        {showScrollDownButton && (
          <div className="absolute bottom-0 right-0 mb-4 mr-4 pb-20">
            <button
              className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-300 text-gray-800 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-neutral-200"
              onClick={handleScrollDown}
            >
              <IconArrowDown size={18} />
            </button>
          </div>
        )}
      </div>
    );
  },
);
Chat.displayName = 'Chat';
