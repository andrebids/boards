import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import { Search } from 'lucide-react';

import styles from './ChatSearch.module.scss';

const ChatSearch = React.memo(
  forwardRef(({ placeholder, value, onChange }, ref) => (
    <label className={styles.search} htmlFor="chat-search-input">
      <Search aria-hidden="true" size={15} strokeWidth={2} />
      <input
        ref={ref}
        id="chat-search-input"
        aria-label={placeholder}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )),
);

ChatSearch.displayName = 'ChatSearch';

ChatSearch.propTypes = {
  placeholder: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default ChatSearch;
