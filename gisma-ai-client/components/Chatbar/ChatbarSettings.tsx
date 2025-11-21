import { IconMoon, IconSun, IconUser, IconLogout, IconUpload, IconShield } from '@tabler/icons-react';
import { FC, useState } from 'react';
import { SidebarButton } from '../Sidebar/SidebarButton';
import { ClearConversations } from './ClearConversations';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { setLastVisitedChatId } from '@/store/slices/chatMemorySlice';
import { useRouter } from 'next/router';
import { Conversation } from '@/types/chat';

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
    <div className="flex flex-col items-center space-y-2 border-t border-white/10 pt-4 text-sm">
      <div className="w-full min-h-[40px]">
        {conversationsCount > 0 && (
          <ClearConversations onClearConversations={onClearConversations} />
        )}
      </div>

      <SidebarButton
        text={lightMode === 'light' ? 'Dark mode' : 'Light mode'}
        icon={
          lightMode === 'light' ? <IconMoon size={18} /> : <IconSun size={18} />
        }
        onClick={() =>
          onToggleLightMode(lightMode === 'light' ? 'dark' : 'light')
        }
      />

      {/* Admin Upload Button - Only show for admin users */}
      {isAdmin && (
        <SidebarButton
          text="Upload Documents"
          icon={<IconUpload size={18} />}
          onClick={() => {
            // Save the current chatId before navigating to upload
            dispatch(setLastVisitedChatId(selectedConversation?.chatId || null));
            router.push('/admin/upload');
          }}
        />
      )}

      {/* User Profile Button */}
      <div className="w-full pt-4 border-t border-white/10 mt-2">
        <button
          className="flex w-full items-center gap-3 rounded-xl py-2.5 px-3 hover:bg-white/5 transition-all duration-apple active:scale-[0.98]"
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
            <IconUser size={18} />
          )}
          <div className="flex flex-col text-left">
            <span className="text-white text-sm font-medium leading-4">
              {user?.username || 'User'}
            </span>
            <span className="text-white/50 text-xs leading-3 truncate max-w-[140px]">
              {user?.username || ''}
            </span>
          </div>
        </button>

        {showProfile && (
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 shadow-xl">
            <div className="mb-3 text-xs text-white/70">
              <div className="font-semibold text-white mb-1">
                {user?.username}
              </div>
              <div className="text-white/50 break-all">{user?.username}</div>
            </div>
            <button
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-3 py-2.5 text-left text-sm font-medium text-white transition-all duration-apple hover:bg-white/10 hover:border-white/20 active:scale-[0.98]"
              onClick={async () => {
                setShowProfile(false);
                await dispatch(logout());
                router.replace('/home');
              }}
            >
              <IconLogout size={18} />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
