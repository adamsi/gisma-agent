import { Conversation } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import {
  IconCheck,
  IconMessage,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { DragEvent, FC, useState } from 'react';

interface Props {
  selectedConversation: Conversation;
  conversation: Conversation;
  loading: boolean;
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversation: Conversation) => void;
  onUpdateConversation: (
    conversation: Conversation,
    data: KeyValuePair,
  ) => void;
}

export const ConversationComponent: FC<Props> = ({
  selectedConversation,
  conversation,
  loading,
  onSelectConversation,
  onDeleteConversation,
  onUpdateConversation,
}) => {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDragStart = (
    e: DragEvent<HTMLButtonElement>,
    conversation: Conversation,
  ) => {
    if (e.dataTransfer) {
      e.dataTransfer.setData('conversation', JSON.stringify(conversation));
    }
  };

  return (
    <div className="relative flex items-center">
      <button
        className={`flex w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-sm transition-all duration-apple hover:bg-white/5 active:scale-[0.98] ${
          loading ? 'disabled:cursor-not-allowed' : ''
        } ${
          (selectedConversation.id === conversation.id || 
           (selectedConversation.chatId && conversation.chatId && 
            selectedConversation.chatId === conversation.chatId)) ? 'bg-white/10 backdrop-blur-sm border border-white/20' : ''
        }`}
        onClick={() => {
          // Update selected conversation immediately for instant UI feedback
          onSelectConversation(conversation);
          
          if (conversation.chatId) {
            router.push(`/chat/${conversation.chatId}`);
          }
        }}
        disabled={loading}
        draggable="true"
        onDragStart={(e) => handleDragStart(e, conversation)}
      >
        <IconMessage size={18} />
        <div
          className={`relative max-h-8 flex-1 overflow-hidden text-ellipsis whitespace-nowrap break-all text-left text-sm leading-4 font-medium ${
            (selectedConversation.id === conversation.id || 
             (selectedConversation.chatId && conversation.chatId && 
              selectedConversation.chatId === conversation.chatId)) ? 'pr-12 text-white' : 'text-white/80'
          }`}
        >
          {conversation.name}
        </div>
      </button>

      {isDeleting &&
        (selectedConversation.id === conversation.id || 
         (selectedConversation.chatId && conversation.chatId && 
          selectedConversation.chatId === conversation.chatId)) && (
          <div className="absolute right-1 z-10 flex gap-1 text-gray-300">
            <button
              className="min-w-[28px] h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all duration-apple active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteConversation(conversation);
                setIsDeleting(false);
              }}
            >
              <IconCheck size={18} />
            </button>
            <button
              className="min-w-[28px] h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all duration-apple active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                setIsDeleting(false);
              }}
            >
              <IconX size={18} />
            </button>
          </div>
        )}

      {(selectedConversation.id === conversation.id || 
        (selectedConversation.chatId && conversation.chatId && 
         selectedConversation.chatId === conversation.chatId)) &&
        !isDeleting && (
          <div className="absolute right-1 z-10 flex gap-1 text-gray-300">
            <button
              className="min-w-[28px] h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all duration-apple active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                setIsDeleting(true);
              }}
            >
              <IconTrash size={18} />
            </button>
          </div>
        )}
    </div>
  );
};
