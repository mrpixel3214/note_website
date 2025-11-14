import React, { useState, useEffect, useRef } from 'react';
import { FileText, Plus, Folder, FolderOpen, ChevronRight, ChevronDown, Search, Menu, Bold, Italic, List, ListOrdered, CheckSquare, Highlighter, Share2, Eye, Edit } from 'lucide-react';

export default function ObsidianClone() {
  const [notes, setNotes] = useState({});
  const [currentNote, setCurrentNote] = useState(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('Untitled');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState({});
  const [viewMode, setViewMode] = useState('edit');
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const response = await fetch('/api/notes');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch notes.');
      }
      const fileTree = await response.json();
      setNotes(fileTree);
      setError(null);
    } catch (err) {
      console.error('Error loading notes:', err);
      setError(err.message);
      setNotes({});
    }
  };

  const loadNote = async (notePath) => {
    try {
      const response = await fetch(`/api/notes?path=${encodeURIComponent(notePath)}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load note.');
      }
      const data = await response.json();
      setCurrentNote({ path: notePath, sha: data.sha });
      setTitle(notePath.split('/').pop().replace('.md', ''));
      setContent(data.content);
      setViewMode('edit');
    } catch (err) {
      console.error('Error loading note:', err);
      alert(`Error loading note: ${err.message}`);
    }
  };

  const saveNote = async () => {
    if (!title) return;

    try {
      const path = currentNote?.path || `${title}.md`;
      
      const response = await fetch(`/api/notes?path=${encodeURIComponent(path)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content,
          sha: currentNote?.sha // This can be null for new files
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save note.');
      }

      const data = await response.json();
      // Update the note's sha after saving
      setCurrentNote(prev => ({ ...prev, path: path, sha: data.sha }));
      
      // Refresh the file tree to show new files
      if (!currentNote?.path) {
        loadNotes();
      }
    } catch (err) {
      console.error('Error saving note:', err);
      alert(`Error saving note: ${err.message}`);
    }
  };

  const createNewNote = () => {
    setCurrentNote(null);
    setTitle('Untitled');
    setContent('');
    setViewMode('edit');
  };

  const toggleFolder = (folderPath) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }));
  };

  const insertFormatting = (before, after = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    
    setContent(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const renderMarkdown = (text) => {
    let html = text;
    
    html = html.replace(/^### (.+)$/gm, '<h3 style="color: #e5e7eb; font-size: 20px; font-weight: 600; margin: 16px 0 8px;">$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2 style="color: #e5e7eb; font-size: 24px; font-weight: 600; margin: 20px 0 10px;">$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1 style="color: #e5e7eb; font-size: 32px; font-weight: 700; margin: 24px 0 12px;">$1</h1>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="color: #e5e7eb; font-weight: 700;">$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em style="color: #d1d5db; font-style: italic;">$1</em>');
    html = html.replace(/==(.+?)==/g, '<mark style="background: #fbbf24; color: #1a1a1a; padding: 2px 4px; border-radius: 2px;">$1</mark>');
    html = html.replace(/\[\[(.+?)\]\]/g, '<a href="#" style="color: #a78bfa; text-decoration: none; border-bottom: 1px solid #a78bfa;">$1</a>');
    html = html.replace(/^- \[ \] (.+)$/gm, '<div style="margin: 4px 0;"><input type="checkbox" style="margin-right: 8px;" disabled /> <span style="color: #d1d5db;">$1</span></div>');
    html = html.replace(/^- \[x\] (.+)$/gm, '<div style="margin: 4px 0;"><input type="checkbox" checked style="margin-right: 8px;" disabled /> <span style="color: #9ca3af; text-decoration: line-through;">$1</span></div>');
    html = html.replace(/^- (.+)$/gm, '<div style="margin: 4px 0; padding-left: 20px;"><span style="color: #6b7280;">•</span> <span style="color: #d1d5db;">$1</span></div>');
    
    let listCounter = 0;
    html = html.replace(/^\d+\. (.+)$/gm, (match, item) => {
      listCounter++;
      return `<div style="margin: 4px 0; padding-left: 20px;"><span style="color: #6b7280;">${listCounter}.</span> <span style="color: #d1d5db;">${item}</span></div>`;
    });
    
    html = html.replace(/\n/g, '<br/>');
    
    return html;
  };

  const getAllNoteNames = (tree, path = '', names = []) => {
    Object.entries(tree).forEach(([name, item]) => {
      const fullPath = path ? `${path}/${name}` : name;
      if (item.type === 'file') {
        names.push(name);
      } else if (item.type === 'folder') {
        getAllNoteNames(item.children, fullPath, names);
      }
    });
    return names;
  };

  const renderGraph = () => {
    const allNotes = getAllNoteNames(notes);
    
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#1a1a1a'
      }}>
        <svg width="100%" height="100%" viewBox="0 0 800 600" style={{ maxWidth: '800px', maxHeight: '600px' }}>
          {allNotes.slice(0, 20).map((note, i) => {
            const angle = (i / Math.max(allNotes.length, 1)) * 2 * Math.PI;
            const x = 400 + Math.cos(angle) * 200;
            const y = 300 + Math.sin(angle) * 200;
            
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="8" fill="#7c3aed" />
                <text x={x + 12} y={y + 4} fill="#9ca3af" fontSize="12">{note}</text>
                <line x1={x} y1={y} x2="400" y2="300" stroke="#374151" strokeWidth="1" opacity="0.3" />
              </g>
            );
          })}
          <circle cx="400" cy="300" r="12" fill="#a78bfa" />
          <text x="420" y="305" fill="#e5e7eb" fontSize="14" fontWeight="600">Your Notes</text>
        </svg>
      </div>
    );
  };

  const renderFileTree = (tree, path = '') => {
    return Object.entries(tree).map(([name, item]) => {
      const fullPath = path ? `${path}/${name}` : name;
      
      if (item.type === 'folder') {
        const isExpanded = expandedFolders[fullPath];
        return (
          <div key={fullPath}>
            <button
              onClick={() => toggleFolder(fullPath)}
              className="folder-btn"
            >
              {isExpanded ? <ChevronDown size={13} color="#6b7280" /> : <ChevronRight size={13} color="#6b7280" />}
              {isExpanded ? <FolderOpen size={13} color="#6b7280" /> : <Folder size={13} color="#6b7280" />}
              <span>{name}</span>
            </button>
            {isExpanded && (
              <div style={{ marginLeft: '12px' }}>
                {renderFileTree(item.children, fullPath)}
              </div>
            )}
          </div>
        );
      } else {
        return (
          <button
            key={fullPath}
            onClick={() => loadNote(item.path)}
            className="file-btn"
            style={{
              marginLeft: '16px',
              background: currentNote?.path === item.path ? '#2a2a2a' : 'transparent',
              color: currentNote?.path === item.path ? '#a78bfa' : '#9ca3af'
            }}
          >
            <FileText size={13} color="#6b7280" />
            <span>{name}</span>
          </button>
        );
      }
    });
  };

  return (
    <div style={{ height: '100vh', display: 'flex', background: '#202020' }}>
      <style>{`
        .folder-btn, .file-btn, .toolbar-btn, .icon-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 6px;
          background: transparent;
          border: none;
          borderRadius: 4px;
          cursor: pointer;
          color: #9ca3af;
          fontSize: 12px;
          textAlign: left;
        }
        .folder-btn:hover, .file-btn:hover, .toolbar-btn:hover, .icon-btn:hover {
          background: #2a2a2a;
        }
        .toolbar-btn {
          padding: 4px 8px;
        }
        .icon-btn {
          padding: 4px;
        }
      `}</style>

      <div style={{
        width: sidebarOpen ? '240px' : '0',
        transition: 'width 0.2s',
        background: '#1a1a1a',
        borderRight: '1px solid #2a2a2a',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '8px 12px',
          borderBottom: '1px solid #2a2a2a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: '11px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Files</span>
          <div style={{ display: 'flex', gap: '2px' }}>
            <button onClick={createNewNote} className="icon-btn" title="New note">
              <Plus size={15} />
            </button>
          </div>
        </div>
        
        <div style={{ padding: '8px' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '10px', top: '8px' }} size={13} color="#6b7280" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: '#0d0d0d',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 8px 6px 28px',
                fontSize: '12px',
                color: '#9ca3af',
                outline: 'none'
              }}
            />
          </div>
        </div>
        
        <div style={{ flex: 1, overflow: 'auto', padding: '0 8px 8px' }}>
          {error ? (
            <div style={{ fontSize: '12px', color: '#fca5a5', textAlign: 'center', marginTop: '32px', padding: '0 16px' }}>
              Error: {error}
            </div>
          ) : Object.keys(notes).length === 0 ? (
            <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', marginTop: '32px', padding: '0 16px' }}>
              Loading notes...
            </div>
          ) : (
            renderFileTree(notes)
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#202020' }}>
        <div style={{
          background: '#1a1a1a',
          borderBottom: '1px solid #2a2a2a',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="icon-btn">
            <Menu size={16} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6b7280' }}>
            {currentNote?.path.split('/').slice(0, -1).map((part, i) => (
              <React.Fragment key={i}>
                <span>{part}</span>
                <ChevronRight size={10} />
              </React.Fragment>
            ))}
            <span style={{ color: '#9ca3af' }}>{title}</span>
          </div>
          
          <div style={{ flex: 1 }}></div>

          <div style={{ display: 'flex', gap: '4px', marginRight: '8px' }}>
            <button
              onClick={() => setViewMode('edit')}
              style={{
                padding: '4px 8px',
                background: viewMode === 'edit' ? '#2a2a2a' : 'transparent',
                color: viewMode === 'edit' ? '#a78bfa' : '#9ca3af',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Edit size={14} /> Edit
            </button>
            <button
              onClick={() => setViewMode('preview')}
              style={{
                padding: '4px 8px',
                background: viewMode === 'preview' ? '#2a2a2a' : 'transparent',
                color: viewMode === 'preview' ? '#a78bfa' : '#9ca3af',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Eye size={14} /> Preview
            </button>
            <button
              onClick={() => setViewMode('graph')}
              style={{
                padding: '4px 8px',
                background: viewMode === 'graph' ? '#2a2a2a' : 'transparent',
                color: viewMode === 'graph' ? '#a78bfa' : '#9ca3af',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Share2 size={14} /> Graph
            </button>
          </div>
          
          <button
            onClick={saveNote}
            style={{
              padding: '4px 12px',
              background: '#2a2a2a',
              color: '#9ca3af',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Save
          </button>
        </div>

        {viewMode === 'edit' && (
          <div style={{
            background: '#1a1a1a',
            borderBottom: '1px solid #2a2a2a',
            padding: '6px 12px',
            display: 'flex',
            gap: '4px'
          }}>
            <button onClick={() => insertFormatting('**', '**')} title="Bold" className="toolbar-btn">
              <Bold size={16} />
            </button>
            <button onClick={() => insertFormatting('*', '*')} title="Italic" className="toolbar-btn">
              <Italic size={16} />
            </button>
            <button onClick={() => insertFormatting('==', '==')} title="Highlight" className="toolbar-btn">
              <Highlighter size={16} />
            </button>
            <div style={{ width: '1px', background: '#2a2a2a', margin: '0 4px' }}></div>
            <button onClick={() => insertFormatting('- ')} title="Bullet List" className="toolbar-btn">
              <List size={16} />
            </button>
            <button onClick={() => insertFormatting('1. ')} title="Numbered List" className="toolbar-btn">
              <ListOrdered size={16} />
            </button>
            <button onClick={() => insertFormatting('- [ ] ')} title="Task List" className="toolbar-btn">
              <CheckSquare size={16} />
            </button>
            <div style={{ width: '1px', background: '#2a2a2a', margin: '0 4px' }}></div>
            <button
              onClick={() => insertFormatting('[[', ']]')}
              title="Wiki Link"
              style={{
                padding: '4px 12px',
                background: 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                color: '#a78bfa',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              [[Link]]
            </button>
          </div>
        )}

        <div style={{ flex: 1, overflow: 'auto' }}>
          {viewMode === 'graph' ? (
            renderGraph()
          ) : viewMode === 'preview' ? (
            <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '48px 64px' }}>
              <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '32px', color: '#e5e7eb' }}>
                {title}
              </h1>
              <div
                style={{ lineHeight: '1.6', fontSize: '15px' }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
              />
            </div>
          ) : (
            <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '48px 64px' }}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: '100%',
                  fontSize: '32px',
                  fontWeight: 'bold',
                  marginBottom: '32px',
                  color: '#e5e7eb',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none'
                }}
                placeholder="Untitled"
              />
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start typing..."
                style={{
                  width: '100%',
                  background: 'transparent',
                  color: '#d1d5db',
                  resize: 'none',
                  outline: 'none',
                  minHeight: '600px',
                  caretColor: '#a78bfa',
                  border: 'none',
                  fontSize: '15px',
                  lineHeight: '1.6',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}