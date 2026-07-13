import React from 'react';
import PropTypes from 'prop-types';
import { Search } from 'lucide-react';

import styles from './ChatSearch.module.scss';

const ChatSearch = React.memo(({ placeholder, value, onChange }) => (
  <label className={styles.search} htmlFor="chat-search-input">
    <Search aria-hidden="true" size={16} strokeWidth={2} />
    <input
      id="chat-search-input"
      aria-label={placeholder}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  </label>
));

ChatSearch.propTypes = {
  placeholder: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default ChatSearch;
