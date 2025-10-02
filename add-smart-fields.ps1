$lines = Get-Content app/admin/agreements/page.tsx
$smartFieldButtons = @"

              {/* Smart Field Quick Add Buttons */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: '$' + '{textColor}',
                  fontSize: '14px'
                }}>
                  Quick Add Smart Fields
                </label>
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '8px'
                }}>
                  {[
                    { field: '{{client.firstName}}', label: 'First Name' },
                    { field: '{{client.lastName}}', label: 'Last Name' },
                    { field: '{{client.email}}', label: 'Email' },
                    { field: '{{client.phone}}', label: 'Phone' },
                    { field: '{{client.eventDate}}', label: 'Event Date' },
                    { field: '{{client.notes}}', label: 'Notes' },
                    { field: '{{agreement.date}}', label: 'Agreement Date' },
                    { field: '{{agreement.id}}', label: 'Agreement ID' }
                  ].map((sf) => (
                    <button
                      key={sf.field}
                      type="button"
                      onClick={() => setEditingContent(prev => prev + ' ' + sf.field)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        border: '1px solid ' + borderColor,
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        color: textColor,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDark ? '#334155' : '#f1f5f9';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#ffffff';
                      }}
                      title={'Insert ' + sf.label}
                    >
                      {sf.label}
                    </button>
                  ))}
                </div>
              </div>
"@

# Insert at line 677 (after the RichTextEditor closing div)
$newLines = $lines[0..676] + $smartFieldButtons.Split("`n") + $lines[677..($lines.Length-1)]
$newLines | Set-Content app/admin/agreements/page.tsx -Encoding UTF8

Write-Host "Smart field buttons added!"

