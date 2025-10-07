import React from 'react';
import { ConversationTurn } from '@/lib/state';
import './History.css';

interface HistoryItemProps {
  userTurn: ConversationTurn;
  agentTurn?: ConversationTurn;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ userTurn, agentTurn }) => {
  return (
    <div className="history-item">
      <p className="history-text transcribed-text">{userTurn.text}</p>
      {agentTurn && <p className="history-text translated-text">{agentTurn.text}</p>}
    </div>
  );
};

export default HistoryItem;
