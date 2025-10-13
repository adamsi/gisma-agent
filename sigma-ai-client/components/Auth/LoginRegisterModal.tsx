import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

// Import LoginRegister component
import LoginRegister from './LoginRegister';

interface LoginRegisterModalProps {
  open: boolean;
  onClose: () => void;
}

const LoginRegisterModal: React.FC<LoginRegisterModalProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(30,58,138,0.8) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: fullScreen ? 0 : '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }
        }
      }}
      sx={{
        '& .MuiDialog-paper': {
          margin: fullScreen ? 0 : '32px',
        }
      }}
    >
      <DialogContent
        sx={{
          padding: '32px',
          background: 'transparent',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(59, 130, 246, 0.5)',
            borderRadius: '4px',
            '&:hover': {
              background: 'rgba(59, 130, 246, 0.7)',
            },
          },
        }}
      >
        <LoginRegister />
      </DialogContent>
    </Dialog>
  );
};

export default LoginRegisterModal; 