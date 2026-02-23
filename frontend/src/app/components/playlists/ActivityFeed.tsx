import React from 'react'
import type { Activity } from '../../../hooks/useCollaboration'

export default function ActivityFeed({ activities }:{activities:Activity[]}){
  return (
    <div className="mt-4 bg-white rounded p-3 shadow-sm">
      <h4 className="font-semibold mb-2">Activity</h4>
      <div className="space-y-2 max-h-64 overflow-auto">
        {activities.map(a => (
          <div key={a.id} className="text-sm text-gray-700">
            <span className="font-medium">{a.userName || 'someone'}</span>
            <span> {a.action} </span>
            <span className="text-gray-600">{a.track?.title}</span>
            <span className="text-xs text-gray-400 ml-2">{new Date(a.ts).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
