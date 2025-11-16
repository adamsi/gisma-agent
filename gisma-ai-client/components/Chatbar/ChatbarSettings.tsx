import { IconMoon, IconSun, IconUser, IconLogout, IconUpload, IconShield } from '@tabler/icons-react';
import { FC, useState } from 'react';
import { SidebarButton } from '../Sidebar/SidebarButton';
import { ClearConversations } from './ClearConversations';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { useRouter } from 'next/router';
import { Conversation } from '@/types/chat';
import { saveLastVisitedChat } from '@/utils/app/chatStorage';

interface Props {
  lightMode: 'light' | 'dark';
  conversationsCount: number;
  selectedConversation?: Conversation;
  onToggleLightMode: (mode: 'light' | 'dark') => void;
  onClearConversations: () => void;
}

export const ChatbarSettings: FC<Props> = ({
  lightMode,
  conversationsCount,
  selectedConversation,
  onToggleLightMode,
  onClearConversations,
}) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, isAdmin } = useAppSelector((state) => state.auth);
  const [showProfile, setShowProfile] = useState(false);
  const avatarUrl = (user as any)?.picture || (user as any)?.image;

  return (
    <div className="flex flex-col items-center space-y-0.5 sm:space-y-1 border-t border-white/20 pt-0.5 sm:pt-1 text-xs sm:text-sm">
      {conversationsCount > 0 ? (
        <ClearConversations onClearConversations={onClearConversations} />
      ) : null}

      <SidebarButton
        text={lightMode === 'light' ? 'Dark mode' : 'Light mode'}
        icon={
          lightMode === 'light' ? <IconMoon size={16} /> : <IconSun size={16} />
        }
        onClick={() =>
          onToggleLightMode(lightMode === 'light' ? 'dark' : 'light')
        }
      />

      {/* Admin Upload Button - Only show for admin users */}
      {isAdmin && (
        <SidebarButton
          text="Upload Documents"
          icon={<IconUpload size={16} />}
          onClick={() => {
            // Save the current chatId before navigating to upload
            saveLastVisitedChat(selectedConversation?.chatId || null);
            router.push('/admin/upload');
          }}
        />
      )}

      {/* User Profile Button */}
      <div className="w-full pt-1 sm:pt-2 border-t border-white/20 mt-0.5 sm:mt-1">
        <button
          className="flex w-full items-center gap-2 sm:gap-3 rounded-lg py-1.5 sm:py-2 px-2 sm:px-3 hover:bg-gray-500/10"
          onClick={() => setShowProfile((v) => !v)}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="User avatar"
              className="h-5 w-5 sm:h-6 sm:w-6 rounded-full object-cover"
            />
          ) : (
            <IconUser size={16} />
          )}
          <div className="flex flex-col text-left">
            <span className="text-white text-[11px] sm:text-[12.5px] leading-3 sm:leading-4">
              {user?.username || 'User'}
            </span>
            <span className="text-neutral-400 text-[10px] sm:text-[11px] leading-2 sm:leading-3 truncate max-w-[140px]">
              {user?.username || ''}
            </span>
          </div>
        </button>

        {showProfile && (
          <div className="mt-1.5 sm:mt-2 rounded-lg border border-white/20 bg-[#161718] p-2 sm:p-3">
            <div className="mb-1.5 sm:mb-2 text-[10px] sm:text-xs text-neutral-300">
              <div className="font-semibold text-white">
                {user?.username}
              </div>
              <div className="text-neutral-400 break-all">{user?.username}</div>
            </div>
            <button
              className="flex w-full items-center gap-2 rounded-md border border-white/20 px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs sm:text-sm text-white hover:bg-gray-500/10"
              onClick={() => {
                setShowProfile(false);
                dispatch(logout());
              }}
            >
              <IconLogout size={16} />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
