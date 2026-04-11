import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";

function App() {
  const path = window.location.pathname;

  if (path === "/login") {
    return <Login />;
  } else if (path === "/dashboard") {
    return <Dashboard />;
  } else {
    return <Register />;
  }
}

export default App;