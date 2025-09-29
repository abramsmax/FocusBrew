import React from 'react'

export default function FooterCredits() {
  return (
    <footer id="app-footer" style={styles.wrapper}>
      <span>
        © 2025 <strong>Maximilian Abrams</strong> ·{' '}
        <a
          href="https://github.com/abramsmax/FocusBrew"
          target="_blank"
          rel="noreferrer"
          style={{ color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}
        >
          GitHub
        </a>
      </span>
    </footer>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    justifyContent: 'center',
    fontSize: 12,
    color: 'var(--autumn-brown)',
    padding: '8px 12px',
  },
}
