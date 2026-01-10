# Tech Context

## Technology Stack

### Frontend (Renderer Process)
*   **Framework:** React 18
*   **Build Tool:** Vite
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **Icons:** Lucide React
*   **State Management:** React Context API

### Backend (Main Process)
*   **Runtime:** Electron (Node.js integration)
*   **Database:** SQLite (via `better-sqlite3`)
*   **Language:** TypeScript

## Development Environment
*   **OS:** Windows 11
*   **IDE:** VSCode
*   **Package Manager:** npm

## Key Technical Constraints
1.  **Local Database:** The application relies entirely on a local SQLite database file. There is no cloud sync or remote server. Backup strategies must focus on this file.
2.  **Offline First:** The system must function 100% offline.
3.  **Single Instance:** Designed as a single-user desktop application, though multiple accounts are tracked internally.
4.  **Security:** Direct database access is restricted to the Main process. The Renderer process can only interact with data via defined IPC handlers.

## Directory Structure
*   `electron/`: Main process code, database schema, and handlers.
*   `src/`: React frontend code.
*   `plans/`: Project documentation and specifications.
*   `memory-bank/`: AI context memory.