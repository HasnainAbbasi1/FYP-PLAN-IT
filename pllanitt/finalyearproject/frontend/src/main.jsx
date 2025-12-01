
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { initAccessibility } from './utils/accessibility';
import './styles/global.css';
import './styles/design-system.css';
import './styles/card-overrides.css';
import './styles/responsive-utilities.css';

// Initialize accessibility features
initAccessibility();

createRoot(document.getElementById("root")).render(<App />);
