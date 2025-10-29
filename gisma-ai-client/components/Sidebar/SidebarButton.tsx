import { FC } from 'react';

interface Props {
  text: string;
  icon: JSX.Element;
  onClick: () => void;
}

export const SidebarButton: FC<Props> = ({ text, icon, onClick }) => {
  return (
    <button
      className="flex w-full cursor-pointer select-none items-center gap-2 sm:gap-3 rounded-md py-2 sm:py-3 px-2 sm:px-3 text-[12px] sm:text-[14px] leading-3 text-white transition-colors duration-200 hover:bg-gray-500/10"
      onClick={onClick}
    >
      <div className="flex items-center">{icon}</div>
      <span>{text}</span>
    </button>
  );
};
