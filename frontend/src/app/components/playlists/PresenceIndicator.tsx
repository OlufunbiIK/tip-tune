import React from 'react'

export default function PresenceIndicator({ collaborators }:{collaborators:any[]}){
  return (
    <div className="mb-4 p-3 bg-white rounded shadow-sm">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Presence</div>
        <div className="text-sm text-gray-500">{collaborators.length} online</div>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {collaborators.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{background:c?.color||'#ddd'}}>{c?.name?.[0]}</div>
            <div>
              <div className="font-medium">{c?.name}</div>
              <div className="text-xs text-gray-500">Active</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
