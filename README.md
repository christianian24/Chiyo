# Chiyo
### A minimalist, offline-first library manager for manga and light novels.

[![Platform: Windows](https://img.shields.io/badge/Platform-Windows-blueviolet?style=flat-square)](https://github.com/ian/chiyo)
[![Author: Ian](https://img.shields.io/badge/Author-Ian-white?style=flat-square)](https://github.com/ian)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**Chiyo** is a lightweight Windows desktop application designed for organizing and tracking personal reading collections. Built with a focus on speed, utility, and local data ownership, Chiyo provides a clean interface for managing series progress without the overhead of cloud synchronization or external trackers.

Designed for users who prefer a dedicated, standalone tool, Chiyo offers a structured environment for cataloging titles, managing cover assets, and maintaining reading logs entirely on your local machine.

---

## 🎐 Key Features

- **Local-First Architecture**: Stores all information in a local SQLite database for instant access and total data sovereignty.
- **Fluid Interface**: Uses a "staged entry" sequence and smooth transitions to create a responsive desktop experience.
- **Dashboard-Driven Design**: Organized Detail Views provide concise operational timelines and chapter progress indicators.
- **Automated Maintenance**: Includes background routines for orphaned asset cleanup and scheduled database backups.
- **Precise Tracking**: Optimized controls for chapter increments, status management, and library-wide search.
- **Asset Management**: Integrated cover image handling with local storage to keep your library visually organized.

---

## 🔒 Privacy & Data Handling

Chiyo is built on the principle of local ownership.
- **Zero External Tracking**: The application does not include any telemetry, analytics, or external tracking scripts.
- **Offline Storage**: Your library metadata and cover images are stored exclusively on your local file system.
- **No Cloud Dependency**: There are no mandatory accounts or cloud requirements; you have full control over your database files.

---

---

## 📸 Screenshots

![Chiyo Library View](./screenshots/library_view.png)
*The Library dashboard organizes your collection through card-centric navigation.*

![Chiyo Detail View](./screenshots/detail_view.png)
*The Detail view provides granular control over individual series data and history.*

---

## 🛠 Tech Stack

Chiyo utilizes a modern, performance-oriented stack to deliver a native desktop feel:

- **Runtime**: [Electron](https://www.electronjs.org/) (ABI 130)
- **Frontend**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animation**: [Framer Motion](https://www.framer.com/motion/)
- **Database**: [Better-SQLite3](https://github.com/WiseLibs/better-sqlite3)
- **Image Processing**: [Sharp](https://sharp.pixelplumbing.com/)

---

## 🚀 Getting Started

To run or build Chiyo from the source code:

1. **Clone the repository**
   ```bash
   git clone https://github.com/ian/chiyo.git
   cd chiyo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Launch in development mode**
   ```bash
   npm run dev
   ```

4. **Build production binaries**
   ```bash
   npm run build
   ```

---

## 📂 Project Structure

```text
chiyo/
├── electron/           # Main process logic and IPC handlers
├── public/             # Static application assets
├── screenshots/        # Project documentation images
├── src/
│   ├── components/     # UI components (modals, cards)
│   ├── pages/          # Core views (Library, Detail)
│   ├── styles/         # Styled themes and design tokens
│   └── types/          # TypeScript interface definitions
├── storage/            # Local asset storage directories
└── vite.config.ts      # Build and module configuration
```

---

## 💡 Design Philosophy

Chiyo is built for users who value simplicity and independence over social features or cloud integration:
1. **Uninterrupted Utility**: The interface is designed to be functional and unobtrusive.
2. **Data Sovereignty**: Users retain absolute ownership of their collection data and assets.
3. **Visual Clarity**: Information density is balanced with minimalist aesthetics for an efficient user experience.

---

## 🗺 Roadmap

- [x] Initial Beta Release
- [x] Custom Confirmation Modals
- [x] Database Maintenance Engine
- [ ] JSON Data Import/Export
- [ ] Support for Multiple Library Instances
- [ ] Detailed Reading Statistics Dashboard

---

## 🗒 Notes & Limitations

- **Platform**: Built and optimized exclusively for Windows environments.
- **Local Assets**: Cover images are stored in the AppData directory. Removing application data will reset your local asset library.
- **Manual Data**: Chiyo does not scrape external databases; all series information is managed manually to ensure accuracy and offline independence.

---

## ✍ Credits

Developed by **Ian**.
For technical feedback or issues, please use the repository issue tracker.
