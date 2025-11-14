import React, { useState, useEffect, useRef } from 'react';
import { FileText, Plus, Folder, FolderOpen, ChevronRight, ChevronDown, Search, Menu, Settings, Bold, Italic, List, ListOrdered, CheckSquare, Highlighter, Share2, Eye, Edit } from 'lucide-react';

export default function ObsidianClone() {
  const [notes, setNotes] = useState({});
  const [currentNote, setCurrentNote] = useState(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('Untitled');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [githubToken, setGithubToken] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [githubOwner, setGithubOwner] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [viewMode, setViewMode] = useState('edit');
  const textareaRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('github_token');
    const repo = localStorage.getItem('github_repo');
    const owner = localStorage.getItem('github_owner');
    
    if (token && repo && owner) {
      setGithubToken(token);
      setGithubRepo(repo);
      setGithubOwner(owner);
      setIsConnected(true);
      loadNotesFromGithub(token, owner, repo);
    }
  }, []);

  const loadNotesFromGithub = async (token, owner, repo) => {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const fileTree = {};
        
        data.tree.forEach(item => {
          if (item.type === 'blob' && item.path.endsWith('.md')) {
            const parts = item.path.split('/');
            let current = fileTree;
            
            for (let i = 0; i < parts.length - 1; i++) {
              if (!current[parts[i]]) {
                current[parts[i]] = { type: 'folder', children: {} };
              }
              current = current[parts[i]].children;
            }
            
            const fileName = parts[parts.length - 1].replace('.md', '');
            current[fileName] = { type: 'file', path: item.path, sha: item.sha };
          }
        });
        
        setNotes(fileTree);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const saveSettings = () => {
    localStorage.setItem('github_token', githubToken);
    localStorage.setItem('github_repo', githubRepo);
    localStorage.setItem('github_owner', githubOwner);
    setIsConnected(true);
    setShowSettings(false);
    loadNotesFromGithub(githubToken, githubOwner, githubRepo);
  };

  const loadNote = async (notePath) => {
    try {
      const response = await fetch(`https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${notePath}`, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const decodedContent = atob(data.content);
        setCurrentNote({ path: notePath, sha: data.sha });
        setTitle(notePath.split('/').pop().replace('.md', ''));
        setContent(decodedContent);
        setViewMode('edit');
      }
    } catch (error) {
      console.error('Error loading note:', error);
    }
  };

  const saveNote = async () => {
    if (!title || !isConnected) return;

    try {
      const path = currentNote?.path || `${title}.md`;
      const encodedContent = btoa(content);
      
      const body = {
        message: `Update ${title}`,
        content: encodedContent,
      };

      if (currentNote?.sha) {
        body.sha = currentNote.sha;
      }

      const response = await fetch(`https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${path}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentNote({ path: path, sha: data.content.sha });
        loadNotesFromGithub(githubToken, githubOwner, githubRepo);
      }
    } catch (error) {
      console.error('Error saving note:', error);
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

  if (showSettings) {
    return (
      <div style={{
        height: '100vh',
        background: '#202020',
        color: '#d1d5db',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '400px',
          background: '#1a1a1a',
          borderRadius: '8px',
          border: '1px solid #2a2a2a',
          padding: '32px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '24px', color: '#e5e7eb', textAlign: 'center' }}>GitHub Settings</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>GitHub Username</label>
              <input
                type="text"
                value={githubOwner}
                onChange={(e) => setGithubOwner(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0d0d0d',
                  border: '1px solid #2a2a2a',
                  borderRadius: '4px',
                  padding: '10px 12px',
                  fontSize: '14px',
                  color: '#d1d5db',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                placeholder="your-username"
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>Repository Name</label>
              <input
                type="text"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0d0d0d',
                  border: '1px solid #2a2a2a',
                  borderRadius: '4px',
                  padding: '10px 12px',
                  fontSize: '14px',
                  color: '#d1d5db',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                placeholder="my-notes"
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>Personal Access Token</label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0d0d0d',
                  border: '1px solid #2a2a2a',
                  borderRadius: '4px',
                  padding: '10px 12px',
                  fontSize: '14px',
                  color: '#d1d5db',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                placeholder="ghp_xxxxxxxxxxxx"
              />
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', margin: '8px 0 0' }}>
                Generate at: GitHub Settings → Developer settings → Tokens (classic) → repo scope
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
              <button
                onClick={saveSettings}
                style={{
                  flex: 1,
                  background: '#7c3aed',
                  color: 'white',
                  padding: '10px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Connect
              </button>
              <button
                onClick={() => setShowSettings(false)}
                style={{
                  padding: '10px 20px',
                  background: '#2a2a2a',
                  color: '#9ca3af',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <button onClick={() => setShowSettings(true)} className="icon-btn" title="Settings">
              <Settings size={15} />
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
          {Object.keys(notes).length === 0 ? (
            <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', marginTop: '32px', padding: '0 16px' }}>
              {isConnected ? 'No notes found' : 'Configure GitHub to start'}
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
            disabled={!isConnected}
            style={{
              padding: '4px 12px',
              background: isConnected ? '#2a2a2a' : '#1a1a1a',
              color: isConnected ? '#9ca3af' : '#6b7280',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: isConnected ? 'pointer' : 'not-allowed'
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
                placeholder={isConnected ? "Start typing..." : "Configure GitHub in settings..."}
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