$lines = Get-Content app/admin/clients/page.tsx

$eventFields = @"

                {/* Event Type */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: '500',
                    color: textColor,
                    fontSize: '14px'
                  }}>
                    Event Type
                  </label>
                  <input
                    type="text"
                    value={newClient.eventType}
                    onChange={(e) => setNewClient({ ...newClient, eventType: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: ``1px solid ``${borderColor}``,
                      borderRadius: '4px',
                      backgroundColor: cardBg,
                      color: textColor,
                      fontSize: '14px'
                    }}
                    placeholder="e.g., Wedding, Corporate Event, Birthday"
                  />
                </div>

                {/* Event Location */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: '500',
                    color: textColor,
                    fontSize: '14px'
                  }}>
                    Event Location
                  </label>
                  <input
                    type="text"
                    value={newClient.eventLocation}
                    onChange={(e) => setNewClient({ ...newClient, eventLocation: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: ``1px solid ``${borderColor}``,
                      borderRadius: '4px',
                      backgroundColor: cardBg,
                      color: textColor,
                      fontSize: '14px'
                    }}
                    placeholder="e.g., Grand Ballroom, Downtown Hotel"
                  />
                </div>

                {/* Event Start Time */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: '500',
                    color: textColor,
                    fontSize: '14px'
                  }}>
                    Event Start Time
                  </label>
                  <input
                    type="text"
                    value={newClient.eventStartTime}
                    onChange={(e) => setNewClient({ ...newClient, eventStartTime: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: ``1px solid ``${borderColor}``,
                      borderRadius: '4px',
                      backgroundColor: cardBg,
                      color: textColor,
                      fontSize: '14px'
                    }}
                    placeholder="e.g., 2:00 PM, 14:00"
                  />
                </div>

                {/* Event Duration */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: '500',
                    color: textColor,
                    fontSize: '14px'
                  }}>
                    Event Duration
                  </label>
                  <input
                    type="text"
                    value={newClient.eventDuration}
                    onChange={(e) => setNewClient({ ...newClient, eventDuration: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: ``1px solid ``${borderColor}``,
                      borderRadius: '4px',
                      backgroundColor: cardBg,
                      color: textColor,
                      fontSize: '14px'
                    }}
                    placeholder="e.g., 4 hours, 8 hours"
                  />
                </div>

                {/* Event Package */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: '500',
                    color: textColor,
                    fontSize: '14px'
                  }}>
                    Package
                  </label>
                  <input
                    type="text"
                    value={newClient.eventPackage}
                    onChange={(e) => setNewClient({ ...newClient, eventPackage: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: ``1px solid ``${borderColor}``,
                      borderRadius: '4px',
                      backgroundColor: cardBg,
                      color: textColor,
                      fontSize: '14px'
                    }}
                    placeholder="e.g., Premium Package, Basic Package"
                  />
                </div>
"@

# Find the line after eventDate closing div and insert
for ($i=0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match '^\s+</div>\s*$' -and $lines[$i-15] -match 'Event Date') {
        $insertLine = $i + 1
        break
    }
}

$newLines = $lines[0..$insertLine] + $eventFields.Split("`n") + $lines[($insertLine+1)..($lines.Length-1)]
$newLines | Set-Content app/admin/clients/page.tsx -Encoding UTF8

Write-Host "Event fields added at line $insertLine!"

