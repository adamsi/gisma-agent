import { IconX } from '@tabler/icons-react';
import { FC } from 'react';

interface Props {
  placeholder: string;
  searchTerm: string;
  onSearch: (searchTerm: string) => void;
}

export const Search: FC<Props> = ({ placeholder, searchTerm, onSearch }) => {

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value);
  };

  const clearSearch = () => {
    onSearch('');
  };

  return (
    <div className="relative flex items-center">
      <input
        className="w-full flex-1 rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm px-4 py-3 pr-10 text-sm text-white placeholder:text-white/40 transition-all duration-apple focus:border-white/30 focus:bg-white/10 focus:outline-none"
        type="text"
        placeholder={placeholder || ''}
        value={searchTerm}
        onChange={handleSearchChange}
      />

      {searchTerm && (
        <IconX
          className="absolute right-4 cursor-pointer text-white/50 hover:text-white transition-colors duration-apple"
          size={18}
          onClick={clearSearch}
        />
      )}
    </div>
  );
};
