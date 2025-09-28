# Copilot Instructions for Eventa

## Project Overview
- **Eventa** is a React-based event planning platform, bootstrapped with Create React App.
- The frontend is in `src/` and uses React Router for navigation and Bootstrap for UI.
- Backend logic (user auth, event data) is handled via PHP scripts in `src/pages/php/` and accessed through HTTP requests from the frontend.
- User data is stored in `localStorage` after login/registration.

## Key Components & Structure
- **Navigation**: `Navbar`, `LoginNav` in `src/pages/components.js` handle desktop/mobile nav and user dropdowns.
- **Authentication**: `Login` component manages login/signup modals and communicates with `php/query.php`.
- **Event Management**: Event creation and dashboard logic is in `src/pages/planner/` (e.g., `activeEventDetails.js`, `eventsDashboard.js`).
- **Admin**: Admin dashboard and styles are in `src/pages/admin/`.
- **Assets**: Images and static files are in `public/images/` and subfolders.

## Developer Workflows
- **Start Dev Server**: `npm start` (runs on http://localhost:3000)
- **Build for Production**: `npm run build`
- **Run Tests**: `npm test`
- **PHP Backend**: PHP scripts are expected to run on a local server (e.g., WAMP at http://localhost/eventa/)

## Project-Specific Patterns
- **API Calls**: Use `fetch` to communicate with PHP endpoints. Example: `fetch("http://localhost/eventa/src/pages/php/query.php", { method: "POST", body: formData })`.
- **User State**: After login, user info is stored in `localStorage` as `user` and used for role-based navigation (admin vs. regular user).
- **Navigation**: Use `useNavigate` from `react-router-dom` for programmatic navigation.
- **Component Organization**: Group related logic (admin, planner, php) in subfolders under `src/pages/`.
- **CSS**: Styles are in both global files (e.g., `App.css`) and feature-specific files (e.g., `adminDesign.css`).

## Integration Points
- **Frontend/Backend**: All data mutations (login, register, logout, event actions) go through PHP endpoints in `src/pages/php/`.
- **Role Handling**: User roles (admin/user) are checked after login to redirect to the correct dashboard.

## Examples
- To log out a user, call the exported `logOut` async function in `components.js`.
- To navigate to the profile page: `navigate("/Profile")` (see `goToProfile` in `components.js`).

## Conventions
- Use React functional components and hooks.
- Use Bootstrap classes for layout and icons (see `bi-` classes).
- Keep all PHP backend logic in `src/pages/php/`.
- Use `localStorage` for client-side user session state.

---
For more, see `README.md` and explore `src/pages/components.js` for core UI logic.
