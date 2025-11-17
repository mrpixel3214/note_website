// api/notes.js

const { GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN } = process.env;

// Helper function to get the API URL for a specific note path
const getNoteApiUrl = (path) => `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;

// Helper function to get the main tree API URL
const getTreeApiUrl = () => `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees/main?recursive=1`;

/**
 * Processes the flat file list from GitHub API into a hierarchical tree.
 */
function buildFileTree(tree) {
  const fileTree = {};
  const mdFilePaths = tree.filter(node => node.path.endsWith('.md'));

  for (const node of mdFilePaths) {
    const pathParts = node.path.split('/');
    let currentLevel = fileTree;

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      const isLastPart = i === pathParts.length - 1;

      if (isLastPart) {
        currentLevel[part] = {
          type: 'file',
          path: node.path,
        };
      } else {
        if (!currentLevel[part]) {
          currentLevel[part] = {
            type: 'folder',
            children: {},
          };
        }
        currentLevel = currentLevel[part].children;
      }
    }
  }
  return fileTree;
}


/**
 * Fetches the entire note tree structure from GitHub.
 */
async function getNoteTree(res) {
  const response = await fetch(getTreeApiUrl(), {
    headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
  });

  if (!response.ok) {
    // Pass the error response body to the frontend for inspection
    const errorData = await response.json();
    res.status(response.status).json(errorData);
    return;
  }

  const data = await response.json();
  const fileTree = buildFileTree(data.tree);
  res.status(200).json(fileTree);
}

/**
 * Fetches the content of a single note from GitHub.
 */
async function getSingleNote(res, path) {
  const response = await fetch(getNoteApiUrl(path), {
    headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
  });

  if (!response.ok) {
    throw new Error(`GitHub API Error: ${response.statusText}`);
  }

  const data = await response.json();
  res.status(200).json({
    content: Buffer.from(data.content, 'base64').toString('utf-8'),
    sha: data.sha
  });
}

/**
 * Creates or updates a note on GitHub.
 */
async function putNote(req, res, path) {
  const { content, sha } = req.body;

  const body = {
    message: `Update ${path}`,
    content: Buffer.from(content).toString('base64'),
    sha: sha // sha is required for updates
  };

  const response = await fetch(getNoteApiUrl(path), {
    method: 'PUT',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`GitHub API Error: ${response.statusText} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  res.status(200).json({ sha: data.content.sha });
}


export default async function handler(req, res) {
  console.log(`[${new Date().toISOString()}] /api/notes invoked. Method: ${req.method}, Path: ${req.query.path || 'none'}`);

  // Check for server configuration first
  if (!GITHUB_OWNER || !GITHUB_REPO || !GITHUB_TOKEN) {
    return res.status(500).json({ message: 'Server configuration error: Missing GitHub environment variables.' });
  }

  const { path } = req.query;

  try {
    if (req.method === 'GET') {
      if (path) {
        await getSingleNote(res, path);
      } else {
        await getNoteTree(res);
      }
    } else if (req.method === 'PUT') {
      if (path) {
        await putNote(req, res, path);
      } else {
        res.status(400).json({ message: 'Bad Request: Missing path for PUT.' });
      }
    } else {
      res.status(405).json({ message: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      message: error.message || 'An internal server error occurred.',
      name: error.name,
      env_check: `GITHUB_OWNER: ${GITHUB_OWNER ? 'Set' : 'Not Set'}, GITHUB_REPO: ${GITHUB_REPO ? 'Set' : 'Not Set'}, GITHUB_TOKEN: ${GITHUB_TOKEN ? 'Set (first 8 chars: ' + GITHUB_TOKEN.substring(0, 8) + '...)' : 'Not Set'}`
    });
  }
}
