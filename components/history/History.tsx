import React from 'react';
import { useLogStore, ConversationTurn } from '@/lib/state';
import HistoryItem from './HistoryItem';
import './History.css';

const groupTurns = (turns: ConversationTurn[]) => {
  const grouped: { user: ConversationTurn; agent?: ConversationTurn }[] = [];
  let currentGroup: { user: ConversationTurn; agent?: ConversationTurn } | null = null;

  turns.forEach(turn => {
    if (turn.role === 'user') {
      if (currentGroup) {
        grouped.push(currentGroup);
      }
      currentGroup = { user: turn };
    } else if (turn.role === 'agent' && currentGroup && !currentGroup.agent) {
      // Only pair if the agent turn follows a user turn
      if (turn.text.trim() !== '') {
          currentGroup.agent = turn;
      }
    } else if (turn.role === 'system') {
        // ignore system messages in history
    }
  });

  if (currentGroup) {
    grouped.push(currentGroup);
  }

  // filter out pairs where agent turn is empty or just whitespace
  return grouped.filter(g => g.agent && g.agent.text.trim() !== '').reverse();
};


const History: React.FC = () => {
  const { turns, clearTurns } = useLogStore();
  const groupedTurns = groupTurns(turns.filter(t => t.isFinal));

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear the entire translation history? This action cannot be undone.')) {
      clearTurns();
    }
  };

  return (
    <div className="history-container">
      <div className="history-header">
        <h4 className="sidebar-section-title">Translation History</h4>
        <button
          onClick={handleClearHistory}
          className="clear-history-button"
          disabled={groupedTurns.length === 0}
          title="Clear history"
        >
          <span className="icon">delete_sweep</span>
        </button>
      </div>
      <div className="history-list">
        {groupedTurns.length > 0 ? (
          groupedTurns.map((group, index) => (
            <HistoryItem
              key={`${group.user.timestamp.toISOString()}-${index}`}
              userTurn={group.user}
              agentTurn={group.agent}
            />
          ))
        ) : (
          <p className="empty-history-message">No translations yet. Start a conversation to see your history.</p>
        )}
      </div>
    </div>
  );
};

export default History;
