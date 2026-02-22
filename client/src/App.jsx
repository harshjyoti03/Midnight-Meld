import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Lobby from "./pages/Lobby";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/lobby" element={<Lobby />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;