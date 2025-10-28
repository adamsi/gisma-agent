import { Conversation, Message } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import { OpenAIModel } from '@/types/openai';
import {
  IconAdjustments,
  IconPlayerStop,
  IconRepeat,
  IconSend,
} from '@tabler/icons-react';
import {
  FC,
  KeyboardEvent,
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AdvancedSettings } from '../Chatbar/AdvancedSettings';

interface Props {
  messageIsStreaming: boolean;
  model: OpenAIModel;
  conversationIsEmpty: boolean;
  conversation: Conversation;
  onUpdateConversation: (conversation: Conversation, data: KeyValuePair) => void;
  onSend: (message: Message) => void;
  onRegenerate: () => void;
  stopConversationRef: MutableRefObject<boolean>;
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
}

export const ChatInput: FC<Props> = ({
  messageIsStreaming,
  model,
  conversationIsEmpty,
  conversation,
  onUpdateConversation,
  onSend,
  onRegenerate,
  stopConversationRef,
  textareaRef,
}) => {

  const [content, setContent] = useState<string>();
  const [isTyping, setIsTyping] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const maxLength = model.maxLength;

    if (value.length > maxLength) {
      alert(
        `Message limit is ${maxLength} characters. You have entered ${value.length} characters.`
      );
      return;
    }

    setContent(value);
  };

  const handleSend = () => {
    if (messageIsStreaming) {
      return;
    }

    if (!content) {
      alert('Please enter a message');
      return;
    }

    onSend({ role: 'user', content });
    setContent('');

    if (window.innerWidth < 640 && textareaRef && textareaRef.current) {
      textareaRef.current.blur();
    }
  };

  const handleStopConversation = () => {
    stopConversationRef.current = true;
    setTimeout(() => {
      stopConversationRef.current = false;
    }, 1000);
  };

  const isMobile = () => {
    const userAgent =
      typeof window.navigator === 'undefined' ? '' : navigator.userAgent;
    const mobileRegex =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
    return mobileRegex.test(userAgent);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !isTyping && !isMobile() && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      const cursorPosition = e.currentTarget?.selectionStart || 0;
      
      setContent((prevContent) => {
        const updatedContent = prevContent || '';
        const textBeforeCursor = updatedContent.substring(0, cursorPosition);
        const textAfterCursor = updatedContent.substring(cursorPosition);
        return textBeforeCursor + '\n' + textAfterCursor;
      });

      // Set cursor position after the content update
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPosition = cursorPosition + 1;
          textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        }
      }, 0);
    }
  };

  useEffect(() => {
    if (textareaRef && textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current?.scrollHeight}px`;
    }
  }, [content]);

  return (
    <div className="absolute bottom-0 left-0 w-full border-transparent bg-gradient-to-b from-transparent via-white to-white pt-2 pb-safe dark:border-white/20 dark:via-[#343541] dark:to-[#343541] sm:pt-6 md:pt-2 md:pb-0">
      <div className="stretch mx-2 mt-2 flex flex-row gap-2 last:mb-1 sm:mt-4 sm:gap-3 sm:last:mb-2 md:mx-4 md:mt-[52px] md:last:mb-6 lg:mx-auto lg:max-w-3xl">
        {messageIsStreaming && (
          <button
            className="absolute top-0 left-0 right-0 mx-auto mb-3 flex w-fit items-center gap-3 rounded border border-neutral-200 bg-white py-2 px-4 text-black hover:opacity-50 dark:border-neutral-600 dark:bg-[#343541] dark:text-white md:mb-0 md:mt-2"
            onClick={handleStopConversation}
          >
            <IconPlayerStop size={16} /> Stop Generating
          </button>
        )}

        <div className="relative flex w-full flex-grow flex-row gap-2 sm:mx-4">
          <AdvancedSettings
            conversation={conversation}
            onUpdateConversation={onUpdateConversation}
            compact={true}
          />

          <div className="relative flex w-full flex-grow flex-col rounded-md border border-black/10 bg-white shadow-[0_0_10px_rgba(0,0,0,0.10)] dark:border-gray-900/50 dark:bg-[#40414F] dark:text-white dark:shadow-[0_0_15px_rgba(0,0,0,0.10)]">

            <textarea
              ref={textareaRef}
              className="m-0 w-full resize-none border-0 bg-transparent p-0 py-2 pr-8 pl-2 text-black dark:bg-transparent dark:text-white md:py-3 md:pl-2"
              style={{
                resize: 'none',
                bottom: `${textareaRef?.current?.scrollHeight}px`,
                maxHeight: '400px',
                overflow: `${
                  textareaRef.current && textareaRef.current.scrollHeight > 400
                    ? 'auto'
                    : 'hidden'
                }`,
              }}
              placeholder={
                'Type a message...'
              }
              value={content}
              rows={1}
              onCompositionStart={() => setIsTyping(true)}
              onCompositionEnd={() => setIsTyping(false)}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
            />

            <button
              className="absolute right-2 top-2 rounded-sm p-1 text-neutral-800 opacity-60 hover:bg-neutral-200 hover:text-neutral-900 dark:bg-opacity-50 dark:text-neutral-100 dark:hover:text-neutral-200"
              onClick={handleSend}
            >
              {messageIsStreaming ? (
                <div className="h-4 w-4 animate-spin rounded-full border-t-2 border-neutral-800 opacity-60 dark:border-neutral-100"></div>
              ) : (
                <IconSend size={18} />
              )}
            </button>
          </div>
        </div>
      </div>
      <div className="px-3 pt-1 pb-2 text-center text-[10px] text-black/50 dark:text-white/50 sm:pt-2 sm:pb-3 sm:text-[12px] md:px-4 md:pt-3 md:pb-6">
        <a
          href="https://docs.spring.io/spring-ai/reference/api/retrieval-augmented-generation.html"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Gisma Agent
        </a>
        .{' '}
        Gisma Agent is an advanced AI assistant.
      </div>
    </div>
  );
};
