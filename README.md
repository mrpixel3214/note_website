# Obsidian Web Clone

This project is a personal web-based recreation of the Obsidian note-taking application, designed to manage and visualize markdown notes, particularly those previously organized with the help of the Gemini CLI. It fetches notes directly from a specified GitHub repository, allowing for a centralized and version-controlled knowledge base.

## Key Features

*   **Note Management:** View, edit, and save markdown notes.
*   **File Tree Navigation:** Browse notes organized in a hierarchical folder structure.
*   **Markdown Preview:** Render markdown content with basic formatting.
*   **Interactive Graph View:** Visualize the connections between notes using an interactive force-directed graph, similar to Obsidian's graph view. Clicking on a node in the graph will open the corresponding note.

## Gemini CLI Contributions

The following features were implemented with the assistance of the Gemini CLI:

*   **Graph View Implementation:**
    *   **Backend API Enhancement (`api/notes.js`):** Modified the existing API to include a new endpoint (`/api/notes?graph=true`). This endpoint fetches all markdown files from the configured GitHub repository, parses their content to identify `[[wikilinks]]`, and returns a JSON object containing `nodes` (notes) and `links` (connections between notes).
    *   **Frontend Graph Library:** Installed `react-force-graph-2d` as a dependency to enable interactive graph visualization.
    *   **Graph View Component (`src/GraphView.js`):** Created a dedicated React component responsible for fetching the graph data from the backend and rendering it using `react-force-graph-2d`. This component includes custom node rendering to display note titles and handles node clicks to load the associated note.
    *   **Integration into Main Application (`src/App.js`):** Replaced the previous placeholder graph rendering logic with the new `GraphView` component. Implemented a `handleGraphNodeClick` function to allow users to navigate to a note by clicking its representation in the graph.

## Setup and Running the Application

1.  **Environment Variables:**
    This application requires the following environment variables to be set for GitHub API access:
    *   `GITHUB_OWNER`: The GitHub username or organization that owns the repository.
    *   `GITHUB_REPO`: The name of the GitHub repository containing your markdown notes.
    *   `GITHUB_TOKEN`: A GitHub Personal Access Token with `repo` scope to read and write to your repository.

    You can set these in a `.env` file in the root of the project (e.g., `note_website/.env`).

    ```
    GITHUB_OWNER=your_github_username
    GITHUB_REPO=your_notes_repo
    GITHUB_TOKEN=your_personal_access_token
    ```

2.  **Install Dependencies:**
    Navigate to the `note_website` directory and install the required Node.js packages:
    ```bash
    npm install
    ```

3.  **Start the Development Server:**
    ```bash
    npm start
    ```
    The application will typically open in your browser at `http://localhost:3000`.

## Usage

*   Use the sidebar to navigate through your notes.
*   Click the "Graph" button in the top right to switch to the interactive graph view.
*   In the graph view, click on any note node to open and view its content.
*   You can edit notes in the "Edit" view and save your changes, which will be committed back to your GitHub repository.
