import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

import AdminLogin from "./pages/admin/adminlogin";
import AdminDashboard from "./pages/admin/admindashboard";
import Room from "./pages/room/room";
import Registered from "./pages/room/Registered";
import Round from "./pages/room/Round";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/admin"
          element={<AdminLogin />}
        />

        <Route
          path="/admin/dashboard"
          element={<AdminDashboard />}
        />

        <Route
          path="/room/:roomCode"
          element={<Room />}
        />

        <Route
          path="/room/:roomCode/registered"
          element={<Registered />}
        />

        <Route
          path="/room/:roomCode/round/:roundNumber"
          element={<Round />}
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/admin"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;