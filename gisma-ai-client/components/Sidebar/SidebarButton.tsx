import { FC } from 'react';

interface Props {
  text: string;
  icon: JSX.Element;
  onClick: () => void;
}

export const SidebarButton: FC<Props> = ({ text, icon, onClick }) => {
  return (
    <button
      className="flex w-full cursor-pointer select-none items-center gap-3 rounded-xl py-2.5 px-3 text-sm font-medium text-white transition-all duration-apple hover:bg-white/5 active:scale-[0.98]"
      onClick={onClick}
    >
      <div className="flex items-center">{icon}</div>
      <span>{text}</span>
    </button>
  );
};
