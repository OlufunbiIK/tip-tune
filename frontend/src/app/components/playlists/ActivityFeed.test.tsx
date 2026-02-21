import React from 'react'
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import ActivityFeed from './ActivityFeed'

test('renders activity items', () => {
  const activities = [
    { id: '1', userId: 'u1', userName: 'Alice', action: 'added', track: { id: 't1', title: 'Song A' }, ts: Date.now() },
    { id: '2', userId: 'u2', userName: 'Bob', action: 'removed', track: { id: 't2', title: 'Song B' }, ts: Date.now() }
  ]
  render(<ActivityFeed activities={activities as any} />)
  expect(screen.getByText(/Alice/)).toBeInTheDocument()
  expect(screen.getByText(/Song A/)).toBeInTheDocument()
  expect(screen.getByText(/Bob/)).toBeInTheDocument()
})
