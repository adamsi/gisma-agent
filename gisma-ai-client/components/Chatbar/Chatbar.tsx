import { Conversation } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import { IconMessagesOff, IconPlus } from '@tabler/icons-react';
import { FC, useEffect, useState } from 'react';
import { Search } from '../Sidebar/Search';
import { ChatbarSettings } from './ChatbarSettings';
import { Conversations } from './Conversations';

interface Props {
  loading: boolean;
  conversations: Conversation[];
  lightMode: 'light' | 'dark';
  selectedConversation: Conversation;
  onNewConversation: () => void;
  onToggleLightMode: (mode: 'light' | 'dark') => void;
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversation: Conversation) => void;
  onUpdateConversation: (
    conversation: Conversation,
    data: KeyValuePair,
  ) => void;
  onClearConversations: () => void;
}

export const Chatbar: FC<Props> = ({
  loading,
  conversations,
  lightMode,
  selectedConversation,
  onNewConversation,
  onToggleLightMode,
  onSelectConversation,
  onDeleteConversation,
  onUpdateConversation,
  onClearConversations,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredConversations, setFilteredConversations] =
    useState<Conversation[]>(conversations);

  const handleUpdateConversation = (
    conversation: Conversation,
    data: KeyValuePair,
  ) => {
    onUpdateConversation(conversation, data);
    setSearchTerm('');
  };

  const handleDeleteConversation = (conversation: Conversation) => {
    onDeleteConversation(conversation);
    setSearchTerm('');
  };


  useEffect(() => {
    if (searchTerm) {
      setFilteredConversations(
        conversations.filter((conversation) => {
          const searchable =
            conversation.name.toLocaleLowerCase() +
            ' ' +
            conversation.messages.map((message) => message.content).join(' ');
          return searchable.toLowerCase().includes(searchTerm.toLowerCase());
        }),
      );
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchTerm, conversations]);

  return (
    <div
      className={`fixed top-0 bottom-0 z-50 flex h-full w-[260px] flex-none flex-col bg-[#202123] transition-all sm:relative sm:top-0 space-y-1 sm:space-y-2 p-1 sm:p-2`}
    >
      <div className="flex items-center">
        <button
          className="flex w-full flex-shrink-0 cursor-pointer select-none items-center gap-2 sm:gap-3 rounded-md border border-white/20 p-2 sm:p-3 text-[12px] sm:text-[14px] leading-normal text-white transition-colors duration-200 hover:bg-gray-500/10"
          onClick={() => {
            onNewConversation();
            setSearchTerm('');
          }}
        >
          <IconPlus size={16} />
          New chat
        </button>
      </div>

      {conversations.length > 1 && (
        <Search
          placeholder="Search conversations..."
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
        />
      )}

      <div className="flex-grow overflow-auto">
        {conversations.length > 0 ? (
          <div className="pt-1 sm:pt-2">
            <Conversations
              loading={loading}
              conversations={filteredConversations}
              selectedConversation={selectedConversation}
              onSelectConversation={onSelectConversation}
              onDeleteConversation={handleDeleteConversation}
              onUpdateConversation={handleUpdateConversation}
            />
          </div>
        ) : (
          <div className="mt-4 sm:mt-8 flex flex-col items-center gap-2 sm:gap-3 text-xs sm:text-sm leading-normal text-white opacity-50">
            <IconMessagesOff size={16} className="sm:w-[18px] sm:h-[18px]" />
            No conversations.
          </div>
        )}
      </div>

      <ChatbarSettings
        lightMode={lightMode}
        conversationsCount={conversations.length}
        onToggleLightMode={onToggleLightMode}
        onClearConversations={onClearConversations}
      />
    </div>
  );
};
