import React from 'react'
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import CollaboratorsList from './CollaboratorsList'

test('renders collaborator initials and count', () => {
  const collaborators = [{ name: 'Alice', color: '#aabbcc' }, { name: 'Bob', color: '#bbccaa' }, { name: 'Carol', color: '#ccaabb' }]
  render(<CollaboratorsList collaborators={collaborators} />)
  expect(screen.getByTitle('Alice')).toBeInTheDocument()
  expect(screen.getByTitle('Bob')).toBeInTheDocument()
  expect(screen.getByTitle('Carol')).toBeInTheDocument()
})
