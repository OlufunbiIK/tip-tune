import React, { useState } from 'react'
import { useCollaboration, Track } from '../../../hooks/useCollaboration'
import CollaboratorsList from './CollaboratorsList'
import ActivityFeed from './ActivityFeed'
import PresenceIndicator from './PresenceIndicator'

export default function CollaborativePlaylist({ playlistId, userName }:{playlistId:string,userName?:string}){
  const { tracks, addTrack, removeTrack, activities, collaborators } = useCollaboration(playlistId, userName || 'Guest')
  const [title, setTitle] = useState('')

  const onAdd = () => {
    if (!title.trim()) return
    addTrack({ title, artist: userName })
    setTitle('')
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Collaborative Playlist</h3>
          <CollaboratorsList collaborators={collaborators} />
        </div>

        <div className="space-y-2">
          {tracks.map((t:Track) => (
            <div key={t.id} className="p-3 bg-white rounded shadow-sm flex items-center justify-between">
              <div>
                <div className="font-medium">{t.title}</div>
                <div className="text-sm text-gray-500">{t.artist}</div>
              </div>
              <div>
                <button onClick={() => removeTrack(t.id)} className="text-sm text-red-600">Remove</button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Track title" className="flex-1 p-2 border rounded" />
          <button onClick={onAdd} className="px-4 py-2 bg-blue-600 text-white rounded">Add</button>
        </div>
      </div>

      <div className="w-80">
        <PresenceIndicator collaborators={collaborators} />
        <ActivityFeed activities={activities} />
      </div>
    </div>
  )
}
