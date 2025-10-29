# Project Overview: Agreements Application

This is a Next.js application built with React and TypeScript, designed for managing agreements. It leverages Prisma for database interactions, NextAuth for authentication, and Tailwind CSS for styling. The application also includes functionality for PDF generation and manipulation using `@react-pdf/renderer`, `html2canvas`, `jspdf`, and `pdfkit`, as well as drag-and-drop features powered by `@dnd-kit` and animations with `framer-motion`.

## Technologies Used:
*   **Framework:** Next.js (v15.1.3)
*   **Language:** TypeScript
*   **UI Library:** React
*   **Styling:** Tailwind CSS
*   **Database ORM:** Prisma
*   **Authentication:** NextAuth
*   **PDF Generation:** `@react-pdf/renderer`, `html2canvas`, `jspdf`, `pdfkit`
*   **Drag and Drop:** `@dnd-kit`
*   **Animations:** `framer-motion`

## Building and Running

To set up and run the project, follow these steps:

1.  **Install Dependencies:**
    ```bash
    npm install
    # or yarn install
    ```

2.  **Generate Prisma Client (if not already done by postinstall):**
    ```bash
    npx prisma generate
    ```

3.  **Run in Development Mode:**
    ```bash
    npm run dev
    # or yarn dev
    ```
    This will start the development server, typically on `http://localhost:3000`.

4.  **Build for Production:**
    ```bash
    npm run build
    # or yarn build
    ```
    This command generates the optimized production build.

5.  **Start Production Server:**
    ```bash
    npm run start
    # or yarn start
    ```
    This command starts the Next.js production server.

## Development Conventions

*   **TypeScript:** The project is written entirely in TypeScript, ensuring type safety and better code maintainability.
*   **Tailwind CSS:** Styling is managed using Tailwind CSS for a utility-first approach.
*   **Prisma:** Database schema and migrations are handled via Prisma. Ensure `prisma generate` is run after any schema changes.
*   **Next.js App Router:** The project utilizes the Next.js App Router for routing and layout management.
