/** @type {import('tailwindcss').Config} */
const base = require('../../tailwind.config.base.js');

// Shop shell tokens (#509) live only in the client app so apps/admin is unchanged.
const ar = (name) => `rgb(var(--ar-${name}) / <alpha-value>)`;

module.exports = {
  ...base,
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    ...base.theme,
    extend: {
      ...base.theme.extend,
      colors: {
        ...base.theme.extend.colors,
        ar: {
          page: ar('page'),
          surface: ar('surface'),
          'surface-muted': ar('surface-muted'),
          subtle: ar('subtle'),
          line: ar('line'),
          'line-soft': ar('line-soft'),
          'line-strong': ar('line-strong'),
          ink: ar('ink'),
          'ink-2': ar('ink-2'),
          muted: ar('muted'),
          faint: ar('faint'),
          primary: ar('primary'),
          'primary-ink': ar('primary-ink'),
          'primary-soft': ar('primary-soft'),
          'on-primary': ar('on-primary'),
          danger: ar('danger'),
          'danger-soft': ar('danger-soft'),
          unread: ar('unread'),
          reserved: ar('reserved'),
          'reserved-bg': ar('reserved-bg'),
          renting: ar('renting'),
          'renting-bg': ar('renting-bg'),
          done: ar('done'),
          'done-bg': ar('done-bg'),
          cancelled: ar('cancelled'),
          'cancelled-bg': ar('cancelled-bg'),
          late: ar('late'),
          'late-bg': ar('late-bg'),
          unprepared: ar('unprepared'),
          'unprepared-bg': ar('unprepared-bg'),
        },
      },
      boxShadow: {
        ...(base.theme.extend.boxShadow || {}),
        ar: 'var(--ar-shadow)',
      },
    },
  },
};
