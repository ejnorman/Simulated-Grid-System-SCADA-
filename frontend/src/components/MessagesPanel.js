import { Paper, Typography, Divider, Box, Chip, IconButton } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CloseIcon from '@mui/icons-material/Close';

const CATEGORY_STYLE = {
  Scenario: { bg: '#4a2c00', color: '#ffa726' },
  Control:  { bg: '#0d2a4a', color: '#42a5f5' },
  Error:    { bg: '#3a0000', color: '#f44336' },
};

export default function MessagesPanel({ messages = [], onDismiss }) {
  return (
    <Paper sx={{ p: { xs: 1, md: 2 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ChatBubbleOutlineIcon fontSize="small" sx={{ color: '#42a5f5' }} />
          <Typography variant="h6">Messages</Typography>
        </Box>
        <Chip
          label={messages.length}
          size="small"
          sx={{
            bgcolor: messages.length > 0 ? '#1565c0' : '#333',
            color:   messages.length > 0 ? '#90caf9' : '#aaa',
            fontWeight: 700,
          }}
        />
      </Box>
      <Divider sx={{ my: 1, borderColor: '#2a2a2a' }} />

      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {messages.length === 0 ? (
          <Typography color="text.secondary" variant="body2" sx={{ py: 1 }}>
            No messages
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {messages.map(msg => {
              const style = CATEGORY_STYLE[msg.category] ?? CATEGORY_STYLE.Control;
              return (
                <Box
                  key={msg.id}
                  sx={{
                    display: 'flex', alignItems: 'flex-start', gap: 1,
                    borderLeft: `3px solid ${style.color}`,
                    pl: 1, py: 0.5,
                  }}
                >
                  <Chip
                    label={msg.category}
                    size="small"
                    sx={{
                      bgcolor: style.bg,
                      color: style.color,
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      flexShrink: 0,
                    }}
                  />
                  <Typography variant="body2" sx={{ flexGrow: 1, fontSize: '0.9rem', lineHeight: 1.4 }}>
                    {msg.text}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => onDismiss?.(msg.id)}
                    sx={{ color: '#555', '&:hover': { color: '#ccc' }, p: 0.25, flexShrink: 0 }}
                  >
                    <CloseIcon sx={{ fontSize: '0.9rem' }} />
                  </IconButton>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Paper>
  );
}
